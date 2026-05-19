"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Language } from "../lib/translations";

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
  }, []);

  function changeLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  }

  const text =
    language === "tr"
      ? {
          badge: "Akıllı Kişisel Finans",
          title1: "Paranı",
          title2: "akıllıca",
          title3: "yönet.",
          desc:
            "Budgee; fiş okuma, yapay zekâ destekli tahminleme ve görsel analizleri bir araya getirerek finans takibini daha akıllı, daha hızlı ve daha anlaşılır hale getirir.",
          primary: "Kayıt Ol",
          secondary: "Giriş Yap",

          stat1: "Otomatik fiş ayrıştırma",
          stat2: "Yapay zekâ destekli harcama tahmini",
          stat3: "Zorunlu banka bağlantısı yok",

          featureTitle1a: "İhtiyacın olan her şey",
          featureTitle1b: "kontrol sende",
          featureDesc:
            "Fiş taramadan gelecek ay bakiyesini tahmin etmeye kadar Budgee, kişisel finansının her tarafını tek yerde toplar.",

          feature1Title: "OCR Fiş Tarama",
          feature1Desc:
            "Kameranı bir fişe doğrult. Budgee satıcıyı, tutarı ve kategoriyi otomatik çıkarır. Elle giriş ihtiyacı azalır.",

          feature2Title: "Yapay Zekâ Tahminleme",
          feature2Desc:
            "Ay sonu bakiyeni tahmin et, bütçe aşımı riskini erkenden gör ve daha doğru kararlar al.",

          feature3Title: "Görsel Analitik",
          feature3Desc:
            "Güzel grafikler ve kırılımlar sayesinde paranı nereye harcadığını net şekilde gör.",

          feature4Title: "Birikim Hedefleri",
          feature4Desc:
            "Hedef belirle, ilerlemeni takip et ve finansal hedeflerine adım adım yaklaş.",

          feature5Title: "Bütçe Yönetimi",
          feature5Desc:
            "Kategori bazlı aylık bütçeler oluştur ve limitlere yaklaşırken anında geri bildirim al.",

          feature6Title: "Akıllı Bildirimler",
          feature6Desc:
            "Harcama alışkanlıkların risk gösterdiğinde sistem seni erkenden uyarır.",

          ctaTitle1: "Finansını",
          ctaTitle2: "bugün kontrol et.",
          ctaDesc:
            "Banka bağlantısı yok. Zorunlu abonelik yok. Sadece akıllı ve sade kişisel finans yönetimi.",
        }
      : {
          badge: "Intelligent Personal Finance",
          title1: "Your money,",
          title2: "intelligently",
          title3: "managed.",
          desc:
            "Budgee combines OCR receipt scanning, AI-driven forecasting, and visual analytics to make personal finance tracking smarter, faster, and easier to understand.",
          primary: "Register",
          secondary: "Login",

          stat1: "Automated receipt parsing",
          stat2: "AI-powered spending forecasts",
          stat3: "No required bank connection",

          featureTitle1a: "Everything you need to",
          featureTitle1b: "stay on top",
          featureDesc:
            "From scanning a receipt to predicting next month’s balance, Budgee gives you complete visibility over your finances in one place.",

          feature1Title: "OCR Receipt Scanning",
          feature1Desc:
            "Point your camera at any receipt. Budgee instantly extracts merchant, amount, and category with less manual entry.",

          feature2Title: "AI Financial Forecasting",
          feature2Desc:
            "Predict your end-of-month balance and get early warnings before you exceed your budget.",

          feature3Title: "Visual Analytics",
          feature3Desc:
            "Beautiful charts and breakdowns give you a clear picture of where your money goes.",

          feature4Title: "Savings Goals",
          feature4Desc:
            "Set a goal, define a target, and track your progress in real time.",

          feature5Title: "Budget Management",
          feature5Desc:
            "Create monthly budgets per category and receive instant feedback as you approach limits.",

          feature6Title: "Smart Notifications",
          feature6Desc:
            "Proactive alerts help you notice risky spending patterns before they become bigger problems.",

          ctaTitle1: "Take control of your",
          ctaTitle2: "finances today.",
          ctaDesc:
            "No bank connections. No subscriptions. Just intelligent, private personal finance management.",
        };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 15% 15%, rgba(59,130,246,0.18), transparent 25%), radial-gradient(circle at 75% 70%, rgba(34,197,94,0.08), transparent 22%), linear-gradient(135deg, #05070d 0%, #08101f 35%, #03050a 100%)",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(79,140,255,0.07), transparent 35%)",
          pointerEvents: "none",
        }}
      />

      <header
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "26px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 800,
            fontSize: 22,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg, #5b7cff, #4f8cff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 20px rgba(79,140,255,0.35)",
              fontSize: 18,
            }}
          >
            ↗
          </div>
          <span>BUDGEE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => changeLanguage("en")}
            style={{
              ...langButtonStyle,
              background: language === "en" ? "#2563eb" : "rgba(255,255,255,0.03)",
            }}
          >
            EN
          </button>

          <button
            onClick={() => changeLanguage("tr")}
            style={{
              ...langButtonStyle,
              background: language === "tr" ? "#2563eb" : "rgba(255,255,255,0.03)",
            }}
          >
            TR
          </button>
        </div>
      </header>

      <section
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100vh - 90px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px 80px",
          textAlign: "center",
        }}
      >
        <div style={badgeStyle}>{text.badge}</div>

        <h1
          style={{
            margin: "28px 0 22px",
            lineHeight: 0.95,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            maxWidth: 1100,
            fontSize: "clamp(56px, 10vw, 136px)",
          }}
        >
          <span style={{ display: "block", color: "#ffffff" }}>{text.title1}</span>
          <span
            style={{
              display: "block",
              background: "linear-gradient(90deg, #5b7cff, #8b7cff, #4f8cff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {text.title2}
          </span>
          <span style={{ display: "block", color: "#ffffff" }}>{text.title3}</span>
        </h1>

        <p
          style={{
            maxWidth: 920,
            color: "#cbd5e1",
            fontSize: "clamp(18px, 2vw, 22px)",
            lineHeight: 1.65,
            margin: "0 0 34px",
          }}
        >
          {text.desc}
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 60,
          }}
        >
          <Link href="/register" style={primaryButton}>
            {text.primary} →
          </Link>

          <Link href="/login" style={secondaryButton}>
            {text.secondary}
          </Link>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 960,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <div style={statCard}>
            <div style={statNumber}>100%</div>
            <div style={statLabel}>{text.stat1}</div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>AI</div>
            <div style={statLabel}>{text.stat2}</div>
          </div>

          <div style={statCard}>
            <div style={statNumber}>0</div>
            <div style={statLabel}>{text.stat3}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "20px 24px 80px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={mockWindow}>
          <div style={mockWindowTop}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...circleStyle, background: "#ef4444" }} />
              <div style={{ ...circleStyle, background: "#f59e0b" }} />
              <div style={{ ...circleStyle, background: "#10b981" }} />
            </div>
            <div style={{ color: "#9ca3af", fontSize: 16 }}>budgee.app / dashboard</div>
          </div>

          <div style={{ padding: 26 }}>
            <div style={mockTopCards}>
              <div style={mockCard}>
                <div style={mockLabel}>
                  {language === "tr" ? "Toplam Bakiye" : "Total Balance"}
                </div>
                <div style={mockValue}>$8,430.00</div>
              </div>
              <div style={mockCard}>
                <div style={mockLabel}>
                  {language === "tr" ? "Gelir" : "Income"}
                </div>
                <div style={{ ...mockValue, color: "#34d399" }}>+$12,000</div>
              </div>
              <div style={mockCard}>
                <div style={mockLabel}>
                  {language === "tr" ? "Gider" : "Expenses"}
                </div>
                <div style={{ ...mockValue, color: "#f43f5e" }}>-$3,570</div>
              </div>
            </div>

            <div style={largePanel}>
              <div style={mockLabel}>
                {language === "tr" ? "Son Aktivite Trendi" : "Recent Activity Trend"}
              </div>
              <div style={barChartRow}>
                {[38, 62, 30, 76, 52, 66, 43, 84, 58, 71].map((h, i) => (
                  <div key={i} style={{ ...chartBar, height: `${h}%` }} />
                ))}
              </div>
            </div>

            <div style={largePanel}>
              <div
                style={{
                  color: "#5b7cff",
                  fontWeight: 800,
                  marginBottom: 14,
                  fontSize: 22,
                }}
              >
                ✦ {language === "tr" ? "Budgee AI İçgörüleri" : "Budgee AI Insights"}
              </div>
              <div style={insightLine}>
                •{" "}
                {language === "tr"
                  ? "Birikim hedefine ulaşma yolunda gidiyorsun!"
                  : "You’re on track to meet your savings goal!"}
              </div>
              <div style={insightLine}>
                •{" "}
                {language === "tr"
                  ? "Market harcaman bu ay %12 daha düşük."
                  : "Grocery spending is 12% lower this month."}
              </div>
              <div style={insightLine}>
                •{" "}
                {language === "tr"
                  ? "Tahmini ay sonu bakiye: $4,860"
                  : "Predicted end-of-month balance: $4,860"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "40px 24px 100px",
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 42 }}>
          <h2
            style={{
              fontSize: "clamp(42px, 7vw, 92px)",
              lineHeight: 0.95,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              margin: 0,
            }}
          >
            <span style={{ color: "#ffffff" }}>{text.featureTitle1a} </span>
            <span
              style={{
                background: "linear-gradient(90deg, #5b7cff, #8b7cff, #4f8cff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {text.featureTitle1b}
            </span>
          </h2>

          <p
            style={{
              maxWidth: 900,
              margin: "24px auto 0",
              color: "#aeb8c8",
              fontSize: 20,
              lineHeight: 1.7,
            }}
          >
            {text.featureDesc}
          </p>
        </div>

        <div style={featureGrid}>
          <div style={featureCard}>
            <div style={{ ...featureIcon, background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>⌲</div>
            <div style={featureTitle}>{text.feature1Title}</div>
            <div style={featureDescStyle}>{text.feature1Desc}</div>
          </div>

          <div style={featureCard}>
            <div style={{ ...featureIcon, background: "rgba(168,85,247,0.12)", color: "#c084fc" }}>✦</div>
            <div style={featureTitle}>{text.feature2Title}</div>
            <div style={featureDescStyle}>{text.feature2Desc}</div>
          </div>

          <div style={featureCard}>
            <div style={{ ...featureIcon, background: "rgba(16,185,129,0.12)", color: "#34d399" }}>▥</div>
            <div style={featureTitle}>{text.feature3Title}</div>
            <div style={featureDescStyle}>{text.feature3Desc}</div>
          </div>

          <div style={featureCard}>
            <div style={{ ...featureIcon, background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>◎</div>
            <div style={featureTitle}>{text.feature4Title}</div>
            <div style={featureDescStyle}>{text.feature4Desc}</div>
          </div>

          <div style={featureCard}>
            <div style={{ ...featureIcon, background: "rgba(236,72,153,0.12)", color: "#f472b6" }}>▣</div>
            <div style={featureTitle}>{text.feature5Title}</div>
            <div style={featureDescStyle}>{text.feature5Desc}</div>
          </div>

          <div style={featureCard}>
            <div style={{ ...featureIcon, background: "rgba(6,182,212,0.12)", color: "#22d3ee" }}>◔</div>
            <div style={featureTitle}>{text.feature6Title}</div>
            <div style={featureDescStyle}>{text.feature6Desc}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          position: "relative",
          zIndex: 2,
          padding: "20px 24px 120px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={ctaCard}>
          <div
            style={{
              fontSize: 54,
              color: "#5b7cff",
              marginBottom: 18,
            }}
          >
            🛡
          </div>

          <h3
            style={{
              fontSize: "clamp(38px, 5vw, 72px)",
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              margin: 0,
              marginBottom: 18,
            }}
          >
            <span style={{ display: "block" }}>{text.ctaTitle1}</span>
            <span style={{ display: "block" }}>{text.ctaTitle2}</span>
          </h3>

          <p
            style={{
              maxWidth: 760,
              margin: "0 auto 30px",
              color: "#b8c2d3",
              fontSize: 22,
              lineHeight: 1.7,
            }}
          >
            {text.ctaDesc}
          </p>

        </div>
      </section>
    </div>
  );
}

const langButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};


const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 18px",
  borderRadius: 999,
  border: "1px solid rgba(79,140,255,0.45)",
  background: "rgba(79,140,255,0.08)",
  color: "#7ea8ff",
  fontWeight: 700,
  fontSize: 16,
  boxShadow: "0 0 0 1px rgba(79,140,255,0.06) inset",
};

const primaryButton: React.CSSProperties = {
  textDecoration: "none",
  color: "#ffffff",
  background: "linear-gradient(135deg, #5b7cff, #4f8cff)",
  padding: "16px 28px",
  borderRadius: 16,
  fontWeight: 800,
  fontSize: 20,
  boxShadow: "0 14px 28px rgba(79,140,255,0.35)",
  minWidth: 230,
  display: "inline-block",
  textAlign: "center",
};

const secondaryButton: React.CSSProperties = {
  textDecoration: "none",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.02)",
  padding: "16px 28px",
  borderRadius: 16,
  fontWeight: 700,
  fontSize: 20,
  minWidth: 230,
  display: "inline-block",
  textAlign: "center",
};

const statCard: React.CSSProperties = {
  padding: "22px 12px",
  borderRadius: 20,
  background: "rgba(255,255,255,0.02)",
};

const statNumber: React.CSSProperties = {
  fontSize: "clamp(38px, 4vw, 72px)",
  fontWeight: 900,
  marginBottom: 8,
};

const statLabel: React.CSSProperties = {
  color: "#aeb8c8",
  fontSize: 18,
  lineHeight: 1.5,
};

const mockWindow: React.CSSProperties = {
  width: "100%",
  maxWidth: 1280,
  background: "rgba(9, 12, 20, 0.94)",
  border: "1px solid #1b2230",
  borderRadius: 28,
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
  overflow: "hidden",
};

const mockWindowTop: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  padding: "16px 22px",
  borderBottom: "1px solid #141a25",
  background: "rgba(255,255,255,0.01)",
};

const circleStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
};

const mockTopCards: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 20,
  marginBottom: 24,
};

const mockCard: React.CSSProperties = {
  background: "#05070d",
  border: "1px solid #141a25",
  borderRadius: 20,
  padding: 24,
};

const mockLabel: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 16,
  marginBottom: 14,
};

const mockValue: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  color: "#ffffff",
};

const largePanel: React.CSSProperties = {
  background: "#05070d",
  border: "1px solid #141a25",
  borderRadius: 22,
  padding: 22,
  marginBottom: 22,
};

const barChartRow: React.CSSProperties = {
  height: 180,
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  marginTop: 18,
};

const chartBar: React.CSSProperties = {
  flex: 1,
  borderRadius: "10px 10px 0 0",
  background: "#23326e",
  minHeight: 30,
};

const insightLine: React.CSSProperties = {
  color: "#b8c2d3",
  fontSize: 18,
  lineHeight: 1.8,
  marginBottom: 4,
};

const featureGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 22,
  marginTop: 50,
};

const featureCard: React.CSSProperties = {
  background: "rgba(8, 10, 16, 0.9)",
  border: "1px solid #1a2230",
  borderRadius: 24,
  padding: 28,
  minHeight: 250,
};

const featureIcon: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  marginBottom: 22,
};

const featureTitle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 14,
  color: "#f8fafc",
};

const featureDescStyle: React.CSSProperties = {
  color: "#aeb8c8",
  fontSize: 18,
  lineHeight: 1.7,
};

const ctaCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 1100,
  background: "rgba(8, 10, 16, 0.92)",
  border: "1px solid #1a2230",
  borderRadius: 34,
  padding: "64px 32px",
  textAlign: "center",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};