"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Language } from "../../lib/translations";

type Props = {
  income: number;
  expense: number;
  language: Language;
};

function formatMoney(value: number, language: Language) {
  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export default function AdminChart({ income, expense, language }: Props) {
  const isTR = language === "tr";

  const data = [
    {
      name: isTR ? "Gelir" : "Income",
      value: income,
      type: "income",
    },
    {
      name: isTR ? "Gider" : "Expense",
      value: expense,
      type: "expense",
    },
  ];

  return (
    <div style={chartBox}>
      <h3 style={title}>
        {isTR ? "Finansal Genel Bakış" : "Financial Overview"}
      </h3>

      <div style={chartInnerBox}>
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={260}>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip formatter={(value) => formatMoney(Number(Array.isArray(value) ? value[0] : (value ?? 0)), language)} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.type === "income" ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const chartBox: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 20,
  marginBottom: 28,
  minWidth: 0,
  overflow: "hidden",
};

const chartInnerBox: React.CSSProperties = {
  width: "100%",
  height: 260,
  minWidth: 0,
  minHeight: 260,
};

const title: React.CSSProperties = {
  marginBottom: 12,
  fontSize: 18,
  fontWeight: 700,
  color: "#f3f4f6",
};