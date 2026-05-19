import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/context/LanguageContext';

const tabLabels = {
  tr: {
    home:     'Ana Sayfa',
    trans:    'İşlemler',
    goals:    'Hedefler',
    budget:   'Bütçe',
    scan:     'Tara',
    currency: 'Döviz',
  },
  en: {
    home:     'Home',
    trans:    'Trans.',
    goals:    'Goals',
    budget:   'Budget',
    scan:     'Scan',
    currency: 'Currency',
  },
};

export default function TabLayout() {
  const { language } = useLanguage();
  const t = tabLabels[language];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        // 🎨 Colors
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#64748b',

        // 📦 Tab style
        tabBarStyle: {
          backgroundColor: '#0b0f17',
          borderTopWidth: 1,
          borderTopColor: '#1f2937',
          height: 82,
          paddingTop: 6,
          paddingBottom: 18,

          // 🔥 modern look
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },

        // 📝 Label
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginTop: -2,
        },

        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      {/* 🏠 DASHBOARD */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.home,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />

      {/* 💳 TRANSACTIONS */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: t.trans,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="creditcard.fill" color={color} />
          ),
        }}
      />

      {/* 🎯 GOALS */}
      <Tabs.Screen
        name="saving-goals"
        options={{
          title: t.goals,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="target" color={color} />
          ),
        }}
      />

      {/* 📊 BUDGETS */}
      <Tabs.Screen
        name="budgets"
        options={{
          title: t.budget,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="chart.pie.fill" color={color} />
          ),
        }}
      />

      {/* 📷 OCR */}
      <Tabs.Screen
        name="ocr"
        options={{
          title: t.scan,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="camera.fill" color={color} />
          ),
        }}
      />

      {/* 💱 CURRENCY */}
      <Tabs.Screen
        name="currency"
        options={{
          title: t.currency,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="chevron.down" color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
