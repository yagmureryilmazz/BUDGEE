import { useCallback, useEffect, useMemo, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { apiGet, getToken, removeToken } from "@/services/api";
import { useFocusEffect, useRouter } from "expo-router";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useLanguage, Language } from "@/context/LanguageContext";


const screenWidth = Dimensions.get("window").width;


const dashboardCopy = {
  tr: {
    eyebrow: "BUDGEE MOBILE",
    title: "Dashboard",
    subtitle: "Finans özetin burada.",
    logout: "Çıkış",
    loading: "Dashboard yükleniyor...",
    loadError: "Dashboard verileri alınamadı.",
    netBalance: "Net Bakiye",
    balanceHint: "Gelir - Gider hesabına göre.",
    income: "Gelir",
    expense: "Gider",
    recentTransactions: "Son İşlemler",
    seeAll: "Tümünü gör",
    emptyTitle: "Henüz işlem yok",
    emptyText: "İşlem eklediğinde burada görünecek.",
    quickActions: "Hızlı İşlemler",
    scanReceipt: "Fiş Tara",
    addTransaction: "İşlem Ekle",
    addGoal: "Hedef Ekle",
    chartTitle: "Gelir / Gider Dağılımı",
    noChartData: "Grafik için henüz veri yok.",
    categoryChartTitle: "Kategori Bazlı Giderler",
    noCategoryData: "Kategori grafiği için henüz gider yok.",
    trendChartTitle: "Aylık Harcama Trendi",
    noTrendData: "Trend grafiği için henüz yeterli veri yok.",
    insightTitle: "Akıllı Özet",
    insightNoData: "Henüz analiz için yeterli işlem yok. Birkaç işlem eklediğinde sana özet çıkaracağım.",
    insightPositive: "Finans durumun iyi görünüyor. Gelirin giderlerinden yüksek.",
    insightNegative: "Bu dönemde giderlerin gelirlerinden yüksek. Harcamalarını gözden geçirmek iyi olabilir.",
    insightHighExpense: "Harcamaların gelirinin büyük kısmına yaklaşmış. Bütçeni dikkatli takip et.",
    insightTopCategoryPrefix: "En çok harcama yaptığın kategori:",
    goalsTitle: "Birikim Hedefleri",
    goalsSubtitle: "Toplam hedef ilerlemen",
    goalsCount: "hedef",
    goalsSaved: "Birikim",
    goalsTarget: "Hedef",
    goalsEmpty: "Henüz birikim hedefi yok.",
    budgetTitle: "Bütçe Özeti",
    budgetSubtitle: "Toplam bütçe kullanımın",
    budgetSpent: "Harcanan",
    budgetLimit: "Limit",
    budgetEmpty: "Henüz bütçe yok.",
    budgetAlertsTitle: "Bütçe Uyarıları",
    budgetAlertsEmpty: "Şu an bütçe uyarısı yok.",
    budgetWarning: "Bütçenin büyük kısmı kullanıldı",
    budgetExceeded: "Bütçe limiti aşıldı",
    addBudget: "Bütçe Ekle",
  },
  en: {
    eyebrow: "BUDGEE MOBILE",
    title: "Dashboard",
    subtitle: "Your financial summary is here.",
    logout: "Logout",
    loading: "Loading dashboard...",
    loadError: "Failed to load dashboard data.",
    netBalance: "Net Balance",
    balanceHint: "Calculated from income minus expenses.",
    income: "Income",
    expense: "Expense",
    recentTransactions: "Recent Transactions",
    seeAll: "See all",
    emptyTitle: "No transactions yet",
    emptyText: "Your transactions will appear here after you add them.",
    quickActions: "Quick Actions",
    scanReceipt: "Scan Receipt",
    addTransaction: "Add Transaction",
    addGoal: "Add Goal",
    chartTitle: "Income / Expense Breakdown",
    noChartData: "No data available for the chart yet.",
    categoryChartTitle: "Expenses by Category",
    noCategoryData: "No expenses available for the category chart yet.",
    trendChartTitle: "Monthly Expense Trend",
    noTrendData: "Not enough data for the trend chart yet.",
    insightTitle: "Smart Insight",
    insightNoData: "There is not enough activity to analyze yet. Add a few transactions and I will summarize them for you.",
    insightPositive: "Your financial position looks good. Your income is higher than your expenses.",
    insightNegative: "Your expenses are higher than your income in this period. Reviewing your spending may help.",
    insightHighExpense: "Your expenses are getting close to most of your income. Keep an eye on your budget.",
    insightTopCategoryPrefix: "Your highest spending category:",
    goalsTitle: "Saving Goals",
    goalsSubtitle: "Your total goal progress",
    goalsCount: "goals",
    goalsSaved: "Saved",
    goalsTarget: "Target",
    goalsEmpty: "No saving goals yet.",
    budgetTitle: "Budget Summary",
    budgetSubtitle: "Your total budget usage",
    budgetSpent: "Spent",
    budgetLimit: "Limit",
    budgetEmpty: "No budgets yet.",
    budgetAlertsTitle: "Budget Alerts",
    budgetAlertsEmpty: "No budget alerts right now.",
    budgetWarning: "Most of this budget has been used",
    budgetExceeded: "Budget limit exceeded",
    addBudget: "Add Budget",
  },
};

type Transaction = {
  id: number;
  amount: number | string;
  type: "income" | "expense" | string;
  category: string;
  spent_at?: string | null;
  created_at?: string | null;
  currency?: string | null;
};

type GoalsSummary = {
  totalTarget: number;
  totalCurrent: number;
  count: number;
  progress: number;
};

type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  count: number;
  progress: number;
};

type BudgetAlert = {
  category: string;
  percentage_used: number;
  status: "warning" | "exceeded" | string;
};

function formatMoney(value: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeTransactions(raw: any): Transaction[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function getCategoryColor(index: number) {
  const colors = ["#60a5fa", "#f97316", "#a78bfa", "#22c55e", "#ef4444", "#eab308", "#14b8a6", "#f472b6"];
  return colors[index % colors.length];
}

function getMonthLabel(date: Date, language: Language) {
  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    month: "short",
  });
}

function translateCategory(category: string | null | undefined, language: Language) {
  const value = (category || "Other").trim();

  if (language === "en") {
    if (value === "Market") return "Groceries";
    if (value === "Transport") return "Transportation";
    if (value === "Bills") return "Utilities";
    return value;
  }

  const map: Record<string, string> = {
    Other: "Diğer",
    Shopping: "Alışveriş",
    Food: "Yemek",
    Entertainment: "Eğlence",
    Transport: "Ulaşım",
    Transportation: "Ulaşım",
    Health: "Sağlık",
    Education: "Eğitim",
    Bills: "Faturalar",
    Utilities: "Faturalar",
    Rent: "Kira",
    Salary: "Maaş",
    Income: "Gelir",
    Expense: "Gider",
    Market: "Market",
    Grocery: "Market",
    Groceries: "Market",
    Restaurant: "Restoran",
    Cafe: "Kafe",
  };

  return map[value] || value;
}

export default function Dashboard() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const t = dashboardCopy[language];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goalsSummary, setGoalsSummary] = useState<GoalsSummary>({
    totalTarget: 0,
    totalCurrent: 0,
    count: 0,
    progress: 0,
  });
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({
    totalBudget: 0,
    totalSpent: 0,
    count: 0,
    progress: 0,
  });
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

  // Staggered fade-in + slide-up animations
  const balanceAnim = useSharedValue(0);
  const insightAnim = useSharedValue(0);
  const goalsAnim = useSharedValue(0);
  const budgetAnim = useSharedValue(0);
  const incomeAnim = useSharedValue(0);
  const expenseAnim = useSharedValue(0);
  const chartOneAnim = useSharedValue(0);
  const chartTwoAnim = useSharedValue(0);
  const chartThreeAnim = useSharedValue(0);
  const shimmerAnim = useSharedValue(0.45);

  useEffect(() => {
    balanceAnim.value = withDelay(0, withTiming(1, { duration: 500 }));
    insightAnim.value = withDelay(100, withTiming(1, { duration: 500 }));
    goalsAnim.value = withDelay(200, withTiming(1, { duration: 500 }));
    budgetAnim.value = withDelay(300, withTiming(1, { duration: 500 }));
    incomeAnim.value = withDelay(400, withTiming(1, { duration: 500 }));
    expenseAnim.value = withDelay(500, withTiming(1, { duration: 500 }));
    chartOneAnim.value = withDelay(600, withTiming(1, { duration: 500 }));
    chartTwoAnim.value = withDelay(700, withTiming(1, { duration: 500 }));
    chartThreeAnim.value = withDelay(800, withTiming(1, { duration: 500 }));
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750 }),
        withTiming(0.45, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  const balanceFadeStyle = useAnimatedStyle(() => ({
    opacity: balanceAnim.value,
    transform: [{ translateY: (1 - balanceAnim.value) * 20 }],
  }));

  const insightFadeStyle = useAnimatedStyle(() => ({
    opacity: insightAnim.value,
    transform: [{ translateY: (1 - insightAnim.value) * 20 }],
  }));

  const goalsFadeStyle = useAnimatedStyle(() => ({
    opacity: goalsAnim.value,
    transform: [{ translateY: (1 - goalsAnim.value) * 20 }],
  }));
  const budgetFadeStyle = useAnimatedStyle(() => ({
    opacity: budgetAnim.value,
    transform: [{ translateY: (1 - budgetAnim.value) * 20 }],
  }));

  const incomeFadeStyle = useAnimatedStyle(() => ({
    opacity: incomeAnim.value,
    transform: [{ translateY: (1 - incomeAnim.value) * 20 }],
  }));

  const expenseFadeStyle = useAnimatedStyle(() => ({
    opacity: expenseAnim.value,
    transform: [{ translateY: (1 - expenseAnim.value) * 20 }],
  }));

  const chartOneFadeStyle = useAnimatedStyle(() => ({
    opacity: chartOneAnim.value,
    transform: [{ translateY: (1 - chartOneAnim.value) * 20 }],
  }));

  const chartTwoFadeStyle = useAnimatedStyle(() => ({
    opacity: chartTwoAnim.value,
    transform: [{ translateY: (1 - chartTwoAnim.value) * 20 }],
  }));

  const chartThreeFadeStyle = useAnimatedStyle(() => ({
    opacity: chartThreeAnim.value,
    transform: [{ translateY: (1 - chartThreeAnim.value) * 20 }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerAnim.value,
  }));

  async function loadDashboard(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const token = await getToken();

      if (!token) {
        router.replace("/");
        return;
      }

      // Fetch user name
      apiGet<any>("/auth/me").then((user) => {
        if (user?.first_name) setUserName(user.first_name);
      }).catch(() => {});

      const transactionsData = await apiGet<any>("/transactions/");
      setTransactions(normalizeTransactions(transactionsData));

      try {
        const goalsData = await apiGet<any>("/savings-goals/progress");
        const items = Array.isArray(goalsData?.items) ? goalsData.items : [];
        const totalTarget = items.reduce(
          (sum: number, item: any) => sum + Number(item.target_amount || 0),
          0
        );
        const totalCurrent = items.reduce(
          (sum: number, item: any) => sum + Number(item.current_amount || 0),
          0
        );
        const progress = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;

        setGoalsSummary({
          totalTarget,
          totalCurrent,
          count: items.length,
          progress,
        });
      } catch {
        setGoalsSummary({
          totalTarget: 0,
          totalCurrent: 0,
          count: 0,
          progress: 0,
        });
      }

      try {
        const budgetUsageData = await apiGet<any>("/budgets/usage");
        const items = Array.isArray(budgetUsageData?.items) ? budgetUsageData.items : [];
        const totalBudget = items.reduce(
          (sum: number, item: any) => sum + Number(item.budget_amount || 0),
          0
        );
        const totalSpent = items.reduce(
          (sum: number, item: any) => sum + Number(item.spent_amount || 0),
          0
        );
        const progress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

        setBudgetSummary({
          totalBudget,
          totalSpent,
          count: items.length,
          progress,
        });
      } catch {
        setBudgetSummary({
          totalBudget: 0,
          totalSpent: 0,
          count: 0,
          progress: 0,
        });
      }

      try {
        const budgetAlertsData = await apiGet<any>("/budgets/alerts");
        setBudgetAlerts(Array.isArray(budgetAlertsData?.alerts) ? budgetAlertsData.alerts : []);
      } catch {
        setBudgetAlerts([]);
      }
    } catch (err: any) {
      if (err?.message === "Not authenticated" || err?.message === "Could not validate credentials") {
        await removeToken();
        router.replace("/");
        return;
      }

      setError(err?.message || t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(false);
    }, [])
  );

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, item) => {
        const amount = Number(item.amount || 0);

        if (item.type === "income") {
          acc.income += amount;
        } else if (item.type === "expense") {
          acc.expense += amount;
        }

        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const balance = totals.income - totals.expense;
  const hasChartData = totals.income > 0 || totals.expense > 0;
  const chartData = useMemo(
    () => [
      {
        name: t.income,
        amount: totals.income,
        color: "#22c55e",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
      {
        name: t.expense,
        amount: totals.expense,
        color: "#ef4444",
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      },
    ].filter((item) => item.amount > 0),
    [totals.income, totals.expense, t.income, t.expense]
  );

  const categoryChartData = useMemo(() => {
    const grouped = transactions.reduce<Record<string, number>>((acc, item) => {
      if (item.type !== "expense") return acc;

      const category = item.category || "Other";
      const amount = Number(item.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) return acc;

      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, amount], index) => ({
        name: translateCategory(category, language),
        amount,
        color: getCategoryColor(index),
        legendFontColor: "#cbd5e1",
        legendFontSize: 12,
      }));
  }, [transactions, language]);

  const hasCategoryChartData = categoryChartData.length > 0;

  const monthlyTrendData = useMemo(() => {
    const grouped = transactions.reduce<Record<string, { label: string; value: number }>>((acc, item) => {
      if (item.type !== "expense") return acc;

      const dateValue = item.spent_at || item.created_at;
      if (!dateValue) return acc;

      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return acc;

      const amount = Number(item.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return acc;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = {
        label: getMonthLabel(date, language),
        value: (acc[key]?.value || 0) + amount,
      };

      return acc;
    }, {});

    const entries = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    return {
      labels: entries.map(([, item]) => item.label),
      datasets: [
        {
          data: entries.map(([, item]) => item.value),
        },
      ],
    };
  }, [transactions, language]);

  const hasTrendData = monthlyTrendData.datasets[0].data.length > 0;
  const topExpenseCategory = categoryChartData[0];

  const smartInsight = useMemo(() => {
    if (transactions.length === 0) {
      return {
        icon: "✨",
        text: t.insightNoData,
        tone: "neutral" as const,
      };
    }

    if (totals.expense > totals.income && totals.expense > 0) {
      return {
        icon: "⚠️",
        text: t.insightNegative,
        tone: "danger" as const,
      };
    }

    if (totals.income > 0 && totals.expense >= totals.income * 0.8) {
      return {
        icon: "👀",
        text: t.insightHighExpense,
        tone: "warning" as const,
      };
    }

    if (topExpenseCategory) {
      return {
        icon: "📌",
        text: `${t.insightTopCategoryPrefix} ${topExpenseCategory.name}`,
        tone: "neutral" as const,
      };
    }

    return {
      icon: "✅",
      text: t.insightPositive,
      tone: "positive" as const,
    };
  }, [transactions.length, totals.expense, totals.income, topExpenseCategory, t]);
  const recentTransactions = transactions.slice(0, 5);

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard(false);
  }

  if (loading) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loadingHeader}>
          <Animated.View style={[styles.skeletonEyebrow, shimmerStyle]} />
          <Animated.View style={[styles.skeletonTitle, shimmerStyle]} />
          <Animated.View style={[styles.skeletonSubtitle, shimmerStyle]} />
        </View>

        <Animated.View style={[styles.skeletonHeroCard, shimmerStyle]} />

        <View style={styles.skeletonRow}>
          <Animated.View style={[styles.skeletonSmallCard, shimmerStyle]} />
          <Animated.View style={[styles.skeletonSmallCard, shimmerStyle]} />
        </View>

        <Animated.View style={[styles.skeletonCard, shimmerStyle]} />
        <Animated.View style={[styles.skeletonCard, shimmerStyle]} />
        <Animated.View style={[styles.skeletonChartCard, shimmerStyle]} />

        <View style={styles.loadingFooterRow}>
          <ActivityIndicator size="small" color="#60a5fa" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#60a5fa" />
      }
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          {userName && (
            <Text style={styles.greetingText}>
              {language === "tr" ? `Merhaba, ${userName} 👋` : `Hello, ${userName} 👋`}
            </Text>
          )}
          <Text style={styles.eyebrow}>{t.eyebrow}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.languageSwitch}>
            <TouchableOpacity
              onPress={() => setLanguage("tr")}
              style={[
                styles.languageButton,
                language === "tr" && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === "tr" && styles.languageButtonTextActive,
                ]}
              >
                TR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage("en")}
              style={[
                styles.languageButton,
                language === "en" && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === "en" && styles.languageButtonTextActive,
                ]}
              >
                EN
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <Text style={styles.quickTitle}>{t.quickActions}</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push("/(tabs)/ocr")}
        >
          <Text style={styles.quickActionIcon}>📷</Text>
          <Text style={styles.quickActionText}>{t.scanReceipt}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push("/(tabs)/transactions")}
        >
          <Text style={styles.quickActionIcon}>➕</Text>
          <Text style={styles.quickActionText}>{t.addTransaction}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push("/saving-goals")}
        >
          <Text style={styles.quickActionIcon}>🎯</Text>
          <Text style={styles.quickActionText}>{t.addGoal}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push("/(tabs)/budgets")}
        >
          <Text style={styles.quickActionIcon}>📊</Text>
          <Text style={styles.quickActionText}>{t.addBudget}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.balanceCard, balanceFadeStyle]}>
        <Text style={styles.cardLabel}>{t.netBalance}</Text>
        <Text style={[styles.balanceValue, { color: balance >= 0 ? "#86efac" : "#fca5a5" }]}>
          {formatMoney(balance)}
        </Text>
        <Text style={styles.cardHint}>{t.balanceHint}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.insightCard,
          smartInsight.tone === "danger" && styles.insightCardDanger,
          smartInsight.tone === "warning" && styles.insightCardWarning,
          smartInsight.tone === "positive" && styles.insightCardPositive,
          insightFadeStyle,
        ]}
      >
        <View style={styles.insightIconBox}>
          <Text style={styles.insightIcon}>{smartInsight.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.insightTitle}>{t.insightTitle}</Text>
          <Text style={styles.insightText}>{smartInsight.text}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.goalsCard, goalsFadeStyle]}>
        <View style={styles.goalsHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.goalsTitle}>🎯 {t.goalsTitle}</Text>
            <Text style={styles.goalsSubtitle}>{t.goalsSubtitle}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push("/saving-goals")}>
            <Text style={styles.seeAllText}>{t.seeAll}</Text>
          </TouchableOpacity>
        </View>

        {goalsSummary.count === 0 ? (
          <Text style={styles.goalsEmptyText}>{t.goalsEmpty}</Text>
        ) : (
          <>
            <View style={styles.goalsStatsRow}>
              <View style={styles.goalsStatBox}>
                <Text style={styles.goalsStatLabel}>{t.goalsSaved}</Text>
                <Text style={styles.goalsStatValue}>{formatMoney(goalsSummary.totalCurrent)}</Text>
              </View>

              <View style={styles.goalsStatBox}>
                <Text style={styles.goalsStatLabel}>{t.goalsTarget}</Text>
                <Text style={styles.goalsStatValue}>{formatMoney(goalsSummary.totalTarget)}</Text>
              </View>
            </View>

            <View style={styles.goalsProgressBg}>
              <View style={[styles.goalsProgressBar, { width: `${goalsSummary.progress}%` }]} />
            </View>

            <Text style={styles.goalsProgressText}>
              %{Math.round(goalsSummary.progress)} · {goalsSummary.count} {t.goalsCount}
            </Text>
          </>
        )}
      </Animated.View>

      <Animated.View style={[styles.budgetCard, budgetFadeStyle]}>
        <View style={styles.budgetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.budgetTitle}>📊 {t.budgetTitle}</Text>
            <Text style={styles.budgetSubtitle}>{t.budgetSubtitle}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push("/(tabs)/budgets")}>
            <Text style={styles.seeAllText}>{t.seeAll}</Text>
          </TouchableOpacity>
        </View>

        {budgetSummary.count === 0 ? (
          <Text style={styles.budgetEmptyText}>{t.budgetEmpty}</Text>
        ) : (
          <>
            <View style={styles.budgetStatsRow}>
              <View style={styles.budgetStatBox}>
                <Text style={styles.budgetStatLabel}>{t.budgetSpent}</Text>
                <Text style={styles.budgetStatValue}>{formatMoney(budgetSummary.totalSpent)}</Text>
              </View>

              <View style={styles.budgetStatBox}>
                <Text style={styles.budgetStatLabel}>{t.budgetLimit}</Text>
                <Text style={styles.budgetStatValue}>{formatMoney(budgetSummary.totalBudget)}</Text>
              </View>
            </View>

            <View style={styles.budgetProgressBg}>
              <View
                style={[
                  styles.budgetProgressBar,
                  budgetSummary.progress >= 100 && styles.budgetProgressBarDanger,
                  budgetSummary.progress >= 80 && budgetSummary.progress < 100 && styles.budgetProgressBarWarning,
                  { width: `${budgetSummary.progress}%` },
                ]}
              />
            </View>

            <Text style={styles.budgetProgressText}>%{Math.round(budgetSummary.progress)}</Text>
          </>
        )}

        <View style={styles.alertDivider} />

        <Text style={styles.alertTitle}>{t.budgetAlertsTitle}</Text>

        {budgetAlerts.length === 0 ? (
          <Text style={styles.alertEmptyText}>{t.budgetAlertsEmpty}</Text>
        ) : (
          budgetAlerts.slice(0, 3).map((alert) => {
            const isExceeded = alert.status === "exceeded";

            return (
              <View
                key={`${alert.category}-${alert.status}`}
                style={[styles.alertRow, isExceeded ? styles.alertRowDanger : styles.alertRowWarning]}
              >
                <Text style={styles.alertIcon}>{isExceeded ? "🚨" : "⚠️"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertCategory}>{translateCategory(alert.category, language)}</Text>
                  <Text style={styles.alertText}>
                    {isExceeded ? t.budgetExceeded : t.budgetWarning} · %{Math.round(alert.percentage_used)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Animated.View>

      <View style={styles.summaryGrid}>
        <Animated.View style={[styles.summaryCard, incomeFadeStyle]}>
          <Text style={styles.summaryIcon}>↗</Text>
          <Text style={styles.cardLabel}>{t.income}</Text>
          <Text style={styles.incomeValue}>{formatMoney(totals.income)}</Text>
        </Animated.View>

        <Animated.View style={[styles.summaryCard, expenseFadeStyle]}>
          <Text style={styles.summaryIcon}>↘</Text>
          <Text style={styles.cardLabel}>{t.expense}</Text>
          <Text style={styles.expenseValue}>{formatMoney(totals.expense)}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.chartCard, chartOneFadeStyle]}>
        <Text style={styles.chartTitle}>{t.chartTitle}</Text>
        {hasChartData ? (
          <PieChart
            data={chartData}
            width={screenWidth - 44}
            height={190}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: () => "#f8fafc",
              labelColor: () => "#cbd5e1",
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="8"
            absolute
          />
        ) : (
          <View style={styles.chartEmptyBox}>
            <Text style={styles.chartEmptyIcon}>📊</Text>
            <Text style={styles.chartEmptyText}>{t.noChartData}</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.chartCard, chartTwoFadeStyle]}>
        <Text style={styles.chartTitle}>{t.categoryChartTitle}</Text>
        {hasCategoryChartData ? (
          <PieChart
            data={categoryChartData}
            width={screenWidth - 44}
            height={210}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              color: () => "#f8fafc",
              labelColor: () => "#cbd5e1",
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="8"
            absolute
          />
        ) : (
          <View style={styles.chartEmptyBox}>
            <Text style={styles.chartEmptyIcon}>📊</Text>
            <Text style={styles.chartEmptyText}>{t.noCategoryData}</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.chartCard, chartThreeFadeStyle]}>
        <Text style={styles.chartTitle}>{t.trendChartTitle}</Text>
        {hasTrendData ? (
          <LineChart
            data={monthlyTrendData}
            width={screenWidth - 44}
            height={220}
            chartConfig={{
              backgroundColor: "#111827",
              backgroundGradientFrom: "#111827",
              backgroundGradientTo: "#111827",
              decimalPlaces: 0,
              color: () => "#60a5fa",
              labelColor: () => "#cbd5e1",
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#93c5fd",
              },
            }}
            bezier
            style={styles.lineChart}
          />
        ) : (
          <View style={styles.chartEmptyBox}>
            <Text style={styles.chartEmptyIcon}>📈</Text>
            <Text style={styles.chartEmptyText}>{t.noTrendData}</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.recentTransactions}</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
          <Text style={styles.seeAllText}>{t.seeAll}</Text>
        </TouchableOpacity>
      </View>

      {recentTransactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.emptyText}</Text>
        </View>
      ) : (
        recentTransactions.map((item) => {
          const amount = Number(item.amount || 0);
          const isExpense = item.type === "expense";

          return (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <View
                  style={[
                    styles.transactionIcon,
                    {
                      backgroundColor: isExpense
                        ? "rgba(239,68,68,0.16)"
                        : "rgba(34,197,94,0.16)",
                    },
                  ]}
                >
                  <Text style={styles.transactionIconText}>{isExpense ? "-" : "+"}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.transactionCategory}>{translateCategory(item.category, language)}</Text>
                  <Text style={styles.transactionDate}>{formatDate(item.spent_at || item.created_at, language)}</Text>
                </View>
              </View>

              <Text style={[styles.transactionAmount, { color: isExpense ? "#fca5a5" : "#86efac" }]}>
                {isExpense ? "-" : "+"}
                {formatMoney(amount, item.currency || "TRY")}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0b0f17",
  },
  content: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 64,
    paddingBottom: 180,
  },
  centerPage: {
    flex: 1,
    backgroundColor: "#0b0f17",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontWeight: "600",
  },
  loadingHeader: {
    marginBottom: 20,
  },
  loadingFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 6,
  },
  skeletonEyebrow: {
    width: 120,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    marginBottom: 12,
  },
  skeletonTitle: {
    width: 210,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#1f2937",
    marginBottom: 10,
  },
  skeletonSubtitle: {
    width: "72%",
    height: 16,
    borderRadius: 999,
    backgroundColor: "#1f2937",
  },
  skeletonHeroCard: {
    height: 132,
    borderRadius: 22,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  skeletonSmallCard: {
    flex: 1,
    height: 118,
    borderRadius: 18,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  skeletonCard: {
    height: 156,
    borderRadius: 22,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 18,
  },
  skeletonChartCard: {
    height: 260,
    borderRadius: 22,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
    gap: 12,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 10,
  },
  languageSwitch: {
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
  languageButtonText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "900",
  },
  languageButtonTextActive: {
    color: "#fff",
  },
  greetingText: {
    color: "#60a5fa",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  eyebrow: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: "#f8fafc",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 6,
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  logoutText: {
    color: "#e5e7eb",
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    color: "#fecaca",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    fontWeight: "700",
  },
  quickTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  quickActionText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  balanceCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
  },
  cardLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: "900",
  },
  cardHint: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 13,
  },
  insightCard: {
    backgroundColor: "rgba(96,165,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  insightCardDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  insightCardWarning: {
    backgroundColor: "rgba(234,179,8,0.12)",
    borderColor: "rgba(234,179,8,0.3)",
  },
  insightCardPositive: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  insightIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightIcon: {
    fontSize: 24,
  },
  insightTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  insightText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  goalsCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  goalsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  goalsTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  goalsSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  goalsEmptyText: {
    color: "#94a3b8",
    fontWeight: "700",
  },
  goalsStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  goalsStatBox: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 16,
    padding: 12,
  },
  goalsStatLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5,
  },
  goalsStatValue: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
  },
  goalsProgressBg: {
    height: 11,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  goalsProgressBar: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 999,
  },
  goalsProgressText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "900",
  },
  budgetCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  budgetTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  budgetSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  budgetEmptyText: {
    color: "#94a3b8",
    fontWeight: "700",
  },
  budgetStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  budgetStatBox: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 16,
    padding: 12,
  },
  budgetStatLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5,
  },
  budgetStatValue: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
  },
  budgetProgressBg: {
    height: 11,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  budgetProgressBar: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 999,
  },
  budgetProgressBarWarning: {
    backgroundColor: "#eab308",
  },
  budgetProgressBarDanger: {
    backgroundColor: "#ef4444",
  },
  budgetProgressText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "900",
  },
  alertDivider: {
    height: 1,
    backgroundColor: "#1f2937",
    marginVertical: 14,
  },
  alertTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  alertEmptyText: {
    color: "#94a3b8",
    fontWeight: "700",
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  alertRowWarning: {
    backgroundColor: "rgba(234,179,8,0.12)",
    borderColor: "rgba(234,179,8,0.32)",
  },
  alertRowDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.32)",
  },
  alertIcon: {
    fontSize: 22,
  },
  alertCategory: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },
  alertText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 26,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    padding: 16,
  },
  summaryIcon: {
    color: "#60a5fa",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  incomeValue: {
    color: "#86efac",
    fontSize: 19,
    fontWeight: "900",
  },
  expenseValue: {
    color: "#fca5a5",
    fontSize: 19,
    fontWeight: "900",
  },
  chartCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 26,
    overflow: "hidden",
  },
  chartTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  chartEmptyBox: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  chartEmptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  chartEmptyText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "700",
  },
  lineChart: {
    borderRadius: 16,
    marginLeft: -12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
  },
  seeAllText: {
    color: "#93c5fd",
    fontWeight: "800",
  },
  emptyBox: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    padding: 20,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: {
    color: "#94a3b8",
  },
  transactionCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionIconText: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "900",
  },
  transactionCategory: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "900",
  },
  transactionDate: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "900",
  },
});