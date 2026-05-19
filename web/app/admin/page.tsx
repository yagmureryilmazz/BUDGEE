// THIS FILE HAS BEEN REPLACED BY REQUEST.

"use client";

import { useEffect, useMemo, useState } from "react";
import AdminChart from "../components/AdminChart";
import { translations, Language } from "../../lib/translations";
import {
  Crown,
  Users,
  Receipt,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  XCircle,
  UserRound,
  LineChart as LineChartIcon,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type User = {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  is_verified: boolean;
};

type AdminStats = {
  total_users: number;
  total_transactions: number;
  total_expense: number;
  total_income: number;
};

type MonthlyStatsItem = {
  month: number;
  income: number;
  expense: number;
};

function formatMoney(value: number, language: Language) {
  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getMonthLabel(month: number, language: Language) {
  const trMonths = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];

  const enMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const index = Math.max(0, Math.min(11, Number(month) - 1));
  return language === "tr" ? trMonths[index] : enMonths[index];
}

function getAdminErrorMessage(rawMessage: string, language: Language) {
  const message = rawMessage || "";

  if (message.includes("remove admin permission") || message.includes("own account")) {
    return language === "tr"
      ? "Kendi admin yetkini kaldıramazsın."
      : "You cannot remove admin permission from your own account.";
  }

  if (message.includes("delete your own admin account")) {
    return language === "tr"
      ? "Kendi admin hesabını silemezsin."
      : "You cannot delete your own admin account.";
  }

  if (message.includes("Admin only")) {
    return language === "tr"
      ? "Bu işlem için admin yetkisi gerekiyor."
      : "Admin permission is required for this action.";
  }

  if (message.includes("User not found")) {
    return language === "tr" ? "Kullanıcı bulunamadı." : "User not found.";
  }

  if (message.includes("Unauthorized") || message.includes("Invalid token")) {
    return language === "tr"
      ? "Oturum süren dolmuş olabilir. Lütfen tekrar giriş yap."
      : "Your session may have expired. Please log in again.";
  }

  return language === "tr" ? "Güncelleme başarısız oldu." : "Update failed.";
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyStatsItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "en" || savedLanguage === "tr") {
      setLanguage(savedLanguage);
    }
  }, []);

  const t = translations[language];

  async function loadUsers() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to load users");

    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  async function loadStats() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to load stats");

    const data = await res.json();
    setStats(data);
  }

  async function loadMonthlyStats() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE_URL}/admin/monthly-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to load monthly stats");

    const data = await res.json();
    setMonthlyData(Array.isArray(data) ? data : []);
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadUsers(), loadStats(), loadMonthlyStats()]);
    } catch (err) {
      setError(t.adminFailedLoad);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(user: User) {
    try {
      setUpdatingUserId(user.id);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_admin: !user.is_admin,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Update failed";

        try {
          const errorData = await res.json();
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          }
        } catch {
          errorMessage = "Update failed";
        }

        setError(getAdminErrorMessage(errorMessage, language));
        return;
      }

      await loadUsers();
      setError("");
    } catch {
      setError(
        language === "tr"
          ? "Bağlantı hatası oluştu. Lütfen tekrar dene."
          : "A connection error occurred. Please try again."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function deleteUser(user: User) {
    try {
      setUpdatingUserId(user.id);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errorMessage = "Delete failed";

        try {
          const errorData = await res.json();

          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          }
        } catch {
          errorMessage = "Delete failed";
        }

        setError(getAdminErrorMessage(errorMessage, language));
        return;
      }

      setUserToDelete(null);
      await Promise.all([loadUsers(), loadStats()]);
      setError("");
    } catch {
      setError(
        language === "tr"
          ? "Kullanıcı silinemedi. Lütfen tekrar dene."
          : "User could not be deleted. Please try again."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  useEffect(() => {
    loadPage();
  }, [language]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const verifiedCount = users.filter((u) => u.is_verified).length;
  const adminCount = users.filter((u) => u.is_admin).length;
  const activeCount = users.filter((u) => u.is_active).length;

  const monthlyChartData = monthlyData.map((item) => ({
    month: getMonthLabel(item.month, language),
    income: Number(item.income || 0),
    expense: Number(item.expense || 0),
  }));

  return (
    <div style={pageStyle}>
      {userToDelete && (
        <div style={modalOverlay}>
          <div style={deleteModalCard}>
            <button
              type="button"
              style={modalCloseButton}
              onClick={() => setUserToDelete(null)}
              disabled={updatingUserId === userToDelete.id}
            >
              ×
            </button>

            <div style={deleteModalIconWrap}>
              <Trash2 size={30} />
            </div>

            <h2 style={deleteModalTitle}>
              {language === "tr" ? "Kullanıcıyı sil" : "Delete user"}
            </h2>

            <p style={deleteModalText}>
              {language === "tr"
                ? `${userToDelete.email} kullanıcısını silmek istediğine emin misin?`
                : `Are you sure you want to delete ${userToDelete.email}?`}
            </p>

            <div style={deleteModalWarning}>
              <AlertTriangleIcon />
              <span>
                {language === "tr"
                  ? "Bu işlem geri alınamaz."
                  : "This action cannot be undone."}
              </span>
            </div>

            <div style={deleteModalActions}>
              <button
                type="button"
                style={modalCancelButton}
                onClick={() => setUserToDelete(null)}
                disabled={updatingUserId === userToDelete.id}
              >
                {language === "tr" ? "İptal" : "Cancel"}
              </button>

              <button
                type="button"
                style={{
                  ...modalDeleteButton,
                  opacity: updatingUserId === userToDelete.id ? 0.7 : 1,
                  cursor:
                    updatingUserId === userToDelete.id ? "not-allowed" : "pointer",
                }}
                onClick={() => deleteUser(userToDelete)}
                disabled={updatingUserId === userToDelete.id}
              >
                <Trash2 size={16} />
                {updatingUserId === userToDelete.id
                  ? language === "tr"
                    ? "Siliniyor..."
                    : "Deleting..."
                  : language === "tr"
                  ? "Sil"
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={heroHeader}>
        <h1 style={titleStyle}>👑 {t.adminTitle}</h1>
        <p style={subtitleStyle}>{t.adminSubtitle}</p>
      </div>

      {error && (
        <div style={errorBox}>
          <div style={errorIconWrap}>
            <XCircle size={18} />
          </div>
          <div style={{ flex: 1 }}>{error}</div>
          <button style={errorCloseButton} onClick={() => setError("")}>×</button>
        </div>
      )}

      {stats && (
        <div style={summaryGrid}>
          <div style={summaryCard}>
            <div style={summaryIconBlue}>
              <Users size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.adminTotalUsers}</div>
              <div style={summaryValue}>{stats.total_users}</div>
            </div>
          </div>

          <div style={summaryCard}>
            <div style={summaryIconPurple}>
              <Receipt size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.adminTotalTransactions}</div>
              <div style={summaryValue}>{stats.total_transactions}</div>
            </div>
          </div>

          <div style={summaryCard}>
            <div style={summaryIconRed}>
              <TrendingDown size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.adminTotalExpense}</div>
              <div style={{ ...summaryValue, color: "#fca5a5" }}>
                {formatMoney(Number(stats.total_expense || 0), language)}
              </div>
            </div>
          </div>

          <div style={summaryCard}>
            <div style={summaryIconGreen}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={summaryLabel}>{t.adminTotalIncome}</div>
              <div style={{ ...summaryValue, color: "#86efac" }}>
                {formatMoney(Number(stats.total_income || 0), language)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={mainGrid}>
        <div style={leftColumn}>
          {stats && (
            <div style={sectionCard}>
              <div style={sectionTitleRow}>
                <div style={sectionIconBox}>
                  <TrendingUp size={16} />
                </div>
                <h2 style={sectionTitle}>{t.adminIncomeVsExpense}</h2>
              </div>

              <AdminChart
                income={Number(stats.total_income || 0)}
                expense={Number(stats.total_expense || 0)}
                language={language}
              />
            </div>
          )}

          {monthlyChartData.length > 0 && (
            <div style={sectionCard}>
              <div style={sectionTitleRow}>
                <div style={sectionIconBox}>
                  <LineChartIcon size={16} />
                </div>
                <h2 style={sectionTitle}>{t.adminMonthlyStats}</h2>
              </div>

              <div style={monthlyChartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#273142" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value: any) =>
                        formatMoney(Number(value), language)
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={language === "tr" ? "Gelir" : "Income"}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={language === "tr" ? "Gider" : "Expense"}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div style={rightColumn}>
          <div style={sectionCard}>
            <div style={sectionTitleRow}>
              <div style={sectionIconBox}>
                <ShieldCheck size={16} />
              </div>
              <h2 style={sectionTitle}>{t.adminSystemOverview}</h2>
            </div>

            <div style={miniStatsGrid}>
              <div style={miniStatCard}>
                <div style={miniStatLabel}>{t.adminAdmins}</div>
                <div style={miniStatValue}>{adminCount}</div>
              </div>

              <div style={miniStatCard}>
                <div style={miniStatLabel}>{t.adminVerified}</div>
                <div style={miniStatValue}>{verifiedCount}</div>
              </div>

              <div style={miniStatCard}>
                <div style={miniStatLabel}>{t.adminActive}</div>
                <div style={miniStatValue}>{activeCount}</div>
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <div style={sectionTitleRow}>
              <div style={sectionIconBox}>
                <UserRound size={16} />
              </div>
              <h2 style={sectionTitle}>{t.adminUsers}</h2>
            </div>

            <div style={searchWrap}>
              <input
                style={searchInput}
                placeholder={t.adminSearchUsers}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={userListScrollArea}>
              {loading ? (
                <p style={mutedText}>{t.adminLoading}</p>
              ) : filteredUsers.length === 0 ? (
                <p style={mutedText}>{t.adminNoUsers}</p>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} style={userCard}>
                    <div style={userTopRow}>
                      <div style={userEmail}>{user.email}</div>

                      <div style={userActionButtons}>
                        <button
                          style={{
                            ...adminToggleButton,
                            background: user.is_admin ? "#1f2937" : "#2563eb",
                            border: user.is_admin
                              ? "1px solid #7f1d1d"
                              : "1px solid #3b82f6",
                            color: "#fff",
                            opacity: updatingUserId === user.id ? 0.7 : 1,
                            cursor:
                              updatingUserId === user.id
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => toggleAdmin(user)}
                          disabled={updatingUserId === user.id}
                        >
                          {user.is_admin ? (
                            <>
                              <ShieldOff size={14} />
                              {t.adminRemoveAdmin}
                            </>
                          ) : (
                            <>
                              <Crown size={14} />
                              {t.adminMakeAdmin}
                            </>
                          )}
                        </button>

                        <button
                          style={{
                            ...adminDeleteButton,
                            opacity: updatingUserId === user.id ? 0.7 : 1,
                            cursor:
                              updatingUserId === user.id
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => setUserToDelete(user)}
                          disabled={updatingUserId === user.id}
                        >
                          <Trash2 size={14} />
                          {language === "tr" ? "Sil" : "Delete"}
                        </button>
                      </div>
                    </div>

                    <div style={badgeRow}>
                      <span
                        style={{
                          ...badgeStyle,
                          background: user.is_admin
                            ? "rgba(245,158,11,0.14)"
                            : "rgba(148,163,184,0.14)",
                          color: user.is_admin ? "#fcd34d" : "#cbd5e1",
                        }}
                      >
                        {user.is_admin ? "👑 Admin" : t.adminUser}
                      </span>

                      <span
                        style={{
                          ...badgeStyle,
                          background: user.is_active
                            ? "rgba(34,197,94,0.14)"
                            : "rgba(239,68,68,0.14)",
                          color: user.is_active ? "#86efac" : "#fca5a5",
                        }}
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle2 size={13} />
                            {t.adminActive}
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            {language === "tr" ? "Pasif" : "Inactive"}
                          </>
                        )}
                      </span>

                      <span
                        style={{
                          ...badgeStyle,
                          background: user.is_verified
                            ? "rgba(59,130,246,0.14)"
                            : "rgba(107,114,128,0.18)",
                          color: user.is_verified ? "#93c5fd" : "#d1d5db",
                        }}
                      >
                        {user.is_verified ? t.adminVerified : t.adminNotVerified}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <span style={alertTriangleIconStyle}>⚠️</span>
  );
}

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(3,7,18,0.78)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const deleteModalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  position: "relative",
  background:
    "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98))",
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: 24,
  boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
  padding: "34px 28px 24px",
  color: "#f8fafc",
};

const modalCloseButton: React.CSSProperties = {
  position: "absolute",
  top: 18,
  right: 18,
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(15,23,42,0.70)",
  color: "#94a3b8",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const deleteModalIconWrap: React.CSSProperties = {
  width: 78,
  height: 78,
  borderRadius: 999,
  margin: "0 auto 22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#f87171",
  background: "rgba(239,68,68,0.12)",
  border: "3px solid rgba(239,68,68,0.55)",
  boxShadow: "0 0 34px rgba(239,68,68,0.18)",
};

const deleteModalTitle: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  textAlign: "center",
  fontSize: 28,
  fontWeight: 900,
  color: "#f8fafc",
};

const deleteModalText: React.CSSProperties = {
  margin: "0 auto 22px",
  maxWidth: 360,
  textAlign: "center",
  color: "#cbd5e1",
  fontSize: 16,
  lineHeight: 1.6,
};

const deleteModalWarning: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "rgba(127,29,29,0.16)",
  border: "1px solid rgba(239,68,68,0.50)",
  color: "#fca5a5",
  borderRadius: 16,
  padding: "15px 16px",
  fontWeight: 800,
  marginBottom: 24,
};

const alertTriangleIconStyle: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1,
};

const deleteModalActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  paddingTop: 22,
  borderTop: "1px solid rgba(148,163,184,0.16)",
};

const modalCancelButton: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.30)",
  background: "rgba(15,23,42,0.75)",
  color: "#e5e7eb",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const modalDeleteButton: React.CSSProperties = {
  border: "1px solid rgba(248,113,113,0.55)",
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "#fff",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 14px 28px rgba(220,38,38,0.26)",
};

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

const errorBox: React.CSSProperties = {
  marginBottom: 18,
  padding: "14px 16px",
  borderRadius: 14,
  background: "rgba(239,68,68,0.14)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 12,
  boxShadow: "0 10px 30px rgba(127,29,29,0.18)",
};

const errorIconWrap: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: "rgba(239,68,68,0.18)",
  color: "#fca5a5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const errorCloseButton: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(248,113,113,0.35)",
  background: "rgba(127,29,29,0.25)",
  color: "#fecaca",
  fontSize: 18,
  fontWeight: 800,
  cursor: "pointer",
  lineHeight: 1,
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

const baseSummaryIcon: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const summaryIconBlue: React.CSSProperties = {
  ...baseSummaryIcon,
  background: "rgba(59,130,246,0.16)",
  color: "#60a5fa",
};

const summaryIconPurple: React.CSSProperties = {
  ...baseSummaryIcon,
  background: "rgba(168,85,247,0.16)",
  color: "#c084fc",
};

const summaryIconRed: React.CSSProperties = {
  ...baseSummaryIcon,
  background: "rgba(239,68,68,0.16)",
  color: "#f87171",
};

const summaryIconGreen: React.CSSProperties = {
  ...baseSummaryIcon,
  background: "rgba(34,197,94,0.16)",
  color: "#4ade80",
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

const mainGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.25fr 1fr",
  gap: 24,
};

const leftColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const rightColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
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

const miniStatsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
};

const miniStatCard: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 14,
};

const miniStatLabel: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 13,
  marginBottom: 8,
  fontWeight: 600,
};

const miniStatValue: React.CSSProperties = {
  color: "#f8fafc",
  fontSize: 22,
  fontWeight: 800,
};

const searchWrap: React.CSSProperties = {
  marginBottom: 14,
};

const searchInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#161d2b",
  color: "#f3f4f6",
  fontSize: 15,
  outline: "none",
};

const monthlyChartWrap: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 320,
  minHeight: 320,
  background: "#0f172a",
  border: "1px solid #263042",
  borderRadius: 16,
  padding: 16,
  boxSizing: "border-box",
};

const userListScrollArea: React.CSSProperties = {
  maxHeight: 700,
  overflowY: "auto",
  paddingRight: 6,
};

const userCard: React.CSSProperties = {
  background: "#161d2b",
  border: "1px solid #263042",
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const userTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 12,
};

const userEmail: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  wordBreak: "break-word",
};

const userActionButtons: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const adminToggleButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const adminDeleteButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
  background: "#7f1d1d",
  border: "1px solid #ef4444",
  color: "#fff",
};

const badgeRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
};

const mutedText: React.CSSProperties = {
  color: "#9ca3af",
};