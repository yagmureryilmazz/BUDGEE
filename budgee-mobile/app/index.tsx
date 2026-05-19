import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

type Language = "tr" | "en";

const copy = {
  tr: {
    badge: "SMARTSPEND AI",
    title: "BUDGEE",
    subtitle:
      "Harcamalarını takip et, fişlerini AI ile okut ve bütçeni mobilde kolayca yönet.",
    ocrTitle: "AI OCR",
    ocrText: "Fiş okutma",
    budgetTitle: "Bütçe",
    budgetText: "Bütçe takibi",
    login: "Giriş Yap",
    register: "Hesap Oluştur",
    continue: "Devam Et",
  },
  en: {
    badge: "SMARTSPEND AI",
    title: "BUDGEE",
    subtitle:
      "Track your expenses, scan receipts with AI, and manage your budget easily on mobile.",
    ocrTitle: "AI OCR",
    ocrText: "Receipt scan",
    budgetTitle: "Budget",
    budgetText: "Budget tracking",
    login: "Login",
    register: "Create Account",
    continue: "Continue",
  },
};

export default function Index() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("tr");
  const t = copy[language];

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        const token = await AsyncStorage.getItem("token");
        setIsLoggedIn(!!token);
      };

      checkAuth();
    }, [])
  );

  return (
    <LinearGradient
      colors={["#0b0f17", "#101827", "#0b0f17"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          paddingTop: 70,
          paddingBottom: 70,
        }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
      >
        <View
          style={{
            position: "absolute",
            top: 90,
            left: -60,
            width: 210,
            height: 210,
            borderRadius: 999,
            backgroundColor: "rgba(37,99,235,0.18)",
          }}
        />

        <View
          style={{
            position: "absolute",
            bottom: 80,
            right: -70,
            width: 240,
            height: 240,
            borderRadius: 999,
            backgroundColor: "rgba(34,197,94,0.12)",
          }}
        />

        <View
          style={{
            backgroundColor: "rgba(17,24,39,0.92)",
            borderWidth: 1,
            borderColor: "rgba(51,65,85,0.9)",
            borderRadius: 28,
            padding: 26,
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 18 },
          }}
        >
          <View
            style={{
              alignSelf: "flex-end",
              flexDirection: "row",
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: "#263042",
              borderRadius: 999,
              padding: 4,
              marginBottom: 18,
            }}
          >
            <TouchableOpacity
              onPress={() => setLanguage("tr")}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: language === "tr" ? "#2563eb" : "transparent",
              }}
            >
              <Text
                style={{
                  color: language === "tr" ? "#fff" : "#94a3b8",
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                TR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage("en")}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: language === "en" ? "#2563eb" : "transparent",
              }}
            >
              <Text
                style={{
                  color: language === "en" ? "#fff" : "#94a3b8",
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                EN
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: "rgba(37,99,235,0.18)",
              borderWidth: 1,
              borderColor: "rgba(96,165,250,0.35)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <Text style={{ fontSize: 34 }}>💸</Text>
          </View>

          <Text
            style={{
              color: "#60a5fa",
              fontSize: 13,
              fontWeight: "900",
              letterSpacing: 1.4,
              marginBottom: 8,
            }}
          >
            {t.badge}
          </Text>

          <Text
            style={{
              fontSize: 46,
              fontWeight: "900",
              color: "#f8fafc",
              marginBottom: 10,
            }}
          >
            {t.title}
          </Text>

          <Text
            style={{
              color: "#cbd5e1",
              fontSize: 17,
              lineHeight: 26,
              marginBottom: 24,
            }}
          >
            {t.subtitle}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 28,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: "#263042",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 22, marginBottom: 8 }}>📸</Text>
              <Text style={{ color: "#f8fafc", fontWeight: "800" }}>
                {t.ocrTitle}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                {t.ocrText}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: "#263042",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 22, marginBottom: 8 }}>📊</Text>
              <Text style={{ color: "#f8fafc", fontWeight: "800" }}>
                {t.budgetTitle}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                {t.budgetText}
              </Text>
            </View>
          </View>

          {!isLoggedIn && (
            <>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
                style={{
                  width: "100%",
                  backgroundColor: "#2563eb",
                  padding: 17,
                  borderRadius: 16,
                  marginBottom: 12,
                  alignItems: "center",
                  shadowColor: "#2563eb",
                  shadowOpacity: 0.35,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                }}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                  {t.login}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/register")}
                style={{
                  width: "100%",
                  borderColor: "#374151",
                  borderWidth: 1,
                  padding: 17,
                  borderRadius: 16,
                  alignItems: "center",
                  backgroundColor: "rgba(15,23,42,0.72)",
                }}
              >
                <Text style={{ color: "#e5e7eb", fontWeight: "900", fontSize: 16 }}>
                  {t.register}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isLoggedIn && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/dashboard")}
              style={{
                width: "100%",
                backgroundColor: "#16a34a",
                padding: 17,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                {t.continue}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}