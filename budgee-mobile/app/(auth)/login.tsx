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
import { apiPost, saveToken } from "@/services/api";
import { useLanguage, Language } from "@/context/LanguageContext";



const copy = {
  tr: {
    subtitle: "Finansını akıllıca yönet",
    email: "Email",
    emailPlaceholder: "ornek@email.com",
    password: "Şifre",
    passwordPlaceholder: "••••••••",
    login: "Giriş Yap",
    loading: "Giriş yapılıyor...",
    forgotPassword: "Şifreni mi unuttun?",
    registerLink: "Hesabın yok mu? Kayıt ol",
    errorTitle: "Giriş başarısız",
    ok: "Tamam",
    emptyFields: "Email ve şifre girmen gerekiyor.",
    invalidCredentials: "Email veya şifre hatalı.",
    timeout: "Sunucuya bağlanılamadı. Backend açık mı?",
    loginFailed: "Giriş yapılamadı.",
    invalidEmail: "Geçerli bir email adresi girmelisin.",
    backendValidation: "Giriş bilgilerini kontrol etmelisin.",
  },
  en: {
    subtitle: "Manage your money smarter",
    email: "Email",
    emailPlaceholder: "example@email.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    login: "Log In",
    loading: "Logging in...",
    forgotPassword: "Forgot your password?",
    registerLink: "Don’t have an account? Sign up",
    errorTitle: "Login failed",
    ok: "OK",
    emptyFields: "Email and password are required.",
    invalidCredentials: "Email or password is incorrect.",
    timeout: "Connection timed out. Is the backend running?",
    loginFailed: "Could not log in.",
    invalidEmail: "Please enter a valid email address.",
    backendValidation: "Please check your login details.",
  },
};

function getLocalizedErrorMessage(detail: any, language: Language, fallback: string) {
  const t = copy[language];

  if (!detail) return fallback;

  if (typeof detail === "string") {
    const lower = detail.toLowerCase();

    if (
      lower.includes("incorrect") ||
      lower.includes("invalid") ||
      lower.includes("wrong") ||
      lower.includes("unauthorized") ||
      lower.includes("credentials") ||
      lower.includes("hatalı") ||
      lower.includes("geçersiz")
    ) {
      return t.invalidCredentials;
    }

    if (lower.includes("email")) {
      return t.invalidEmail;
    }

    return fallback;
  }

  if (Array.isArray(detail)) {
    return t.backendValidation;
  }

  if (typeof detail === "object") {
    const message = detail.msg || detail.message || detail.error || "";

    if (message) {
      return getLocalizedErrorMessage(message, language, fallback);
    }
  }

  return fallback;
}

export default function LoginScreen() {
  const router = useRouter();

  const { language, setLanguage } = useLanguage();
  const t = copy[language];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage(t.emptyFields);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const data = await apiPost<{ access_token: string }>("/auth/login", {
        email: cleanEmail,
        password: cleanPassword,
      });

      await saveToken(data.access_token);
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      if (err?.message === "REQUEST_TIMEOUT") {
        setErrorMessage(t.timeout);
      } else {
        setErrorMessage(
          getLocalizedErrorMessage(err?.message, language, t.loginFailed)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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

      <View style={styles.logoBox}>
        <Text style={styles.logo}>💸</Text>
      </View>

      <Text style={styles.title}>BUDGEE</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.email}</Text>
        <TextInput
          placeholder={t.emailPlaceholder}
          placeholderTextColor="#64748b"
          style={styles.input}
          value={email}
          onChangeText={(text) => setEmail(text.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Text style={styles.label}>{t.password}</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            placeholder={t.passwordPlaceholder}
            placeholderTextColor="#64748b"
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
          />

          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Text style={styles.showPasswordText}>
              {showPassword
                ? language === "tr"
                  ? "Gizle"
                  : "Hide"
                : language === "tr"
                ? "Göster"
                : "Show"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.buttonText}>{t.loading}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{t.login}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{ alignItems: "center", marginTop: 10 }}
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text style={styles.forgotText}>{t.forgotPassword}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
        <Text style={styles.link}>{t.registerLink}</Text>
      </TouchableOpacity>

      <Modal transparent visible={!!errorMessage} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>{t.errorTitle}</Text>
            <Text style={styles.modalText}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorMessage("")}
            >
              <Text style={styles.modalButtonText}>{t.ok}</Text>
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
  passwordInputWrap: {
    position: "relative",
    marginBottom: 12,
  },
  passwordInput: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 86,
    borderRadius: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#263042",
  },
  showPasswordButton: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  showPasswordText: {
    color: "#93c5fd",
    fontWeight: "900",
    fontSize: 12,
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
  forgotText: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "700",
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