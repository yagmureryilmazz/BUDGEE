"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { Language, translateGoalTitle } from "../../lib/translations";
import {
  PiggyBank,
  Target,
  Wallet,
  Pencil,
  Trash2,
  Plus,
  Search,
  ChevronDown,
  Trophy,
  X,
  CheckCircle2,
  Clock3,
  ListFilter,
} from "lucide-react";

type SavingsProgress = {
  id: number;
  title: string;
  target_amount: string;
  current_amount: string;
  remaining_amount: string;
  progress_percentage: number;
  is_completed: boolean;
};

function formatMoney(value: number, language: Language) {
  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function getProgressTone(progress: number) {
  if (progress >= 100) {
    return {
      fill: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
      color: "#86efac",
    };
  }

  if (progress >= 70) {
    return {
      fill: "#3b82f6",
      bg: "rgba(59,130,246,0.15)",
      color: "#93c5fd",
    };
  }

  if (progress >= 40) {
    return {
      fill: "#f59e0b",
      bg: "rgba(245,158,11,0.15)",
      color: "#fde68a",
    };
  }

  return {
    fill: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    color: "#fca5a5",
  };
}

export default function SavingsGoalsPage() {
  const router = useRouter();

  const [progressItems, setProgressItems] = useState<SavingsProgress[]>([]);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingsProgress | null>(null);
  const [addMoneyTarget, setAddMoneyTarget] = useState<SavingsProgress | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState("");
  const [addMoneyError, setAddMoneyError] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
  }, []);

  async function loadGoals() {
    try {
      const raw = await apiFetch("/savings-goals/progress");

      let normalized: SavingsProgress[] = [];

      if (Array.isArray(raw)) {
        normalized = raw;
      } else if (raw && Array.isArray(raw.items)) {
        normalized = raw.items;
      } else {
        normalized = [];
      }

      setProgressItems(normalized);
      setError("");
    } catch (err) {
      console.error("SAVINGS LOAD ERROR:", err);
      setError(
        language === "tr"
          ? "Birikim hedefleri yüklenemedi."
          : "Failed to load savings goals."
      );
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
    setStatusMenuOpen(false);
    setError("");
  }

  function validateForm() {
    if (!title.trim()) {
      setError(language === "tr" ? "Başlık gerekli." : "Title is required.");
      return false;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setError(
        language === "tr"
          ? "Hedef tutar 0'dan büyük olmalı."
          : "Target amount must be greater than 0."
      );
      return false;
    }

    if (currentAmount === "" || Number(currentAmount) < 0) {
      setError(
        language === "tr"
          ? "Mevcut tutar negatif olamaz."
          : "Current amount cannot be negative."
      );
      return false;
    }

    if (Number(currentAmount) > Number(targetAmount)) {
      setError(
        language === "tr"
          ? "Mevcut tutar hedef tutarı aşamaz."
          : "Current amount cannot exceed target amount."
      );
      return false;
    }

    return true;
  }

  async function handleAdd() {
    setError("");

    if (!validateForm()) return;

    try {
      await apiFetch("/savings-goals/", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          target_amount: Number(targetAmount),
          current_amount: Number(currentAmount),
        }),
      });

      resetForm();
      await loadGoals();
    } catch (err: any) {
      console.error("SAVINGS ADD ERROR:", err);
      setError(
        err?.message ||
          (language === "tr"
            ? "Birikim hedefi eklenemedi."
            : "Failed to add savings goal.")
      );
    }
  }

  async function handleUpdate() {
    if (editingId === null) return;

    setError("");

    if (!validateForm()) return;

    try {
      await apiFetch(`/savings-goals/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          target_amount: Number(targetAmount),
          current_amount: Number(currentAmount),
        }),
      });

      resetForm();
      await loadGoals();
    } catch (err: any) {
      console.error("SAVINGS UPDATE ERROR:", err);
      setError(
        err?.message ||
          (language === "tr"
            ? "Birikim hedefi güncellenemedi."
            : "Failed to update savings goal.")
      );
    }
  }

  async function confirmDeleteGoal() {
    if (!deleteTarget) return;

    const id = deleteTarget.id;

    setError("");

    try {
      await apiFetch(`/savings-goals/${id}`, {
        method: "DELETE",
      });

      if (editingId === id) {
        resetForm();
      }

      setDeleteTarget(null);
      await loadGoals();
    } catch (err: any) {
      setError(
        err?.message ||
          (language === "tr"
            ? "Birikim hedefi silinemedi."
            : "Failed to delete savings goal.")
      );
    }
  }

  async function handleAddMoney() {
    if (!addMoneyTarget) return;
    setAddMoneyError("");

    const toAdd = Number(addMoneyAmount);
    if (!addMoneyAmount || isNaN(toAdd) || toAdd <= 0) {
      setAddMoneyError(
        language === "tr"
          ? "Eklenecek tutar 0'dan büyük olmalı."
          : "Amount must be greater than 0."
      );
      return;
    }

    const newCurrent = Number(addMoneyTarget.current_amount) + toAdd;
    if (newCurrent > Number(addMoneyTarget.target_amount)) {
      setAddMoneyError(
        language === "tr"
          ? "Toplam tutar hedef tutarı aşamaz."
          : "Total cannot exceed the target amount."
      );
      return;
    }

    try {
      await apiFetch(`/savings-goals/${addMoneyTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: addMoneyTarget.title,
          target_amount: Number(addMoneyTarget.target_amount),
          current_amount: newCurrent,
        }),
      });
      setAddMoneyTarget(null);
      setAddMoneyAmount("");
      setAddMoneyError("");
      await loadGoals();
    } catch (err: any) {
      setAddMoneyError(
        err?.message ||
          (language === "tr"
            ? "Para eklenemedi."
            : "Failed to add money.")
      );
    }
  }

  function handleEdit(goal: SavingsProgress) {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setError("");
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    loadGoals();
  }, [router, language]);

  const filteredGoals = useMemo(() => {
    return progressItems.filter((goal) => {
      const translatedTitle = translateGoalTitle(goal.title, language).toLowerCase();

      const matchesSearch =
        searchTerm.trim() === "" ||
        translatedTitle.includes(searchTerm.toLowerCase()) ||
        goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(goal.target_amount).includes(searchTerm) ||
        String(goal.current_amount).includes(searchTerm);

      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "completed"
          ? goal.is_completed
          : !goal.is_completed;

      return matchesSearch && matchesStatus;
    });
  }, [progressItems, searchTerm, filterStatus, language]);

  const totalTargetAmount = filteredGoals.reduce(
    (sum, goal) => sum + Number(goal.target_amount || 0),
    0
  );

  const totalCurrentAmount = filteredGoals.reduce(
    (sum, goal) => sum + Number(goal.current_amount || 0),
    0
  );

  const completedCount = filteredGoals.filter((goal) => goal.is_completed).length;

  return (
    <div style={pageStyle}>
      <div style={heroHeader}>
        <h1 style={titleStyle}>
          {language === "tr" ? "Birikim Hedefleri" : "Savings Goals"}
        </h1>
        <p style={subtitleStyle}>
          {language === "tr"
            ? "Birikim ilerlemeni oluştur ve takip et."
            : "Create and track your savings progress."}
        </p>
      </div>

      <div style={summaryGrid}>
        <div style={summaryCard}>
          <div style={summaryIconWrap}>
            <Target size={22} />
          </div>
          <div>
            <div style={summaryLabel}>
              {language === "tr" ? "Toplam Hedef" : "Total Target"}
            </div>
            <div style={summaryValue}>
              {formatMoney(totalTargetAmount, language)}
            </div>
          </div>
        </div>

        <div style={summaryCard}>
          <div style={summaryIconWrap}>
            <Wallet size={22} />
          </div>
          <div>
            <div style={summaryLabel}>
              {language === "tr" ? "Toplam Mevcut" : "Total Current"}
            </div>
            <div style={summaryValue}>
              {formatMoney(totalCurrentAmount, language)}
            </div>
          </div>
        </div>

        <div style={summaryCard}>
          <div style={summaryIconWrap}>
            <Trophy size={22} />
          </div>
          <div>
            <div style={summaryLabel}>
              {language === "tr" ? "Tamamlanan Hedef" : "Completed Goals"}
            </div>
            <div style={summaryValue}>{completedCount}</div>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={sectionCard}>
          <div style={sectionTitleRow}>
            <div style={sectionIconBox}>
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            </div>
            <h2 style={sectionTitle}>
              {editingId
                ? language === "tr"
                  ? "Hedefi Düzenle"
                  : "Edit Savings Goal"
                : language === "tr"
                ? "Yeni Hedef Ekle"
                : "Add New Goal"}
            </h2>
          </div>

          <div style={labelStyle}>{language === "tr" ? "Başlık" : "Title"}</div>
          <input
            style={inputStyle}
            placeholder={language === "tr" ? "Başlık" : "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div style={labelStyle}>
            {language === "tr" ? "Hedef Tutar" : "Target Amount"}
          </div>
          <input
            style={inputStyle}
            placeholder={language === "tr" ? "Hedef Tutar" : "Target Amount"}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />

          <div style={labelStyle}>
            {language === "tr" ? "Mevcut Tutar" : "Current Amount"}
          </div>
          <input
            style={inputStyle}
            placeholder={language === "tr" ? "Mevcut Tutar" : "Current Amount"}
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
          />

          <div style={helperText}>
            {language === "tr"
              ? "Mevcut tutar hedef tutardan büyük olamaz."
              : "Current amount cannot be greater than target amount."}
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

          {error && <p style={errorStyle}>{error}</p>}
        </div>

        <div style={sectionCard}>
          <div style={sectionTitleRow}>
            <div style={sectionIconBox}>
              <PiggyBank size={16} />
            </div>
            <h2 style={sectionTitle}>
              {language === "tr" ? "Hedefler" : "Goals"}
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

            <div style={customSelectWrap}>
              <button
                type="button"
                style={customSelectButton}
                onClick={() => setStatusMenuOpen((prev) => !prev)}
              >
                <ListFilter size={16} style={customSelectLeftIcon} />
                <span style={customSelectValue}>
                  {filterStatus === "all"
                    ? language === "tr"
                      ? "Tüm Durumlar"
                      : "All Statuses"
                    : filterStatus === "in_progress"
                    ? language === "tr"
                      ? "Devam Ediyor"
                      : "In Progress"
                    : language === "tr"
                    ? "Tamamlandı"
                    : "Completed"}
                </span>
                <ChevronDown size={16} style={customSelectChevron} />
              </button>

              {statusMenuOpen && (
                <div style={customSelectMenu}>
                  {[
                    {
                      value: "all",
                      label: language === "tr" ? "Tüm Durumlar" : "All Statuses",
                    },
                    {
                      value: "in_progress",
                      label: language === "tr" ? "Devam Ediyor" : "In Progress",
                    },
                    {
                      value: "completed",
                      label: language === "tr" ? "Tamamlandı" : "Completed",
                    },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      style={{
                        ...customSelectOption,
                        ...(filterStatus === item.value ? customSelectOptionActive : {}),
                      }}
                      onClick={() => {
                        setFilterStatus(item.value);
                        setStatusMenuOpen(false);
                      }}
                    >
                      <span style={customSelectOptionCheck}>
                        {filterStatus === item.value ? "✓" : ""}
                      </span>
                      <span style={customSelectOptionIcon}>
                        {item.value === "completed" ? (
                          <CheckCircle2 size={18} />
                        ) : item.value === "in_progress" ? (
                          <Clock3 size={18} />
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
          </div>

          {filteredGoals.length === 0 ? (
            <p style={mutedText}>
              {language === "tr"
                ? "Filtreye uygun birikim hedefi yok."
                : "No savings goals match the filters."}
            </p>
          ) : (
            filteredGoals.map((goal) => {
              const progress = Number(goal.progress_percentage || 0);
              const tone = getProgressTone(progress);

              return (
                <div key={goal.id} style={goalCard}>
                  <div style={goalTopRow}>
                    <div>
                      <div style={miniTitle}>
                        {translateGoalTitle(goal.title, language)}
                      </div>
                      <div
                        style={{
                          ...statusBadge,
                          background: goal.is_completed
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(59,130,246,0.15)",
                          color: goal.is_completed ? "#86efac" : "#93c5fd",
                        }}
                      >
                        {goal.is_completed
                          ? language === "tr"
                            ? "Tamamlandı"
                            : "Completed"
                          : language === "tr"
                          ? "Devam Ediyor"
                          : "In Progress"}
                      </div>
                    </div>

                    <div
                      style={{
                        ...percentageBadge,
                        background: tone.bg,
                        color: tone.color,
                      }}
                    >
                      %{progress}
                    </div>
                  </div>

                  <div style={miniText}>
                    {language === "tr" ? "Hedef" : "Target"}:{" "}
                    {formatMoney(Number(goal.target_amount), language)}
                  </div>
                  <div style={miniText}>
                    {language === "tr" ? "Mevcut" : "Current"}:{" "}
                    {formatMoney(Number(goal.current_amount), language)}
                  </div>
                  <div style={miniText}>
                    {language === "tr" ? "Kalan" : "Remaining"}:{" "}
                    {formatMoney(Number(goal.remaining_amount), language)}
                  </div>

                  <div style={progressOuter}>
                    <div
                      style={{
                        ...progressInner,
                        width: `${Math.min(progress, 100)}%`,
                        background: tone.fill,
                      }}
                    />
                  </div>

                  <div style={goalActions}>
                    {!goal.is_completed && (
                      <button
                        style={addMoneyButton}
                        onClick={() => {
                          setAddMoneyTarget(goal);
                          setAddMoneyAmount("");
                          setAddMoneyError("");
                        }}
                      >
                        <Wallet size={15} />
                        {language === "tr" ? "Para Ekle" : "Add Money"}
                      </button>
                    )}
                    <button style={smallButton} onClick={() => handleEdit(goal)}>
                      <Pencil size={15} />
                      {language === "tr" ? "Düzenle" : "Edit"}
                    </button>
                    <button
                      style={deleteButton}
                      onClick={() => setDeleteTarget(goal)}
                    >
                      <Trash2 size={15} />
                      {language === "tr" ? "Sil" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {addMoneyTarget && (
        <div
          style={modalOverlay}
          onClick={() => {
            setAddMoneyTarget(null);
            setAddMoneyAmount("");
            setAddMoneyError("");
          }}
        >
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              style={modalCloseButton}
              onClick={() => {
                setAddMoneyTarget(null);
                setAddMoneyAmount("");
                setAddMoneyError("");
              }}
            >
              <X size={18} />
            </button>

            <div style={addMoneyIconWrap}>💰</div>

            <h3 style={modalTitle}>
              {language === "tr" ? "Para Ekle" : "Add Money"}
            </h3>
            <p style={{ ...modalText, marginBottom: 20 }}>
              {translateGoalTitle(addMoneyTarget.title, language)}
            </p>

            <div style={addMoneySummaryCard}>
              <div style={addMoneySummaryRow}>
                <span style={addMoneySummaryLabel}>
                  {language === "tr" ? "Mevcut birikim" : "Current savings"}
                </span>
                <span style={addMoneySummaryValue}>
                  {formatMoney(Number(addMoneyTarget.current_amount), language)}
                </span>
              </div>
              <div style={addMoneySummaryRow}>
                <span style={addMoneySummaryLabel}>
                  {language === "tr" ? "Eklenecek tutar" : "Amount to add"}
                </span>
                <span style={addMoneySummaryValue}>
                  {formatMoney(Number(addMoneyAmount) || 0, language)}
                </span>
              </div>
              <div style={addMoneySummaryDivider} />
              <div style={addMoneySummaryRow}>
                <span style={{ ...addMoneySummaryLabel, fontWeight: 800, color: "#f9fafb" }}>
                  {language === "tr" ? "Yeni toplam" : "New total"}
                </span>
                <span style={addMoneyNewTotal}>
                  {formatMoney(
                    Math.min(
                      Number(addMoneyTarget.current_amount) + (Number(addMoneyAmount) || 0),
                      Number(addMoneyTarget.target_amount)
                    ),
                    language
                  )}
                </span>
              </div>
            </div>

            <input
              style={{ ...inputStyle, marginBottom: 6, textAlign: "left" }}
              type="number"
              min="0"
              placeholder={language === "tr" ? "Eklenecek tutar" : "Amount to add"}
              value={addMoneyAmount}
              onChange={(e) => {
                setAddMoneyAmount(e.target.value);
                setAddMoneyError("");
              }}
            />

            {addMoneyError && (
              <p style={{ ...errorStyle, marginBottom: 14, marginTop: 0 }}>
                {addMoneyError}
              </p>
            )}

            <div style={{ ...modalActions, marginTop: 16 }}>
              <button
                style={modalCancelButton}
                onClick={() => {
                  setAddMoneyTarget(null);
                  setAddMoneyAmount("");
                  setAddMoneyError("");
                }}
              >
                {language === "tr" ? "Vazgeç" : "Cancel"}
              </button>
              <button style={addMoneySaveButton} onClick={handleAddMoney}>
                {language === "tr" ? "Kaydet" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                ? "Bu birikim hedefini silmek istediğine emin misin?"
                : "Are you sure you want to delete this savings goal?"}
            </h3>

            <p style={modalText}>
              {language === "tr"
                ? `“${translateGoalTitle(deleteTarget.title, language)}” hedefi kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                : `“${translateGoalTitle(deleteTarget.title, language)}” will be permanently deleted. This action cannot be undone.`}
            </p>

            <div style={modalActions}>
              <button style={modalCancelButton} onClick={() => setDeleteTarget(null)}>
                {language === "tr" ? "İptal" : "Cancel"}
              </button>

              <button style={modalDeleteButton} onClick={confirmDeleteGoal}>
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

const summaryCard: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.45fr",
  gap: 24,
};

const sectionCard: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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

const helperText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 14,
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 12,
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
  color: "#fca5a5",
  marginTop: 14,
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

const selectWrap: React.CSSProperties = {
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

const customSelectLeftIcon: React.CSSProperties = {
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
  maxHeight: 260,
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

const mutedText: React.CSSProperties = {
  color: "#9ca3af",
};

const goalCard: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const goalTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 10,
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
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
};

const percentageBadge: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const progressOuter: React.CSSProperties = {
  width: "100%",
  height: 10,
  background: "#0f172a",
  borderRadius: 999,
  overflow: "hidden",
  margin: "12px 0 10px 0",
};

const progressInner: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

const goalActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 12,
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
  maxWidth: 560,
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 22,
  padding: "34px 28px 26px",
  boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
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
  width: 86,
  height: 86,
  borderRadius: 999,
  margin: "0 auto 22px",
  background: "rgba(239,68,68,0.16)",
  color: "#fb7185",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalTitle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#f8fafc",
  fontSize: 22,
  fontWeight: 800,
  lineHeight: 1.35,
};

const modalText: React.CSSProperties = {
  margin: "0 auto 24px",
  color: "#cbd5e1",
  lineHeight: 1.6,
  maxWidth: 440,
};

const modalActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const modalCancelButton: React.CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
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
  fontWeight: 800,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 14px 30px rgba(225,29,72,0.28)",
};
const addMoneyButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "linear-gradient(135deg, #16a34a, #22c55e)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(34,197,94,0.28)",
};

const addMoneyIconWrap: React.CSSProperties = {
  fontSize: 46,
  marginBottom: 12,
  lineHeight: 1,
};

const addMoneySummaryCard: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: "14px 18px",
  marginBottom: 16,
  textAlign: "left",
};

const addMoneySummaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "5px 0",
};

const addMoneySummaryLabel: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
  fontWeight: 600,
};

const addMoneySummaryValue: React.CSSProperties = {
  color: "#f3f4f6",
  fontSize: 14,
  fontWeight: 700,
};

const addMoneySummaryDivider: React.CSSProperties = {
  height: 1,
  background: "#263042",
  margin: "8px 0",
};

const addMoneyNewTotal: React.CSSProperties = {
  color: "#22c55e",
  fontSize: 16,
  fontWeight: 800,
};

const addMoneySaveButton: React.CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #16a34a, #22c55e)",
  color: "#fff",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(34,197,94,0.28)",
};
