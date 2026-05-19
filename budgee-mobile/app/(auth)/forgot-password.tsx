import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiPost } from "@/services/api";
import { useLanguage } from "@/context/LanguageContext";

const copy = {
  tr: {
    subtitle: "Şifre sıfırlama linki gönderilecek",
    email: "Email",
    emailPlaceholder: "ornek@email.com",
    send: "Link Gönder",
    loading: "Gönderiliyor...",
    backToLogin: "Girişe dön",
    successTitle: "Email gönderildi",
    successText: "Şifre sıfırlama linki email adresine gönderildi. Gelen kutunu kontrol et.",
    errorTitle: "Hata",
    emptyField: "Email adresini girmelisin.",
    ok: "Tamam",
    goLogin: "Giriş Yap",
  },
  en: {
    subtitle: "We'll send you a password reset link",
    email: "Email",
    emailPlaceholder: "example@email.com",
    send: "Send Link",
    loading: "Sending...",
    backToLogin: "Back to login",
    successTitle: "Email sent",
    successText: "A password reset link has been sent to your email address. Check your inbox.",
    errorTitle: "Error",
    emptyField: "Please enter your email address.",
    ok: "OK",
    goLogin: "Go to Login",
  },
};

export default function ForgotPassword() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const t = copy[language];

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      setError(t.emptyField);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiPost("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || t.errorTitle);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Language switcher */}
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

      {/* Logo */}
      <View style={styles.logoBox}>
        <Text style={styles.logo}>🔐</Text>
      </View>

      <Text style={styles.title}>BUDGEE</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.label}>{t.email}</Text>
        <TextInput
          placeholder={t.emailPlaceholder}
          placeholderTextColor="#64748b"
          style={styles.input}
          value={email}
          onChangeText={(text) => setEmail(text.trim().toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.buttonText}>{t.loading}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{t.send}</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.link}>{t.backToLogin}</Text>
      </TouchableOpacity>

      {/* Error modal */}
      <Modal transparent visible={!!error} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>{t.errorTitle}</Text>
            <Text style={styles.modalText}>{error}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setError("")}>
              <Text style={styles.modalButtonText}>{t.ok}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal transparent visible={success} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>{t.successTitle}</Text>
            <Text style={styles.modalText}>{t.successText}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={styles.modalButtonText}>{t.goLogin}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f17",
    justifyContent: "center",
    padding: 24,
  },
  languageSwitch: {
    position: "absolute",
    top: 64,
    right: 24,
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
  logoBox: {
    alignSelf: "center",
    marginBottom: 12,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 28,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  label: {
    color: "#cbd5e1",
    marginBottom: 6,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#263042",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
  },
  link: {
    color: "#93c5fd",
    textAlign: "center",
    marginTop: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  modalText: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
});
