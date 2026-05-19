import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useLanguage, Language } from "@/context/LanguageContext";



const copy = {
  tr: {
    eyebrow: "BUDGEE MOBILE",
    title: "Bütçeler",
    subtitle: "Kategori bazlı harcama limitlerini takip et.",
    category: "Kategori",
    amount: "Bütçe tutarı",
    startDate: "Başlangıç tarihi",
    endDate: "Bitiş tarihi",
    addBudget: "Bütçe Ekle",
    updateBudget: "Bütçeyi Güncelle",
    cancelEdit: "Düzenlemeyi İptal Et",
    loading: "Bütçeler yükleniyor...",
    emptyTitle: "Henüz bütçe yok",
    emptyText: "İlk bütçeni eklediğinde burada görünecek.",
    spent: "Harcanan",
    remaining: "Kalan",
    budget: "Bütçe",
    overBudget: "Limit aşıldı",
    active: "Aktif",
    inactive: "Pasif",
    edit: "Düzenle",
    delete: "Sil",
    deleteTitle: "Bütçeyi sil",
    deleteMessage: "Bu bütçeyi silmek istediğine emin misin?",
    confirmDelete: "Evet, sil",
    cancel: "Vazgeç",
    error: "Hata",
    fillRequired: "Kategori ve bütçe tutarı zorunlu.",
    invalidAmount: "Geçerli bir tutar girmelisin.",
    positiveAmount: "Tutar 0'dan büyük olmalı.",
    invalidDates: "Bitiş tarihi başlangıçtan önce olamaz.",
    saveError: "Bütçe kaydedilemedi.",
    fetchError: "Bütçeler alınamadı.",
    deleteError: "Bütçe silinemedi.",
    chooseStart: "Başlangıç seç",
    chooseEnd: "Bitiş seç",
    thisMonth: "Bu ay",
    nextMonth: "Gelecek ay",
    editingBadge: "Düzenleme modu",
    warningLimit: "Bütçe kullanımın %80'i geçti.",
    duplicateBudget: "Bu kategori ve tarih aralığı için zaten bütçe var.",
  },
  en: {
    eyebrow: "BUDGEE MOBILE",
    title: "Budgets",
    subtitle: "Track category-based spending limits.",
    category: "Category",
    amount: "Budget amount",
    startDate: "Start date",
    endDate: "End date",
    addBudget: "Add Budget",
    updateBudget: "Update Budget",
    cancelEdit: "Cancel Edit",
    loading: "Loading budgets...",
    emptyTitle: "No budgets yet",
    emptyText: "Your first budget will appear here after you add it.",
    spent: "Spent",
    remaining: "Remaining",
    budget: "Budget",
    overBudget: "Over budget",
    active: "Active",
    inactive: "Inactive",
    edit: "Edit",
    delete: "Delete",
    deleteTitle: "Delete budget",
    deleteMessage: "Are you sure you want to delete this budget?",
    confirmDelete: "Yes, delete",
    cancel: "Cancel",
    error: "Error",
    fillRequired: "Category and budget amount are required.",
    invalidAmount: "Please enter a valid amount.",
    positiveAmount: "Amount must be greater than 0.",
    invalidDates: "End date cannot be earlier than start date.",
    saveError: "Could not save budget.",
    fetchError: "Failed to load budgets.",
    deleteError: "Could not delete budget.",
    chooseStart: "Choose start",
    chooseEnd: "Choose end",
    thisMonth: "This month",
    nextMonth: "Next month",
    editingBadge: "Editing mode",
    warningLimit: "Your budget usage has passed 80%.",
    duplicateBudget: "A budget already exists for this category and date range.",
  },
};

const categoryOptions = [
  "Food",
  "Shopping",
  "Market",
  "Transport",
  "Entertainment",
  "Health",
  "Education",
  "Bills",
  "Rent",
  "Other",
];

type BudgetUsage = {
  budget_id: number;
  category: string;
  budget_amount: number | string;
  spent_amount: number | string;
  remaining_amount: number | string;
  percentage_used: number;
  is_over_budget: boolean;
  period_start: string;
  period_end: string;
};

type Budget = {
  id: number;
  category: string;
  amount: number | string;
  period_start: string;
  period_end: string;
  is_active: boolean;
};

function normalizeAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

function formatMoney(value: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | Date | null | undefined, language: Language) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toBackendDate(date: Date) {
  return date.toISOString();
}

function normalizeUsage(raw: any): BudgetUsage[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function translateCategory(category: string | null | undefined, language: Language) {
  const value = (category || "Other").trim();

  if (language === "en") return value;

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
    Rent: "Kira",
    Salary: "Maaş",
    Market: "Market",
    Grocery: "Market",
    Groceries: "Market",
    Restaurant: "Restoran",
    Cafe: "Kafe",
  };

  return map[value] || value;
}

function getMonthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getMonthEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getNextMonthStart() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getNextMonthEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 2);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getBudgetErrorMessage(detail: any, language: Language, fallback: string) {
  const t = copy[language];

  if (!detail) return fallback;

  if (typeof detail === "string") {
    const lower = detail.toLowerCase();

    if (
      lower.includes("already exists") ||
      lower.includes("another budget") ||
      lower.includes("duplicate") ||
      lower.includes("zaten")
    ) {
      return t.duplicateBudget;
    }

    if (lower.includes("end date") || lower.includes("earlier")) {
      return t.invalidDates;
    }

    if (lower.includes("amount")) {
      return t.invalidAmount;
    }

    return fallback;
  }

  if (Array.isArray(detail)) {
    return fallback;
  }

  if (typeof detail === "object") {
    const message = detail.msg || detail.message || detail.error || "";
    if (message) return getBudgetErrorMessage(message, language, fallback);
  }

  return fallback;
}

function AnimatedProgressBar({
  percent,
  isWarning,
  isOver,
}: {
  percent: number;
  isWarning: boolean;
  isOver: boolean;
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: Math.min(Math.max(percent, 0), 100),
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [percent, progressAnim]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.progressBg}>
      <Animated.View
        style={[
          styles.progressBar,
          isWarning && styles.progressBarWarning,
          isOver && styles.progressBarOver,
          { width: animatedWidth },
        ]}
      />
    </View>
  );
}

function AnimatedSummaryProgressBar({ percent }: { percent: number }) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: Math.min(Math.max(percent, 0), 100),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent, progressAnim]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const isWarning = percent >= 80 && percent < 100;
  const isOver = percent >= 100;

  return (
    <View style={styles.summaryProgressBg}>
      <Animated.View
        style={[
          styles.summaryProgressBar,
          isWarning && styles.summaryProgressBarWarning,
          isOver && styles.summaryProgressBarOver,
          { width: animatedWidth },
        ]}
      />
    </View>
  );
}

export default function Budgets() {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];

  const [usageItems, setUsageItems] = useState<BudgetUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState<Date>(getMonthStart());
  const [periodEnd, setPeriodEnd] = useState<Date>(getMonthEnd());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const warningBudgets = usageItems.filter(
    (item) => !item.is_over_budget && Number(item.percentage_used || 0) >= 80
  );

  const summary = useMemo(() => {
    return usageItems.reduce(
      (acc, item) => {
        acc.totalBudget += Number(item.budget_amount || 0);
        acc.totalSpent += Number(item.spent_amount || 0);
        return acc;
      },
      { totalBudget: 0, totalSpent: 0 }
    );
  }, [usageItems]);

  const summaryPercent =
    summary.totalBudget > 0
      ? Math.min((summary.totalSpent / summary.totalBudget) * 100, 100)
      : 0;

  async function fetchBudgets(showLoader = true) {
    if (showLoader) setLoading(true);

    try {
      const data = await apiGet<any>("/budgets/usage");
      setUsageItems(normalizeUsage(data));
    } catch (err: any) {
      setWarningMessage(err?.message || t.fetchError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBudgets(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBudgets(false);
    }, [language])
  );

  function resetForm() {
    setCategory("Food");
    setAmount("");
    setPeriodStart(getMonthStart());
    setPeriodEnd(getMonthEnd());
    setEditingId(null);
  }

  async function saveBudget() {
    const cleanCategory = category.trim();
    const numericAmount = normalizeAmount(amount);

    if (!cleanCategory || !amount.trim()) {
      setWarningMessage(t.fillRequired);
      return;
    }

    if (!Number.isFinite(numericAmount) || Number.isNaN(numericAmount)) {
      setWarningMessage(t.invalidAmount);
      return;
    }

    if (numericAmount <= 0) {
      setWarningMessage(t.positiveAmount);
      return;
    }

    if (periodEnd < periodStart) {
      setWarningMessage(t.invalidDates);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        category: cleanCategory,
        amount: numericAmount,
        period_start: toBackendDate(periodStart),
        period_end: toBackendDate(periodEnd),
        is_active: true,
      };

      if (editingId) {
        await apiPatch(`/budgets/${editingId}`, payload);
      } else {
        await apiPost("/budgets/", payload, true);
      }

      resetForm();
      await fetchBudgets(false);
    } catch (err: any) {
      setWarningMessage(getBudgetErrorMessage(err?.message, language, t.saveError));
    } finally {
      setSaving(false);
    }
  }

  async function fetchBudgetForEdit(id: number) {
    try {
      const data = await apiGet<Budget>(`/budgets/${id}`);

      setEditingId(data.id);
      setCategory(data.category);
      setAmount(String(data.amount));
      setPeriodStart(new Date(data.period_start));
      setPeriodEnd(new Date(data.period_end));
    } catch (err: any) {
      setWarningMessage(err?.message || t.fetchError);
    }
  }

  async function deleteBudget(id: number) {
    try {
      await apiDelete(`/budgets/${id}`);
      setUsageItems((prev) => prev.filter((item) => item.budget_id !== id));
      setDeleteId(null);
    } catch (err: any) {
      setWarningMessage(err?.message || t.deleteError);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{t.eyebrow}</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

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
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t.budget}</Text>
          <Text style={styles.summaryValue}>{formatMoney(summary.totalSpent)} / {formatMoney(summary.totalBudget)}</Text>
          <AnimatedSummaryProgressBar percent={summaryPercent} />
        </View>

        {warningBudgets.length > 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningBannerTitle}>{t.warningLimit}</Text>
              <Text style={styles.warningBannerText}>
                {warningBudgets
                  .slice(0, 2)
                  .map((item) => translateCategory(item.category, language))
                  .join(", ")}
              </Text>
            </View>
          </View>
        )}

        {editingId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerIcon}>✏️</Text>
            <Text style={styles.editingBannerText}>{t.editingBadge}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.label}>{t.category}</Text>
          <View style={styles.categoryChips}>
            {categoryOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.categoryChip, category === item && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextActive]}>
                  {translateCategory(item, language)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.quickDateRow}>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => {
                setPeriodStart(getMonthStart());
                setPeriodEnd(getMonthEnd());
              }}
            >
              <Text style={styles.quickDateText}>{t.thisMonth}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => {
                setPeriodStart(getNextMonthStart());
                setPeriodEnd(getNextMonthEnd());
              }}
            >
              <Text style={styles.quickDateText}>{t.nextMonth}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t.amount}</Text>
          <TextInput
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>{t.startDate}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.dateButtonText}>{formatDate(periodStart, language)}</Text>
          </TouchableOpacity>

          {showStartPicker && (
            <View style={styles.inlinePicker}>
              <DateTimePicker
                value={periodStart}
                mode="date"
                display="spinner"
                themeVariant="dark"
                textColor="#f8fafc"
                onChange={(_, selectedDate) => {
                  if (selectedDate) setPeriodStart(selectedDate);
                }}
              />
              <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowStartPicker(false)}>
                <Text style={styles.pickerDoneText}>OK</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>{t.endDate}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.dateButtonText}>{formatDate(periodEnd, language)}</Text>
          </TouchableOpacity>

          {showEndPicker && (
            <View style={styles.inlinePicker}>
              <DateTimePicker
                value={periodEnd}
                mode="date"
                display="spinner"
                themeVariant="dark"
                textColor="#f8fafc"
                onChange={(_, selectedDate) => {
                  if (selectedDate) setPeriodEnd(selectedDate);
                }}
              />
              <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowEndPicker(false)}>
                <Text style={styles.pickerDoneText}>OK</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={saveBudget}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{editingId ? t.updateBudget : t.addBudget}</Text>
            )}
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={resetForm}>
              <Text style={styles.cancelEditText}>{t.cancelEdit}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={usageItems}
          keyExtractor={(item) => item.budget_id.toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
              <Text style={styles.emptyText}>{t.emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const rawPercent = Number(item.percentage_used || 0);
            const percent = Math.min(rawPercent, 100);
            const isWarning = !item.is_over_budget && rawPercent >= 80;
            const spent = Number(item.spent_amount || 0);
            const budget = Number(item.budget_amount || 0);
            const remaining = Number(item.remaining_amount || 0);

            return (
              <View
                style={[
                  styles.budgetCard,
                  isWarning && styles.budgetCardWarning,
                  item.is_over_budget && styles.budgetCardOver,
                ]}
              >
                <View style={styles.budgetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.budgetCategory}>{translateCategory(item.category, language)}</Text>
                    <Text style={styles.budgetPeriod}>
                      {formatDate(item.period_start, language)} - {formatDate(item.period_end, language)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isWarning && styles.statusBadgeWarning,
                      item.is_over_budget && styles.statusBadgeOver,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isWarning && styles.statusTextWarning,
                        item.is_over_budget && styles.statusTextOver,
                      ]}
                    >
                      {item.is_over_budget ? t.overBudget : `${Math.round(rawPercent)}%`}
                    </Text>
                  </View>
                </View>

                <Text style={styles.budgetAmountText}>
                  {formatMoney(spent)} / {formatMoney(budget)}
                </Text>

                <AnimatedProgressBar
                  percent={percent}
                  isWarning={isWarning}
                  isOver={item.is_over_budget}
                />

                <Text style={styles.remainingText}>
                  {item.is_over_budget ? t.overBudget : `${t.remaining}: ${formatMoney(Math.max(remaining, 0))}`}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => fetchBudgetForEdit(item.budget_id)}>
                    <Text style={styles.actionText}>{t.edit}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteId(item.budget_id)}>
                    <Text style={styles.actionText}>{t.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </ScrollView>

      <Modal transparent visible={deleteId !== null} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>🗑️</Text>
            <Text style={styles.modalTitle}>{t.deleteTitle}</Text>
            <Text style={styles.modalText}>{t.deleteMessage}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDeleteId(null)}>
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => {
                  if (deleteId !== null) deleteBudget(deleteId);
                }}
              >
                <Text style={styles.modalDeleteText}>{t.confirmDelete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={warningMessage.length > 0} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>{t.error}</Text>
            <Text style={styles.modalText}>{warningMessage}</Text>

            <TouchableOpacity style={styles.warningOkButton} onPress={() => setWarningMessage("")}>
              <Text style={styles.modalDeleteText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0f17" },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 64, paddingBottom: 160 },
  centerPage: {
    flex: 1,
    backgroundColor: "#0b0f17",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#94a3b8", marginTop: 12, fontWeight: "700" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  eyebrow: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: { color: "#f8fafc", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 6, fontSize: 14, lineHeight: 20 },
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
  languageButtonActive: { backgroundColor: "#2563eb" },
  languageText: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  languageTextActive: { color: "#fff" },
  summaryCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "800", marginBottom: 6 },
  summaryValue: { color: "#f8fafc", fontSize: 22, fontWeight: "900", marginBottom: 12 },
  summaryProgressBg: {
    height: 11,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
  },
  summaryProgressBar: { height: "100%", backgroundColor: "#22c55e" },
  summaryProgressBarWarning: { backgroundColor: "#eab308" },
  summaryProgressBarOver: { backgroundColor: "#ef4444" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(234,179,8,0.12)",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.32)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  warningBannerIcon: {
    fontSize: 24,
  },
  warningBannerTitle: {
    color: "#fef3c7",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3,
  },
  warningBannerText: {
    color: "#facc15",
    fontSize: 12,
    fontWeight: "800",
  },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(96,165,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  editingBannerIcon: {
    fontSize: 18,
  },
  editingBannerText: {
    color: "#bfdbfe",
    fontWeight: "900",
  },
  formCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  label: { color: "#cbd5e1", fontWeight: "800", marginBottom: 8, fontSize: 13 },
  categoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  categoryChip: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  categoryChipActive: { backgroundColor: "#2563eb", borderColor: "#60a5fa" },
  categoryChipText: { color: "#cbd5e1", fontSize: 12, fontWeight: "800" },
  categoryChipTextActive: { color: "#fff" },
  quickDateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  quickDateText: {
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: "900",
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#263042",
    fontWeight: "800",
  },
  dateButton: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  dateButtonText: { color: "#f8fafc", fontWeight: "900" },
  inlinePicker: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  pickerDoneButton: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pickerDoneText: { color: "#fff", fontWeight: "900" },
  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  disabledButton: { opacity: 0.6 },
  cancelEditButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  cancelEditText: { color: "#e5e7eb", fontWeight: "900" },
  emptyBox: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyTitle: { color: "#f8fafc", fontWeight: "900", fontSize: 17, marginBottom: 6 },
  emptyText: { color: "#94a3b8", textAlign: "center", lineHeight: 20 },
  budgetCard: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  budgetCardWarning: {
    borderColor: "rgba(234,179,8,0.58)",
    backgroundColor: "rgba(234,179,8,0.1)",
    shadowColor: "#eab308",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  budgetCardOver: {
    borderColor: "rgba(239,68,68,0.68)",
    backgroundColor: "rgba(239,68,68,0.13)",
    shadowColor: "#ef4444",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  budgetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  budgetCategory: { color: "#f8fafc", fontSize: 17, fontWeight: "900", marginBottom: 5 },
  budgetPeriod: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  statusBadge: {
    backgroundColor: "rgba(96,165,250,0.16)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusBadgeWarning: {
    backgroundColor: "rgba(234,179,8,0.16)",
    borderColor: "rgba(234,179,8,0.3)",
  },
  statusBadgeOver: {
    backgroundColor: "rgba(239,68,68,0.16)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  statusText: { color: "#bfdbfe", fontSize: 12, fontWeight: "900" },
  statusTextWarning: { color: "#fef3c7" },
  statusTextOver: { color: "#fecaca" },
  budgetAmountText: { color: "#94a3b8", fontWeight: "900", marginBottom: 10 },
  progressBg: {
    height: 11,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 9,
  },
  progressBar: { height: "100%", backgroundColor: "#22c55e" },
  progressBarWarning: { backgroundColor: "#eab308" },
  progressBarOver: { backgroundColor: "#ef4444" },
  remainingText: { color: "#94a3b8", fontSize: 12, fontWeight: "800", marginBottom: 12 },
  cardActions: { flexDirection: "row", gap: 8 },
  editButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    padding: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  warningModalCard: {
    width: "100%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.35)",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  modalIcon: { fontSize: 32, marginBottom: 12 },
  modalTitle: { color: "#f8fafc", fontSize: 20, fontWeight: "900", marginBottom: 8 },
  modalText: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  warningOkButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCancelText: { color: "#e5e7eb", fontWeight: "900" },
  modalDeleteText: { color: "#fff", fontWeight: "900" },
});
