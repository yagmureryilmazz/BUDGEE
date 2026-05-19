import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL, apiPost, getToken } from "@/services/api";
import * as ImagePicker from "expo-image-picker";
import { useLanguage, Language } from "@/context/LanguageContext";



type OCRResult = {
  merchant?: string | null;
  amount?: number | null;
  date?: string | null;
  category?: string | null;
  error?: string | null;
  message?: string | null;
};

type FormState = {
  merchant: string;
  amount: string;
  date: string;
  category: string;
};

const copy = {
  tr: {
    eyebrow: "BUDGEE MOBILE",
    title: "OCR Scanner",
    subtitle: "Fiş görselini yükle, alanları kontrol et ve kaydetmeden önce düzenle.",
    uploadTitle: "Fiş Yükle",
    chooseReceipt: "Fiş görseli seç",
    chooseReceiptHint: "Daha iyi OCR için fişi net ve düz seç.",
    tapToChange: "Değiştirmek için dokun",
    selectedFile: "Seçilen dosya",
    pickGallery: "Galeriden Seç",
    scanReceipt: "Fişi Oku",
    reading: "Fiş okunuyor...",
    editResult: "Sonucu Düzenle",
    emptyResult: "Fiş okunduktan sonra düzenleme alanları burada görünecek.",
    merchant: "İşletme",
    merchantPlaceholder: "İşletme adı",
    amount: "Tutar",
    date: "Tarih",
    category: "Kategori",
    saveAsTransaction: "Transaction Olarak Kaydet",
    saving: "Kaydediliyor...",
    permissionTitle: "İzin gerekli",
    galleryPermission: "Galeri izni vermelisin.",
    chooseImageWarning: "Önce bir fiş görseli seçmelisin.",
    ocrFailed: "OCR başarısız oldu.",
    invalidAmount: "Geçerli bir tutar girmelisin.",
    saveFailed: "Kaydedilemedi.",
    successTitle: "Başarılı",
    successMessage: "Transaction kaydedildi.",
    errorTitle: "Hata",
    warningTitle: "Uyarı",
    ok: "Tamam",
    categorySuggestion: "Kategori önerisi",
    confidenceHint: "OCR sonucu otomatik dolduruldu. Kaydetmeden önce kontrol edebilirsin.",
    retry: "Tekrar Dene",
    scanAgain: "Yeni Fiş Tara",
    scanningTitle: "Fiş analiz ediliyor",
    scanningText: "Tutar, tarih ve kategori bilgilerini çıkarmaya çalışıyorum.",
    successHint: "Harika! İşlem listene eklendi.",
    suggestionStrong: "Önerilen kategori",
    suggestionLow: "Emin değilsen kategoriyi aşağıdan değiştirebilirsin.",
  },
  en: {
    eyebrow: "BUDGEE MOBILE",
    title: "OCR Scanner",
    subtitle: "Upload a receipt image, review the fields, and edit before saving.",
    uploadTitle: "Upload Receipt",
    chooseReceipt: "Choose receipt image",
    chooseReceiptHint: "For better OCR, use a clear and straight receipt photo.",
    tapToChange: "Tap to change",
    selectedFile: "Selected file",
    pickGallery: "Pick from Gallery",
    scanReceipt: "Read Receipt",
    reading: "Reading receipt...",
    editResult: "Edit Result",
    emptyResult: "Editable fields will appear here after the receipt is read.",
    merchant: "Merchant",
    merchantPlaceholder: "Merchant name",
    amount: "Amount",
    date: "Date",
    category: "Category",
    saveAsTransaction: "Save as Transaction",
    saving: "Saving...",
    permissionTitle: "Permission required",
    galleryPermission: "You need to allow gallery access.",
    chooseImageWarning: "Choose a receipt image first.",
    ocrFailed: "OCR failed.",
    invalidAmount: "Please enter a valid amount.",
    saveFailed: "Could not save.",
    successTitle: "Success",
    successMessage: "Transaction saved.",
    errorTitle: "Error",
    warningTitle: "Warning",
    ok: "OK",
    categorySuggestion: "Category suggestion",
    confidenceHint: "The OCR result was filled automatically. You can review it before saving.",
    retry: "Retry",
    scanAgain: "Scan New Receipt",
    scanningTitle: "Analyzing receipt",
    scanningText: "I am trying to extract amount, date, and category details.",
    successHint: "Great! It has been added to your transactions.",
    suggestionStrong: "Suggested category",
    suggestionLow: "You can change the category below if it does not look right.",
  },
};

const categoryOptions = [
  "Other",
  "Food",
  "Shopping",
  "Market",
  "Transport",
  "Entertainment",
  "Health",
  "Education",
  "Bills",
  "Rent",
];

function normalizeDate(value?: string | null) {
  if (!value) return "";

  const text = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const fullYearMatch = text.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (fullYearMatch) {
    return `${fullYearMatch[3]}-${fullYearMatch[2]}-${fullYearMatch[1]}`;
  }

  const shortYearMatch = text.match(/(\d{2})[./-](\d{2})[./-](\d{2})/);
  if (shortYearMatch) {
    const yearNumber = Number(shortYearMatch[3]);
    const fullYear = yearNumber >= 70 ? `19${shortYearMatch[3]}` : `20${shortYearMatch[3]}`;
    return `${fullYear}-${shortYearMatch[2]}-${shortYearMatch[1]}`;
  }

  return "";
}

function normalizeImageFileName(name: string) {
  const cleanName = name.trim().toLowerCase();

  if (cleanName.endsWith(".heic") || cleanName.endsWith(".heif")) {
    return "receipt.jpg";
  }

  if (cleanName.endsWith(".jpg") || cleanName.endsWith(".jpeg") || cleanName.endsWith(".png")) {
    return name;
  }

  return "receipt.jpg";
}

function getImageMimeType(name: string) {
  const cleanName = name.trim().toLowerCase();

  if (cleanName.endsWith(".png")) return "image/png";

  return "image/jpeg";
}

function normalizeAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

function translateCategory(category: string | null | undefined, language: Language) {
  const value = (category || "Other").trim();

  if (language === "en") return value;

  const map: Record<string, string> = {
    Other: "Diğer",
    Shopping: "Alışveriş",
    Food: "Yemek",
    Entertainment: "Eğlence",
    Transport: "Ulaşım",
    Transportation: "Ulaşım",
    Health: "Sağlık",
    Education: "Eğitim",
    Bills: "Faturalar",
    Rent: "Kira",
    Market: "Market",
    Grocery: "Market",
    Groceries: "Market",
    Restaurant: "Restoran",
    Cafe: "Kafe",
  };

  return map[value] || value;
}

export default function OCRScreen() {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState("receipt.jpg");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [form, setForm] = useState<FormState>({
    merchant: "",
    amount: "",
    date: "",
    category: "Other",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [loading, pulseAnim]);

  useEffect(() => {
    if (!successVisible) {
      successScale.setValue(0.8);
      successOpacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successVisible, successOpacity, successScale]);

  function resetOCRForm() {
    setResult(null);
    setForm({
      merchant: "",
      amount: "",
      date: "",
      category: "Other",
    });
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setWarningMessage(t.galleryPermission);
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });

    if (!res.canceled) {
      const asset = res.assets[0];
      setImageUri(asset.uri);
      setFileName(normalizeImageFileName(asset.fileName || "receipt.jpg"));
      resetOCRForm();
    }
  }

  async function scanReceipt() {
    if (!imageUri) {
      setWarningMessage(t.chooseImageWarning);
      return;
    }

    setLoading(true);
    setWarningMessage("");
    setResult(null);

    try {
      const token = await getToken();

      const formData = new FormData();
      const uploadName = normalizeImageFileName(fileName);

      formData.append("file", {
        uri: imageUri,
        name: uploadName,
        type: getImageMimeType(uploadName),
      } as any);

      const res = await fetch(`${API_URL}/ocr/scan`, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            }
          : {
              Accept: "application/json",
            },
        body: formData,
      });

      const data: OCRResult & { detail?: any } = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        const detail = data.detail;

        if (typeof detail === "string") {
          throw new Error(detail);
        }

        if (detail?.message) {
          throw new Error(detail.message);
        }

        if (data.message) {
          throw new Error(data.message);
        }

        throw new Error(t.ocrFailed);
      }

      setResult(data);
      setForm({
        merchant: data.merchant || "",
        amount: data.amount !== null && data.amount !== undefined ? String(data.amount) : "",
        date: normalizeDate(data.date),
        category: categoryOptions.includes(data.category || "") ? data.category || "Other" : "Other",
      });
    } catch (err: any) {
      setWarningMessage(err?.message || t.ocrFailed);
    } finally {
      setLoading(false);
    }
  }

  async function saveTransaction() {
    const amount = normalizeAmount(form.amount);

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setWarningMessage(t.invalidAmount);
      return;
    }

    setSaving(true);
    setWarningMessage("");

    try {
      await apiPost(
        "/transactions/",
        {
          amount,
          type: "expense",
          category: form.category || "Other",
          spent_at: form.date || undefined,
        },
        true
      );

      setSuccessVisible(true);
      setImageUri(null);
      setFileName("receipt.jpg");
      resetOCRForm();
    } catch (err: any) {
      setWarningMessage(err?.message || t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{t.eyebrow}</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          <View style={styles.languageSwitch}>
            <TouchableOpacity
              onPress={() => setLanguage("tr")}
              style={[styles.languageButton, language === "tr" && styles.languageButtonActive]}
            >
              <Text style={[styles.languageText, language === "tr" && styles.languageTextActive]}>TR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage("en")}
              style={[styles.languageButton, language === "en" && styles.languageButtonActive]}
            >
              <Text style={[styles.languageText, language === "en" && styles.languageTextActive]}>EN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.uploadTitle}</Text>

          <TouchableOpacity style={styles.uploadBox} onPress={pickImage} activeOpacity={0.88}>
            {imageUri ? (
              <View style={styles.imageWrap}>
                <Image source={{ uri: imageUri }} style={styles.image} />
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageOverlayText}>{t.tapToChange}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyIcon}>🧾</Text>
                <Text style={styles.emptyTitle}>{t.chooseReceipt}</Text>
                <Text style={styles.emptyText}>{t.chooseReceiptHint}</Text>
              </View>
            )}
          </TouchableOpacity>

          {imageUri && (
            <View style={styles.fileBox}>
              <Text style={styles.fileLabel}>{t.selectedFile}</Text>
              <Text style={styles.fileName}>{fileName}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={pickImage}>
              <Text style={styles.secondaryButtonText}>{t.pickGallery}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, (!imageUri || loading) && styles.disabledButton]}
            onPress={scanReceipt}
            disabled={!imageUri || loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.buttonText}>{t.reading}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>{result ? t.retry : t.scanReceipt}</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading && (
          <Animated.View style={[styles.scanningCard, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.scanningIconBox}>
              <ActivityIndicator color="#60a5fa" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanningTitle}>{t.scanningTitle}</Text>
              <Text style={styles.scanningText}>{t.scanningText}</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.editResult}</Text>

          {!result ? (
            <View style={styles.emptyResult}>
              <Text style={styles.emptyText}>{t.emptyResult}</Text>
            </View>
          ) : (
            <>
              <View style={styles.aiHintBox}>
                <View style={styles.aiHintIconBox}>
                  <Text style={styles.aiHintIcon}>🧠</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiHintTitle}>{t.categorySuggestion}</Text>
                  <View style={styles.suggestionPill}>
                    <Text style={styles.suggestionPillLabel}>{t.suggestionStrong}</Text>
                    <Text style={styles.suggestionPillValue}>{translateCategory(form.category, language)}</Text>
                  </View>
                  <Text style={styles.aiHintText}>{t.suggestionLow}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.merchant}</Text>
                <TextInput
                  value={form.merchant}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, merchant: text }))}
                  placeholder={t.merchantPlaceholder}
                  placeholderTextColor="#64748b"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t.amount}</Text>
                  <TextInput
                    value={form.amount}
                    onChangeText={(text) =>
                      setForm((prev) => ({ ...prev, amount: text.replace(/[^0-9.,]/g, "") }))
                    }
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t.date}</Text>
                  <TextInput
                    value={form.date}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.category}</Text>
                <View style={styles.categoryChips}>
                  {categoryOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setForm((prev) => ({ ...prev, category: item }))}
                      style={[styles.categoryChip, form.category === item && styles.categoryChipActive]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          form.category === item && styles.categoryChipTextActive,
                        ]}
                      >
                        {translateCategory(item, language)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={saveTransaction}
                disabled={saving}
              >
                {saving ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.buttonText}>{t.saving}</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{t.saveAsTransaction}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={scanReceipt}
                disabled={loading || !imageUri}
              >
                <Text style={styles.retryButtonText}>{t.retry}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={warningMessage.length > 0} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>{t.errorTitle}</Text>
            <Text style={styles.modalText}>{warningMessage}</Text>

            <TouchableOpacity style={styles.warningOkButton} onPress={() => setWarningMessage("")}>
              <Text style={styles.modalButtonText}>{t.ok}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={successVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.successModalCard,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={styles.successIconCircle}>
              <Text style={styles.modalIcon}>✅</Text>
            </View>
            <Text style={styles.modalTitle}>{t.successTitle}</Text>
            <Text style={styles.modalText}>{t.successMessage}</Text>
            <Text style={styles.successHintText}>{t.successHint}</Text>

            <TouchableOpacity style={styles.successOkButton} onPress={() => setSuccessVisible(false)}>
              <Text style={styles.modalButtonText}>{t.scanAgain}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0f17",
  },
  container: {
    flex: 1,
    backgroundColor: "#0b0f17",
  },
  content: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 150,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  languageSwitch: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 999,
    padding: 3,
  },
  languageButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  languageButtonActive: {
    backgroundColor: "#2563eb",
  },
  languageText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "900",
  },
  languageTextActive: {
    color: "#fff",
  },
  eyebrow: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 280,
    backgroundColor: "#0f172a",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  imageOverlayText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyPreview: {
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderWidth: 1,
    borderColor: "#263042",
    borderStyle: "dashed",
    borderRadius: 18,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  fileBox: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  fileLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5,
  },
  fileName: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#e5e7eb",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  saveButton: {
    width: "100%",
    backgroundColor: "#16a34a",
    padding: 15,
    borderRadius: 14,
    marginTop: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
  },
  scanningCard: {
    backgroundColor: "rgba(96,165,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.32)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scanningIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    justifyContent: "center",
    alignItems: "center",
  },
  scanningTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  scanningText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyResult: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 16,
    padding: 22,
  },
  aiHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(96,165,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  aiHintIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiHintIcon: {
    fontSize: 22,
  },
  aiHintTitle: {
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3,
  },
  aiHintText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  suggestionPill: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.32)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  suggestionPillLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 2,
  },
  suggestionPillValue: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "900",
  },
  retryButton: {
    width: "100%",
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#e5e7eb",
    fontWeight: "900",
  },
  inputGroup: {
    marginBottom: 13,
  },
  label: {
    color: "#cbd5e1",
    fontWeight: "800",
    marginBottom: 8,
    fontSize: 13,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    padding: 14,
    color: "#f8fafc",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  categoryChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  categoryChipText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  warningModalCard: {
    width: "100%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.35)",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  successModalCard: {
    width: "100%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.16)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.38)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  successHintText: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: -10,
    marginBottom: 18,
  },
  modalIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  modalText: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  warningOkButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  successOkButton: {
    width: "100%",
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
});