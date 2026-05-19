"use client";

import { useEffect, useState } from "react";
import { ChevronDown, DollarSign, Euro } from "lucide-react";
import { translations, Language } from "../../lib/translations";

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    type ConvertResult = {
      amount: number;
      from_currency: string;
      to_currency: string;
      rate: number;
      converted_amount: number;
      date: string | null;
    };

function getCurrencyIcon(code: string) {
  if (code === "USD") return <DollarSign size={18} />;
  if (code === "EUR") return <Euro size={18} />;
  return <span style={currencySymbolIcon}>₺</span>;
}

    export default function CurrencyConverterPage() {
      const [language, setLanguage] = useState<Language>("en");
      const [amount, setAmount] = useState("");
      const [fromCurrency, setFromCurrency] = useState("TRY");
      const [toCurrency, setToCurrency] = useState("USD");
      const [fromMenuOpen, setFromMenuOpen] = useState(false);
      const [toMenuOpen, setToMenuOpen] = useState(false);
      const [result, setResult] = useState<ConvertResult | null>(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState("");
      const [success, setSuccess] = useState("");

      useEffect(() => {
        const savedLanguage = localStorage.getItem("language") as Language | null;
        if (savedLanguage === "en" || savedLanguage === "tr") {
          setLanguage(savedLanguage);
        }
      }, []);

      const t = translations[language];

      const currencyOptions =
        language === "tr"
          ? [
              { code: "TRY", label: "Türk Lirası (TRY)" },
              { code: "USD", label: "Amerikan Doları (USD)" },
              { code: "EUR", label: "Euro (EUR)" },
            ]
          : [
              { code: "TRY", label: "Turkish Lira (TRY)" },
              { code: "USD", label: "US Dollar (USD)" },
              { code: "EUR", label: "Euro (EUR)" },
            ];

      function getCurrencyLabel(code: string) {
        return currencyOptions.find((currency) => currency.code === code)?.label || code;
      }

      function selectFromCurrency(code: string) {
        setFromCurrency(code);
        setFromMenuOpen(false);
        setResult(null);
        setError("");
        setSuccess("");
      }

      function selectToCurrency(code: string) {
        setToCurrency(code);
        setToMenuOpen(false);
        setResult(null);
        setError("");
        setSuccess("");
      }

      async function handleConvert() {
        setError("");
        setSuccess("");
        setResult(null);

        const numericAmount = Number(amount);

        if (!amount.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
          setError(t.currencyEnterValidAmount);
          return;
        }

        try {
          setLoading(true);

          const res = await fetch(
            `${API_BASE_URL}/currency/convert?amount=${numericAmount}&from_currency=${fromCurrency}&to_currency=${toCurrency}`
          );

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data?.detail || t.currencyFailed);
          }

          setResult(data);
        } catch (err: any) {
          setError(err?.message || t.currencyFailed);
        } finally {
          setLoading(false);
        }
      }


      function handleSwap() {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
        setFromMenuOpen(false);
        setToMenuOpen(false);
        setResult(null);
        setError("");
        setSuccess("");
      }

      return (
        <div style={pageStyle}>
          <div style={cardStyle}>
            <div style={headerRow}>
              <div>
                <h1 style={titleStyle}>{t.currencyTitle}</h1>
                <p style={subtitleStyle}>{t.currencySubtitle}</p>
              </div>
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

            <div style={formGroup}>
              <label style={labelStyle}>{t.currencyAmount}</label>
              <input
                type="number"
                placeholder={t.currencyAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={currencyGrid}>
              <div style={formGroup}>
                <label style={labelStyle}>{t.currencyFrom}</label>
                <div style={customSelectWrap}>
                  <button
                    type="button"
                    style={customSelectButton}
                    onClick={() => {
                      setFromMenuOpen((prev) => !prev);
                      setToMenuOpen(false);
                    }}
                  >
                    <span style={customSelectLeft}>{getCurrencyIcon(fromCurrency)}</span>
                    <span style={customSelectValue}>{getCurrencyLabel(fromCurrency)}</span>
                    <ChevronDown size={16} style={customSelectChevron} />
                  </button>

                  {fromMenuOpen && (
                    <div style={customSelectMenu}>
                      {currencyOptions.map((currency) => (
                        <button
                          type="button"
                          key={currency.code}
                          style={{
                            ...customSelectOption,
                            ...(fromCurrency === currency.code ? customSelectOptionActive : {}),
                          }}
                          onClick={() => selectFromCurrency(currency.code)}
                        >
                          <span style={customSelectOptionCheck}>
                            {fromCurrency === currency.code ? "✓" : ""}
                          </span>
                          <span style={customSelectOptionIcon}>{getCurrencyIcon(currency.code)}</span>
                          <span>{currency.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={swapWrapper}>
                <button onClick={handleSwap} style={swapButtonStyle} type="button">
                  ⇄
                </button>
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>{t.currencyTo}</label>
                <div style={customSelectWrap}>
                  <button
                    type="button"
                    style={customSelectButton}
                    onClick={() => {
                      setToMenuOpen((prev) => !prev);
                      setFromMenuOpen(false);
                    }}
                  >
                    <span style={customSelectLeft}>{getCurrencyIcon(toCurrency)}</span>
                    <span style={customSelectValue}>{getCurrencyLabel(toCurrency)}</span>
                    <ChevronDown size={16} style={customSelectChevron} />
                  </button>

                  {toMenuOpen && (
                    <div style={customSelectMenu}>
                      {currencyOptions.map((currency) => (
                        <button
                          type="button"
                          key={currency.code}
                          style={{
                            ...customSelectOption,
                            ...(toCurrency === currency.code ? customSelectOptionActive : {}),
                          }}
                          onClick={() => selectToCurrency(currency.code)}
                        >
                          <span style={customSelectOptionCheck}>
                            {toCurrency === currency.code ? "✓" : ""}
                          </span>
                          <span style={customSelectOptionIcon}>{getCurrencyIcon(currency.code)}</span>
                          <span>{currency.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleConvert}
              disabled={loading}
              style={{
                ...buttonStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? t.currencyConverting : t.currencyConvert}
            </button>

            {result && (
              <div style={resultCardStyle}>
                <div style={resultTitleStyle}>{t.currencyResult}</div>

                <div style={resultRowStyle}>
                  <span style={resultLabelStyle}>{t.currencyInput}</span>
                  <span style={resultValueStyle}>
                    {result.amount} {result.from_currency}
                  </span>
                </div>

                <div style={resultRowStyle}>
                  <span style={resultLabelStyle}>{t.currencyOutput}</span>
                  <span style={resultValueStyle}>
                    {result.converted_amount} {result.to_currency}
                  </span>
                </div>

                <div style={resultRowStyle}>
                  <span style={resultLabelStyle}>{t.currencyRate}</span>
                  <span style={resultValueStyle}>
                    1 {result.from_currency} = {result.rate} {result.to_currency}
                  </span>
                </div>

                <div style={resultRowStyle}>
                  <span style={resultLabelStyle}>{t.currencyDate}</span>
                  <span style={resultValueStyle}>{result.date || "-"}</span>
                </div>

              </div>
            )}
          </div>
        </div>
      );
    }

    const pageStyle: React.CSSProperties = {
      minHeight: "100vh",
      background: "#0b0f17",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    };

    const cardStyle: React.CSSProperties = {
      width: "100%",
      maxWidth: 720,
      background: "#111827",
      border: "1px solid #1f2937",
      borderRadius: 22,
      padding: 28,
      boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
      color: "#f9fafb",
    };

    const headerRow: React.CSSProperties = {
      marginBottom: 24,
    };

    const titleStyle: React.CSSProperties = {
      margin: 0,
      fontSize: 34,
      fontWeight: 800,
    };

    const subtitleStyle: React.CSSProperties = {
      marginTop: 10,
      color: "#9ca3af",
      fontSize: 15,
      lineHeight: 1.6,
    };

    const formGroup: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: "100%",
    };

    const labelStyle: React.CSSProperties = {
      fontSize: 14,
      fontWeight: 600,
      color: "#d1d5db",
    };

    const inputStyle: React.CSSProperties = {
      width: "100%",
      boxSizing: "border-box",
      padding: "14px 16px",
      borderRadius: 12,
      border: "1px solid #374151",
      background: "#0f172a",
      color: "#f9fafb",
      fontSize: 15,
    };

    const customSelectWrap: React.CSSProperties = {
      position: "relative",
      width: "100%",
      zIndex: 40,
    };

    const customSelectButton: React.CSSProperties = {
      width: "100%",
      boxSizing: "border-box",
      minHeight: 50,
      padding: "14px 42px 14px 44px",
      borderRadius: 12,
      border: "1px solid #374151",
      background:
        "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(17,24,39,0.98))",
      color: "#f9fafb",
      fontSize: 15,
      outline: "none",
      display: "flex",
      alignItems: "center",
      textAlign: "left",
      cursor: "pointer",
      boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
    };

    const customSelectLeft: React.CSSProperties = {
      position: "absolute",
      left: 14,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#93c5fd",
      display: "flex",
      alignItems: "center",
    };

    const customSelectValue: React.CSSProperties = {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    };

    const customSelectChevron: React.CSSProperties = {
      position: "absolute",
      right: 14,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#94a3b8",
      pointerEvents: "none",
    };

    const customSelectMenu: React.CSSProperties = {
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      right: 0,
      zIndex: 120,
      maxHeight: 260,
      overflowY: "auto",
      background:
        "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
      border: "1px solid rgba(59,130,246,0.22)",
      borderRadius: 16,
      padding: 8,
      boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
    };

    const customSelectOption: React.CSSProperties = {
      width: "100%",
      border: "none",
      borderRadius: 12,
      background: "transparent",
      color: "#dbeafe",
      padding: "11px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 14,
      fontWeight: 800,
      textAlign: "left",
      cursor: "pointer",
    };

    const customSelectOptionActive: React.CSSProperties = {
      background:
        "linear-gradient(135deg, rgba(37,99,235,0.55), rgba(59,130,246,0.32))",
      color: "#fff",
      boxShadow: "inset 0 0 0 1px rgba(147,197,253,0.18)",
    };

    const customSelectOptionCheck: React.CSSProperties = {
      width: 18,
      color: "#93c5fd",
      fontWeight: 900,
      flexShrink: 0,
    };

const customSelectOptionIcon: React.CSSProperties = {
  width: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#93c5fd",
  flexShrink: 0,
};

const currencySymbolIcon: React.CSSProperties = {
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#93c5fd",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1,
};

    const currencyGrid: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      gap: 14,
      alignItems: "end",
      marginTop: 16,
      marginBottom: 20,
    };

    const swapWrapper: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 2,
    };

    const swapButtonStyle: React.CSSProperties = {
      width: 52,
      height: 52,
      borderRadius: 14,
      border: "1px solid #374151",
      background: "#1f2937",
      color: "#fff",
      fontSize: 22,
      fontWeight: 700,
      cursor: "pointer",
    };

    const buttonStyle: React.CSSProperties = {
      width: "100%",
      marginTop: 8,
      padding: "14px 18px",
      borderRadius: 12,
      border: "none",
      background: "#2563eb",
      color: "#fff",
      fontSize: 16,
      fontWeight: 800,
    };


    const resultCardStyle: React.CSSProperties = {
      marginTop: 24,
      borderRadius: 18,
      border: "1px solid #243244",
      background: "#0f172a",
      padding: 20,
    };

    const resultTitleStyle: React.CSSProperties = {
      fontSize: 20,
      fontWeight: 800,
      marginBottom: 18,
    };

    const resultRowStyle: React.CSSProperties = {
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      padding: "10px 0",
      borderBottom: "1px solid #1f2937",
    };

    const resultLabelStyle: React.CSSProperties = {
      color: "#9ca3af",
      fontWeight: 600,
    };

    const resultValueStyle: React.CSSProperties = {
      color: "#f9fafb",
      fontWeight: 700,
      textAlign: "right",
    };

    const messageStyle: React.CSSProperties = {
      border: "1px solid",
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 16,
      fontWeight: 600,
    };