"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { Language, translateCategory } from "../../lib/translations";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import {
  Wallet,
  Target,
  Pencil,
  Trash2,
  Plus,
  Search,
  Tag,
  Calendar,
  ChevronDown,
  Inbox,
  UtensilsCrossed,
  ShoppingBag,
  Car,
  House,
  HeartPulse,
  BookOpen,
  Zap,
} from "lucide-react";

type Budget = {
  id: number;
  category: string;
  amount: string;
  period_start: string;
  period_end: string;
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
    case "Utilities":
      return <Zap size={18} />;
    case "Health":
      return <HeartPulse size={18} />;
    case "Education":
      return <BookOpen size={18} />;
    case "Shopping":
      return <ShoppingBag size={18} />;
    default:
      return <Tag size={18} />;
  }
}

function formatMoney(value: number, language: Language) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function formatDate(value: string, language: Language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCategoryBadgeColor(category: string) {
  const c = category.toLowerCase();

  if (c.includes("food")) {
    return {
      bg: "rgba(245,158,11,0.15)",
      color: "#fcd34d",
    };
  }

  if (c.includes("shopping") || c.includes("groceries")) {
    return {
      bg: "rgba(59,130,246,0.15)",
      color: "#93c5fd",
    };
  }

  if (c.includes("rent")) {
    return {
      bg: "rgba(168,85,247,0.15)",
      color: "#d8b4fe",
    };
  }

  if (c.includes("transport")) {
    return {
      bg: "rgba(34,197,94,0.15)",
      color: "#86efac",
    };
  }

  return {
    bg: "rgba(148,163,184,0.15)",
    color: "#cbd5e1",
  };
}

function BudgetsSkeleton() {
  return (
    <div style={pageStyle}>
      <div style={heroHeader}>
        <Skeleton width={220} height={48} />
        <div style={{ marginTop: 12 }}>
          <Skeleton width={340} height={18} />
        </div>
      </div>

      <div style={summaryGrid}>
        {[1, 2, 3].map((item) => (
          <Card key={item}>
            <div style={summaryCardInner}>
              <Skeleton width={52} height={52} borderRadius={999} />
              <div style={{ width: "100%" }}>
                <Skeleton width="45%" height={14} />
                <div style={{ height: 12 }} />
                <Skeleton width="65%" height={30} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={gridStyle}>
        <Card>
          <Skeleton width={220} height={24} />
          <div style={{ height: 22 }} />
          <Skeleton width="100%" height={18} />
          <div style={{ height: 8 }} />
          <Skeleton width="100%" height={50} />
          <div style={{ height: 14 }} />
          <Skeleton width="100%" height={18} />
          <div style={{ height: 8 }} />
          <Skeleton width="100%" height={50} />
          <div style={{ height: 20 }} />
          <Skeleton width={140} height={44} />
        </Card>

        <Card>
          <Skeleton width={190} height={24} />
          <div style={{ height: 20 }} />
          <div style={filterGrid}>
            <Skeleton width="100%" height={50} />
            <Skeleton width="100%" height={50} />
          </div>
          <div style={{ height: 14 }} />
          {[1, 2, 3].map((item) => (
            <div key={item} style={{ marginBottom: 12 }}>
              <Skeleton width="100%" height={120} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const router = useRouter();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [filterCategoryMenuOpen, setFilterCategoryMenuOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
  }, []);

  async function loadBudgets() {
    try {
      const raw = await apiFetch("/budgets/");

      let normalized: Budget[] = [];

      if (Array.isArray(raw)) {
        normalized = raw;
      } else if (raw && Array.isArray(raw.items)) {
        normalized = raw.items;
      } else {
        normalized = [];
      }

      setBudgets(normalized);
      setError("");
    } catch (err) {
      console.error("BUDGETS LOAD ERROR:", err);
      setError(
        language === "tr" ? "Bütçeler yüklenemedi." : "Failed to load budgets."
      );
    }
  }

  function getFinalCategory() {
    if (selectedCategory === "Custom") {
      return customCategory.trim();
    }
    return selectedCategory;
  }

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setSelectedCategory("");
    setCustomCategory("");
    setCategoryMenuOpen(false);
    setError("");
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
          ? "Lütfen bir kategori seçin veya girin."
          : "Please select or enter a category."
      );
      return;
    }

    try {
      const now = new Date();

      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      await apiFetch("/budgets/", {
        method: "POST",
        body: JSON.stringify({
          category: finalCategory,
          amount: Number(amount),
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        }),
      });

      resetForm();
      await loadBudgets();
    } catch (err: any) {
      console.error("BUDGET ADD ERROR:", err);

      const message = err?.message || "";

      if (message.includes("already exists")) {
        setError(
          language === "tr"
            ? "Bu kategori ve dönem için zaten bütçe var."
            : "Budget already exists for this category and period."
        );
      } else if (message.includes("category cannot be empty")) {
        setError(
          language === "tr"
            ? "Bütçe kategorisi boş olamaz."
            : "Budget category cannot be empty."
        );
      } else if (message.includes("end date cannot be earlier")) {
        setError(
          language === "tr"
            ? "Bütçe bitiş tarihi başlangıç tarihinden önce olamaz."
            : "Budget end date cannot be earlier than start date."
        );
      } else if (message.includes("amount must be greater than 0")) {
        setError(
          language === "tr"
            ? "Bütçe tutarı 0'dan büyük olmalı."
            : "Budget amount must be greater than 0."
        );
      } else {
        setError(
          language === "tr" ? "Bütçe eklenemedi." : "Failed to add budget."
        );
      }
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
          ? "Lütfen bir kategori seçin veya girin."
          : "Please select or enter a category."
      );
      return;
    }

    try {
      const currentBudget = budgets.find((b) => b.id === editingId);

      await apiFetch(`/budgets/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          category: finalCategory,
          amount: Number(amount),
          period_start: currentBudget?.period_start,
          period_end: currentBudget?.period_end,
        }),
      });

      resetForm();
      await loadBudgets();
    } catch (err: any) {
      console.error("BUDGET UPDATE ERROR:", err);

      const message = err?.message || "";

      if (message.includes("already exists")) {
        setError(
          language === "tr"
            ? "Bu kategori ve dönem için zaten bütçe var."
            : "Budget already exists for this category and period."
        );
      } else if (message.includes("category cannot be empty")) {
        setError(
          language === "tr"
            ? "Bütçe kategorisi boş olamaz."
            : "Budget category cannot be empty."
        );
      } else if (message.includes("end date cannot be earlier")) {
        setError(
          language === "tr"
            ? "Bütçe bitiş tarihi başlangıç tarihinden önce olamaz."
            : "Budget end date cannot be earlier than start date."
        );
      } else if (message.includes("amount must be greater than 0")) {
        setError(
          language === "tr"
            ? "Bütçe tutarı 0'dan büyük olmalı."
            : "Budget amount must be greater than 0."
        );
      } else {
        setError(
          language === "tr"
            ? "Bütçe güncellenemedi."
            : "Failed to update budget."
        );
      }
    }
  }

  async function handleDelete(id: number) {
    setError("");
    setDeleting(true);

    try {
      await apiFetch(`/budgets/${id}`, {
        method: "DELETE",
      });

      if (editingId === id) {
        resetForm();
      }

      setDeleteTarget(null);
      await loadBudgets();
    } catch (err) {
      console.error("BUDGET DELETE ERROR:", err);
      setError(
        language === "tr" ? "Bütçe silinemedi." : "Failed to delete budget."
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(budget: Budget) {
    setEditingId(budget.id);
    setAmount(String(budget.amount));

    if (expenseCategories.includes(budget.category)) {
      setSelectedCategory(budget.category);
      setCustomCategory("");
    } else {
      setSelectedCategory("Custom");
      setCustomCategory(budget.category);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    async function init() {
      setLoading(true);
      await loadBudgets();
      setLoading(false);
    }

    init();
  }, [router, language]);

  const allFilterCategories = Array.from(
    new Set([
      ...budgets.map((b) => b.category),
      ...expenseCategories.filter((c) => c !== "Custom"),
    ])
  );

  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        budget.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(budget.amount).includes(searchTerm);

      const matchesCategory =
        filterCategory === "all" ? true : budget.category === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [budgets, searchTerm, filterCategory]);

  const totalFilteredBudgetAmount = filteredBudgets.reduce(
    (sum, budget) => sum + Number(budget.amount || 0),
    0
  );

  const highestBudget = filteredBudgets.reduce(
    (max, current) => {
      return Number(current.amount) > Number(max.amount || 0) ? current : max;
    },
    filteredBudgets[0] || ({ amount: 0, category: "-" } as unknown as Budget)
  );

  if (loading) {
    return <BudgetsSkeleton />;
  }

  return (
    <div style={pageStyle}>
      <div style={heroHeader}>
        <h1 style={titleStyle}>{language === "tr" ? "Bütçeler" : "Budgets"}</h1>
        <p style={subtitleStyle}>
          {language === "tr"
            ? "Aylık kategori bütçeleri oluştur ve yönet."
            : "Create and manage monthly category budgets."}
        </p>
      </div>

      <div style={summaryGrid}>
        <Card>
          <div style={summaryCardInner}>
            <div style={summaryIconWrap}>
              <Wallet size={22} />
            </div>
            <div>
              <div style={summaryLabel}>
                {language === "tr" ? "Toplam Bütçe" : "Total Budget"}
              </div>
              <div style={summaryValue}>
                {formatMoney(totalFilteredBudgetAmount, language)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={summaryCardInner}>
            <div style={summaryIconWrap}>
              <Target size={22} />
            </div>
            <div>
              <div style={summaryLabel}>
                {language === "tr" ? "Görünen Bütçe" : "Visible Budgets"}
              </div>
              <div style={summaryValue}>{filteredBudgets.length}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={summaryCardInner}>
            <div style={summaryIconWrap}>
              <Tag size={22} />
            </div>
            <div>
              <div style={summaryLabel}>
                {language === "tr" ? "En Yüksek Kategori" : "Highest Category"}
              </div>
              <div style={summaryValueSmall}>
                {highestBudget?.category && highestBudget.category !== "-"
                  ? translateCategory(highestBudget.category, language)
                  : "-"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={gridStyle}>
        <Card>
          <div style={sectionTitleRow}>
            <div style={sectionIconBox}>
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            </div>
            <h2 style={sectionTitle}>
              {editingId
                ? language === "tr"
                  ? "Bütçeyi Düzenle"
                  : "Edit Budget"
                : language === "tr"
                ? "Yeni Bütçe Ekle"
                : "Add New Budget"}
            </h2>
          </div>

          <div style={labelStyle}>{language === "tr" ? "Tutar" : "Amount"}</div>
          <input
            style={inputStyle}
            placeholder={language === "tr" ? "₺1000" : "₺1000"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div style={labelStyle}>
            {language === "tr" ? "Kategori" : "Category"}
          </div>
          <div style={customSelectWrap}>
            <button
              type="button"
              style={customSelectButton}
              onClick={() => setCategoryMenuOpen((prev) => !prev)}
            >
              <span style={customSelectLeft}>
                <Tag size={16} />
              </span>
              <span style={customSelectValue}>
                {selectedCategory
                  ? translateCategory(selectedCategory, language)
                  : language === "tr"
                  ? "Kategori Seç"
                  : "Select Category"}
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
                  <span style={customSelectOptionIcon}>
                    <Tag size={18} />
                  </span>
                  <span>{language === "tr" ? "Kategori Seç" : "Select Category"}</span>
                </button>

                {expenseCategories.map((cat) => (
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
                    <span>{translateCategory(cat, language)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCategory === "Custom" && (
            <>
              <div style={labelStyle}>
                {language === "tr" ? "Özel Kategori" : "Custom Category"}
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
            </>
          )}

          <div style={helperText}>
            {language === "tr"
              ? "Bütçe mevcut ay için oluşturulur."
              : "The budget will be created for the current month."}
          </div>

          <div style={buttonRow}>
            {editingId ? (
              <>
                <button style={primaryButton} onClick={handleUpdate}>
                  <Pencil size={16} />
                  {language === "tr" ? "Güncelle" : "Update"}
                </button>
                <button style={secondaryButton} onClick={resetForm}>
                  {language === "tr" ? "Vazgeç" : "Cancel"}
                </button>
              </>
            ) : (
              <button style={primaryButton} onClick={handleAdd}>
                <Plus size={16} />
                {language === "tr" ? "Ekle" : "Add"}
              </button>
            )}
          </div>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}
        </Card>

        <Card>
          <div style={sectionTitleRow}>
            <div style={sectionIconBox}>
              <Wallet size={16} />
            </div>
            <h2 style={sectionTitle}>
              {language === "tr" ? "Bütçe Listesi" : "Budget List"}
            </h2>
          </div>

          <div style={filterGrid}>
            <div style={searchWrap}>
              <Search size={16} style={searchIcon} />
              <input
                style={searchInput}
                placeholder={language === "tr" ? "Ara..." : "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={customSelectWrapNoMargin}>
              <button
                type="button"
                style={customSelectButton}
                onClick={() => setFilterCategoryMenuOpen((prev) => !prev)}
              >
                <span style={customSelectLeft}>
                  <Tag size={16} />
                </span>
                <span style={customSelectValue}>
                  {filterCategory === "all"
                    ? language === "tr"
                      ? "Tüm Kategoriler"
                      : "All Categories"
                    : translateCategory(filterCategory, language)}
                </span>
                <ChevronDown size={16} style={customSelectChevron} />
              </button>

              {filterCategoryMenuOpen && (
                <div style={customSelectMenu}>
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
                    <span style={customSelectOptionIcon}>
                      <Tag size={18} />
                    </span>
                    <span>{language === "tr" ? "Tüm Kategoriler" : "All Categories"}</span>
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
                      <span>{translateCategory(cat, language)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {filteredBudgets.length === 0 ? (
            <EmptyState
              icon={<Inbox size={24} />}
              title={
                language === "tr"
                  ? "Henüz bütçe bulunamadı"
                  : "No budgets found yet"
              }
              description={
                searchTerm || filterCategory !== "all"
                  ? language === "tr"
                    ? "Filtrelere uygun bütçe bulunamadı. Arama veya kategori seçimini değiştirin."
                    : "No budgets match your current filters. Try changing the search or category filter."
                  : language === "tr"
                  ? "İlk bütçeni ekleyerek harcamalarını daha kontrollü yönetmeye başla."
                  : "Create your first budget to start managing your spending more effectively."
              }
            />
          ) : (
            filteredBudgets.map((b) => {
              const badge = getCategoryBadgeColor(b.category);

              return (
                <div key={b.id} style={budgetCard}>
                  <div style={budgetTopRow}>
                    <div>
                      <div
                        style={{
                          ...categoryBadge,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {translateCategory(b.category, language)}
                      </div>

                      <div style={budgetDates}>
                        <span style={datePill}>
                          <Calendar size={13} />
                          {formatDate(b.period_start, language)}
                        </span>

                        <span style={dateDivider}>→</span>

                        <span style={datePill}>
                          <Calendar size={13} />
                          {formatDate(b.period_end, language)}
                        </span>
                      </div>
                    </div>

                    <div style={amountBadge}>
                      {formatMoney(Number(b.amount), language)}
                    </div>
                  </div>

                  <div style={budgetActions}>
                    <button style={smallButton} onClick={() => handleEdit(b)}>
                      <Pencil size={15} />
                      {language === "tr" ? "Düzenle" : "Edit"}
                    </button>
                    <button
                      style={deleteButton}
                      onClick={() => setDeleteTarget(b)}
                    >
                      <Trash2 size={15} />
                      {language === "tr" ? "Sil" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {deleteTarget && (
        <div style={modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={modalCard} onClick={(event) => event.stopPropagation()}>
            <div style={modalIconWrap}>
              <Trash2 size={28} />
            </div>

            <h3 style={modalTitle}>
              {language === "tr" ? "Bütçeyi Sil" : "Delete Budget"}
            </h3>

            <p style={modalText}>
              {language === "tr"
                ? "Bu bütçeyi silmek istediğine emin misin? Bu işlem geri alınamaz."
                : "Are you sure you want to delete this budget? This action cannot be undone."}
            </p>

            <div style={modalBudgetPreview}>
              <div style={modalBudgetCategory}>
                {translateCategory(deleteTarget.category, language)}
              </div>
              <div style={modalBudgetAmount}>
                {formatMoney(Number(deleteTarget.amount), language)}
              </div>
            </div>

            <div style={modalActionRow}>
              <button
                style={modalCancelButton}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                {language === "tr" ? "Vazgeç" : "Cancel"}
              </button>

              <button
                style={{
                  ...modalDeleteButton,
                  opacity: deleting ? 0.7 : 1,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting
                  ? language === "tr"
                    ? "Siliniyor..."
                    : "Deleting..."
                  : language === "tr"
                  ? "Evet, Sil"
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 20,
  marginBottom: 24,
};

const summaryCardInner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const summaryIconWrap: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 999,
  background: "rgba(37,99,235,0.16)",
  color: "#60a5fa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const summaryLabel: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 14,
  marginBottom: 8,
};

const summaryValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
};

const summaryValueSmall: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.45fr",
  gap: 24,
};

const sectionTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 18,
};

const sectionIconBox: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "rgba(37,99,235,0.16)",
  color: "#60a5fa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#cbd5e1",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginBottom: 14,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#161d2b",
  color: "#f3f4f6",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
};

const selectWrap: React.CSSProperties = {
  position: "relative",
  marginBottom: 14,
};

const selectWrapNoMargin: React.CSSProperties = {
  position: "relative",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 42px 14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#161d2b",
  color: "#f3f4f6",
  fontSize: 15,
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  outline: "none",
};

const selectArrow: React.CSSProperties = {
  position: "absolute",
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
};

const customSelectWrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  marginBottom: 14,
  zIndex: 30,
};

const customSelectWrapNoMargin: React.CSSProperties = {
  position: "relative",
  width: "100%",
  zIndex: 40,
};

const customSelectButton: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 50,
  padding: "14px 42px 14px 44px",
  borderRadius: 12,
  border: "1px solid #263042",
  background:
    "linear-gradient(180deg, rgba(22,29,43,0.98), rgba(15,23,42,0.98))",
  color: "#f3f4f6",
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

const customSelectValue: React.CSSProperties = {
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
  zIndex: 120,
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
  marginBottom: 14,
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 12,
  flexWrap: "wrap",
};

const primaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#374151",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const deleteButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#7f1d1d",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(239,68,68,0.14)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
  fontWeight: 700,
  lineHeight: 1.5,
};

const filterGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: 12,
  marginBottom: 18,
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
  background: "#161d2b",
  color: "#f3f4f6",
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

const budgetCard: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
  transition: "transform 0.18s ease, border-color 0.18s ease",
};

const budgetTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
};

const categoryBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 10,
};

const budgetDates: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const datePill: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "#cbd5e1",
  background: "#0f172a",
  border: "1px solid #263042",
  padding: "6px 10px",
  borderRadius: 999,
};

const dateDivider: React.CSSProperties = {
  color: "#94a3b8",
  fontWeight: 700,
};

const amountBadge: React.CSSProperties = {
  background: "rgba(34,197,94,0.15)",
  color: "#86efac",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const budgetActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 14,
  flexWrap: "wrap",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(3,7,18,0.72)",
  backdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  border: "1px solid rgba(239,68,68,0.28)",
  borderRadius: 24,
  padding: 26,
  boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
};

const modalIconWrap: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 22,
  background: "rgba(239,68,68,0.14)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fca5a5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
};

const modalTitle: React.CSSProperties = {
  color: "#f8fafc",
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  marginBottom: 8,
};

const modalText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 15,
  lineHeight: 1.6,
  margin: 0,
  marginBottom: 18,
};

const modalBudgetPreview: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #263042",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 20,
};

const modalBudgetCategory: React.CSSProperties = {
  color: "#f8fafc",
  fontWeight: 800,
};

const modalBudgetAmount: React.CSSProperties = {
  background: "rgba(34,197,94,0.15)",
  color: "#86efac",
  padding: "7px 10px",
  borderRadius: 999,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const modalActionRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  justifyContent: "flex-end",
  flexWrap: "wrap",
};

const modalCancelButton: React.CSSProperties = {
  background: "#1f2937",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const modalDeleteButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "#fff",
  border: "none",
  borderRadius: 14,
  padding: "12px 18px",
  fontWeight: 900,
  boxShadow: "0 12px 28px rgba(220,38,38,0.28)",
};