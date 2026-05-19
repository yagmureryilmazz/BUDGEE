import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { apiDelete, apiGet, apiPost } from "@/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLanguage, Language } from "@/context/LanguageContext";




const copy = {
  tr: {
    title: "İşlemler",
    subtitle: "Gelir ve giderlerini yönet.",
    amount: "Tutar",
    category: "Kategori",
    income: "Gelir",
    expense: "Gider",
    add: "Ekle",
    delete: "Sil",
    deleteTitle: "İşlemi sil",
    deleteMessage: "Bu işlemi silmek istediğine emin misin?",
    cancel: "Vazgeç",
    error: "Hata",
    fillAll: "Tüm alanları doldur",
    invalidAmount: "Geçerli bir tutar girmelisin.",
    positiveAmount: "Tutar 0'dan büyük olmalı.",
    updateFailed: "Güncelleme başarısız oldu.",
    update: "Güncelle",
    edit: "Düzenle",
    confirmDelete: "Evet, sil",
    date: "Tarih",
    search: "Kategori ara...",
    all: "Tümü",
    today: "Bugün",
    yesterday: "Dün",
    chooseDate: "Tarih seç",
    currencyLabel: "Para Birimi",
    clearEdit: "Düzenlemeyi iptal et",
    emptyTitle: "Henüz işlem yok",
    emptyText: "Gelir veya gider eklediğinde burada görünecek.",
    allDates: "Tüm tarihler",
    selectedDay: "Seçili gün",
    thisMonth: "Bu ay",
    editingBadge: "Düzenleme modu",
    totalIncome: "Toplam Gelir",
    totalExpense: "Toplam Gider",
    balance: "Bakiye",
    summaryMonth: "Özet Ayı",
    transactionsThisMonth: "Bu ay işlem",
    previous: "Geri",
    next: "İleri",
    page: "Sayfa",
    perPage: "sayfa",
    showing: "Gösteriliyor",
    transactionsText: "işlem",
    noDate: "Tarihsiz İşlemler",
  },
  en: {
    title: "Transactions",
    subtitle: "Manage your income and expenses.",
    amount: "Amount",
    category: "Category",
    income: "Income",
    expense: "Expense",
    add: "Add",
    delete: "Delete",
    deleteTitle: "Delete transaction",
    deleteMessage: "Are you sure you want to delete this transaction?",
    cancel: "Cancel",
    error: "Error",
    fillAll: "Fill all fields",
    invalidAmount: "Please enter a valid amount.",
    positiveAmount: "Amount must be greater than 0.",
    updateFailed: "Update failed.",
    update: "Update",
    edit: "Edit",
    confirmDelete: "Yes, delete",
    date: "Date",
    search: "Search category...",
    all: "All",
    today: "Today",
    yesterday: "Yesterday",
    chooseDate: "Choose date",
    currencyLabel: "Currency",
    clearEdit: "Cancel edit",
    emptyTitle: "No transactions yet",
    emptyText: "Your income and expenses will appear here after you add them.",
    allDates: "All dates",
    selectedDay: "Selected day",
    thisMonth: "This month",
    editingBadge: "Editing mode",
    totalIncome: "Total Income",
    totalExpense: "Total Expense",
    balance: "Balance",
    summaryMonth: "Summary Month",
    transactionsThisMonth: "transactions this month",
    previous: "Previous",
    next: "Next",
    page: "Page",
    perPage: "page",
    showing: "Showing",
    transactionsText: "transactions",
    noDate: "Transactions Without Date",
  },
};

const categoryOptions = [
  "Other",
  "Food",
  "Shopping",
  "Market",
  "Transport",
  "Entertainment",
  "Health",
  "Education",
  "Bills",
  "Rent",
  "Salary",
];

function translateCategory(category: string, language: Language) {
  if (language === "en") return category;

  const map: Record<string, string> = {
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
    Other: "Diğer",
  };

  return map[category] || category;
}

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

function getTransactionDate(value: string | null | undefined) {
  if (!value) return null;

  const onlyDate = value.includes("T") ? value.split("T")[0] : value;
  const date = new Date(`${onlyDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatMonthLabel(date: Date, language: Language) {
  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function getTransactionMonthKey(value: string | null | undefined) {
  const transactionDate = getTransactionDate(value);

  if (!transactionDate) return "no-date";

  const year = transactionDate.getFullYear();
  const month = String(transactionDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getTransactionMonthTitle(value: string | null | undefined, language: Language) {
  const transactionDate = getTransactionDate(value);

  if (!transactionDate) {
    return language === "tr" ? "Tarihsiz İşlemler" : "Transactions Without Date";
  }

  return formatMonthLabel(transactionDate, language);
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function normalizeAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

type Transaction = {
  id: number;
  amount: number;
  type: "income" | "expense";
  category: string;
  spent_at?: string | null;
  created_at?: string | null;
  currency?: string | null;
  original_amount?: number | string | null;
  original_currency?: string | null;
};

function normalizeTransactions(raw: any): Transaction[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [currency, setCurrency] = useState<"TRY" | "USD" | "EUR">("TRY");
  const { language, setLanguage } = useLanguage();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "day" | "month">("all");
  const [summaryMonth, setSummaryMonth] = useState(() => new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const scrollRef = useRef<ScrollView | null>(null);
  const t = copy[language];

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const data = await apiGet<any>("/transactions/");
      setTransactions(normalizeTransactions(data));
    } catch (err: any) {
      setWarningMessage(err?.message || t.error);
    }
  }

  async function addTransaction() {
    const cleanAmountText = amount.trim();
    const cleanCategory = category.trim();
    const numericAmount = normalizeAmount(cleanAmountText);

    if (!cleanAmountText || !cleanCategory) {
      setWarningMessage(t.fillAll);
      return;
    }

    if (Number.isNaN(numericAmount) || !Number.isFinite(numericAmount)) {
      setWarningMessage(t.invalidAmount);
      return;
    }

    if (numericAmount <= 0) {
      setWarningMessage(t.positiveAmount);
      return;
    }


    const payload = {
      amount: numericAmount,
      category: cleanCategory,
      type,
      currency,
      spent_at: date ? toISODate(date) : undefined,
    };

    try {
      if (editingId) {
        try {
          await apiDelete(`/transactions/${editingId}`);
        } catch {
          await apiDelete(`/transactions/${editingId}/`);
        }
        await apiPost("/transactions/", payload, true);
      } else {
        await apiPost("/transactions/", payload, true);
      }
    } catch (err: any) {
      setWarningMessage(err?.message || (editingId ? t.updateFailed : t.error));
      return;
    }

    setAmount("");
    setCategory("");
    setCurrency("TRY");
    setEditingId(null);
    setDate(null);
    setDateFilter("all");
    await fetchTransactions();
  }

  function startEdit(item: Transaction) {
    setAmount(String(item.amount));
    setCategory(item.category);
    setType(item.type);
    setCurrency((item.currency === "USD" || item.currency === "EUR") ? item.currency : "TRY");
    setEditingId(item.id);
    setShowDatePicker(false);
    const itemDate = item.spent_at || item.created_at;
    setDate(itemDate ? new Date(itemDate) : null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }

  async function deleteTransaction(id: number) {
    try {
      await apiDelete(`/transactions/${id}`);
      await fetchTransactions();
    } catch (err: any) {
      setWarningMessage(err?.message || t.error);
    }
  }

  function confirmDelete(id: number) {
    setDeleteId(id);
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchesType = filterType === "all" || item.type === filterType;

      const translated = translateCategory(item.category, language).toLowerCase();
      const raw = item.category.toLowerCase();
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || translated.includes(query) || raw.includes(query);

      const itemDateValue = item.spent_at || item.created_at;
      let matchesDate = true;

      if (dateFilter !== "all" && date) {
        if (!itemDateValue) {
          matchesDate = false;
        } else {
          const itemDate = getTransactionDate(itemDateValue);

          if (!itemDate) {
            matchesDate = false;
          } else if (dateFilter === "day") {
            matchesDate = toISODate(itemDate) === toISODate(date);
          } else if (dateFilter === "month") {
            matchesDate = isSameMonth(itemDate, date);
          }
        }
      }

      return matchesType && matchesSearch && matchesDate;
    });
  }, [transactions, filterType, language, search, dateFilter, date]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = getTransactionDate(a.spent_at || a.created_at)?.getTime() || 0;
      const dateB = getTransactionDate(b.spent_at || b.created_at)?.getTime() || 0;

      if (dateA !== dateB) return dateB - dateA;

      return b.id - a.id;
    });
  }, [filteredTransactions]);

  const monthTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const itemDate = item.spent_at || item.created_at;
      const transactionDate = getTransactionDate(itemDate);

      return transactionDate ? isSameMonth(transactionDate, summaryMonth) : false;
    });
  }, [transactions, summaryMonth]);

  const totalIncome = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpense = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginationStart = sortedTransactions.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const paginationEnd = Math.min(safeCurrentPage * itemsPerPage, sortedTransactions.length);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, safeCurrentPage, itemsPerPage]);

  const groupedPaginatedTransactions = useMemo(() => {
    const groups: Array<{ key: string; title: string; items: Transaction[] }> = [];

    for (const transaction of paginatedTransactions) {
      const dateValue = transaction.spent_at || transaction.created_at;
      const key = getTransactionMonthKey(dateValue);
      const existingGroup = groups.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.items.push(transaction);
      } else {
        groups.push({
          key,
          title: getTransactionMonthTitle(dateValue, language),
          items: [transaction],
        });
      }
    }

    return groups;
  }, [paginatedTransactions, language]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, dateFilter, date, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function goToPreviousSummaryMonth() {
    setSummaryMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextSummaryMonth() {
    setSummaryMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>BUDGEE MOBILE</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        <View style={styles.languageSwitch}>
          <TouchableOpacity
            onPress={() => setLanguage("tr")}
            style={[styles.languageButton, language === "tr" && styles.languageButtonActive]}
          >
            <Text style={[styles.languageButtonText, language === "tr" && styles.languageButtonTextActive]}>TR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLanguage("en")}
            style={[styles.languageButton, language === "en" && styles.languageButtonActive]}
          >
            <Text style={[styles.languageButtonText, language === "en" && styles.languageButtonTextActive]}>EN</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.monthControlRow}>
        <TouchableOpacity style={styles.monthButton} onPress={goToPreviousSummaryMonth}>
          <Text style={styles.monthButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.monthPill}>
          <Text style={styles.monthPillLabel}>{t.summaryMonth}</Text>
          <Text style={styles.monthPillValue}>{formatMonthLabel(summaryMonth, language)}</Text>
        </View>

        <TouchableOpacity style={styles.monthButton} onPress={goToNextSummaryMonth}>
          <Text style={styles.monthButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t.totalIncome}</Text>
          <Text style={[styles.summaryValue, { color: "#4ade80" }]}>{formatMoney(totalIncome)}</Text>
          <Text style={styles.summaryMeta}>{monthTransactions.length} {t.transactionsThisMonth}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t.totalExpense}</Text>
          <Text style={[styles.summaryValue, { color: "#f87171" }]}>{formatMoney(totalExpense)}</Text>
          <Text style={styles.summaryMeta}>{formatMonthLabel(summaryMonth, language)}</Text>
        </View>

        <View style={styles.summaryCardWide}>
          <Text style={styles.summaryLabel}>{t.balance}</Text>
          <Text style={[styles.summaryValue, { color: "#60a5fa" }]}>{formatMoney(balance)}</Text>
          <Text style={styles.summaryMeta}>
            {language === "tr" ? "Aylık net durum (TRY karşılığı)" : "Monthly net status (TRY equivalent)"}
          </Text>
        </View>
      </View>

      {/* ── ADD / EDIT FORM CARD ── */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>
          {editingId
            ? (language === "tr" ? "İşlemi Düzenle" : "Edit Transaction")
            : (language === "tr" ? "Yeni İşlem Ekle" : "Add New Transaction")}
        </Text>

        {editingId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerIcon}>✏️</Text>
            <Text style={styles.editingBannerText}>{t.editingBadge}</Text>
          </View>
        )}

        <TextInput
          placeholder={t.amount}
          placeholderTextColor="#64748b"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ""))}
          keyboardType="numeric"
          style={styles.input}
        />

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

        <Text style={styles.label}>{t.date}</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => { setDate(new Date()); setDateFilter("day"); }}
            style={styles.dateQuickButton}
          >
            <Text style={styles.dateQuickText}>{t.today}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setDate(yesterday);
              setDateFilter("day");
            }}
            style={styles.dateQuickButton}
          >
            <Text style={styles.dateQuickText}>{t.yesterday}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const initial = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
              setPickerDate(initial);
              setShowDatePicker(true);
            }}
            style={styles.datePickerButton}
          >
            <Text style={styles.datePickerText}>
              {date ? formatDate(toISODate(date), language) : t.chooseDate}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <View style={styles.inlinePicker}>
            <Text style={styles.inlinePickerTitle}>{t.chooseDate}</Text>
            <View style={styles.inlinePickerBox}>
              <DateTimePicker
                key={pickerDate.getTime()}
                value={pickerDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                accentColor="#60a5fa"
                minimumDate={new Date(2000, 0, 1)}
                maximumDate={new Date()}
                style={{ width: "100%", transform: [{ scale: 0.82 }], marginVertical: -18, alignSelf: "center" }}
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setPickerDate(selectedDate);
                    setDate(selectedDate);
                    setDateFilter("day");
                    setShowDatePicker(false);
                  }
                }}
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>{t.currencyLabel}</Text>
        <View style={styles.row}>
          {(["TRY", "USD", "EUR"] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCurrency(c)}
              style={[styles.currencyButton, currency === c && styles.currencyButtonActive]}
            >
              <Text style={[styles.currencyButtonText, currency === c && styles.currencyButtonTextActive]}>
                {c === "TRY" ? "₺ TRY" : c === "USD" ? "$ USD" : "€ EUR"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{language === "tr" ? "Tür" : "Type"}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setType("income")}
            style={[styles.typeButton, type === "income" && styles.activeIncome]}
          >
            <Text style={styles.buttonText}>{t.income}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType("expense")}
            style={[styles.typeButton, type === "expense" && styles.activeExpense]}
          >
            <Text style={styles.buttonText}>{t.expense}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addTransaction}>
          <Text style={styles.buttonText}>{editingId ? t.update : t.add}</Text>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            style={styles.cancelEditButton}
            onPress={() => {
              setEditingId(null);
              setAmount("");
              setCategory("");
              setType("expense");
              setCurrency("TRY");
              setDate(null);
              setDateFilter("all");
            }}
          >
            <Text style={styles.cancelEditText}>{t.clearEdit}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTER & LIST SECTION ── */}
      <View style={styles.listSectionHeader}>
        <Text style={styles.listSectionTitle}>
          {language === "tr" ? "İşlem Geçmişi" : "Transaction History"}
        </Text>
      </View>

      <TextInput
        placeholder={t.search}
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilterType("all")}
          style={[styles.filterButton, filterType === "all" && styles.filterButtonActive]}
        >
          <Text style={[styles.filterText, filterType === "all" && styles.filterTextActive]}>{t.all}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType("expense")}
          style={[styles.filterButton, filterType === "expense" && styles.filterButtonActive]}
        >
          <Text style={[styles.filterText, filterType === "expense" && styles.filterTextActive]}>{t.expense}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType("income")}
          style={[styles.filterButton, filterType === "income" && styles.filterButtonActive]}
        >
          <Text style={[styles.filterText, filterType === "income" && styles.filterTextActive]}>{t.income}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateFilterRow}>
        <TouchableOpacity
          onPress={() => { setDateFilter("all"); setDate(null); }}
          style={[styles.dateFilterButton, dateFilter === "all" && styles.dateFilterButtonActive]}
        >
          <Text style={[styles.dateFilterText, dateFilter === "all" && styles.dateFilterTextActive]}>
            {t.allDates}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (!date) setDate(new Date()); setDateFilter("day"); }}
          style={[styles.dateFilterButton, dateFilter === "day" && styles.dateFilterButtonActive]}
        >
          <Text style={[styles.dateFilterText, dateFilter === "day" && styles.dateFilterTextActive]}>
            {t.selectedDay}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (!date) setDate(new Date()); setDateFilter("month"); }}
          style={[styles.dateFilterButton, dateFilter === "month" && styles.dateFilterButtonActive]}
        >
          <Text style={[styles.dateFilterText, dateFilter === "month" && styles.dateFilterTextActive]}>
            {t.thisMonth}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {sortedTransactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.emptyText}</Text>
        </View>
      ) : (
        <>
          <View style={styles.listInfoRow}>
            <Text style={styles.listInfoText}>
              {t.showing} {paginationStart} - {paginationEnd} / {sortedTransactions.length} {t.transactionsText}
            </Text>
          </View>

          {groupedPaginatedTransactions.map((group) => (
            <View key={group.key} style={styles.monthGroup}>
              <View style={styles.monthGroupHeader}>
                <Text style={styles.monthGroupTitle}>{group.title}</Text>
                <Text style={styles.monthGroupCount}>{group.items.length} {t.transactionsText}</Text>
              </View>

              {group.items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.category}>{translateCategory(item.category, language)}</Text>
                    <Text
                      style={[
                        styles.amount,
                        { color: item.type === "expense" ? "#f87171" : "#4ade80" },
                      ]}
                    >
                      {item.type === "expense" ? "-" : "+"}{" "}
                      {item.original_amount && item.original_currency && item.original_currency !== "TRY"
                        ? formatMoney(Number(item.original_amount), item.original_currency)
                        : formatMoney(Number(item.amount), "TRY")}
                    </Text>
                    {item.original_amount && item.original_currency && item.original_currency !== "TRY" && (
                      <Text style={styles.convertedAmount}>
                        ≈ {formatMoney(Number(item.amount), "TRY")}
                      </Text>
                    )}
                    <Text style={styles.transactionDate}>
                      {formatDate(item.spent_at || item.created_at, language)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setDateFilter("all");
                        setSearch("");
                        setFilterType("all");
                        startEdit(item);
                      }}
                    >
                      <Text style={{ color: "#60a5fa", fontWeight: "bold" }}>{t.edit}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                      <Text style={styles.delete}>{t.delete}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.paginationButton, safeCurrentPage <= 1 && styles.paginationButtonDisabled]}
              disabled={safeCurrentPage <= 1}
              onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <Text style={styles.paginationButtonText}>‹ {t.previous}</Text>
            </TouchableOpacity>

            <View style={styles.pagePill}>
              <Text style={styles.pagePillText}>{t.page} {safeCurrentPage} / {totalPages}</Text>
            </View>

            <TouchableOpacity
              style={[styles.paginationButton, safeCurrentPage >= totalPages && styles.paginationButtonDisabled]}
              disabled={safeCurrentPage >= totalPages}
              onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <Text style={styles.paginationButtonText}>{t.next} ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.perPageRow}>
            {[5, 10, 20, 50].map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.perPageButton, itemsPerPage === value && styles.perPageButtonActive]}
                onPress={() => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.perPageText, itemsPerPage === value && styles.perPageTextActive]}>
                  {value} / {t.perPage}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      </ScrollView>

      <Modal transparent visible={deleteId !== null} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>

            <Text style={styles.modalTitle}>{t.deleteTitle}</Text>
            <Text style={styles.modalText}>{t.deleteMessage}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDeleteId(null)}
              >
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => {
                  if (deleteId !== null) {
                    deleteTransaction(deleteId);
                  }
                  setDeleteId(null);
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
            <View style={styles.warningIconBox}>
              <Text style={styles.modalIcon}>⚠️</Text>
            </View>

            <Text style={styles.modalTitle}>{t.error}</Text>
            <Text style={styles.modalText}>{warningMessage}</Text>

            <TouchableOpacity
              style={styles.warningOkButton}
              onPress={() => setWarningMessage("")}
            >
              <Text style={styles.modalDeleteText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0f17",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#0b0f17",
  },
  container: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 160,
    backgroundColor: "#0b0f17",
  },
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
  title: {
    fontSize: 32,
    color: "#f8fafc",
    fontWeight: "900",
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
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
  monthControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },
  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#263042",
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonText: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "900",
  },
  monthPill: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  monthPillLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 2,
  },
  monthPillValue: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 18,
    padding: 14,
  },
  summaryCardWide: {
    width: "100%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 18,
    padding: 14,
  },
  summaryLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  summaryValue: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryMeta: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "capitalize",
  },
  formCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },
  listSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  listSectionTitle: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
  input: {
    backgroundColor: "#0f172a",
    color: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  currencyButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#1f2937",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#263042",
  },
  currencyButtonActive: {
    backgroundColor: "#1e3a5f",
    borderColor: "#60a5fa",
  },
  currencyButtonText: {
    color: "#64748b",
    fontWeight: "800",
    fontSize: 13,
  },
  currencyButtonTextActive: {
    color: "#60a5fa",
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1f2937",
    alignItems: "center",
  },
  activeIncome: {
    backgroundColor: "#16a34a",
  },
  activeExpense: {
    backgroundColor: "#dc2626",
  },
  addButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  label: {
    color: "#cbd5e1",
    fontWeight: "800",
    marginBottom: 8,
    fontSize: 13,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  categoryChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  categoryChipText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  dateQuickButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dateQuickText: {
    color: "#e5e7eb",
    fontWeight: "800",
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  datePickerText: {
    color: "#f8fafc",
    fontWeight: "900",
  },
  dateFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  dateFilterButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  dateFilterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  dateFilterText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  dateFilterTextActive: {
    color: "#fff",
  },
  cancelEditButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: -10,
    marginBottom: 18,
  },
  cancelEditText: {
    color: "#e5e7eb",
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: "#0f172a",
    color: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  filterText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#fff",
  },
  listInfoRow: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  listInfoText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
  },
  monthGroup: {
    marginBottom: 14,
  },
  monthGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(96,165,250,0.10)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.24)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  monthGroupTitle: {
    color: "#bfdbfe",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  monthGroupCount: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  paginationButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  paginationButtonDisabled: {
    opacity: 0.45,
  },
  paginationButtonText: {
    color: "#e5e7eb",
    fontWeight: "900",
    fontSize: 12,
  },
  pagePill: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  pagePillText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  perPageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  perPageButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  perPageButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  perPageText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "900",
  },
  perPageTextActive: {
    color: "#fff",
  },
  emptyBox: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 6,
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
  },
  transactionDate: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  convertedAmount: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  card: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#263042",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  category: {
    color: "white",
    fontWeight: "bold",
  },
  amount: {
    color: "#94a3b8",
  },
  delete: {
    color: "#ef4444",
    fontWeight: "bold",
  },
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
  modalIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  warningIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(234,179,8,0.14)",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  modalText: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
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
  modalCancelText: {
    color: "#e5e7eb",
    fontWeight: "900",
  },
  modalDeleteText: {
    color: "#fff",
    fontWeight: "900",
  },
  inlinePicker: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  inlinePickerTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  inlinePickerBox: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
  },
  pickerDoneButton: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pickerDoneText: {
    color: "#fff",
    fontWeight: "900",
  },
});