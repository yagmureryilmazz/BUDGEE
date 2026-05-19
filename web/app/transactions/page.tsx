"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpRight,
  BriefcaseBusiness,
  Calendar,
  ClipboardList,
  CreditCard,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  UtensilsCrossed,
  Wallet,
  ShoppingBag,
  Car,
  House,
  HeartPulse,
  BookOpen,
  Gift,
  BarChart3,
  ChevronDown,
  RotateCcw,
  X,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import {
  translations,
  Language,
  translateCategory,
} from "../../lib/translations";

type Currency = "TRY" | "USD" | "EUR";

type Transaction = {
  id: number;
  amount: string;
  category: string;
  type: "income" | "expense" | string;
  spent_at?: string | null;
  currency?: string | null;
  original_amount?: string | number | null;
  original_currency?: string | null;
};

const expenseCategories = [
  "Food",
  "Groceries",
  "Rent",
  "Transportation",
  "Entertainment",
  "Utilities",
  "Health",
  "Shopping",
  "Education",
  "Other",
  "Custom",
];

const incomeCategories = [
  "Salary",
  "Freelance",
  "Investment",
  "Bonus",
  "Gift",
  "Other",
  "Custom",
];

function getCurrencySymbol(currency?: string | null) {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return "₺";
}

function formatMoney(amount: number | string, currency?: string | null) {
  const num = Number(amount || 0);
  return `${getCurrencySymbol(currency)}${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Food":
      return <UtensilsCrossed size={18} />;
    case "Groceries":
    case "Market":
      return <ShoppingBag size={18} />;
    case "Rent":
      return <House size={18} />;
    case "Transportation":
      return <Car size={18} />;
    case "Health":
      return <HeartPulse size={18} />;
    case "Education":
      return <BookOpen size={18} />;
    case "Salary":
      return <BriefcaseBusiness size={18} />;
    case "Gift":
      return <Gift size={18} />;
    default:
      return <Tag size={18} />;
  }
}

function getDisplayCategory(category: string, language: Language) {
  if (category === "Market") {
    return language === "tr" ? "Market" : "Groceries";
  }
  return translateCategory(category, language);
}

function formatDate(value?: string | null, language: Language = "en") {
  if (!value) return language === "tr" ? "Tarih yok" : "No date";

  const onlyDate = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = onlyDate.split("-");

  if (!year || !month || !day) return value;

  if (language === "tr") {
    return `${day}.${month}.${year}`;
  }

  const dateObj = new Date(`${year}-${month}-${day}`);
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTransactionDate(value?: string | null) {
  if (!value) return null;

  const onlyDate = value.includes("T") ? value.split("T")[0] : value;
  const dateObj = new Date(`${onlyDate}T00:00:00`);

  if (Number.isNaN(dateObj.getTime())) return null;

  return dateObj;
}

function isSameMonth(value: string | null | undefined, monthDate: Date) {
  const transactionDate = getTransactionDate(value);

  if (!transactionDate) return false;

  return (
    transactionDate.getFullYear() === monthDate.getFullYear() &&
    transactionDate.getMonth() === monthDate.getMonth()
  );
}

function formatMonthLabel(date: Date, language: Language) {
  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

function getTransactionMonthKey(value?: string | null) {
  const transactionDate = getTransactionDate(value);

  if (!transactionDate) return "no-date";

  const year = transactionDate.getFullYear();
  const month = String(transactionDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getTransactionMonthTitle(value?: string | null, language: Language = "en") {
  const transactionDate = getTransactionDate(value);

  if (!transactionDate) {
    return language === "tr" ? "Tarihsiz İşlemler" : "Transactions Without Date";
  }

  return formatMonthLabel(transactionDate, language);
}

export default function TransactionsPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState("");
  const [currency, setCurrency] = useState<Currency>("TRY");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [filterTypeMenuOpen, setFilterTypeMenuOpen] = useState(false);
  const [filterCategoryMenuOpen, setFilterCategoryMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [summaryMonth, setSummaryMonth] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  const categoryOptions =
    type === "expense" ? expenseCategories : incomeCategories;

  const allFilterCategories = Array.from(
    new Set([
      ...transactions.map((t) => t.category),
      ...expenseCategories.filter((c) => c !== "Custom"),
      ...incomeCategories.filter((c) => c !== "Custom"),
    ])
  );

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    function handleOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [calendarOpen]);

  async function loadTransactions() {
    try {
      const raw = await apiFetch("/transactions/");

      let normalized: Transaction[] = [];

      if (Array.isArray(raw)) {
        normalized = raw;
      } else if (raw && Array.isArray(raw.items)) {
        normalized = raw.items;
      } else {
        normalized = [];
      }

      setTransactions(normalized);
      setError("");
    } catch (err) {
      console.error("TRANSACTIONS LOAD ERROR:", err);
      setError(
        language === "tr"
          ? "İşlemler yüklenemedi."
          : "Failed to load transactions."
      );
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    loadTransactions();
  }, [router, language]);

  useEffect(() => {
    setSelectedCategory("");
    setCustomCategory("");
    setCategoryMenuOpen(false);
    setTypeMenuOpen(false);
    setCurrencyMenuOpen(false);
  }, [type]);

  function getFinalCategory() {
    if (selectedCategory === "Custom") {
      return customCategory.trim();
    }
    return selectedCategory;
  }

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setType("expense");
    setDate("");
    setCurrency("TRY");
    setSelectedCategory("");
    setCustomCategory("");
    setError("");
  }

  function getTypeLabel(value: "expense" | "income") {
    if (value === "income") {
      return language === "tr" ? "Gelir" : "Income";
    }
    return language === "tr" ? "Gider" : "Expense";
  }

  function getTypeIcon(value: "expense" | "income") {
    return value === "income" ? <ArrowUpRight size={16} /> : <ArrowDownCircle size={16} />;
  }

  function getCurrencyLabel(value: Currency) {
    if (value === "USD") return "USD $";
    if (value === "EUR") return "EUR €";
    return "TRY ₺";
  }

  async function handleAdd() {
    setError("");

    const finalCategory = getFinalCategory();

    if (!amount || Number(amount) <= 0) {
      setError(
        language === "tr"
          ? "Tutar 0'dan büyük olmalı."
          : "Amount must be greater than 0."
      );
      return;
    }

    if (!finalCategory) {
      setError(
        language === "tr"
          ? "Lütfen kategori seçin."
          : "Please select a category."
      );
      return;
    }

    try {
      await apiFetch("/transactions/", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          category: finalCategory,
          type,
          spent_at: date || undefined,
          currency,
        }),
      });

      resetForm();
      await loadTransactions();
    } catch (err) {
      console.error(err);
      setError(
        language === "tr" ? "İşlem eklenemedi." : "Failed to add transaction."
      );
    }
  }

  async function handleUpdate() {
    if (editingId === null) return;

    setError("");

    const finalCategory = getFinalCategory();

    if (!amount || Number(amount) <= 0) {
      setError(
        language === "tr"
          ? "Tutar 0'dan büyük olmalı."
          : "Amount must be greater than 0."
      );
      return;
    }

    if (!finalCategory) {
      setError(
        language === "tr"
          ? "Lütfen kategori seçin."
          : "Please select a category."
      );
      return;
    }

    try {
      await apiFetch(`/transactions/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: Number(amount),
          category: finalCategory,
          type,
          spent_at: date || undefined,
          currency,
        }),
      });

      resetForm();
      await loadTransactions();
    } catch (err) {
      console.error(err);
      setError(
        language === "tr"
          ? "İşlem güncellenemedi."
          : "Failed to update transaction."
      );
    }
  }

  async function confirmDeleteTransaction() {
    if (!deleteTarget) return;

    const id = deleteTarget.id;

    setError("");

    try {
      await apiFetch(`/transactions/${id}`, {
        method: "DELETE",
      });

      if (editingId === id) {
        resetForm();
      }

      setDeleteTarget(null);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      setError(
        language === "tr" ? "İşlem silinemedi." : "Failed to delete transaction."
      );
    }
  }

  function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setAmount(String(transaction.amount));
    setType(transaction.type === "income" ? "income" : "expense");
    setDate(
      transaction.spent_at
        ? transaction.spent_at.includes("T")
          ? transaction.spent_at.split("T")[0]
          : transaction.spent_at
        : ""
    );

    setCurrency(
      transaction.currency === "USD" || transaction.currency === "EUR"
        ? transaction.currency
        : "TRY"
    );

    const options =
      transaction.type === "expense" ? expenseCategories : incomeCategories;

    if (options.includes(transaction.category)) {
      setSelectedCategory(transaction.category);
      setCustomCategory("");
    } else {
      setSelectedCategory("Custom");
      setCustomCategory(transaction.category);
    }
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const search = searchTerm.trim().toLowerCase();
      const displayCategory = getDisplayCategory(tx.category, language).toLowerCase();

      const matchesSearch =
        search === "" ||
        tx.category.toLowerCase().includes(search) ||
        displayCategory.includes(search) ||
        tx.type.toLowerCase().includes(search) ||
        String(tx.amount).includes(searchTerm) ||
        String(tx.currency || "TRY")
          .toLowerCase()
          .includes(search);

      const matchesType =
        filterType === "all" ? true : tx.type === filterType;

      const matchesCategory =
        filterCategory === "all" ? true : tx.category === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, filterType, filterCategory, language]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = getTransactionDate(a.spent_at)?.getTime() || 0;
      const dateB = getTransactionDate(b.spent_at)?.getTime() || 0;

      if (dateA !== dateB) return dateB - dateA;

      return b.id - a.id;
    });
  }, [filteredTransactions]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / itemsPerPage));

  const paginatedTransactions = useMemo(() => {
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage, totalPages]);

  const groupedPaginatedTransactions = useMemo(() => {
    const groups: Array<{ key: string; title: string; items: Transaction[] }> = [];

    for (const transaction of paginatedTransactions) {
      const key = getTransactionMonthKey(transaction.spent_at);
      const existingGroup = groups.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.items.push(transaction);
      } else {
        groups.push({
          key,
          title: getTransactionMonthTitle(transaction.spent_at, language),
          items: [transaction],
        });
      }
    }

    return groups;
  }, [paginatedTransactions, language]);

  const paginationStart = sortedTransactions.length === 0 ? 0 : (Math.min(currentPage, totalPages) - 1) * itemsPerPage + 1;
  const paginationEnd = Math.min(Math.min(currentPage, totalPages) * itemsPerPage, sortedTransactions.length);

  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => isSameMonth(tx.spent_at, summaryMonth));
  }, [transactions, summaryMonth]);

  const totalIncome = monthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const totalExpense = monthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterCategory, itemsPerPage]);

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
    <div style={pageStyle}>
      <div style={heroSection}>
        <h1 style={titleStyle}>
          {language === "tr" ? "İşlemler" : "Transactions"}
        </h1>
        <p style={subtitleStyle}>
          {language === "tr"
            ? "Gelir ve giderlerini takip et ve yönet."
            : "Track and manage your income and expenses."}
        </p>
      </div>

      <div style={monthControlRow}>
        <button type="button" style={monthButton} onClick={goToPreviousSummaryMonth}>
          ‹
        </button>
        <div style={monthPill}>
          {language === "tr" ? "Özet Ayı" : "Summary Month"}: {formatMonthLabel(summaryMonth, language)}
        </div>
        <button type="button" style={monthButton} onClick={goToNextSummaryMonth}>
          ›
        </button>
      </div>

      <div style={summaryGrid}>
        <div style={summaryCard}>
          <div style={summaryCardLeft}>
            <div
              style={{
                ...summaryIconWrap,
                background: "rgba(34,197,94,0.15)",
                color: "#4ade80",
              }}
            >
              <ArrowUpRight size={22} />
            </div>
            <div>
              <div style={summaryLabel}>
                {language === "tr" ? "Toplam Gelir" : "Total Income"}
              </div>
              <div style={{ ...summaryValue, color: "#4ade80" }}>
                {formatMoney(totalIncome, "TRY")}
              </div>
            </div>
          </div>

          <div style={summaryRightMeta}>
            <div style={{ color: "#4ade80", fontWeight: 700 }}>{monthTransactions.length}</div>
            <div style={metaSmall}>
              {language === "tr" ? "bu ay işlem" : "transactions this month"}
            </div>
          </div>
        </div>

        <div style={summaryCard}>
          <div style={summaryCardLeft}>
            <div
              style={{
                ...summaryIconWrap,
                background: "rgba(239,68,68,0.15)",
                color: "#f87171",
              }}
            >
              <ArrowDownCircle size={22} />
            </div>
            <div>
              <div style={summaryLabel}>
                {language === "tr" ? "Toplam Gider" : "Total Expense"}
              </div>
              <div style={{ ...summaryValue, color: "#f87171" }}>
                {formatMoney(totalExpense, "TRY")}
              </div>
            </div>
          </div>

          <div style={summaryRightMeta}>
            <div style={{ color: "#f87171", fontWeight: 700 }}>{formatMonthLabel(summaryMonth, language)}</div>
            <div style={metaSmall}>
              {language === "tr" ? "aylık toplam" : "monthly total"}
            </div>
          </div>
        </div>

        <div style={summaryCard}>
          <div style={summaryCardLeft}>
            <div
              style={{
                ...summaryIconWrap,
                background: "rgba(59,130,246,0.18)",
                color: "#60a5fa",
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <div style={summaryLabel}>
                {language === "tr" ? "Bakiye" : "Balance"}
              </div>
              <div style={summaryValue}>{formatMoney(balance, "TRY")}</div>
            </div>
          </div>

          <div style={summaryRightMeta}>
            <div style={{ color: "#60a5fa", fontWeight: 700 }}>{language === "tr" ? "Aylık" : "Monthly"}</div>
            <div style={metaSmall}>
              {language === "tr" ? "net durum" : "net status"}
            </div>
          </div>
        </div>
      </div>

      <div style={mainGrid}>
        <div style={panelStyle}>
          <div style={panelTitleRow}>
            <div style={panelIconBox}>
              <Plus size={16} />
            </div>
            <h2 style={panelTitle}>
              {editingId
                ? language === "tr"
                  ? "İşlemi Düzenle"
                  : "Edit Transaction"
                : language === "tr"
                ? "Yeni İşlem Ekle"
                : "Add New Transaction"}
            </h2>
          </div>

          <div style={labelStyle}>{language === "tr" ? "Tutar" : "Amount"}</div>
          <div style={inputIconWrap}>
            <span style={leftInsideIcon}>
              <CreditCard size={16} />
            </span>
            <input
              style={inputWithLeftIcon}
              placeholder={language === "tr" ? "Tutar gir" : "Enter amount"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div style={labelStyle}>{language === "tr" ? "Tür" : "Type"}</div>
          <div style={customSelectWrap}>
            <button
              type="button"
              style={customSelectButton}
              onClick={() => {
                setTypeMenuOpen((prev) => !prev);
                setCurrencyMenuOpen(false);
                setCategoryMenuOpen(false);
              }}
            >
              <span style={customSelectLeft}>{getTypeIcon(type)}</span>
              <span style={customSelectValue}>{getTypeLabel(type)}</span>
              <ChevronDown size={16} style={customSelectChevron} />
            </button>

            {typeMenuOpen && (
              <div style={customSelectMenu}>
                {(["expense", "income"] as Array<"expense" | "income">).map((item) => (
                  <button
                    type="button"
                    key={item}
                    style={{
                      ...customSelectOption,
                      ...(type === item ? customSelectOptionActive : {}),
                    }}
                    onClick={() => {
                      setType(item);
                      setTypeMenuOpen(false);
                    }}
                  >
                    <span style={customSelectOptionCheck}>{type === item ? "✓" : ""}</span>
                    <span style={customSelectOptionIcon}>{getTypeIcon(item)}</span>
                    <span>{getTypeLabel(item)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={labelStyle}>{language === "tr" ? "Tarih" : "Date"}</div>
          <div ref={calendarRef} style={customSelectWrap}>
            <button
              type="button"
              style={customSelectButton}
              onClick={() => {
                if (!calendarOpen && date) {
                  const [y, m, d] = date.split("-").map(Number);
                  setCalendarViewDate(new Date(y, m - 1, d));
                }
                setCalendarOpen((prev) => !prev);
                setTypeMenuOpen(false);
                setCurrencyMenuOpen(false);
                setCategoryMenuOpen(false);
              }}
            >
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#60a5fa", display: "flex", alignItems: "center" }}>
                <Calendar size={16} />
              </span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: date ? "#f9fafb" : "#6b7280" }}>
                {date
                  ? (() => {
                      const [y, m, d] = date.split("-").map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
                    })()
                  : (language === "tr" ? "Tarih seçin" : "Select date")}
              </span>
              {date && (
                <span
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", display: "flex", alignItems: "center", cursor: "pointer", zIndex: 1 }}
                  onMouseDown={(e) => { e.stopPropagation(); setDate(""); setCalendarOpen(false); }}
                >
                  <X size={15} />
                </span>
              )}
              {!date && (
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                  <ChevronDown size={15} />
                </span>
              )}
            </button>

            {calendarOpen && (() => {
              const today = new Date();
              const viewYear = calendarViewDate.getFullYear();
              const viewMonth = calendarViewDate.getMonth();
              const firstDay = new Date(viewYear, viewMonth, 1);
              const lastDay = new Date(viewYear, viewMonth + 1, 0);
              // Monday-first: 0=Mon..6=Sun
              let startDow = firstDay.getDay(); // 0=Sun..6=Sat
              startDow = startDow === 0 ? 6 : startDow - 1;
              const totalCells = startDow + lastDay.getDate();
              const rows = Math.ceil(totalCells / 7);
              const cells = rows * 7;
              const weekdays = language === "tr"
                ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]
                : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
              const monthLabel = calendarViewDate.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", { month: "long", year: "numeric" });

              return (
                <div style={calendarDropdownStyle}>
                  <div style={calendarHeaderStyle}>
                    <button
                      type="button"
                      style={calendarNavBtnStyle}
                      onClick={() => setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1))}
                    >‹</button>
                    <span style={calendarMonthLabelStyle}>{monthLabel}</span>
                    <button
                      type="button"
                      style={calendarNavBtnStyle}
                      onClick={() => setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1))}
                    >›</button>
                  </div>

                  <div style={calendarGridStyle}>
                    {weekdays.map((wd) => (
                      <div key={wd} style={calendarWeekdayStyle}>{wd}</div>
                    ))}
                    {Array.from({ length: cells }).map((_, i) => {
                      const dayNum = i - startDow + 1;
                      if (dayNum < 1 || dayNum > lastDay.getDate()) {
                        return <div key={i} />;
                      }
                      const cellDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const isSelected = date === cellDateStr;
                      const isToday =
                        today.getFullYear() === viewYear &&
                        today.getMonth() === viewMonth &&
                        today.getDate() === dayNum;
                      return (
                        <button
                          key={i}
                          type="button"
                          style={{
                            ...calendarDayBtnStyle,
                            ...(isSelected ? calendarDaySelectedStyle : {}),
                            ...(isToday && !isSelected ? calendarDayTodayStyle : {}),
                          }}
                          onClick={() => {
                            setDate(cellDateStr);
                            setCalendarOpen(false);
                          }}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={labelStyle}>
            {language === "tr" ? "Para Birimi" : "Currency"}
          </div>
          <div style={customSelectWrap}>
            <button
              type="button"
              style={customSelectButton}
              onClick={() => {
                setCurrencyMenuOpen((prev) => !prev);
                setTypeMenuOpen(false);
                setCategoryMenuOpen(false);
              }}
            >
              <span style={customSelectLeft}>
                <Wallet size={16} />
              </span>
              <span style={customSelectValue}>{getCurrencyLabel(currency)}</span>
              <ChevronDown size={16} style={customSelectChevron} />
            </button>

            {currencyMenuOpen && (
              <div style={customSelectMenu}>
                {(["TRY", "USD", "EUR"] as Currency[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    style={{
                      ...customSelectOption,
                      ...(currency === item ? customSelectOptionActive : {}),
                    }}
                    onClick={() => {
                      setCurrency(item);
                      setCurrencyMenuOpen(false);
                    }}
                  >
                    <span style={customSelectOptionCheck}>{currency === item ? "✓" : ""}</span>
                    <span style={customSelectOptionIcon}>
                      <Wallet size={16} />
                    </span>
                    <span>{getCurrencyLabel(item)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={labelStyle}>
            {language === "tr" ? "Kategori" : "Category"}
          </div>
          <div style={customSelectWrap}>
            <button
              type="button"
              style={customSelectButton}
              onClick={() => {
                setCategoryMenuOpen((prev) => !prev);
                setTypeMenuOpen(false);
                setCurrencyMenuOpen(false);
              }}
            >
              <span style={customSelectLeft}>
                <Tag size={16} />
              </span>
              <span style={customSelectValue}>
                {selectedCategory
                  ? getDisplayCategory(selectedCategory, language)
                  : language === "tr"
                  ? "Kategori seç"
                  : "Select category"}
              </span>
              <ChevronDown size={16} style={customSelectChevron} />
            </button>

            {categoryMenuOpen && (
              <div style={customSelectMenu}>
                <button
                  type="button"
                  style={{
                    ...customSelectOption,
                    ...(selectedCategory === "" ? customSelectOptionActive : {}),
                  }}
                  onClick={() => {
                    setSelectedCategory("");
                    setCategoryMenuOpen(false);
                  }}
                >
                  <span style={customSelectOptionCheck}>
                    {selectedCategory === "" ? "✓" : ""}
                  </span>
                  {language === "tr" ? "Kategori seç" : "Select category"}
                </button>

                {categoryOptions.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    style={{
                      ...customSelectOption,
                      ...(selectedCategory === cat ? customSelectOptionActive : {}),
                    }}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCategoryMenuOpen(false);
                    }}
                  >
                    <span style={customSelectOptionCheck}>
                      {selectedCategory === cat ? "✓" : ""}
                    </span>
                    <span style={customSelectOptionIcon}>{getCategoryIcon(cat)}</span>
                    <span>{getDisplayCategory(cat, language)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCategory === "Custom" && (
            <>
              <div style={labelStyle}>
                {language === "tr"
                  ? "Özel Kategori (isteğe bağlı)"
                  : "Custom Category (optional)"}
              </div>
              <input
                style={inputStyle}
                placeholder={
                  language === "tr"
                    ? "Özel kategori gir"
                    : "Enter custom category"
                }
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
              <div style={helperText}>
                {language === "tr"
                  ? '"Custom" seçtiysen bunu doldur.'
                  : 'Fill this only if you selected "Custom" above.'}
              </div>
            </>
          )}

          <div style={formButtonsRow}>
            {editingId ? (
              <>
                <button style={primaryActionButton} onClick={handleUpdate}>
                  <Pencil size={16} />
                  {language === "tr" ? "Güncelle" : "Update"}
                </button>
                <button style={secondaryActionButton} onClick={resetForm}>
                  <RotateCcw size={16} />
                  {language === "tr" ? "Sıfırla" : "Reset"}
                </button>
              </>
            ) : (
              <>
                <button style={primaryActionButton} onClick={handleAdd}>
                  <Plus size={16} />
                  {language === "tr" ? "İşlem Ekle" : "Add Transaction"}
                </button>
                <button style={secondaryActionButton} onClick={resetForm}>
                  <RotateCcw size={16} />
                  {language === "tr" ? "Sıfırla" : "Reset"}
                </button>
              </>
            )}
          </div>

          {error && <div style={errorStyle}>{error}</div>}
        </div>

        <div style={panelStyle}>
          <div style={panelTitleRow}>
            <div style={panelIconBox}>
              <ClipboardList size={16} />
            </div>
            <h2 style={panelTitle}>
              {language === "tr" ? "İşlem Listesi" : "Transaction List"}
            </h2>
          </div>

          <div style={filtersRow}>
            <div style={searchWrap}>
              <Search size={16} style={searchIcon} />
              <input
                style={searchInput}
                placeholder={
                  language === "tr"
                    ? "Kategori, tür, tutar veya para birimine göre ara..."
                    : "Search by category, type, amount or currency..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={customSelectWrapCompact}>
              <button
                type="button"
                style={customSelectButtonCompact}
                onClick={() => setFilterTypeMenuOpen((prev) => !prev)}
              >
                <ListFilter size={16} style={customCompactIcon} />
                <span style={customSelectCompactValue}>
                  {filterType === "all"
                    ? language === "tr"
                      ? "Tüm Türler"
                      : "All Types"
                    : filterType === "expense"
                    ? language === "tr"
                      ? "Gider"
                      : "Expense"
                    : language === "tr"
                    ? "Gelir"
                    : "Income"}
                </span>
                <ChevronDown size={16} style={customSelectChevron} />
              </button>

              {filterTypeMenuOpen && (
                <div style={customSelectMenuCompact}>
                  {[
                    {
                      value: "all",
                      label: language === "tr" ? "Tüm Türler" : "All Types",
                    },
                    {
                      value: "expense",
                      label: language === "tr" ? "Gider" : "Expense",
                    },
                    {
                      value: "income",
                      label: language === "tr" ? "Gelir" : "Income",
                    },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      style={{
                        ...customSelectOption,
                        ...(filterType === item.value ? customSelectOptionActive : {}),
                      }}
                      onClick={() => {
                        setFilterType(item.value);
                        setFilterTypeMenuOpen(false);
                      }}
                    >
                      <span style={customSelectOptionCheck}>
                        {filterType === item.value ? "✓" : ""}
                      </span>
                      <span style={customSelectOptionIcon}>
                        {item.value === "income" ? (
                          <ArrowUpRight size={18} />
                        ) : item.value === "expense" ? (
                          <ArrowDownCircle size={18} />
                        ) : (
                          <ListFilter size={18} />
                        )}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={customSelectWrapCompact}>
              <button
                type="button"
                style={customSelectButtonCompact}
                onClick={() => setFilterCategoryMenuOpen((prev) => !prev)}
              >
                <Tag size={16} style={customCompactIcon} />
                <span style={customSelectCompactValue}>
                  {filterCategory === "all"
                    ? language === "tr"
                      ? "Tüm Kategoriler"
                      : "All Categories"
                    : getDisplayCategory(filterCategory, language)}
                </span>
                <ChevronDown size={16} style={customSelectChevron} />
              </button>

              {filterCategoryMenuOpen && (
                <div style={customSelectMenuCompact}>
                  <button
                    type="button"
                    style={{
                      ...customSelectOption,
                      ...(filterCategory === "all" ? customSelectOptionActive : {}),
                    }}
                    onClick={() => {
                      setFilterCategory("all");
                      setFilterCategoryMenuOpen(false);
                    }}
                  >
                    <span style={customSelectOptionCheck}>
                      {filterCategory === "all" ? "✓" : ""}
                    </span>
                    {language === "tr" ? "Tüm Kategoriler" : "All Categories"}
                  </button>

                  {allFilterCategories.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      style={{
                        ...customSelectOption,
                        ...(filterCategory === cat ? customSelectOptionActive : {}),
                      }}
                      onClick={() => {
                        setFilterCategory(cat);
                        setFilterCategoryMenuOpen(false);
                      }}
                    >
                      <span style={customSelectOptionCheck}>
                        {filterCategory === cat ? "✓" : ""}
                      </span>
                      <span style={customSelectOptionIcon}>{getCategoryIcon(cat)}</span>
                      <span>{getDisplayCategory(cat, language)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={miniStatsRow}>
            <div style={miniStatCard}>
              <div style={miniStatHeader}>
                <ClipboardList size={15} />
                <span>
                  {language === "tr" ? "Görünen İşlem" : "Visible Transactions"}
                </span>
              </div>
              <div style={miniStatValue}>{sortedTransactions.length}</div>
            </div>

            <div style={miniStatCard}>
              <div style={miniStatHeader}>
                <BarChart3 size={15} />
                <span>{language === "tr" ? "Net Durum" : "Net Status"}</span>
              </div>
              <div style={{ ...miniStatValue, color: "#60a5fa" }}>
                {formatMoney(balance, "TRY")}
              </div>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={emptyState}>
              {language === "tr"
                ? "Filtreye uygun işlem bulunamadı."
                : "No transactions match the filters."}
            </div>
          ) : (
            <>
              <div style={transactionList}>
                {groupedPaginatedTransactions.map((group) => (
                  <div key={group.key} style={transactionMonthGroup}>
                    <div style={transactionMonthHeader}>
                      <span>{group.title}</span>
                      <span style={transactionMonthCount}>
                        {group.items.length} {language === "tr" ? "işlem" : "transactions"}
                      </span>
                    </div>

                    <div style={transactionMonthList}>
                      {group.items.map((tItem) => {
                        const isExpense = tItem.type === "expense";

                        return (
                          <div key={tItem.id} style={transactionRow}>
                            <div style={transactionLeft}>
                              <div
                                style={{
                                  ...transactionIconWrap,
                                  background: isExpense
                                    ? "rgba(239,68,68,0.18)"
                                    : "rgba(34,197,94,0.18)",
                                  color: isExpense ? "#f87171" : "#4ade80",
                                }}
                              >
                                {getCategoryIcon(tItem.category)}
                              </div>

                              <div>
                                <div style={transactionTitle}>
                                  {getDisplayCategory(tItem.category, language)}
                                </div>

                                <div style={transactionMeta}>
                                  <span
                                    style={{
                                      ...typeBadge,
                                      background: isExpense
                                        ? "rgba(239,68,68,0.18)"
                                        : "rgba(34,197,94,0.18)",
                                      color: isExpense ? "#fca5a5" : "#86efac",
                                    }}
                                  >
                                    {isExpense
                                      ? language === "tr"
                                        ? "Gider"
                                        : "Expense"
                                      : language === "tr"
                                      ? "Gelir"
                                      : "Income"}
                                  </span>

                                  <span style={dateMeta}>
                                    <Calendar size={13} />
                                    {formatDate(tItem.spent_at, language)}
                                  </span>

                                  <span style={currencyBadge}>
                                    {tItem.currency || "TRY"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={transactionRight}>
                              <div
                                style={{
                                  ...amountText,
                                  color: isExpense ? "#f87171" : "#4ade80",
                                }}
                              >
                                <span>{isExpense ? "-" : "+"}</span>
                                {tItem.original_amount && tItem.original_currency ? (
                                  <div>
                                    <div>
                                      {formatMoney(tItem.original_amount, tItem.original_currency)}
                                    </div>
                                    <div style={convertedAmountText}>
                                      ≈ {formatMoney(tItem.amount, "TRY")}
                                    </div>
                                  </div>
                                ) : (
                                  <span>{formatMoney(tItem.amount, "TRY")}</span>
                                )}
                              </div>
                              <div style={actionButtons}>
                                <button
                                  style={iconButtonBlue}
                                  onClick={() => handleEdit(tItem)}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  style={iconButtonRed}
                                  onClick={() => setDeleteTarget(tItem)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={footerRow}>
                <div style={footerText}>
                  {language === "tr"
                    ? `${paginationStart} - ${paginationEnd} / ${sortedTransactions.length} işlem gösteriliyor`
                    : `Showing ${paginationStart} to ${paginationEnd} of ${sortedTransactions.length} transactions`}
                </div>

                <div style={footerControls}>
                  <button
                    type="button"
                    style={{
                      ...pagerButton,
                      opacity: currentPage <= 1 ? 0.45 : 1,
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    }}
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    const isActive = pageNumber === currentPage;

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        style={isActive ? pagerActive : pagerButton}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    style={{
                      ...pagerButton,
                      opacity: currentPage >= totalPages ? 0.45 : 1,
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    }}
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    ›
                  </button>

                  <div style={perPageWrap}>
                    <select
                      style={perPageSelect}
                      value={itemsPerPage}
                      onChange={(event) => {
                        setItemsPerPage(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="5">5 / page</option>
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                    </select>
                    <ChevronDown size={15} style={compactArrow} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div style={modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={modalCard} onClick={(event) => event.stopPropagation()}>
            <button style={modalCloseButton} onClick={() => setDeleteTarget(null)}>
              <X size={18} />
            </button>

            <div style={modalIconWrap}>
              <Trash2 size={30} />
            </div>

            <h3 style={modalTitle}>
              {language === "tr"
                ? "Bu işlemi silmek istediğine emin misin?"
                : "Are you sure you want to delete this transaction?"}
            </h3>

            <p style={modalText}>
              {language === "tr"
                ? "Bu işlem silindiğinde geri alınamaz."
                : "This transaction will be permanently deleted and cannot be restored."}
            </p>

            <div style={modalPreviewCard}>
              <div
                style={{
                  ...modalPreviewIcon,
                  background:
                    deleteTarget.type === "expense"
                      ? "rgba(239,68,68,0.18)"
                      : "rgba(34,197,94,0.18)",
                  color: deleteTarget.type === "expense" ? "#f87171" : "#4ade80",
                }}
              >
                {getCategoryIcon(deleteTarget.category)}
              </div>

              <div style={modalPreviewInfo}>
                <div style={modalPreviewTitle}>
                  {getDisplayCategory(deleteTarget.category, language)}
                </div>
                <div style={modalPreviewMeta}>
                  <span
                    style={{
                      ...typeBadge,
                      background:
                        deleteTarget.type === "expense"
                          ? "rgba(239,68,68,0.18)"
                          : "rgba(34,197,94,0.18)",
                      color: deleteTarget.type === "expense" ? "#fca5a5" : "#86efac",
                    }}
                  >
                    {deleteTarget.type === "expense"
                      ? language === "tr"
                        ? "Gider"
                        : "Expense"
                      : language === "tr"
                      ? "Gelir"
                      : "Income"}
                  </span>
                  <span style={dateMeta}>
                    <Calendar size={13} />
                    {formatDate(deleteTarget.spent_at, language)}
                  </span>
                  <span style={currencyBadge}>{deleteTarget.currency || "TRY"}</span>
                </div>
              </div>

              <div
                style={{
                  ...modalPreviewAmount,
                  color: deleteTarget.type === "expense" ? "#f87171" : "#4ade80",
                }}
              >
                {deleteTarget.type === "expense" ? "-" : "+"}
                {formatMoney(deleteTarget.amount, deleteTarget.currency || "TRY")}
              </div>
            </div>

            <div style={modalDivider} />

            <div style={modalActions}>
              <button style={modalCancelButton} onClick={() => setDeleteTarget(null)}>
                {language === "tr" ? "İptal" : "Cancel"}
              </button>

              <button style={modalDeleteButton} onClick={confirmDeleteTransaction}>
                <Trash2 size={16} />
                {language === "tr" ? "Sil" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const currencyBadge: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background: "rgba(59,130,246,0.16)",
  color: "#93c5fd",
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 30%), #070d18",
  color: "#f3f4f6",
  padding: 28,
};

const heroSection: React.CSSProperties = {
  marginBottom: 22,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 52,
  fontWeight: 800,
  lineHeight: 1.05,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#9ca3af",
  fontSize: 18,
};

const monthControlRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginBottom: 18,
};

const monthButton: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  border: "1px solid #263042",
  background: "#111827",
  color: "#f8fafc",
  fontSize: 24,
  fontWeight: 900,
  cursor: "pointer",
};

const monthPill: React.CSSProperties = {
  background: "rgba(17,24,39,0.92)",
  border: "1px solid rgba(59,130,246,0.18)",
  borderRadius: 999,
  padding: "11px 18px",
  color: "#bfdbfe",
  fontWeight: 900,
  textTransform: "capitalize",
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 16,
  marginBottom: 18,
};

const summaryCard: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(10,18,34,0.95))",
  border: "1px solid rgba(59,130,246,0.15)",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const summaryCardLeft: React.CSSProperties = {
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
  border: "1px solid rgba(255,255,255,0.08)",
};

const summaryLabel: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: 15,
  marginBottom: 6,
};

const summaryValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#f8fafc",
};

const summaryRightMeta: React.CSSProperties = {
  textAlign: "right",
};

const metaSmall: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 13,
  marginTop: 4,
};

const mainGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.9fr 1.8fr",
  gap: 18,
};

const panelStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(13,20,37,0.98), rgba(10,18,34,0.98))",
  border: "1px solid rgba(59,130,246,0.14)",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 12px 30px rgba(0,0,0,0.20)",
};

const panelTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
};

const panelIconBox: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(37,99,235,0.18)",
  color: "#60a5fa",
  border: "1px solid rgba(59,130,246,0.2)",
};

const panelTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#cbd5e1",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#111827",
  color: "#f9fafb",
  fontSize: 15,
  outline: "none",
  marginBottom: 14,
};

const inputIconWrap: React.CSSProperties = {
  position: "relative",
  marginBottom: 14,
};

const inputWithLeftIcon: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 16px 14px 44px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#111827",
  color: "#f9fafb",
  fontSize: 15,
  outline: "none",
};

const leftInsideIcon: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
};

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const customSelectWrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  marginBottom: 14,
};

const customSelectWrapCompact: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const customSelectButton: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 49,
  padding: "14px 42px 14px 44px",
  borderRadius: 12,
  border: "1px solid #263042",
  background:
    "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  color: "#f9fafb",
  fontSize: 15,
  outline: "none",
  display: "flex",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
};

const customSelectButtonCompact: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 49,
  padding: "14px 38px 14px 40px",
  borderRadius: 12,
  border: "1px solid #263042",
  background:
    "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  color: "#f9fafb",
  fontSize: 15,
  outline: "none",
  display: "flex",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
};

const customSelectLeft: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
};

const customCompactIcon: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
};

const customSelectValue: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const customSelectCompactValue: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const customSelectChevron: React.CSSProperties = {
  position: "absolute",
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  pointerEvents: "none",
};

const customSelectMenu: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 9999,
  maxHeight: 310,
  overflowY: "auto",
  background:
    "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  border: "1px solid rgba(59,130,246,0.22)",
  borderRadius: 16,
  padding: 8,
  boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
};

const customSelectMenuCompact: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 9999,
  maxHeight: 330,
  overflowY: "auto",
  background:
    "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  border: "1px solid rgba(59,130,246,0.22)",
  borderRadius: 16,
  padding: 8,
  boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
};

const customSelectOption: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 12,
  background: "transparent",
  color: "#dbeafe",
  padding: "11px 12px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  fontWeight: 800,
  textAlign: "left",
  cursor: "pointer",
};

const customSelectOptionActive: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.55), rgba(59,130,246,0.32))",
  color: "#fff",
  boxShadow: "inset 0 0 0 1px rgba(147,197,253,0.18)",
};

const customSelectOptionCheck: React.CSSProperties = {
  width: 18,
  color: "#93c5fd",
  fontWeight: 900,
  flexShrink: 0,
};

const customSelectOptionIcon: React.CSSProperties = {
  width: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#93c5fd",
  flexShrink: 0,
};

const helperText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  marginTop: -4,
  marginBottom: 14,
};

const formButtonsRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 8,
};

const primaryActionButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(37,99,235,0.25)",
};

const secondaryActionButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#1f2937",
  color: "#e5e7eb",
  border: "1px solid #374151",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#3b0d14",
  border: "1px solid #7f1d1d",
  color: "#fecaca",
  fontWeight: 600,
};

const filtersRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr 0.8fr",
  gap: 12,
  marginBottom: 14,
};

const searchWrap: React.CSSProperties = {
  position: "relative",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 16px 14px 42px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#111827",
  color: "#f9fafb",
  fontSize: 15,
  outline: "none",
};

const searchIcon: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
};

const compactArrow: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  pointerEvents: "none",
};

const miniStatsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 14,
};

const miniStatCard: React.CSSProperties = {
  background: "rgba(17,24,39,0.9)",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 14,
};

const miniStatHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#9ca3af",
  fontSize: 13,
  marginBottom: 8,
};

const miniStatValue: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#f8fafc",
};

const transactionList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const transactionMonthGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const transactionMonthHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(15,23,42,0.86)",
  border: "1px solid rgba(59,130,246,0.18)",
  color: "#bfdbfe",
  fontSize: 14,
  fontWeight: 900,
  textTransform: "capitalize",
};

const transactionMonthCount: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
};

const transactionMonthList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const transactionRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "#121b2d",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 16,
};

const transactionLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const transactionIconWrap: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const transactionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#f8fafc",
  marginBottom: 6,
};

const transactionMeta: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const typeBadge: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const dateMeta: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#9ca3af",
  fontSize: 13,
};

const transactionRight: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const amountText: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  minWidth: 140,
  textAlign: "right",
};

const actionButtons: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const iconButtonBlue: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "1px solid rgba(59,130,246,0.35)",
  background: "rgba(37,99,235,0.15)",
  color: "#60a5fa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const iconButtonRed: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(127,29,29,0.25)",
  color: "#f87171",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const emptyState: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 18,
  color: "#94a3b8",
};

const footerRow: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const footerText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 14,
};

const footerControls: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const pagerButton: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#0f172a",
  color: "#cbd5e1",
  cursor: "pointer",
};

const pagerActive: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid rgba(59,130,246,0.35)",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const perPageWrap: React.CSSProperties = {
  position: "relative",
  minWidth: 110,
};

const perPageSelect: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 34px 12px 12px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#0f172a",
  color: "#f9fafb",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const convertedAmountText: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#94a3b8",
  fontWeight: 600,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,0.72)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 1000,
};

const modalCard: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 620,
  background: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(10,18,34,0.98))",
  border: "1px solid #334155",
  borderRadius: 24,
  padding: "34px 28px 26px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.58)",
  textAlign: "center",
};

const modalCloseButton: React.CSSProperties = {
  position: "absolute",
  top: 18,
  right: 18,
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#cbd5e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const modalIconWrap: React.CSSProperties = {
  width: 76,
  height: 76,
  borderRadius: 999,
  margin: "0 auto 18px",
  background: "rgba(239,68,68,0.16)",
  color: "#fb7185",
  border: "1px solid rgba(239,68,68,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalTitle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#f8fafc",
  fontSize: 23,
  fontWeight: 900,
  lineHeight: 1.35,
};

const modalText: React.CSSProperties = {
  margin: "0 auto 22px",
  color: "#cbd5e1",
  lineHeight: 1.6,
  maxWidth: 440,
};

const modalPreviewCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  textAlign: "left",
  background: "rgba(15,23,42,0.82)",
  border: "1px solid #263042",
  borderRadius: 18,
  padding: 16,
};

const modalPreviewIcon: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const modalPreviewInfo: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const modalPreviewTitle: React.CSSProperties = {
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 8,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const modalPreviewMeta: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const modalPreviewAmount: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const modalDivider: React.CSSProperties = {
  height: 1,
  background: "#263042",
  margin: "18px 0 16px",
};

const modalActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const modalCancelButton: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#1f2937",
  color: "#f8fafc",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const modalDeleteButton: React.CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #ef4444, #e11d48)",
  color: "#fff",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 14px 30px rgba(225,29,72,0.28)",
};

const calendarDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 9999,
  background: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  border: "1px solid rgba(59,130,246,0.22)",
  borderRadius: 16,
  padding: "14px 12px 12px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
};

const calendarHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const calendarNavBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#60a5fa",
  fontSize: 22,
  cursor: "pointer",
  padding: "0 8px",
  lineHeight: 1,
  borderRadius: 8,
};

const calendarMonthLabelStyle: React.CSSProperties = {
  color: "#f9fafb",
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: 0.3,
  textTransform: "capitalize",
};

const calendarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 2,
};

const calendarWeekdayStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 11,
  fontWeight: 700,
  textAlign: "center",
  padding: "4px 0 6px",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const calendarDayBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#d1d5db",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: 8,
  padding: "6px 0",
  width: "100%",
  textAlign: "center",
  transition: "background 0.15s, color 0.15s",
};

const calendarDaySelectedStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
  color: "#fff",
  fontWeight: 800,
  borderRadius: 8,
};

const calendarDayTodayStyle: React.CSSProperties = {
  border: "1.5px solid #3b82f6",
  color: "#60a5fa",
  fontWeight: 700,
  borderRadius: 8,
};
