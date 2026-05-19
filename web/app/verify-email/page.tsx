"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Language } from "../../lib/translations";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";

  const [language] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("language");
      if (saved === "en" || saved === "tr") return saved as Language;
    } catch {}
    return "en";
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isTr = language === "tr";

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setError(isTr ? "Doğrulama tokenı eksik." : "Verification token is missing.");
        setLoading(false);
        return;
      }

      setMessage(isTr ? "Email doğrulanıyor..." : "Verifying your email...");

      try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.detail || (isTr ? "Doğrulama başarısız." : "Verification failed."));
        }

        setMessage(
          isTr
            ? "Email başarıyla doğrulandı. Giriş sayfasına yönlendiriliyorsun..."
            : "Email verified successfully. Redirecting to login..."
        );

        setTimeout(() => router.push("/login"), 1500);
      } catch (err: any) {
        setError(err.message || (isTr ? "Bir hata oluştu." : "Something went wrong."));
      } finally {
        setLoading(false);
      }
    }

    verifyEmail();
  }, [token, router, isTr]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>{isTr ? "Email Doğrulama" : "Email Verification"}</h1>

        {loading && <p style={subtitleStyle}>{message}</p>}
        {!loading && !error && <p style={successStyle}>{message}</p>}
        {!loading && error && <p style={errorStyle}>{error}</p>}
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
  marginBottom: 12,
  fontSize: 30,
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  color: "#cbd5e1",
};

const successStyle: React.CSSProperties = {
  color: "#86efac",
};

const errorStyle: React.CSSProperties = {
  color: "#fca5a5",
};