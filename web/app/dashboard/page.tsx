"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import {
  translations,
  Language,
  translateCategory,
} from "../../lib/translations";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Lightbulb,
  AlertTriangle,
  Target,
  Brain,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  HeartPulse,
  Gift,
  Inbox,
  BarChart3,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

type DashboardData = {
  summary?: {
    total_income?: string | number;
    total_expense?: string | number;
    balance?: string | number;
  };
  alerts?: {
    alerts?: {
      category: string;
      percentage_used: number;
      status: string;
    }[];
  };
  budget_usage?: {
    items?: {
      budget_id: number;
      category: string;
      budget_amount: string | number;
      spent_amount: string | number;
      remaining_amount: string | number;
      percentage_used: number;
    }[];
  };
};

type BudgetUsageItem = {
  budget_id: number;
  category: string;
  budget_amount: string | number;
  spent_amount: string | number;
  remaining_amount: string | number;
  percentage_used: number;
};

type PredictionItem = {
  category: string;
  predicted_spent: string | number;
  risk_level: string;
};

type BreakdownItem = {
  category: string;
  total: number | string;
  percentage: number;
};

type TrendItem = {
  period?: string;
  income?: number | string | null;
  expense?: number | string | null;
  balance?: number | string | null;
};

type TransactionItem = {
  id: number;
  amount: number | string;
  category: string;
  type: "income" | "expense" | string;
  date?: string | null;
  spent_at?: string | null;
};

type DashboardInsight = {
  status: "empty" | "healthy" | "warning" | "danger" | string;
  title: string;
  summary: string;
  messages: string[];
  metrics?: {
    total_income?: number;
    total_expense?: number;
    balance?: number;
    top_category?: string | null;
    top_category_total?: number;
    highest_budget_usage?: {
      category: string;
      budget_amount: number;
      spent_amount: number;
      percentage_used: number;
    } | null;
  };
};
function formatMoney(value: number, language: Language) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "%0";
  return `%${Math.round(value)}`;
}

function getRiskTone(risk: string) {
  const level = risk.toLowerCase();

  if (level === "high") {
    return {
      bg: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(239,68,68,0.20)",
    };
  }

  if (level === "medium") {
    return {
      bg: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.20)",
    };
  }

  return {
    bg: "rgba(34,197,94,0.14)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.20)",
  };
}

function getAlertTone(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("critical") ||
    value.includes("danger") ||
    value.includes("high")
  ) {
    return {
      bg: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(239,68,68,0.20)",
    };
  }

  if (value.includes("warning") || value.includes("medium")) {
    return {
      bg: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.20)",
    };
  }

  return {
    bg: "rgba(34,197,94,0.14)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.20)",
  };
}

function getCategoryIcon(category: string) {
  const c = category.toLowerCase();

  if (c.includes("food")) return <Utensils size={16} />;
  if (c.includes("shopping") || c.includes("groceries") || c.includes("market")) {
    return <ShoppingBag size={16} />;
  }
  if (c.includes("transport")) return <Car size={16} />;
  if (c.includes("rent") || c.includes("home")) return <Home size={16} />;
  if (c.includes("health")) return <HeartPulse size={16} />;
  if (c.includes("gift")) return <Gift size={16} />;

  return <Wallet size={16} />;
}

function getDisplayCategory(category: string, language: Language) {
  if (category === "Market") {
    return language === "tr" ? "Market" : "Groceries";
  }

  return translateCategory(category, language);
}

function translateInsightText(text: string, language: Language): string {
  if (language === "tr") return text;

  return text
    // Titles
    .replace("Finansal durumun sağlıklı görünüyor", "Your financial situation looks healthy")
    .replace("Dikkatli ol! Harcamalar yüksek", "Be careful! Expenses are high")
    .replace("Bütçe aşımı riski", "Budget overrun risk")
    .replace("Harika gidiyorsun!", "You're doing great!")
    .replace("İyi ilerliyorsun", "Good progress")
    // Summary sentences
    .replace("Gelirin şu an harcamalarını karşılıyor.", "Your income is currently covering your expenses.")
    .replace("Bu şekilde devam edersen pozitif bakiyeni koruyabilirsin.", "If you continue this way, you can maintain a positive balance.")
    .replace("Harcamaların gelirine yaklaşıyor, dikkatli ol.", "Your expenses are approaching your income, be careful.")
    .replace("Harcamaların gelirini aşıyor! Acil önlem alman gerekebilir.", "Your expenses exceed your income! You may need to take immediate action.")
    // Dynamic message patterns (with regex to preserve numbers/amounts)
    .replace(
      /Bu dönemde en yüksek harcama kategorin (.+?)\. Toplam harcama: (.+?)\./,
      "Your highest expense category this period is $1. Total spending: $2."
    )
    .replace(
      /Harcamaların gelirinin %(.+?) seviyesinde\./,
      "Your expenses are at $1% of your income."
    )
    .replace(
      /(.+?) bütçesinde sınıra yaklaşıyorsun\. Kullanım oranı: %(.+?)\./,
      "You're approaching the limit in your $1 budget. Usage: $2%."
    )
    .replace(
      /(.+?) bütçesini aştın\. Kullanım oranı: %(.+?)\./,
      "You've exceeded your $1 budget. Usage: $2%."
    )
    .replace(
      /(.+?) kategorisinde bu ay (.+?) harcadın\./,
      "You spent $2 in the $1 category this month."
    )
    // Category name translations inside insight texts
    .replace(/\bYemek\b/g, "Food")
    .replace(/\bMarket\b/g, "Groceries")
    .replace(/\bAlışveriş\b/g, "Shopping")
    .replace(/\bUlaşım\b/g, "Transportation")
    .replace(/\bKira\b/g, "Rent")
    .replace(/\bEğitim\b/g, "Education")
    .replace(/\bSağlık\b/g, "Health")
    .replace(/\bDiğer\b/g, "Other");
}

function formatRecentDate(value?: string | null, language: Language = "en") {
  if (!value) return "-";

  const raw = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = raw.split("-");

  if (!year || !month || !day) return value;

  return language === "tr"
    ? `${day}.${month}.${year}`
    : `${year}-${month}-${day}`;
}

function DashboardSkeleton() {
  return (
    <div style={pageStyle}>
      <div style={heroHeader}>
        <Skeleton width={260} height={46} />
        <div style={{ marginTop: 12 }}>
          <Skeleton width={420} height={18} />
        </div>
      </div>

      <div style={summaryGrid}>
        {[1, 2, 3].map((item) => (
          <Card key={item}>
            <div style={summaryLeft}>
              <Skeleton width={52} height={52} borderRadius={999} />
              <div style={{ width: "100%" }}>
                <Skeleton width="40%" height={14} />
                <div style={{ height: 12 }} />
                <Skeleton width="75%" height={30} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={mainGrid}>
        <div style={leftColumn}>
          <Card style={{ minHeight: 420 }}>
            <Skeleton width={220} height={24} />
            <div style={{ height: 20 }} />
            <Skeleton width="100%" height={320} />
          </Card>

          <Card style={{ minHeight: 420 }}>
            <Skeleton width={180} height={24} />
            <div style={{ height: 20 }} />
            <Skeleton width="100%" height={320} />
          </Card>
        </div>

        <div style={rightColumn}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Card key={item}>
              <Skeleton width={180} height={24} />
              <div style={{ height: 18 }} />
              <Skeleton width="100%" height={120} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([]);
  const [dashboardInsight, setDashboardInsight] = useState<DashboardInsight | null>(null);
  const [budgetUsageItems, setBudgetUsageItems] = useState<BudgetUsageItem[]>([]);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
    // Fetch user name
    apiFetch("/auth/me").then((user: any) => {
      if (user?.first_name) setUserName(user.first_name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsNarrowScreen(window.innerWidth < 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const t = translations[language];

  async function loadDashboard() {
    try {
      const dashboard = await apiFetch("/dashboard/");
      setData(dashboard);
      setError("");
    } catch (err: any) {
      console.error("DASHBOARD LOAD ERROR:", err);
      setError(
        language === "tr"
          ? "Dashboard yüklenemedi."
          : "Failed to load dashboard."
      );
    }
  }

  async function loadPredictions() {
    try {
      const raw = await apiFetch("/predictions/");

      let normalized: PredictionItem[] = [];

      if (Array.isArray(raw)) {
        normalized = raw;
      } else if (raw && Array.isArray(raw.items)) {
        normalized = raw.items;
      } else {
        normalized = [];
      }

      setPredictions(normalized);
    } catch (err) {
      console.error("PREDICTIONS LOAD ERROR:", err);
      setPredictions([]);
    }
  }

  async function loadBreakdown() {
    try {
      const raw = await apiFetch("/transactions/category-breakdown");

      let normalized: BreakdownItem[] = [];

      if (Array.isArray(raw)) {
        normalized = raw;
      } else if (raw && Array.isArray(raw.breakdown)) {
        normalized = raw.breakdown;
      } else if (raw && Array.isArray(raw.items)) {
        normalized = raw.items;
      } else {
        normalized = [];
      }

      setBreakdown(normalized);
    } catch (err) {
      console.error("BREAKDOWN LOAD ERROR:", err);
      setBreakdown([]);
    }
  }

  async function loadTrend() {
    try {
      const raw = await apiFetch("/transactions/monthly-trend");

      let normalized: TrendItem[] = [];

      if (Array.isArray(raw)) {
        normalized = raw;
      } else if (raw && Array.isArray(raw.trend)) {
        normalized = raw.trend;
      } else if (raw && Array.isArray(raw.items)) {
        normalized = raw.items;
      } else {
        normalized = [];
      }

      setTrend(normalized);
    } catch (err) {
      console.error("TREND LOAD ERROR:", err);
      setTrend([]);
    }
  }

  async function loadRecentTransactions() {
    try {
      const raw = await apiFetch("/transactions/");

      let list: TransactionItem[] = [];

      if (Array.isArray(raw)) {
        list = raw;
      } else if (raw && Array.isArray(raw.items)) {
        list = raw.items;
      }

      setRecentTransactions(list.slice(0, 5));
    } catch (err) {
      console.error("RECENT TRANSACTIONS ERROR:", err);
      setRecentTransactions([]);
    }
  }

  async function loadBudgetUsage() {
    try {
      const token = localStorage.getItem("token");
      const languageHeader = localStorage.getItem("language") || "en";

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/budgets/usage`, {
        headers: {
          "Accept-Language": languageHeader,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const raw = await response.json().catch(() => null);

      if (!response.ok) {
        setBudgetUsageItems([]);
        return;
      }

      if (Array.isArray(raw)) {
        setBudgetUsageItems(raw);
      } else if (raw && Array.isArray(raw.items)) {
        setBudgetUsageItems(raw.items);
      } else {
        setBudgetUsageItems([]);
      }
    } catch {
      setBudgetUsageItems([]);
    }
  }

  async function loadAllDashboardData(showMainLoader = false) {
    if (showMainLoader) setLoading(true);
    setRefreshing(!showMainLoader);

    await Promise.all([
      loadDashboard(),
      loadPredictions(),
      loadBreakdown(),
      loadTrend(),
      loadRecentTransactions(),
      loadBudgetUsage(),
      loadDashboardInsight(),
    ]);

    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    loadAllDashboardData(true);
  }, [router, language]);
async function loadDashboardInsight() {
  try {
    const raw = await apiFetch(`/dashboard/insights?language=${language}`);
    setDashboardInsight(raw);
  } catch (err) {
    console.error("DASHBOARD INSIGHT ERROR:", err);
    setDashboardInsight(null);
  }
}

  const income = Number(data?.summary?.total_income ?? 0);
  const expense = Number(data?.summary?.total_expense ?? 0);
  const balance = Number(data?.summary?.balance ?? 0);

  const alerts = data?.alerts?.alerts ?? [];
  const budgetItems = budgetUsageItems.length > 0 ? budgetUsageItems : data?.budget_usage?.items ?? [];

  const chartData = breakdown
    .map((item) => {
      const value = Number(item.total);
      return {
        name: getDisplayCategory(item.category || "Unknown", language),
        value: Number.isNaN(value) ? 0 : value,
      };
    })
    .filter((item) => item.value > 0);

  const trendData = trend.map((item) => {
    const incomeValue = Number(item.income);
    const expenseValue = Number(item.expense);
    const balanceValue = Number(item.balance);

    return {
      period: item.period || "Unknown",
      income: Number.isNaN(incomeValue) ? 0 : incomeValue,
      expense: Number.isNaN(expenseValue) ? 0 : expenseValue,
      balance: Number.isNaN(balanceValue) ? 0 : balanceValue,
    };
  });

  const insight = useMemo(() => {
  if (income === 0 && expense === 0) {
    return {
      title: language === "tr" ? "Henüz veri yok" : "No data yet",
      message:
        language === "tr"
          ? "İlk işlemlerini eklediğinde burada sana özel finansal içgörü oluşacak."
          : "Your personalized financial insight will appear here once you add your first transactions.",
      toneBg: "rgba(148,163,184,0.12)",
      toneColor: "#cbd5e1",
      border: "1px solid rgba(148,163,184,0.18)",
    };
  }

  if (expense > income) {
    return {
      title:
        language === "tr"
          ? "Harcamalar gelirini geçti"
          : "Expenses exceeded income",
      message:
        language === "tr"
          ? "Bu dönemde gelirinden daha fazla harcama yaptın. Özellikle yüksek harcama kategorilerini gözden geçirmen faydalı olabilir."
          : "You spent more than you earned in this period. Reviewing your highest spending categories may help.",
      toneBg: "rgba(239,68,68,0.14)",
      toneColor: "#fecaca",
      border: "1px solid rgba(239,68,68,0.20)",
    };
  }

  if (income > 0 && expense >= income * 0.8) {
    return {
      title:
        language === "tr"
          ? "Sınırına yaklaşıyorsun"
          : "You are close to your limit",
      message:
        language === "tr"
          ? "Harcamaların gelirinin büyük kısmına ulaştı. Kalan dönemde daha kontrollü gitmek faydalı olabilir."
          : "Your expenses are reaching most of your income. Being more careful for the rest of the period may help.",
      toneBg: "rgba(245,158,11,0.14)",
      toneColor: "#fde68a",
      border: "1px solid rgba(245,158,11,0.20)",
    };
  }

  return {
    title:
      language === "tr"
        ? "Finansal durumun sağlıklı görünüyor"
        : "Your finances look healthy",
    message:
      language === "tr"
        ? "Gelirin şu an harcamalarını karşılıyor. Bu şekilde devam edersen pozitif bakiyeni koruyabilirsin."
        : "Your income is currently covering your expenses. If you continue like this, you are likely to maintain a positive balance.",
    toneBg: "rgba(34,197,94,0.14)",
    toneColor: "#bbf7d0",
    border: "1px solid rgba(34,197,94,0.20)",
  };
}, [income, expense, language]);

const insightTone = (() => {
  const status = dashboardInsight?.status;

  if (status === "danger") {
    return {
      bg: "rgba(239,68,68,0.14)",
      color: "#fecaca",
      border: "1px solid rgba(239,68,68,0.20)",
    };
  }

  if (status === "warning") {
    return {
      bg: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.20)",
    };
  }

  if (status === "empty") {
    return {
      bg: "rgba(148,163,184,0.12)",
      color: "#cbd5e1",
      border: "1px solid rgba(148,163,184,0.18)",
    };
  }

  return {
    bg: "rgba(34,197,94,0.14)",
    color: "#bbf7d0",
    border: "1px solid rgba(34,197,94,0.20)",
  };
})();

  const COLORS = [
    "#4f8cff",
    "#2dd4bf",
    "#f59e0b",
    "#ef4444",
    "#a78bfa",
    "#ec4899",
    "#22c55e",
    "#f97316",
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <Card style={errorCardStyle}>
          <div style={errorInner}>
            <div style={errorIconWrap}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={errorTitle}>
                {language === "tr" ? "Bir sorun oluştu" : "Something went wrong"}
              </div>
              <div style={errorText}>{error}</div>
              <button
                style={retryButton}
                onClick={() => loadAllDashboardData(true)}
              >
                <RefreshCw size={15} />
                {language === "tr" ? "Tekrar dene" : "Retry"}
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={pageStyle}>
        <EmptyState
          icon={<Inbox size={24} />}
          title={
            language === "tr" ? "Dashboard verisi yok" : "No dashboard data"
          }
          description={
            language === "tr"
              ? "Henüz gösterilecek veri bulunamadı."
              : "There is no data to show yet."
          }
        />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={heroHeader}>
        <div>
          {userName && (
            <div style={{ fontSize: 18, color: "#60a5fa", fontWeight: 800, marginBottom: 4 }}>
              {language === "tr" ? `Merhaba, ${userName} 👋` : `Hello, ${userName} 👋`}
            </div>
          )}
          <h1 style={titleStyle}>{t.dashboardTitle}</h1>
          <p style={subtitleStyle}>{t.dashboardSubtitle}</p>
          {lastUpdated && (
            <div style={lastUpdatedText}>
              {language === "tr" ? "Son güncelleme" : "Last updated"}: {lastUpdated.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        <button
          style={{
            ...refreshButton,
            opacity: refreshing ? 0.7 : 1,
            cursor: refreshing ? "not-allowed" : "pointer",
          }}
          onClick={() => loadAllDashboardData(false)}
          disabled={refreshing}
        >
          <RefreshCw size={16} style={{ transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }} />
          {refreshing
            ? language === "tr"
              ? "Yenileniyor..."
              : "Refreshing..."
            : language === "tr"
            ? "Yenile"
            : "Refresh"}
        </button>
      </div>

      <div
        style={{
          ...summaryGrid,
          gridTemplateColumns: isNarrowScreen
            ? "1fr"
            : "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <Card>
          <div style={summaryLeft}>
            <div
              style={{
                ...summaryIconWrap,
                background: "rgba(59,130,246,0.16)",
                color: "#60a5fa",
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.totalBalance}</div>
              <div style={summaryValue}>{formatMoney(balance, language)}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={summaryLeft}>
            <div
              style={{
                ...summaryIconWrap,
                background: "rgba(34,197,94,0.16)",
                color: "#4ade80",
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.income}</div>
              <div style={{ ...summaryValue, color: "#86efac" }}>
                {formatMoney(income, language)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={summaryLeft}>
            <div
              style={{
                ...summaryIconWrap,
                background: "rgba(239,68,68,0.16)",
                color: "#f87171",
              }}
            >
              <TrendingDown size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.expenses}</div>
              <div style={{ ...summaryValue, color: "#fca5a5" }}>
                {formatMoney(expense, language)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div
        style={{
          ...mainGrid,
          gridTemplateColumns: isNarrowScreen ? "1fr" : "2fr 1fr",
        }}
      >
        <div style={leftColumn}>
          <Card style={{ minHeight: 420 }}>
            <div style={sectionTitleRow}>
              <div style={sectionIconWrap}>
                <PieChartIcon size={18} />
              </div>
              <h2 style={sectionTitle}>{t.categoryBreakdown}</h2>
            </div>

            {chartData.length === 0 ? (
              <EmptyState
                icon={<PieChartIcon size={24} />}
                title={
                  language === "tr" ? "Kategori verisi yok" : "No category data"
                }
                description={t.noCategoryData}
              />
            ) : (
              <div style={chartContainerStyle}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={105}
                      innerRadius={40}
                      paddingAngle={3}
                      label
                      isAnimationActive
                      animationDuration={850}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        formatMoney(Number(Array.isArray(value) ? value[0] : (value ?? 0)), language)
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card style={{ minHeight: 420 }}>
            <div style={sectionTitleRow}>
              <div style={sectionIconWrap}>
                <BarChart3 size={18} />
              </div>
              <h2 style={sectionTitle}>{t.monthlyTrend}</h2>
            </div>

            {trendData.length === 0 ? (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title={language === "tr" ? "Trend verisi yok" : "No trend data"}
                description={t.noTrendData}
              />
            ) : (
              <div style={chartContainerStyle}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#273142" />
                    <XAxis dataKey="period" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value) =>
                        formatMoney(Number(Array.isArray(value) ? value[0] : (value ?? 0)), language)
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name={t.income}
                      isAnimationActive
                      animationDuration={850}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name={t.expenses}
                      isAnimationActive
                      animationDuration={850}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#4f8cff"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name={t.balance}
                      isAnimationActive
                      animationDuration={850}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <div style={rightColumn}>
          <Card>
  <div style={sectionTitleRow}>
    <div style={sectionIconWrap}>
      <Lightbulb size={18} />
    </div>
    <h2 style={sectionTitle}>
      {language === "tr" ? "Akıllı İçgörü" : "Smart Insight"}
    </h2>
  </div>

  <div
    style={{
      ...highlightCard,
      background: insightTone.bg,
      border: insightTone.border,
    }}
  >
    <div style={{ ...miniTitle, color: insightTone.color }}>
      {dashboardInsight?.title
        ? translateInsightText(dashboardInsight.title, language)
        : insight.title}
    </div>

    <div style={{ ...miniText, color: insight.toneColor }}>
      {dashboardInsight?.summary
        ? translateInsightText(dashboardInsight.summary, language)
        : insight.message}
    </div>

    {dashboardInsight?.messages && dashboardInsight.messages.length > 1 && (
  <div style={insightList}>
    {dashboardInsight.messages.slice(1).map((message, index) => (
      <div key={index} style={insightListItem}>
        • {translateInsightText(message, language)}
      </div>
    ))}
  </div>
)}
  </div>
</Card>

          <Card>
            <div style={sectionTitleRow}>
              <div style={sectionIconWrap}>
                <AlertTriangle size={18} />
              </div>
              <h2 style={sectionTitle}>{t.alerts}</h2>
            </div>

            {alerts.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle size={24} />}
                title={language === "tr" ? "Uyarı yok" : "No alerts"}
                description={t.noAlerts}
              />
            ) : (
              alerts.map((alert, index) => {
                const tone = getAlertTone(alert.status);

                return (
                  <div key={index} style={miniCard}>
                    <div style={miniTitle}>
                      {getDisplayCategory(alert.category, language)}
                    </div>
                    <div style={miniText}>
                      {t.usage}: {formatPercent(alert.percentage_used)}
                    </div>
                    <div
                      style={{
                        ...statusBadge,
                        background: tone.bg,
                        color: tone.color,
                        border: tone.border,
                      }}
                    >
                      {alert.status}
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          <Card>
            <div style={sectionTitleRow}>
              <div style={sectionIconWrap}>
                <Target size={18} />
              </div>
              <h2 style={sectionTitle}>{t.budgetUsage}</h2>
            </div>

            {budgetItems.length === 0 ? (
              <EmptyState
                icon={<Target size={24} />}
                title={
                  language === "tr" ? "Bütçe kullanımı yok" : "No budget usage"
                }
                description={t.noBudgetUsage}
              />
            ) : (
              budgetItems.map((item) => (
                <div key={item.budget_id} style={miniCard}>
                  <div style={miniTitle}>
                    {getDisplayCategory(item.category, language)}
                  </div>
                  <div style={miniText}>
                    {t.budget}:{" "}
                    {formatMoney(Number(item.budget_amount), language)}
                  </div>
                  <div style={miniText}>
                    {t.spent}: {formatMoney(Number(item.spent_amount), language)}
                  </div>
                  <div style={miniText}>
                    {t.remaining}:{" "}
                    {formatMoney(Number(item.remaining_amount), language)}
                  </div>

                  <div style={progressOuter}>
                    <div
                      style={{
                        ...progressInner,
                        width: `${Math.min(Number(item.percentage_used), 100)}%`,
                        background:
                          Number(item.percentage_used) >= 90
                            ? "#ef4444"
                            : Number(item.percentage_used) >= 70
                            ? "#f59e0b"
                            : "#22c55e",
                      }}
                    />
                  </div>

                  <div style={miniText}>
                    {t.usage}: {formatPercent(Number(item.percentage_used))}
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <div style={sectionTitleRow}>
              <div style={sectionIconWrap}>
                <Brain size={18} />
              </div>
              <h2 style={sectionTitle}>{t.predictions}</h2>
            </div>

            {predictions.length === 0 ? (
              <EmptyState
                icon={<Brain size={24} />}
                title={language === "tr" ? "Tahmin yok" : "No predictions"}
                description={t.noPredictions}
              />
            ) : (
              predictions.map((prediction, index) => {
                const tone = getRiskTone(prediction.risk_level);

                return (
                  <div key={index} style={miniCard}>
                    <div style={miniTitle}>
                      {getDisplayCategory(prediction.category, language)}
                    </div>
                    <div style={miniText}>
                      {t.predictedSpending}:{" "}
                      {formatMoney(Number(prediction.predicted_spent), language)}
                    </div>
                    <div
                      style={{
                        ...statusBadge,
                        background: tone.bg,
                        color: tone.color,
                        border: tone.border,
                      }}
                    >
                      {prediction.risk_level.toUpperCase()}
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          <Card>
            <div style={sectionTitleRow}>
              <div style={sectionIconWrap}>
                <ReceiptText size={18} />
              </div>
              <h2 style={sectionTitle}>
                {language === "tr" ? "Son İşlemler" : "Recent Transactions"}
              </h2>
            </div>

            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={<ReceiptText size={24} />}
                title={
                  language === "tr"
                    ? "Henüz işlem yok"
                    : "No recent transactions"
                }
                description={
                  language === "tr"
                    ? "İlk işlemler eklendiğinde burada görünecek."
                    : "Your latest transactions will appear here."
                }
              />
            ) : (
              recentTransactions.map((tx) => {
                const isIncome = tx.type === "income";
                const rawDate = tx.date || tx.spent_at || null;

                return (
                  <div key={tx.id} style={recentItem}>
                    <div style={recentLeft}>
                      <div style={recentIcon}>{getCategoryIcon(tx.category)}</div>

                      <div>
                        <div style={miniTitle}>
                          {getDisplayCategory(tx.category, language)}
                        </div>
                        <div style={miniText}>
                          {formatRecentDate(rawDate, language)}
                        </div>
                      </div>
                    </div>

                    <div style={recentRight}>
                      <div
                        style={{
                          ...amountStyle,
                          color: isIncome ? "#4ade80" : "#f87171",
                        }}
                      >
                        {isIncome ? "+" : "-"}
                        {formatMoney(Number(tx.amount), language)}
                      </div>

                      <div
                        style={{
                          ...statusBadge,
                          background: isIncome
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                          color: isIncome ? "#86efac" : "#fca5a5",
                          border: "none",
                        }}
                      >
                        {isIncome
                          ? language === "tr"
                            ? "Gelir"
                            : "Income"
                          : language === "tr"
                          ? "Gider"
                          : "Expense"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 30%), #0b0f17",
  color: "#f3f4f6",
  padding: 32,
};

const heroHeader: React.CSSProperties = {
  marginBottom: 28,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 800,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: "#9ca3af",
  marginTop: 8,
  fontSize: 18,
};

const lastUpdatedText: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  marginTop: 8,
  fontWeight: 700,
};

const refreshButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(37,99,235,0.16)",
  border: "1px solid rgba(59,130,246,0.32)",
  color: "#bfdbfe",
  borderRadius: 999,
  padding: "11px 15px",
  fontWeight: 900,
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 20,
  marginBottom: 24,
};

const summaryLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const summaryIconWrap: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const summaryLabel: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 16,
  marginBottom: 8,
};

const summaryValue: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 800,
};

const mainGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 24,
  minWidth: 0,
};

const leftColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minWidth: 0,
};

const rightColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  minWidth: 0,
};

const sectionTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 18,
};

const sectionIconWrap: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(37,99,235,0.16)",
  color: "#60a5fa",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
};

const highlightCard: React.CSSProperties = {
  borderRadius: 14,
  padding: 16,
};

const miniCard: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const miniTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 17,
  marginBottom: 8,
};

const miniText: React.CSSProperties = {
  color: "#d1d5db",
  marginBottom: 6,
};

const statusBadge: React.CSSProperties = {
  display: "inline-block",
  marginTop: 8,
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
};

const progressOuter: React.CSSProperties = {
  width: "100%",
  height: 10,
  background: "#0f172a",
  borderRadius: 999,
  overflow: "hidden",
  margin: "10px 0 8px 0",
};

const progressInner: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

const chartContainerStyle: React.CSSProperties = {
  width: "100%",
  height: 320,
  minWidth: 0,
  minHeight: 320,
};

const recentItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#0f172a",
  marginBottom: 10,
};

const recentLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const recentRight: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
};

const recentIcon: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "rgba(37,99,235,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#60a5fa",
};

const amountStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 16,
};

const errorCardStyle: React.CSSProperties = {
  border: "1px solid #7f1d1d",
};

const errorInner: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
};

const errorIconWrap: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: "rgba(239,68,68,0.16)",
  color: "#fca5a5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const errorTitle: React.CSSProperties = {
  color: "#fecaca",
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 6,
};

const errorText: React.CSSProperties = {
  color: "#fca5a5",
  lineHeight: 1.6,
};

const retryButton: React.CSSProperties = {
  marginTop: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#2563eb",
  border: "none",
  color: "#fff",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const insightList: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const insightListItem: React.CSSProperties = {
  color: "#d1d5db",
  fontSize: 14,
  lineHeight: 1.5,
};