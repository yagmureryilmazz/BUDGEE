import { useCallback, useEffect, useRef, useState } from "react";
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
import { useFocusEffect } from "expo-router";
import { useLanguage, Language } from "@/context/LanguageContext";



const copy = {
  tr: {
    eyebrow: "BUDGEE MOBILE",
    title: "Birikim Hedefleri",
    subtitle: "Hedeflerini oluştur, ilerlemeni takip et.",
    goalName: "Hedef adı",
    goalNamePlaceholder: "Örn: Yeni laptop",
    targetAmount: "Hedef tutar",
    currentAmount: "Mevcut birikim",
    addGoal: "Hedef Ekle",
    updateGoal: "Hedefi Güncelle",
    cancelEdit: "Düzenlemeyi İptal Et",
    loading: "Hedefler yükleniyor...",
    fetchError: "Hedefler alınamadı",
    saveError: "Kaydedilemedi",
    deleteError: "Silinemedi",
    updateError: "Güncellenemedi",
    fillRequired: "Hedef adı ve hedef tutar zorunlu.",
    invalidTarget: "Geçerli bir hedef tutar girmelisin.",
    invalidCurrent: "Geçerli bir mevcut birikim girmelisin.",
    validAmounts: "Tutarlar geçerli olmalı.",
    currentGreater: "Mevcut birikim hedef tutardan büyük olamaz.",
    invalidAmount: "Geçerli bir tutar girmelisin.",
    emptyTitle: "Henüz hedef yok",
    emptyText: "İlk birikim hedefini eklediğinde burada görünecek.",
    completed: "Tamamlandı",
    remaining: "Kalan",
    addMoney: "Para Ekle",
    edit: "Düzenle",
    delete: "Sil",
    deleteTitle: "Hedefi sil",
    deleteMessage: "Bu hedefi silmek istediğine emin misin?",
    cancel: "Vazgeç",
    confirmDelete: "Evet, sil",
    amountToAdd: "Eklenecek tutar",
    currentSaved: "Mevcut birikim",
    newTotal: "Yeni toplam",
    completedBadge: "Hedef tamamlandı",
    completedMessage: "Harika! Bir hedefini tamamladın.",
    editingBadge: "Düzenleme modu",
    save: "Kaydet",
    error: "Hata",
  },
  en: {
    eyebrow: "BUDGEE MOBILE",
    title: "Saving Goals",
    subtitle: "Create goals and track your progress.",
    goalName: "Goal name",
    goalNamePlaceholder: "Ex: New laptop",
    targetAmount: "Target amount",
    currentAmount: "Current saved",
    addGoal: "Add Goal",
    updateGoal: "Update Goal",
    cancelEdit: "Cancel Edit",
    loading: "Loading goals...",
    fetchError: "Failed to load goals",
    saveError: "Could not save",
    deleteError: "Could not delete",
    updateError: "Could not update",
    fillRequired: "Goal name and target amount are required.",
    invalidTarget: "Please enter a valid target amount.",
    invalidCurrent: "Please enter a valid current saved amount.",
    validAmounts: "Amounts must be valid.",
    currentGreater: "Current saved cannot be greater than target amount.",
    invalidAmount: "Please enter a valid amount.",
    emptyTitle: "No goals yet",
    emptyText: "Your first saving goal will appear here after you add it.",
    completed: "Completed",
    remaining: "Remaining",
    addMoney: "Add Money",
    edit: "Edit",
    delete: "Delete",
    deleteTitle: "Delete goal",
    deleteMessage: "Are you sure you want to delete this goal?",
    cancel: "Cancel",
    confirmDelete: "Yes, delete",
    amountToAdd: "Amount to add",
    currentSaved: "Current saved",
    newTotal: "New total",
    completedBadge: "Goal completed",
    completedMessage: "Great job! You completed a goal.",
    editingBadge: "Editing mode",
    save: "Save",
    error: "Error",
  },
};

type SavingsGoal = {
  id: number;
  title: string;
  target_amount: number | string;
  current_amount: number | string;
  remaining_amount?: number | string;
  progress_percentage?: number;
  is_completed: boolean;
};

function normalizeAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeGoals(raw: any): SavingsGoal[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function getProgress(goal: SavingsGoal) {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  if (!target || target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

function getAddedMoneyPreview(goal: SavingsGoal | null, amountText: string) {
  if (!goal) {
    return {
      current: 0,
      added: 0,
      newTotal: 0,
      target: 0,
    };
  }

  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 0);
  const added = normalizeAmount(amountText || "0");
  const safeAdded = Number.isFinite(added) && !Number.isNaN(added) ? added : 0;

  return {
    current,
    added: safeAdded,
    newTotal: current + safeAdded,
    target,
  };
}

function AnimatedGoalProgressBar({
  progress,
  completed,
}: {
  progress: number;
  completed: boolean;
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: Math.min(Math.max(progress, 0), 100),
      duration: 750,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.progressBarBg}>
      <Animated.View
        style={[
          styles.progressBar,
          completed && styles.progressBarCompleted,
          { width: animatedWidth },
        ]}
      />
    </View>
  );
}

function CompletedCelebration({ text }: { text: string }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.completedCelebration,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.completedCelebrationIcon}>🎉</Text>
      <Text style={styles.completedCelebrationText}>{text}</Text>
    </Animated.View>
  );
}

export default function SavingGoals() {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [warningMessage, setWarningMessage] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [moneyGoal, setMoneyGoal] = useState<SavingsGoal | null>(null);
  const [moneyAmount, setMoneyAmount] = useState("");
  const moneyPreview = getAddedMoneyPreview(moneyGoal, moneyAmount);
  const completedGoalsCount = goals.filter((goal) => goal.is_completed).length;

  async function fetchGoals(showLoader = true) {
    if (showLoader) setLoading(true);

    try {
      const data = await apiGet<any>("/savings-goals/progress");
      setGoals(normalizeGoals(data));
    } catch (err: any) {
      setWarningMessage(err?.message || t.fetchError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGoals(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGoals(false);
    }, [language])
  );

  function resetForm() {
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("0");
    setEditingId(null);
  }

  async function saveGoal() {
    const cleanTitle = title.trim();
    const target = normalizeAmount(targetAmount);
    const current = normalizeAmount(currentAmount || "0");

    if (!cleanTitle || !targetAmount.trim()) {
      setWarningMessage(t.fillRequired);
      return;
    }

    if (!Number.isFinite(target) || Number.isNaN(target)) {
      setWarningMessage(t.invalidTarget);
      return;
    }

    if (!Number.isFinite(current) || Number.isNaN(current)) {
      setWarningMessage(t.invalidCurrent);
      return;
    }

    if (target <= 0 || current < 0) {
      setWarningMessage(t.validAmounts);
      return;
    }

    if (current > target) {
      setWarningMessage(t.currentGreater);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: cleanTitle,
        target_amount: target,
        current_amount: current,
      };

      if (editingId) {
        await apiPatch(`/savings-goals/${editingId}`, payload);
      } else {
        await apiPost("/savings-goals/", payload, true);
      }

      resetForm();
      await fetchGoals(false);
    } catch (err: any) {
      setWarningMessage(err?.message || t.saveError);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(goal: SavingsGoal) {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
  }

  async function deleteGoal(id: number) {
    try {
      await apiDelete(`/savings-goals/${id}`);
      setGoals((prev) => prev.filter((goal) => goal.id !== id));
      setDeleteId(null);
    } catch (err: any) {
      setWarningMessage(err?.message || t.deleteError);
    }
  }

  async function addMoneyToGoal() {
    if (!moneyGoal) return;

    const amount = normalizeAmount(moneyAmount);

    if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
      setWarningMessage(t.invalidAmount);
      return;
    }

    const current = Number(moneyGoal.current_amount || 0);
    const target = Number(moneyGoal.target_amount || 0);
    const newCurrent = current + amount;

    if (newCurrent > target) {
      setWarningMessage(t.currentGreater);
      return;
    }

    try {
      await apiPatch(`/savings-goals/${moneyGoal.id}`, {
        current_amount: newCurrent,
      });

      setMoneyGoal(null);
      setMoneyAmount("");
      await fetchGoals(false);
    } catch (err: any) {
      setWarningMessage(err?.message || t.updateError);
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

        {completedGoalsCount > 0 && (
          <CompletedCelebration text={t.completedMessage} />
        )}

        {editingId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerIcon}>✏️</Text>
            <Text style={styles.editingBannerText}>{t.editingBadge}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.label}>{t.goalName}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t.goalNamePlaceholder}
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <Text style={styles.label}>{t.targetAmount}</Text>
          <TextInput
            value={targetAmount}
            onChangeText={(text) => setTargetAmount(text.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>{t.currentAmount}</Text>
          <TextInput
            value={currentAmount}
            onChangeText={(text) => setCurrentAmount(text.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={saveGoal}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {editingId ? t.updateGoal : t.addGoal}
              </Text>
            )}
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={resetForm}>
              <Text style={styles.cancelEditText}>{t.cancelEdit}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={goals}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
              <Text style={styles.emptyText}>{t.emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const progress = getProgress(item);
            const current = Number(item.current_amount || 0);
            const target = Number(item.target_amount || 0);
            const remaining = Math.max(target - current, 0);

            return (
              <View style={[styles.goalCard, item.is_completed && styles.goalCardCompleted]}>
                {item.is_completed && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>✅ {t.completedBadge}</Text>
                  </View>
                )}

                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{item.title}</Text>
                    <Text style={styles.goalAmount}>
                      {formatMoney(current)} / {formatMoney(target)}
                    </Text>
                  </View>

                  <View style={styles.percentBadge}>
                    <Text style={styles.percentText}>{Math.round(progress)}%</Text>
                  </View>
                </View>

                <AnimatedGoalProgressBar
                  progress={progress}
                  completed={item.is_completed}
                />

                <Text style={styles.remainingText}>
                  {item.is_completed ? t.completed : `${t.remaining}: ${formatMoney(remaining)}`}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.addMoneyButton} onPress={() => setMoneyGoal(item)}>
                    <Text style={styles.actionText}>{t.addMoney}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.editButton} onPress={() => startEdit(item)}>
                    <Text style={styles.actionText}>{t.edit}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteId(item.id)}>
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
                  if (deleteId !== null) deleteGoal(deleteId);
                }}
              >
                <Text style={styles.modalDeleteText}>{t.confirmDelete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={moneyGoal !== null} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>💰</Text>
            <Text style={styles.modalTitle}>{t.addMoney}</Text>
            <Text style={styles.modalText}>{moneyGoal?.title}</Text>

            <View style={styles.moneyPreviewBox}>
              <View style={styles.moneyPreviewRow}>
                <Text style={styles.moneyPreviewLabel}>{t.currentSaved}</Text>
                <Text style={styles.moneyPreviewValue}>{formatMoney(moneyPreview.current)}</Text>
              </View>

              <View style={styles.moneyPreviewRow}>
                <Text style={styles.moneyPreviewLabel}>{t.amountToAdd}</Text>
                <Text style={styles.moneyPreviewValue}>{formatMoney(moneyPreview.added)}</Text>
              </View>

              <View style={styles.moneyPreviewDivider} />

              <View style={styles.moneyPreviewRow}>
                <Text style={styles.moneyPreviewLabelStrong}>{t.newTotal}</Text>
                <Text style={styles.moneyPreviewValueStrong}>{formatMoney(moneyPreview.newTotal)}</Text>
              </View>
            </View>

            <TextInput
              value={moneyAmount}
              onChangeText={(text) => setMoneyAmount(text.replace(/[^0-9.,]/g, ""))}
              placeholder={t.amountToAdd}
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setMoneyGoal(null);
                  setMoneyAmount("");
                }}
              >
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveButton} onPress={addMoneyToGoal}>
                <Text style={styles.modalDeleteText}>{t.save}</Text>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
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
  languageText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "900",
  },
  languageTextActive: {
    color: "#fff",
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
  eyebrow: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: { color: "#f8fafc", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 6 },
  formCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  label: { color: "#cbd5e1", fontWeight: "800", marginBottom: 8, fontSize: 13 },
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
  goalCard: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  goalCardCompleted: {
    borderColor: "rgba(34,197,94,0.68)",
    backgroundColor: "rgba(22,163,74,0.13)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  completedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,197,94,0.16)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.36)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  completedBadgeText: {
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: "900",
  },
  goalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  goalTitle: { color: "#f8fafc", fontSize: 17, fontWeight: "900", marginBottom: 5 },
  goalAmount: { color: "#94a3b8", fontWeight: "800" },
  percentBadge: {
    backgroundColor: "rgba(96,165,250,0.16)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  percentText: { color: "#bfdbfe", fontSize: 12, fontWeight: "900" },
  completedCelebration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(34,197,94,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.38)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  completedCelebrationIcon: {
    fontSize: 24,
  },
  completedCelebrationText: {
    flex: 1,
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19,
  },
  progressBarBg: {
    height: 13,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  progressBar: { height: "100%", backgroundColor: "#22c55e", borderRadius: 999 },
  progressBarCompleted: {
    backgroundColor: "#86efac",
  },
  remainingText: { color: "#94a3b8", fontSize: 12, fontWeight: "800", marginBottom: 12 },
  cardActions: { flexDirection: "row", gap: 8 },
  addMoneyButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 11,
    borderRadius: 12,
    alignItems: "center",
  },
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
  modalInput: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 14,
    padding: 14,
    color: "#f8fafc",
    marginBottom: 14,
    fontWeight: "800",
  },
  moneyPreviewBox: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#263042",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  moneyPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  moneyPreviewLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "800",
  },
  moneyPreviewValue: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "900",
  },
  moneyPreviewDivider: {
    height: 1,
    backgroundColor: "#263042",
    marginVertical: 6,
  },
  moneyPreviewLabelStrong: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
  },
  moneyPreviewValueStrong: {
    color: "#86efac",
    fontSize: 14,
    fontWeight: "900",
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
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#16a34a",
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