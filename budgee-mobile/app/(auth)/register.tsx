import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { apiPost } from "@/services/api";
import { useLanguage, Language } from "@/context/LanguageContext";

// ── Password strength ────────────────────────────────────────
function checkPassword(p: string) {
  return {
    length:  p.length >= 8,
    upper:   /[A-Z]/.test(p),
    lower:   /[a-z]/.test(p),
    digit:   /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
}
function getStrengthScore(p: string) {
  return Object.values(checkPassword(p)).filter(Boolean).length;
}
const RULE_LABELS = {
  tr: {
    length:  "En az 8 karakter",
    upper:   "Büyük harf (A-Z)",
    lower:   "Küçük harf (a-z)",
    digit:   "Rakam (0-9)",
    special: "Özel karakter (!@#$%...)",
  },
  en: {
    length:  "At least 8 characters",
    upper:   "Uppercase letter (A-Z)",
    lower:   "Lowercase letter (a-z)",
    digit:   "Number (0-9)",
    special: "Special character (!@#$%...)",
  },
};
function strengthColor(score: number) {
  if (score <= 2) return "#ef4444";
  if (score <= 4) return "#f59e0b";
  return "#22c55e";
}
function strengthLabel(score: number, lang: Language) {
  if (score <= 2) return lang === "tr" ? "Zayıf" : "Weak";
  if (score <= 4) return lang === "tr" ? "Orta" : "Medium";
  return lang === "tr" ? "Güçlü" : "Strong";
}


const copy = {
  tr: {
    subtitle: "Yeni hesabını oluştur",
    email: "Email",
    emailPlaceholder: "ornek@email.com",
    password: "Şifre",
    passwordPlaceholder: "••••••••",
    confirmPassword: "Şifre tekrar",
    confirmPasswordPlaceholder: "••••••••",
    register: "Kayıt Ol",
    loading: "Kayıt oluşturuluyor...",
    loginLink: "Zaten hesabın var mı? Giriş yap",
    errorTitle: "Kayıt başarısız",
    successTitle: "Kayıt başarılı",
    successText: "Hesabın oluşturuldu. Şimdi giriş yapabilirsin.",
    ok: "Tamam",
    goLogin: "Girişe Git",
    firstName: "Ad",
    firstNamePlaceholder: "Adın",
    lastName: "Soyad",
    lastNamePlaceholder: "Soyadın",
    birthDate: "Doğum Tarihi",
    birthDatePlaceholder: "YYYY-AA-GG",
    underage: "Kayıt olmak için 18 yaşında olmalısın.",
    emptyFields: "Tüm alanları doldurmalısın.",
    passwordMismatch: "Şifreler eşleşmiyor.",
    weakPassword: "Şifre yeterince güçlü değil. Tüm kuralları karşılamalısın.",
    timeout: "Sunucuya bağlanılamadı.",
    failed: "Kayıt oluşturulamadı.",
    show: "Göster",
    hide: "Gizle",
  },
  en: {
    subtitle: "Create your account",
    email: "Email",
    emailPlaceholder: "example@email.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "••••••••",
    register: "Sign Up",
    loading: "Creating account...",
    loginLink: "Already have an account? Log in",
    errorTitle: "Registration failed",
    successTitle: "Registration successful",
    successText: "Account created. You can log in now.",
    ok: "OK",
    goLogin: "Go to Login",
    firstName: "First Name",
    firstNamePlaceholder: "Your first name",
    lastName: "Last Name",
    lastNamePlaceholder: "Your last name",
    birthDate: "Date of Birth",
    birthDatePlaceholder: "YYYY-MM-DD",
    underage: "You must be at least 18 years old to register.",
    emptyFields: "Fill all fields.",
    passwordMismatch: "Passwords do not match.",
    weakPassword: "Password is not strong enough. Please meet all requirements.",
    timeout: "Connection timed out.",
    failed: "Could not register.",
    show: "Show",
    hide: "Hide",
  },
};

export default function Register() {
  const router = useRouter();

  const { language, setLanguage } = useLanguage();
  const t = copy[language];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pickerDate, setPickerDate] = useState<Date>(
    new Date(new Date().getFullYear() - 20, 0, 1)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const maxDate = new Date(
    new Date().getFullYear() - 18,
    new Date().getMonth(),
    new Date().getDate()
  );

  function handleDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && date) {
        setPickerDate(date);
        setBirthDate(date.toISOString().split("T")[0]);
      }
    } else {
      if (date) setPickerDate(date);
    }
  }

  function confirmIosPicker() {
    setBirthDate(pickerDate.toISOString().split("T")[0]);
    setIosPickerVisible(false);
  }

  function openDatePicker() {
    if (Platform.OS === "ios") {
      setIosPickerVisible(true);
    } else {
      setShowDatePicker(true);
    }
  }

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !birthDate || !email || !password || !confirmPassword) {
      setError(t.emptyFields);
      return;
    }

    // 18+ check
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() -
      ((today.getMonth() * 100 + today.getDate()) < (birth.getMonth() * 100 + birth.getDate()) ? 1 : 0);
    if (isNaN(birth.getTime()) || age < 18) {
      setError(t.underage);
      return;
    }

    if (getStrengthScore(password) < 5) {
      setError(t.weakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiPost("/auth/register", {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
      });
      setSuccess(true);
    } catch (err: any) {
      if (err?.message === "REQUEST_TIMEOUT") {
        setError(t.timeout);
      } else {
        setError(err?.message || t.failed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Language switcher — pill style like login */}
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
        <Text style={styles.logo}>💸</Text>
      </View>

      <Text style={styles.title}>BUDGEE</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      {/* Card */}
      <View style={styles.card}>
        {/* Name row */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t.firstName}</Text>
            <TextInput
              placeholder={t.firstNamePlaceholder}
              placeholderTextColor="#64748b"
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="givenName"
              autoComplete="given-name"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t.lastName}</Text>
            <TextInput
              placeholder={t.lastNamePlaceholder}
              placeholderTextColor="#64748b"
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="familyName"
              autoComplete="family-name"
            />
          </View>
        </View>

        <Text style={styles.label}>{t.birthDate}</Text>
        <TouchableOpacity
          style={[styles.input, styles.datePickerButton]}
          onPress={openDatePicker}
          activeOpacity={0.7}
        >
          <Text style={birthDate ? styles.datePickerText : styles.datePickerPlaceholder}>
            {birthDate
              ? new Date(birthDate + "T12:00:00").toLocaleDateString(
                  language === "tr" ? "tr-TR" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" }
                )
              : t.birthDatePlaceholder}
          </Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>

        {/* Android picker — inline */}
        {showDatePicker && (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            maximumDate={maxDate}
            onChange={handleDateChange}
          />
        )}

        {/* iOS picker — bottom modal */}
        <Modal visible={iosPickerVisible} transparent animationType="slide">
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setIosPickerVisible(false)}>
                  <Text style={styles.iosPickerCancel}>
                    {language === "tr" ? "Vazgeç" : "Cancel"}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>{t.birthDate}</Text>
                <TouchableOpacity onPress={confirmIosPicker}>
                  <Text style={styles.iosPickerDone}>
                    {language === "tr" ? "Tamam" : "Done"}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                maximumDate={maxDate}
                onChange={handleDateChange}
                style={{ width: "100%" }}
                textColor="#f8fafc"
              />
            </View>
          </View>
        </Modal>

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
          autoComplete="email"
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
            textContentType="oneTimeCode"
            autoComplete="off"
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Text style={styles.showPasswordText}>
              {showPassword ? t.hide : t.show}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Password strength */}
        {password.length > 0 && (() => {
          const score = getStrengthScore(password);
          const checks = checkPassword(password);
          const color = strengthColor(score);
          const rules = RULE_LABELS[language];
          return (
            <View style={styles.strengthBox}>
              {/* Bar + label */}
              <View style={styles.strengthBarRow}>
                {[1,2,3,4,5].map((i) => (
                  <View key={i} style={[styles.strengthSegment, { backgroundColor: i <= score ? color : "#1f2937" }]} />
                ))}
                <Text style={[styles.strengthLabel, { color }]}>{strengthLabel(score, language)}</Text>
              </View>
              {/* Rules grid */}
              <View style={styles.rulesGrid}>
                {(Object.keys(checks) as (keyof typeof checks)[]).map((key) => (
                  <View key={key} style={styles.ruleRow}>
                    <Text style={[styles.ruleText, { color: checks[key] ? "#4ade80" : "#64748b" }]}>
                      {checks[key] ? "✓" : "✗"} {rules[key]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        <Text style={styles.label}>{t.confirmPassword}</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            placeholder={t.confirmPasswordPlaceholder}
            placeholderTextColor="#64748b"
            style={styles.passwordInput}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="oneTimeCode"
            autoComplete="off"
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowConfirmPassword((prev) => !prev)}
          >
            <Text style={styles.showPasswordText}>
              {showConfirmPassword ? t.hide : t.show}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.buttonText}>{t.loading}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{t.register}</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={styles.link}>{t.loginLink}</Text>
      </TouchableOpacity>

      {/* Error modal */}
      <Modal transparent visible={!!error} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>{t.errorTitle}</Text>
            <Text style={styles.modalText}>{error}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setError("")}
            >
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
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerText: {
    color: "#f3f4f6",
    fontSize: 15,
    flex: 1,
  },
  datePickerPlaceholder: {
    color: "#64748b",
    fontSize: 15,
    flex: 1,
  },
  calendarIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  iosPickerCard: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingBottom: 32,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  iosPickerTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    fontSize: 15,
  },
  iosPickerCancel: {
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: 15,
  },
  iosPickerDone: {
    color: "#60a5fa",
    fontWeight: "900",
    fontSize: 15,
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
  strengthBox: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    marginTop: -8,
  },
  strengthBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 99,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 6,
  },
  rulesGrid: {
    gap: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ruleText: {
    fontSize: 11,
    fontWeight: "700",
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
