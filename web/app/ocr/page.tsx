"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  translations,
  Language,
  translateCategory,
} from "../../lib/translations";
import { apiFetch } from "../../lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type OCRResult = {
  merchant?: string | null;
  amount?: number | null;
  date?: string | null;
  category?: string | null;
  confidence?: "low" | "medium" | "high" | string | null;
  raw_text?: string | null;
  header_text?: string | null;
  error?: string | null;
  message?: string | null;
};

type FormState = {
  merchant: string;
  amount: string;
  date: string;
  category: string;
};

const CATEGORY_OPTIONS = [
  "Food",
  "Groceries",
  "Transportation",
  "Shopping",
  "Health",
  "Utilities",
  "Other",
];

const STOP_WORDS = [
  "tarih",
  "date",
  "saat",
  "time",
  "fis",
  "fiş",
  "fis no",
  "fiş no",
  "toplam",
  "total",
  "topkdv",
  "kdv",
  "kart",
  "kredi",
  "credit",
  "nakit",
  "cash",
  "odeme",
  "ödeme",
  "ref",
  "isyeri",
  "term",
  "onay",
  "bölüm",
  "bolum",
  "z no",
  "zno",
  "eku",
  "app label",
  "aid",
  "no:",
  "vd:",
  "v.d",
  "verg",
  "sıra no",
  "sira no",
  "vakifbank",
  "vakıfbank",
  "banka",
  "bankasi",
  "bankası",
  "mastercard",
  "debit",
  "satis",
  "satış",
  "islem tutari",
  "işlem tutarı",
  "pos",
  "stan",
  "batch",
  "onay kodu",
  "terminal",
  "slip",
  "belge",
  "mali",
  "maliye",
];

const ADDRESS_HINTS = [
  "mah",
  "mahalle",
  "cad",
  "caddesi",
  "sok",
  "sk",
  "bulvar",
  "yolu",
  "no",
  "kat",
  "daire",
  "istanbul",
  "ankara",
  "izmir",
  "tuzla",
  "kadikoy",
  "kadıköy",
  "besiktas",
  "beşiktaş",
  "park",
  "karsisi",
  "karşısı",
];

const STRONG_HINTS = [
  "ltd",
  "şti",
  "sti",
  "a.ş",
  "aş",
  "market",
  "cafe",
  "restaurant",
  "restoran",
  "turizm",
  "organizasyon",
  "işletmecilik",
  "isletmecilik",
  "üniversitesi",
  "universitesi",
  "ticaret",
  "sanayi",
];

function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeForMatching(text: string): string {
  return safeText(text)
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/orcanezashon/g, "organizasyon")
    .replace(/organezasyon/g, "organizasyon")
    .replace(/turtz/g, "turizm")
    .replace(/turtzm/g, "turizm")
    .replace(/untverstises/g, "universitesi")
    .replace(/universtises/g, "universitesi")
    .replace(/isletmelicik/g, "isletmecilik")
    .replace(/tsletmelicik/g, "isletmecilik")
    .replace(/[^\w\s./&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMerchantLine(line: string): string {
  return safeText(line)
    .replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s.&/:-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toMerchantTitleCase(value: string): string {
  const parts = safeText(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

  let result = parts.join(" ");

  result = result.replace(/A\.ş\./g, "A.Ş.");
  result = result.replace(/Ltd\./g, "Ltd.");
  result = result.replace(/Şti\./g, "Şti.");
  result = result.replace(/Universitesi/g, "Üniversitesi");
  result = result.replace(/Isletmecilik/g, "İşletmecilik");

  return result;
}

function normalizeDateValue(value?: string | null): string {
  const text = safeText(value).trim();

  if (!text) return "";

  const currentYear = new Date().getFullYear();

  function fixLikelyWrongYear(yearText: string) {
    const parsedYear = Number(yearText);

    if (!Number.isFinite(parsedYear)) return yearText;

    // OCR bazen 2026 yılını 2022 gibi okuyabiliyor.
    // Fiş tarihi geçmiş bir yıl görünüyorsa mevcut yıla sabitliyoruz.
    if (parsedYear < currentYear) {
      return String(currentYear);
    }

    return yearText;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${fixLikelyWrongYear(year)}-${month}-${day}`;
  }

  const match = text.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (match) {
    return `${fixLikelyWrongYear(match[3])}-${match[2]}-${match[1]}`;
  }

  return "";
}

function normalizeAmountValue(value: string): number {
  const normalized = safeText(value).replace(",", ".").trim();
  return Number(normalized);
}

function looksLikeAddressLine(line: string): boolean {
  const norm = normalizeForMatching(line);

  return ADDRESS_HINTS.some((hint) => norm.includes(hint));
}

function looksLikeReceiptMetaLine(line: string): boolean {
  const norm = normalizeForMatching(line);

  return STOP_WORDS.some((word) => norm.includes(word));
}

function looksLikeBusinessLine(line: string): boolean {
  const norm = normalizeForMatching(line);
  const cleaned = cleanMerchantLine(line);
  const letters = (cleaned.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []).length;
  const digits = (cleaned.match(/\d/g) || []).length;

  if (!cleaned || letters < 3 || digits > letters) return false;
  if (looksLikeReceiptMetaLine(cleaned)) return false;
  if (looksLikeAddressLine(cleaned)) return false;

  return (
    STRONG_HINTS.some((hint) => norm.includes(hint)) ||
    cleaned === cleaned.toUpperCase()
  );
}

function buildMerchantFromHeader(result: OCRResult | null): string {
  if (!result) return "";

  const source = [safeText(result.header_text), safeText(result.raw_text)]
    .filter(Boolean)
    .join("\n");

  if (!source.trim()) return "";

  const lines = source
    .split("\n")
    .map((line) => cleanMerchantLine(line))
    .filter(Boolean)
    .slice(0, 10);

  const businessLines = lines.filter((line) => looksLikeBusinessLine(line));

  if (businessLines.length >= 2) {
    return toMerchantTitleCase(`${businessLines[0]} ${businessLines[1]}`);
  }

  if (businessLines.length === 1) {
    return toMerchantTitleCase(businessLines[0]);
  }

  return "";
}

function getBestMerchant(result: OCRResult | null): string {
  const headerMerchant = buildMerchantFromHeader(result);

  if (headerMerchant) {
    return headerMerchant;
  }

  const parsedMerchant = safeText(result?.merchant).trim();

  if (parsedMerchant) {
    return toMerchantTitleCase(parsedMerchant);
  }

  return extractMerchantCandidates(result)[0] || "";
}

function extractMerchantCandidates(result: OCRResult | null): string[] {
  if (!result) return [];

  const sources = [safeText(result.header_text), safeText(result.raw_text)].filter(Boolean);
  const candidates: Array<{ value: string; score: number }> = [];

  if (safeText(result.merchant).trim()) {
    const merchantNorm = normalizeForMatching(safeText(result.merchant));

    if (!STOP_WORDS.some((word) => merchantNorm.includes(word))) {
      candidates.push({
        value: toMerchantTitleCase(safeText(result.merchant)),
        score: 12,
      });
    }
  }

  for (const source of sources) {
    const lines = source
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 18);

    for (const [lineIndex, rawLine] of lines.entries()) {
      const norm = normalizeForMatching(rawLine);
      const cleaned = cleanMerchantLine(rawLine);

      if (!cleaned) continue;
      if (STOP_WORDS.some((word) => norm.includes(word))) continue;

      const letters = (cleaned.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []).length;
      const digits = (cleaned.match(/\d/g) || []).length;

      if (letters < 3) continue;
      if (digits > letters) continue;

      let score = 0;
      if (lineIndex <= 2) score += 20;
      else if (lineIndex <= 5) score += 12;
      else if (lineIndex <= 8) score += 6;
      else score -= 8;

      if (cleaned.length <= 40) score += 8;
      else if (cleaned.length <= 65) score += 4;

      if (cleaned === cleaned.toUpperCase() && letters >= 5) score += 8;
      if (STRONG_HINTS.some((word) => norm.includes(word))) score += 14;
      if (ADDRESS_HINTS.some((word) => norm.includes(word))) score -= 10;
      if (cleaned.includes("/")) score -= 4;
      if (digits > 0) score -= 6;

      if (score >= 2) {
        candidates.push({
          value: toMerchantTitleCase(cleaned),
          score,
        });
      }
    }
  }

  const seen = new Set<string>();

  return candidates
    .sort((a, b) => b.score - a.score)
    .map((item) => item.value)
    .filter((value) => {
      const key = normalizeForMatching(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function getOcrResultMessage(result: OCRResult, language: Language) {
  if (result.error === "NO_RECEIPT_TEXT") {
    return language === "tr"
      ? "Bu görselde okunabilir bir fiş metni bulunamadı. Lütfen gerçek bir fiş görseli yükleyin."
      : "No readable receipt text was found in this image. Please upload a real receipt image.";
  }

  if (result.error === "NO_RECEIPT_DATA") {
    return language === "tr"
      ? "Fiş bilgileri algılanamadı. Lütfen daha net bir fiş görseli yükleyin."
      : "Receipt data could not be detected. Please upload a clearer receipt image.";
  }

  return language === "tr"
    ? "Fiş okunamadı. Lütfen daha net bir görsel deneyin."
    : "Receipt could not be read. Please try a clearer image.";
}

export default function OCRPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("en");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoSave, setAutoSave] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const [form, setForm] = useState<FormState>({
    merchant: "",
    amount: "",
    date: "",
    category: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    }

    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
  }, [router]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const t = translations[language];

  const merchantCandidates = useMemo(() => {
    try {
      return extractMerchantCandidates(result);
    } catch {
      return [];
    }
  }, [result]);

  const canSave = useMemo(() => {
    const amount = normalizeAmountValue(form.amount);
    return !!(
      form.merchant.trim() &&
      form.category.trim() &&
      !Number.isNaN(amount) &&
      amount > 0
    );
  }, [form]);

  function resetPageState() {
    setResult(null);
    setFile(null);
    setIsEditing(true);

    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }

    setForm({
      merchant: "",
      amount: "",
      date: "",
      category: "",
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;

    setError("");
    setSuccess("");
    setResult(null);
    setIsEditing(true);

    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }

    setFile(selected);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  }

  async function createTransaction(payload: {
    amount: number;
    category: string;
    date?: string;
  }) {
    const transactionPayload = {
      amount: Number(payload.amount),
      type: "expense",
      category: payload.category || "Other",
      spent_at: payload.date || undefined,
      currency: "TRY",
    };

    console.log("OCR TRANSACTION REQUEST:", transactionPayload);

    const createdTransaction = await apiFetch("/transactions/", {
      method: "POST",
      body: JSON.stringify(transactionPayload),
    });

    console.log("OCR TRANSACTION CREATED:", createdTransaction);

    if (!createdTransaction) {
      throw new Error(t.ocrTransactionCreateFailed);
    }

    return createdTransaction;
  }

  async function handleUpload() {
    if (!file) {
      setError(t.ocrChooseReceiptFirst);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/ocr/scan`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data?.detail;

        if (typeof detail === "string") {
          throw new Error(detail);
        }

        if (detail?.code === "OCR_TIMEOUT") {
          throw new Error(
            language === "tr"
              ? "Fiş okuma işlemi çok uzun sürdü. Lütfen daha net bir fiş görseli deneyin."
              : "Receipt processing took too long. Please try a clearer receipt image."
          );
        }

        if (detail?.message) {
          throw new Error(detail.message);
        }

        throw new Error(t.ocrScanFailed);
      }

      const parsed: OCRResult = data;

      if (parsed.error) {
        setResult(parsed);
        setForm({
          merchant: "",
          amount: "",
          date: "",
          category: "Other",
        });
        setIsEditing(true);
        setError(getOcrResultMessage(parsed, language));
        return;
      }

      setResult(parsed);

      const bestMerchant = getBestMerchant(parsed);
      const normalizedDate = normalizeDateValue(parsed.date);

      setForm({
        merchant: bestMerchant,
        amount:
          parsed.amount !== null && parsed.amount !== undefined
            ? String(parsed.amount)
            : "",
        date: normalizedDate,
        category:
          safeText(parsed.category) && CATEGORY_OPTIONS.includes(safeText(parsed.category))
            ? safeText(parsed.category)
            : "Other",
      });

      if (autoSave) {
        const amount = parsed.amount ?? null;
        if (amount === null || amount <= 0) {
          throw new Error(t.ocrInvalidAmount);
        }

        const createdTransaction = await createTransaction({
          amount: Number(amount),
          category:
            safeText(parsed.category) && CATEGORY_OPTIONS.includes(safeText(parsed.category))
              ? safeText(parsed.category)
              : "Other",
          date: normalizedDate || undefined,
        });

        console.log("OCR AUTO SAVED TRANSACTION:", createdTransaction);
        setSuccess(t.ocrScannedAndSaved);
        setIsEditing(false);

        setTimeout(() => {
          resetPageState();
          router.push(`/transactions?refresh=${Date.now()}`);
        }, 900);
      } else {
        setSuccess(t.ocrScannedSuccess);
        setIsEditing(true);
      }
    } catch (err: any) {
      setError(err?.message || t.ocrScanFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTransaction() {
    if (!canSave) {
      setError(t.ocrFillRequired);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const createdTransaction = await createTransaction({
        amount: normalizeAmountValue(form.amount),
        category: form.category || "Other",
        date: form.date || undefined,
      });

      console.log("OCR MANUALLY SAVED TRANSACTION:", createdTransaction);
      setSuccess(t.ocrTransactionAdded);

      setTimeout(() => {
        resetPageState();
        router.push(`/transactions?refresh=${Date.now()}`);
      }, 900);
    } catch (err: any) {
      setError(err?.message || t.ocrTransactionCreateFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={heroBox}>
        <div>
          <h1 style={titleStyle}> {t.ocrTitle}</h1>
          <p style={subtitleStyle}>{t.ocrSubtitle}</p>
        </div>
        <div style={pillStyle}>{t.ocrAiParsing}</div>
      </div>

      {(error || success) && (
        <div
          style={{
            ...messageStyle,
            background: error ? "#3b0d14" : "#0f2e1d",
            borderColor: error ? "#7f1d1d" : "#166534",
            color: error ? "#fecaca" : "#bbf7d0",
          }}
        >
          {error || success}
        </div>
      )}

      <div style={mainGrid}>
        <div style={leftColumn}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>{t.ocrUploadTitle}</h2>

            <label style={uploadBox}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: 34, marginBottom: 12 }}>🧾</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                {t.ocrChooseImage}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 14 }}>
                {t.ocrImageFormats}
              </div>
            </label>

            {file && (
              <div style={fileInfoBox}>
                <div style={{ fontWeight: 700 }}>{t.ocrSelectedFile}</div>
                <div style={{ color: "#cbd5e1", marginTop: 6 }}>{file.name}</div>
              </div>
            )}

            <label style={toggleRow}>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                style={checkboxStyle}
              />
              <span style={toggleText}>{t.ocrAutoSave}</span>
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              style={{
                ...primaryButton,
                opacity: loading || !file ? 0.65 : 1,
                cursor: loading || !file ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? autoSave
                  ? t.ocrScanningAndSaving
                  : t.ocrScanning
                : autoSave
                ? t.ocrScanAndSave
                : t.ocrScanReceipt}
            </button>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>{t.ocrPreview}</h2>

            {preview ? (
              <div style={previewWrap}>
                <img src={preview} alt={t.ocrPreview} style={previewImage} />
              </div>
            ) : (
              <div style={emptyBox}>{t.ocrNoImage}</div>
            )}
          </div>
        </div>

        <div style={rightColumn}>
          <div style={confirmCardStyle}>
            <div style={confirmHeaderRow}>
              <div>
                <div style={confirmEyebrow}>{t.ocrConfirmResult}</div>
                <h2 style={confirmTitle}>{t.ocrDetectedSummary}</h2>
              </div>

              <div
                style={{
                  ...confirmStatusBadge,
                  background:
                    result?.confidence === "high"
                      ? "#0f2e1d"
                      : result?.confidence === "medium"
                      ? "#3a2a07"
                      : "#1e293b",
                  color:
                    result?.confidence === "high"
                      ? "#86efac"
                      : result?.confidence === "medium"
                      ? "#fde68a"
                      : "#cbd5e1",
                }}
              >
                {result?.confidence
                  ? `${t.ocrConfidence}: ${result.confidence}`
                  : t.ocrWaiting}
              </div>
            </div>

            {!result ? (
              <div style={emptyConfirmBox}>{t.ocrScanToSeeSummary}</div>
            ) : result.error ? (
              <div style={warnBox}>{getOcrResultMessage(result, language)}</div>
            ) : (
              <>
                {result.confidence === "low" && (
                  <div style={warnBox}>{t.ocrLowConfidenceWarning}</div>
                )}

                <div style={confirmSummaryGrid}>
                  <div style={confirmMetricCard}>
                    <div style={confirmMetricLabel}>{t.ocrMerchant}</div>
                    <input
                      value={form.merchant}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, merchant: e.target.value }))
                      }
                      placeholder={t.ocrMerchantPlaceholder}
                      style={confirmInputStyle}
                      disabled={autoSave}
                    />
                  </div>

                  <div style={confirmMetricCard}>
                    <div style={confirmMetricLabel}>{t.ocrAmount}</div>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, amount: e.target.value }))
                      }
                      placeholder={t.ocrAmountPlaceholder}
                      style={confirmInputStyle}
                      disabled={autoSave}
                    />
                  </div>

                  <div style={confirmMetricCard}>
                    <div style={confirmMetricLabel}>{t.ocrDate}</div>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, date: e.target.value }))
                      }
                      style={confirmInputStyle}
                      disabled={autoSave}
                    />
                  </div>

                  <div style={confirmMetricCard}>
                    <div style={confirmMetricLabel}>{t.ocrCategory}</div>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                      style={confirmInputStyle}
                      disabled={autoSave}
                    >
                      <option value="">{t.ocrSelectCategory}</option>
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {translateCategory(option, language)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!autoSave && (
                  <div style={confirmActionsRow}>
                    <button
                      onClick={() => setIsEditing((prev) => !prev)}
                      style={secondaryButton}
                    >
                      {isEditing ? t.ocrHideEditFields : t.ocrEditBeforeSave}
                    </button>

                    <button
                      onClick={handleCreateTransaction}
                      disabled={saving || !canSave}
                      style={{
                        ...successButton,
                        width: "auto",
                        minWidth: 190,
                        opacity: saving || !canSave ? 0.65 : 1,
                        cursor: saving || !canSave ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving ? t.ocrSaving : t.ocrConfirmAndSave}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>{t.ocrDetectedCleanResult}</h2>

            {!result ? (
              <div style={emptyBox}>{t.ocrNoParsedResult}</div>
            ) : result.error ? (
              <div style={emptyBox}>{getOcrResultMessage(result, language)}</div>
            ) : (
              <div style={summaryGrid}>
                <div style={summaryItem}>
                  <div style={summaryLabel}>{t.ocrMerchant}</div>
                  <div style={summaryValue}>{getBestMerchant(result) || "-"}</div>
                </div>

                <div style={summaryItem}>
                  <div style={summaryLabel}>{t.ocrAmount}</div>
                  <div style={summaryValue}>{result.amount ?? "-"}</div>
                </div>

                <div style={summaryItem}>
                  <div style={summaryLabel}>{t.ocrDate}</div>
                  <div style={summaryValue}>{normalizeDateValue(result.date) || "-"}</div>
                </div>

                <div style={summaryItem}>
                  <div style={summaryLabel}>{t.ocrCategory}</div>
                  <div style={summaryValue}>
                    {translateCategory(result.category || "-", language)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>{t.ocrReviewAndSave}</h2>

            {!result ? (
              <div style={emptyBox}>{t.ocrScanFirst}</div>
            ) : result.error ? (
              <div style={emptyBox}>{getOcrResultMessage(result, language)}</div>
            ) : !isEditing && !autoSave ? (
              <div style={emptyBox}>{t.ocrEditModeHidden}</div>
            ) : autoSave ? (
              <div style={emptyBox}>{t.ocrAutoSaveEnabled}</div>
            ) : (
              <>
                {merchantCandidates.length > 0 && (
                  <div style={candidateWrap}>
                    <div style={candidateTitle}>{t.ocrSuggestedMerchantValues}</div>
                    <div style={candidateList}>
                      {merchantCandidates.map((candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, merchant: candidate }))
                          }
                          style={candidateChip}
                        >
                          {candidate}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={formGroup}>
                  <label style={labelStyle}>{t.ocrMerchant}</label>
                  <input
                    value={form.merchant}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, merchant: e.target.value }))
                    }
                    placeholder={t.ocrMerchantPlaceholder}
                    style={inputStyle}
                  />
                </div>

                <div style={formRow}>
                  <div style={formGroup}>
                    <label style={labelStyle}>{t.ocrAmount}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, amount: e.target.value }))
                      }
                      placeholder={t.ocrAmountPlaceholder}
                      style={inputStyle}
                    />
                  </div>

                  <div style={formGroup}>
                    <label style={labelStyle}>{t.ocrDate}</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, date: e.target.value }))
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={formGroup}>
                  <label style={labelStyle}>{t.ocrCategory}</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    <option value="">{t.ocrSelectCategory}</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {translateCategory(option, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreateTransaction}
                  disabled={saving || !canSave}
                  style={{
                    ...successButton,
                    opacity: saving || !canSave ? 0.65 : 1,
                    cursor: saving || !canSave ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? t.ocrSaving : t.ocrAddAsTransaction}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f17",
  color: "#f3f4f6",
  padding: 32,
};

const heroBox: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 40,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#9ca3af",
  fontSize: 17,
  lineHeight: 1.6,
  maxWidth: 760,
};

const pillStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #263042",
  color: "#93c5fd",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 700,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const messageStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 20,
  fontWeight: 600,
};

const warnBox: React.CSSProperties = {
  background: "#3a2a07",
  border: "1px solid #a16207",
  color: "#fde68a",
  borderRadius: 14,
  padding: "12px 14px",
  marginBottom: 16,
  fontWeight: 600,
};

const mainGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.15fr",
  gap: 24,
};

const leftColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const rightColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const confirmCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(22,163,74,0.08))",
  border: "1px solid #263042",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 18,
  fontSize: 24,
  fontWeight: 700,
};

const uploadBox: React.CSSProperties = {
  display: "block",
  border: "2px dashed #334155",
  borderRadius: 18,
  padding: "34px 20px",
  textAlign: "center",
  background: "#0f172a",
  cursor: "pointer",
  marginBottom: 18,
};

const fileInfoBox: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 14,
  marginBottom: 16,
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 12,
  padding: "12px 14px",
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  cursor: "pointer",
};

const toggleText: React.CSSProperties = {
  color: "#e5e7eb",
  fontWeight: 600,
  fontSize: 14,
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 800,
  fontSize: 15,
};

const successButton: React.CSSProperties = {
  width: "100%",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 800,
  fontSize: 15,
};

const secondaryButton: React.CSSProperties = {
  background: "#1f2937",
  color: "#fff",
  border: "1px solid #374151",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const previewWrap: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #263042",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: 340,
};

const previewImage: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: 520,
  borderRadius: 12,
  objectFit: "contain",
};

const emptyBox: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #263042",
  borderRadius: 16,
  padding: 24,
  color: "#94a3b8",
};

const emptyConfirmBox: React.CSSProperties = {
  background: "rgba(15,23,42,0.7)",
  border: "1px solid #263042",
  borderRadius: 16,
  padding: 24,
  color: "#cbd5e1",
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const summaryItem: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 16,
};

const summaryLabel: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 8,
  fontWeight: 600,
};

const summaryValue: React.CSSProperties = {
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 700,
  wordBreak: "break-word",
};

const formRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const formGroup: React.CSSProperties = {
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "#cbd5e1",
  fontWeight: 600,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#161d2b",
  color: "#f3f4f6",
  fontSize: 15,
};

const confirmHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 18,
};

const confirmEyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#93c5fd",
  marginBottom: 6,
};

const confirmTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "#f8fafc",
};

const confirmStatusBadge: React.CSSProperties = {
  borderRadius: 999,
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const confirmSummaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginBottom: 18,
};

const confirmMetricCard: React.CSSProperties = {
  background: "rgba(15,23,42,0.75)",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const confirmMetricLabel: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const confirmMetricValue: React.CSSProperties = {
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 800,
  wordBreak: "break-word",
};

const confirmInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
};

const confirmActionsRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const candidateWrap: React.CSSProperties = {
  marginBottom: 16,
  background: "#0f172a",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 14,
};

const candidateTitle: React.CSSProperties = {
  color: "#cbd5e1",
  fontWeight: 700,
  marginBottom: 10,
  fontSize: 14,
};

const candidateList: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const candidateChip: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#e2e8f0",
  borderRadius: 999,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};