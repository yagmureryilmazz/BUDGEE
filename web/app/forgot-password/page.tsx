"use client";

import { useEffect, useMemo, useState } from "react";
import { Language } from "../../lib/translations";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved === "en" || saved === "tr") setLanguage(saved);
  }, []);

  const text = useMemo(
    () =>
      language === "tr"
        ? {
            title: "Şifremi Unuttum",
            subtitle: "E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.",
            placeholder: "E-posta",
            button: "Sıfırlama E-postası Gönder",
            sending: "Gönderiliyor...",
            fallbackSuccess: "Eğer bu e-posta adresine kayıtlı bir hesap varsa, sıfırlama bağlantısı gönderildi.",
            fallbackError: "Bir şeyler ters gitti.",
          }
        : {
            title: "Forgot Password",
            subtitle: "Enter your email address and we will send you a password reset link.",
            placeholder: "Email",
            button: "Send Reset Email",
            sending: "Sending...",
            fallbackSuccess: "If an account with that email exists, a reset email has been sent.",
            fallbackError: "Something went wrong.",
          },
    [language]
  );

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Request failed.");
      }

      setMessage(data.message || text.fallbackSuccess);
    } catch (err: any) {
      setError(err.message || text.fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>{text.title}</h1>
        <p style={subtitleStyle}>{text.subtitle}</p>

        <input
          style={inputStyle}
          type="email"
          placeholder={text.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          style={{
            ...buttonStyle,
            opacity: loading || !email.trim() ? 0.7 : 1,
            cursor: loading || !email.trim() ? "not-allowed" : "pointer",
          }}
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
        >
          {loading ? text.sending : text.button}
        </button>

        {message && <p style={successStyle}>{message}</p>}
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#0b0f17",
  color: "#f3f4f6",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 28,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 8,
  fontSize: 30,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 18,
  color: "#9ca3af",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginBottom: 14,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#161d2b",
  color: "#f3f4f6",
  fontSize: 15,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  color: "#86efac",
  marginTop: 14,
};

const errorStyle: React.CSSProperties = {
  color: "#fca5a5",
  marginTop: 14,
};