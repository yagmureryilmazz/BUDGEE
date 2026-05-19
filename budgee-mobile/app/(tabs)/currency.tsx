import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeftRight } from "lucide-react-native";
import { Picker } from "@react-native-picker/picker";
import { useLanguage, Language } from "@/context/LanguageContext";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

type ConvertResult = {
  amount: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  converted_amount: number;
  date: string | null;
};


export default function CurrencyScreen() {
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("TRY");
  const [toCurrency, setToCurrency] = useState("USD");

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<ConvertResult | null>(null);

  const [error, setError] = useState("");
  const { language, setLanguage } = useLanguage();

  const currencyOptions = [
    {
      code: "TRY",
      label: "Türk Lirası",
    },
    {
      code: "USD",
      label: "US Dollar",
    },
    {
      code: "EUR",
      label: "Euro",
    },
  ];

  const t = {
    tr: {
      badge: "BUDGEE MOBILE",
      title: "Döviz Çevirici",
      subtitle: "Canlı kur ile hızlı dönüşüm yap.",
      amount: "Tutar",
      source: "Kaynak",
      target: "Hedef",
      convert: "Çevir",
      converting: "Çevriliyor...",
      result: "Dönüşüm Sonucu",
      input: "Girilen",
      output: "Sonuç",
      rate: "Kur",
      date: "Tarih",
      invalid: "Geçerli bir tutar gir.",
      failed: "Döviz bilgisi alınamadı.",
      networkFailed:
        "Backend bağlantısı kurulamadı. Backend açık mı ve EXPO_PUBLIC_API_BASE_URL doğru mu?",
    },
    en: {
      badge: "BUDGEE MOBILE",
      title: "Currency Converter",
      subtitle: "Convert currencies instantly with live exchange rates.",
      amount: "Amount",
      source: "From",
      target: "To",
      convert: "Convert",
      converting: "Converting...",
      result: "Conversion Result",
      input: "Input",
      output: "Output",
      rate: "Rate",
      date: "Date",
      invalid: "Enter a valid amount.",
      failed: "Could not fetch currency data.",
      networkFailed:
        "Could not connect to backend. Is the backend running and is EXPO_PUBLIC_API_BASE_URL correct?",
    },
  };

  async function handleConvert() {
    setError("");
    setResult(null);

    const numericAmount = Number(amount.replace(",", ".").trim());

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError(t[language].invalid);
      return;
    }

    try {
      setLoading(true);

      if (!API_BASE_URL) {
        throw new Error(t[language].networkFailed);
      }

      const query = new URLSearchParams({
        amount: String(numericAmount),
        from_currency: fromCurrency,
        to_currency: toCurrency,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${API_BASE_URL}/currency/convert?${query.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = data?.detail;
        const message =
          typeof detail === "string"
            ? detail
            : detail?.message || data?.message || t[language].failed;

        throw new Error(message);
      }

      setResult(data);
    } catch (err: any) {
      const message = String(err?.message || "");

      if (
        message.includes("Network request failed") ||
        message.includes("Failed to fetch") ||
        err?.name === "AbortError"
      ) {
        setError(t[language].networkFailed);
      } else {
        setError(message || t[language].failed);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);

    setResult(null);
    setError("");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#111827", "#0f172a"]}
          style={styles.card}
        >
          <View style={styles.topBar}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.badgeText}>
                {t[language].badge}
              </Text>

              <Text style={styles.title}>
                {t[language].title}
              </Text>

              <Text style={styles.subtitle}>
                {t[language].subtitle}
              </Text>
            </View>

            <View style={styles.languageSwitch}>
              <TouchableOpacity
                onPress={() => setLanguage("tr")}
                style={[
                  styles.languageButton,
                  language === "tr" && styles.languageButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    language === "tr" && styles.languageButtonTextActive,
                  ]}
                >
                  TR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setLanguage("en")}
                style={[
                  styles.languageButton,
                  language === "en" && styles.languageButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    language === "en" && styles.languageButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t[language].amount}</Text>

            <TextInput
              placeholder="0.00"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
            />
          </View>

          <View style={styles.currencyRow}>
            <View style={styles.currencyBox}>
              <Text style={styles.label}>{t[language].source}</Text>

              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={fromCurrency}
                  onValueChange={(itemValue) =>
                    setFromCurrency(itemValue)
                  }
                  dropdownIconColor="#fff"
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {currencyOptions.map((currency) => (
                    <Picker.Item
                      key={currency.code}
                      label={`${currency.label} (${currency.code})`}
                      value={currency.code}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwap}
            >
              <ArrowLeftRight size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.currencyBox}>
              <Text style={styles.label}>{t[language].target}</Text>

              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={toCurrency}
                  onValueChange={(itemValue) =>
                    setToCurrency(itemValue)
                  }
                  dropdownIconColor="#fff"
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {currencyOptions.map((currency) => (
                    <Picker.Item
                      key={currency.code}
                      label={`${currency.label} (${currency.code})`}
                      value={currency.code}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.convertButton}
            onPress={handleConvert}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.convertButtonText}>
                {t[language].convert}
              </Text>
            )}
          </TouchableOpacity>

          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                {t[language].result}
              </Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>
                  {t[language].input}
                </Text>

                <Text style={styles.resultValue}>
                  {result.amount} {result.from_currency}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>
                  {t[language].output}
                </Text>

                <Text style={styles.resultValue}>
                  {result.converted_amount} {result.to_currency}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>
                  {t[language].rate}
                </Text>

                <Text style={styles.resultValue}>
                  1 {result.from_currency} = {result.rate} {result.to_currency}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>
                  {t[language].date}
                </Text>

                <Text style={styles.resultValue}>
                  {result.date || "-"}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 120,
    justifyContent: "center",
  },

  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  header: {
    marginBottom: 26,
  },

  topBar: {
    position: "relative",
    marginBottom: 28,
  },

  headerTextBlock: {
    width: "100%",
    paddingRight: 118,
  },

  badgeText: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },

  languageSwitch: {
    position: "absolute",
    top: -6,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1e293b",
    zIndex: 10,
  },

  languageButton: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },

  languageButtonActive: {
    backgroundColor: "#2563eb",
  },

  languageButtonText: {
    color: "#94a3b8",
    fontWeight: "800",
    fontSize: 12,
  },

  languageButtonTextActive: {
    color: "#fff",
  },

  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
  },

  inputContainer: {
    marginBottom: 22,
  },

  label: {
    color: "#cbd5e1",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: "#fff",
    fontSize: 18,
  },

  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  currencyBox: {
    flex: 1,
  },

  pickerWrapper: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 18,
    overflow: "hidden",
  },

  picker: {
    color: "#fff",
    backgroundColor: "#0f172a",
  },

  pickerItem: {
    color: "#f8fafc",
    backgroundColor: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },

  swapButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  convertButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  convertButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  resultCard: {
    marginTop: 26,
    backgroundColor: "#0f172a",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  resultTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  resultLabel: {
    color: "#94a3b8",
    fontSize: 15,
  },

  resultValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  errorBox: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "#7f1d1d",
    padding: 14,
    borderRadius: 16,
    marginBottom: 18,
  },

  errorText: {
    color: "#fecaca",
    fontWeight: "600",
  },
});