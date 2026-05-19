"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, resendVerification } from "@/lib/api";
import { Language } from "@/lib/translations";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage === "tr" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  const text = useMemo(
    () =>
      language === "tr"
        ? {
            brand: "Budgee",
            badge: "Güvenli finans paneli",
            title: "Tekrar hoş geldin",
            subtitle:
              "Harcamalarını, bütçelerini ve hedeflerini yönetmek için hesabına giriş yap.",
            email: "E-posta",
            emailPlaceholder: "ornek@email.com",
            password: "Şifre",
            passwordPlaceholder: "••••••••",
            button: "Giriş Yap",
            loading: "Giriş yapılıyor...",
            loadFailed: "Yükleme hatası",
            forgotPassword: "Şifreni mi unuttun?",
            verifyMessage: "Giriş yapmadan önce email adresini doğrulamalısın.",
            resendVerification: "Doğrulama mailini tekrar gönder",
            resendLoading: "Gönderiliyor...",
            resendSuccess:
              "Doğrulama maili tekrar gönderildi. Lütfen mail kutunu kontrol et.",
            noAccount: "Hesabın yok mu?",
            register: "Kayıt ol",
            emptyFields: "E-posta ve şifre alanlarını doldurmalısın.",
            highlightOne: "Akıllı bütçe uyarıları",
            highlightTwo: "Gelir-gider analizi",
            highlightThree: "OCR fiş okuma",
          }
        : {
            brand: "Budgee",
            badge: "Secure finance workspace",
            title: "Welcome back",
            subtitle: "Sign in to manage your spending, budgets, and savings goals.",
            email: "Email",
            emailPlaceholder: "example@email.com",
            password: "Password",
            passwordPlaceholder: "••••••••",
            button: "Sign In",
            loading: "Signing in...",
            loadFailed: "Load failed",
            forgotPassword: "Forgot your password?",
            verifyMessage: "You must verify your email before logging in.",
            resendVerification: "Resend verification email",
            resendLoading: "Sending...",
            resendSuccess:
              "Verification email has been resent. Please check your inbox.",
            noAccount: "Don’t have an account?",
            register: "Create account",
            emptyFields: "Email and password are required.",
            highlightOne: "Smart budget alerts",
            highlightTwo: "Income-expense analytics",
            highlightThree: "OCR receipt scanning",
          },
    [language]
  );

  function changeLanguage(nextLanguage: "en" | "tr") {
    setLanguage(nextLanguage);
    localStorage.setItem("language", nextLanguage);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError(text.emptyFields);
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setShowResendVerification(false);
    setLoading(true);

    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      const message = err?.message || text.loadFailed;
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("verify your email") ||
        lowerMessage.includes("not verified") ||
        lowerMessage.includes("email is not verified")
      ) {
        setError(text.verifyMessage);
        setShowResendVerification(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setError(
        language === "tr"
          ? "Önce email adresini gir."
          : "Please enter your email first."
      );
      return;
    }

    setResending(true);
    setError("");
    setSuccess("");

    try {
      const data = await resendVerification(email);
      setSuccess(data?.message || text.resendSuccess);
    } catch (err: any) {
      setError(
        err.message ||
          (language === "tr"
            ? "Doğrulama maili gönderilemedi."
            : "Verification email could not be sent.")
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={backgroundGlowOne} />
      <div style={backgroundGlowTwo} />

      <div style={shellStyle}>
        <section style={infoPanelStyle}>
          <div style={brandWrapStyle}>
            <div style={brandIconStyle}>💸</div>
            <div>
              <div style={brandTextStyle}>{text.brand}</div>
              <div style={brandSubTextStyle}>{text.badge}</div>
            </div>
          </div>

          <h1 style={heroTitleStyle}>{text.title}</h1>
          <p style={heroTextStyle}>{text.subtitle}</p>

          <div style={featureListStyle}>
            <div style={featureItemStyle}>✓ {text.highlightOne}</div>
            <div style={featureItemStyle}>✓ {text.highlightTwo}</div>
            <div style={featureItemStyle}>✓ {text.highlightThree}</div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={languageSwitchStyle}>
            <button
              type="button"
              onClick={() => changeLanguage("tr")}
              style={{
                ...languageButtonStyle,
                ...(language === "tr" ? languageButtonActiveStyle : {}),
              }}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              style={{
                ...languageButtonStyle,
                ...(language === "en" ? languageButtonActiveStyle : {}),
              }}
            >
              EN
            </button>
          </div>

          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subtitleStyle}>{text.subtitle}</p>

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>{text.email}</label>
            <input
              style={inputStyle}
              type="email"
              placeholder={text.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <label style={labelStyle}>{text.password}</label>
            <div style={passwordWrapperStyle}>
              <input
                style={passwordInputStyle}
                type={showPassword ? "text" : "password"}
                placeholder={text.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={eyeButtonStyle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )}
              </button>
            </div>

            <div style={linksRowStyle}>
              <a href="/forgot-password" style={forgotLinkStyle}>
                {text.forgotPassword}
              </a>
            </div>

            {error && <div style={errorStyle}>⚠️ {error}</div>}
            {success && <div style={successStyle}>✅ {success}</div>}

            {showResendVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                style={{
                  ...secondaryButtonStyle,
                  opacity: resending ? 0.75 : 1,
                  cursor: resending ? "not-allowed" : "pointer",
                }}
              >
                {resending ? text.resendLoading : text.resendVerification}
              </button>
            )}

            <button
              type="submit"
              style={{
                ...buttonStyle,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
            >
              {loading && <span style={spinnerStyle} />}
              {loading ? text.loading : text.button}
            </button>
          </form>

          <div style={registerRowStyle}>
            <span>{text.noAccount}</span>
            <a href="/register" style={registerLinkStyle}>
              {text.register}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #05070d 0%, #08101f 48%, #03050a 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
  overflow: "hidden",
};

const backgroundGlowOne: React.CSSProperties = {
  position: "absolute",
  width: 420,
  height: 420,
  borderRadius: 999,
  background: "rgba(79,140,255,0.16)",
  filter: "blur(90px)",
  top: -120,
  left: -90,
};

const backgroundGlowTwo: React.CSSProperties = {
  position: "absolute",
  width: 360,
  height: 360,
  borderRadius: 999,
  background: "rgba(34,197,94,0.09)",
  filter: "blur(100px)",
  right: -110,
  bottom: -110,
};

const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1040,
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: 24,
  position: "relative",
  zIndex: 1,
};

const infoPanelStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(17,24,39,0.70), rgba(15,23,42,0.46))",
  border: "1px solid rgba(59,130,246,0.18)",
  borderRadius: 28,
  padding: 34,
  boxShadow: "0 24px 70px rgba(0,0,0,0.30)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minHeight: 520,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(17, 24, 39, 0.94)",
  border: "1px solid #263042",
  borderRadius: 28,
  padding: 32,
  boxShadow: "0 24px 70px rgba(0,0,0,0.40)",
  boxSizing: "border-box",
};

const brandWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 30,
};

const brandIconStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: "rgba(37,99,235,0.18)",
  border: "1px solid rgba(96,165,250,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
};

const brandTextStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#f8fafc",
  letterSpacing: 0.3,
};

const brandSubTextStyle: React.CSSProperties = {
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 800,
  marginTop: 3,
};

const heroTitleStyle: React.CSSProperties = {
  color: "#f8fafc",
  fontSize: 52,
  lineHeight: 1.05,
  margin: 0,
  marginBottom: 16,
  fontWeight: 950,
};

const heroTextStyle: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 18,
  lineHeight: 1.7,
  maxWidth: 520,
  margin: 0,
};

const featureListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 28,
};

const featureItemStyle: React.CSSProperties = {
  color: "#dbeafe",
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(96,165,250,0.20)",
  borderRadius: 14,
  padding: "12px 14px",
  fontWeight: 800,
};

const languageSwitchStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 6,
  marginBottom: 18,
};

const languageButtonStyle: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#94a3b8",
  borderRadius: 999,
  padding: "7px 11px",
  fontWeight: 900,
  cursor: "pointer",
};

const languageButtonActiveStyle: React.CSSProperties = {
  background: "#2563eb",
  border: "1px solid #60a5fa",
  color: "#fff",
};

const titleStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  margin: 0,
  marginBottom: 10,
  color: "#f8fafc",
};

const subtitleStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 15,
  marginBottom: 24,
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginBottom: 14,
  padding: "15px 16px",
  borderRadius: 14,
  border: "1px solid #263042",
  background: "#0f172a",
  color: "#f3f4f6",
  fontSize: 15,
  outline: "none",
};

const passwordWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  marginBottom: 14,
};

const passwordInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 52px 15px 16px",
  borderRadius: 14,
  border: "1px solid #263042",
  background: "#0f172a",
  color: "#f3f4f6",
  fontSize: 15,
  outline: "none",
};

const eyeButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const linksRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: -4,
  marginBottom: 12,
};

const forgotLinkStyle: React.CSSProperties = {
  color: "#93c5fd",
  fontSize: 14,
  textDecoration: "none",
  fontWeight: 800,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "15px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #4f8cff)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 16,
  boxShadow: "0 14px 30px rgba(37,99,235,0.32)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  marginBottom: 8,
  padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid #334155",
  background: "#1f2937",
  color: "#e5e7eb",
  fontWeight: 800,
  fontSize: 14,
};

const spinnerStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: 999,
  border: "2px solid rgba(255,255,255,0.45)",
  borderTopColor: "#fff",
  display: "inline-block",
};

const errorStyle: React.CSSProperties = {
  color: "#fecaca",
  background: "rgba(239,68,68,0.13)",
  border: "1px solid rgba(239,68,68,0.32)",
  padding: "12px 14px",
  borderRadius: 14,
  marginTop: 4,
  marginBottom: 12,
  lineHeight: 1.5,
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  color: "#bbf7d0",
  background: "rgba(34,197,94,0.13)",
  border: "1px solid rgba(34,197,94,0.28)",
  padding: "12px 14px",
  borderRadius: 14,
  marginTop: 4,
  marginBottom: 12,
  lineHeight: 1.5,
  fontWeight: 700,
};

const registerRowStyle: React.CSSProperties = {
  marginTop: 18,
  color: "#94a3b8",
  display: "flex",
  justifyContent: "center",
  gap: 8,
  fontSize: 14,
};

const registerLinkStyle: React.CSSProperties = {
  color: "#93c5fd",
  fontWeight: 900,
  textDecoration: "none",
};