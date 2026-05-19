"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import { translations, Language } from "../lib/translations";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    setIsAdmin(false);

    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }

    async function loadMe() {
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        setIsAdmin(!!data?.is_admin);
      } catch {
        setIsAdmin(false);
      }
    }

    loadMe();
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false);
    window.location.href = "/";
  }

  function handleLanguageChange(newLanguage: Language) {
    setLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
    window.location.reload();
  }

  const t = translations[language];

  const hiddenNavbarPaths = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  const hideNavbar = hiddenNavbarPaths.includes(pathname);

  return (
    <html lang={language}>
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#0b0f17",
          color: "#f3f4f6",
        }}
      >
        {!hideNavbar && (
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              padding: "18px 28px",
              borderBottom: "1px solid #1f2937",
              background: "#0f172a",
              boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
              position: "sticky",
              top: 0,
              zIndex: 20,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 22,
                marginRight: 8,
                color: "#f8fafc",
              }}
            >
              BUDGEE
            </div>

            {isLoggedIn ? (
              <>
                <Link href="/dashboard" style={linkStyle}>
                  {t.navDashboard}
                </Link>
                <Link href="/transactions" style={linkStyle}>
                  {t.navTransactions}
                </Link>
                <Link href="/budgets" style={linkStyle}>
                  {t.navBudgets}
                </Link>
                <Link href="/savings-goals" style={linkStyle}>
                  {t.navSavingsGoals}
                </Link>
                <Link href="/ocr" style={linkStyle}>
                  {t.navOCR}
                </Link>
                <Link href="/currency" style={linkStyle}>
                  {t.navCurrency}
                </Link>

                {isAdmin && (
                  <Link href="/admin" style={adminLinkStyle}>
                    👑 Admin
                  </Link>
                )}

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    style={{
                      ...langButtonStyle,
                      background: language === "en" ? "#2563eb" : "#1f2937",
                    }}
                    onClick={() => handleLanguageChange("en")}
                  >
                    EN
                  </button>

                  <button
                    style={{
                      ...langButtonStyle,
                      background: language === "tr" ? "#2563eb" : "#1f2937",
                    }}
                    onClick={() => handleLanguageChange("tr")}
                  >
                    TR
                  </button>

                  <button onClick={handleLogout} style={logoutButtonStyle}>
                    {t.navLogout}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" style={linkStyle}>
                  {t.navLogin}
                </Link>
                <Link href="/register" style={linkStyle}>
                  {t.navRegister}
                </Link>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    style={{
                      ...langButtonStyle,
                      background: language === "en" ? "#2563eb" : "#1f2937",
                    }}
                    onClick={() => handleLanguageChange("en")}
                  >
                    EN
                  </button>

                  <button
                    style={{
                      ...langButtonStyle,
                      background: language === "tr" ? "#2563eb" : "#1f2937",
                    }}
                    onClick={() => handleLanguageChange("tr")}
                  >
                    TR
                  </button>
                </div>
              </>
            )}
          </nav>
        )}

        <main
          style={{
            background: "#0b0f17",
            minHeight: hideNavbar ? "100vh" : "calc(100vh - 70px)",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#d1d5db",
  fontWeight: 600,
};

const adminLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#fbbf24",
  fontWeight: 700,
};

const logoutButtonStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #7f1d1d",
  cursor: "pointer",
  fontSize: "14px",
  color: "#f87171",
  fontWeight: 700,
  borderRadius: 10,
  padding: "8px 12px",
};

const langButtonStyle: React.CSSProperties = {
  border: "1px solid #374151",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};