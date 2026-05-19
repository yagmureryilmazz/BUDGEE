"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Language } from "../../lib/translations";
import {
  checkPassword,
  getStrengthScore,
  getStrengthLabel,
  getStrengthColor,
  RULE_LABELS,
} from "../../lib/passwordStrength";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

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
            badge: "Akıllı finans yönetimi",
            title: "Hesabını oluştur",
            subtitle:
              "Bütçelerini takip etmek, hedeflerini yönetmek ve harcamalarını analiz etmek için Budgee’ye katıl.",
            email: "E-posta",
            emailPlaceholder: "ornek@email.com",
            password: "Şifre",
            passwordPlaceholder: "En az 8 karakter",
            confirmPassword: "Şifre tekrar",
            confirmPasswordPlaceholder: "Şifreni tekrar gir",
            button: "Kayıt Ol",
            loading: "Kayıt oluşturuluyor...",
            error: "Kayıt başarısız.",
            success:
              "Kayıt başarılı. Email doğrulama bağlantısı gönderildi. Lütfen mail kutunu kontrol et.",
            goLogin: "Giriş sayfasına git",
            alreadyHaveAccount: "Zaten hesabın var mı?",
            login: "Giriş yap",
            firstName: "Ad",
            firstNamePlaceholder: "Adın",
            lastName: "Soyad",
            lastNamePlaceholder: "Soyadın",
            birthDate: "Doğum Tarihi",
            underage: "Kayıt olmak için 18 yaşında olmalısın.",
            emptyFields: "Tüm alanları doldurmalısın.",
            weakPassword: "Şifre yeterince güçlü değil. Tüm kuralları karşılamalısın.",
            passwordMismatch: "Şifreler eşleşmiyor.",
            highlightOne: "Bütçe ve uyarı sistemi",
            highlightTwo: "Birikim hedefleri",
            highlightThree: "Fiş OCR desteği",
          }
        : {
            brand: "Budgee",
            badge: "Smart finance management",
            title: "Create your account",
            subtitle:
              "Join Budgee to track budgets, manage goals, and analyze your spending with a cleaner dashboard.",
            email: "Email",
            emailPlaceholder: "example@email.com",
            password: "Password",
            passwordPlaceholder: "At least 8 characters",
            confirmPassword: "Confirm password",
            confirmPasswordPlaceholder: "Re-enter your password",
            button: "Sign Up",
            loading: "Creating account...",
            error: "Registration failed.",
            success:
              "Registration successful. A verification email has been sent. Please check your inbox.",
            goLogin: "Go to login page",
            alreadyHaveAccount: "Already have an account?",
            login: "Sign in",
            firstName: "First Name",
            firstNamePlaceholder: "Your first name",
            lastName: "Last Name",
            lastNamePlaceholder: "Your last name",
            birthDate: "Date of Birth",
            underage: "You must be at least 18 years old to register.",
            emptyFields: "Please fill in all fields.",
            weakPassword: "Password is not strong enough. Please meet all requirements.",
            passwordMismatch: "Passwords do not match.",
            highlightOne: "Budget and alert system",
            highlightTwo: "Saving goals",
            highlightThree: "Receipt OCR support",
          },
    [language]
  );

  function changeLanguage(nextLanguage: "en" | "tr") {
    setLanguage(nextLanguage);
    localStorage.setItem("language", nextLanguage);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanFirstName || !cleanLastName || !birthDate || !cleanEmail || !cleanPassword || !cleanConfirmPassword) {
      setError(text.emptyFields);
      return;
    }

    // 18+ check on frontend too
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() -
      ((today.getMonth() * 100 + today.getDate()) < (birth.getMonth() * 100 + birth.getDate()) ? 1 : 0);
    if (age < 18) {
      setError(text.underage);
      return;
    }

    if (getStrengthScore(cleanPassword) < 5) {
      setError(text.weakPassword);
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setError(text.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": language,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          birth_date: birthDate,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (typeof data?.detail === "string") {
          throw new Error(data.detail);
        }

        if (Array.isArray(data?.detail) && data.detail.length > 0) {
          throw new Error(data.detail[0]?.msg || text.error);
        }

        throw new Error(text.error);
      }

      setSuccess(text.success);
      setFirstName(""); setLastName("");
      setBirthDay(""); setBirthMonth(""); setBirthYear("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || text.error);
    } finally {
      setLoading(false);
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
            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>{text.firstName}</label>
                <input style={inputStyle} type="text" placeholder={text.firstNamePlaceholder}
                  value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
              </div>
              <div>
                <label style={labelStyle}>{text.lastName}</label>
                <input style={inputStyle} type="text" placeholder={text.lastNamePlaceholder}
                  value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
              </div>
            </div>

            <label style={labelStyle}>{text.birthDate}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.5fr", gap: 8, marginBottom: 14 }}>
              <DateSelect
                value={birthDay}
                onChange={setBirthDay}
                placeholder={language === "tr" ? "Gün" : "Day"}
                options={Array.from({ length: 31 }, (_, i) => ({
                  value: String(i + 1),
                  label: String(i + 1),
                }))}
              />
              <DateSelect
                value={birthMonth}
                onChange={setBirthMonth}
                placeholder={language === "tr" ? "Ay" : "Month"}
                options={MONTH_NAMES[language].map((name, i) => ({
                  value: String(i + 1),
                  label: name,
                }))}
              />
              <DateSelect
                value={birthYear}
                onChange={setBirthYear}
                placeholder={language === "tr" ? "Yıl" : "Year"}
                options={Array.from({ length: 100 }, (_, i) => {
                  const y = new Date().getFullYear() - 18 - i;
                  return { value: String(y), label: String(y) };
                })}
              />
            </div>

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
                autoComplete="new-password"
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

            {/* Password strength bar */}
            {password.length > 0 && (() => {
              const score = getStrengthScore(password);
              const checks = checkPassword(password);
              const color = getStrengthColor(score);
              const rules = RULE_LABELS[language];
              return (
                <div style={{ marginTop: -8, marginBottom: 14 }}>
                  {/* Bar */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 99,
                        backgroundColor: i <= score ? color : "#1f2937",
                        transition: "background-color 0.2s",
                      }} />
                    ))}
                    <span style={{ fontSize: 11, fontWeight: 800, color, marginLeft: 8, whiteSpace: "nowrap" }}>
                      {getStrengthLabel(score, language)}
                    </span>
                  </div>
                  {/* Rules */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px" }}>
                    {(Object.keys(checks) as (keyof typeof checks)[]).map((key) => (
                      <div key={key} style={{ fontSize: 11, color: checks[key] ? "#4ade80" : "#64748b", fontWeight: 700 }}>
                        {checks[key] ? "✓" : "✗"} {rules[key]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <label style={labelStyle}>{text.confirmPassword}</label>
            <div style={passwordWrapperStyle}>
              <input
                style={passwordInputStyle}
                type={showConfirmPassword ? "text" : "password"}
                placeholder={text.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                style={eyeButtonStyle}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )}
              </button>
            </div>

            {error && <div style={errorStyle}>⚠️ {error}</div>}
            {success && <div style={successStyle}>✅ {success}</div>}

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

          <div style={loginRowStyle}>
            <span>{text.alreadyHaveAccount}</span>
            <a href="/login" style={loginLinkStyle}>
              {text.login}
            </a>
          </div>

          {success && (
            <a href="/login" style={goLoginButtonStyle}>
              {text.goLogin}
            </a>
          )}
        </section>
      </div>
    </div>
  );
}

const MONTH_NAMES: Record<"tr" | "en", string[]> = {
  tr: ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};

function DateSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          padding: "15px 36px 15px 16px",
          borderRadius: 14,
          border: `1px solid ${open ? "#3b82f6" : "#263042"}`,
          background: "#0f172a",
          color: selectedLabel ? "#f3f4f6" : "#64748b",
          fontSize: 15,
          outline: "none",
          cursor: "pointer",
          textAlign: "left",
          position: "relative",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
      >
        {selectedLabel || placeholder}
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? "180deg" : "0deg"})`,
            color: "#64748b",
            fontSize: 14,
            transition: "transform 0.2s",
            pointerEvents: "none",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#111827",
            border: "1px solid #263042",
            borderRadius: 12,
            overflowY: "auto",
            maxHeight: 220,
            zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: "10px 16px",
                color: opt.value === value ? "#60a5fa" : "#cbd5e1",
                background: opt.value === value ? "rgba(37,99,235,0.14)" : "transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: opt.value === value ? 700 : 400,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  opt.value === value ? "rgba(37,99,235,0.14)" : "transparent";
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
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

const loginRowStyle: React.CSSProperties = {
  marginTop: 18,
  color: "#94a3b8",
  display: "flex",
  justifyContent: "center",
  gap: 8,
  fontSize: 14,
};

const loginLinkStyle: React.CSSProperties = {
  color: "#93c5fd",
  fontWeight: 900,
  textDecoration: "none",
};

const goLoginButtonStyle: React.CSSProperties = {
  display: "block",
  marginTop: 14,
  textAlign: "center",
  color: "#bfdbfe",
  background: "rgba(37,99,235,0.14)",
  border: "1px solid rgba(59,130,246,0.28)",
  borderRadius: 14,
  padding: "12px 14px",
  textDecoration: "none",
  fontWeight: 900,
};