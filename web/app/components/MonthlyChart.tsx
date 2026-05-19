"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: {
    month: number;
    income: number;
    expense: number;
  }[];
};

export default function MonthlyChart({ data }: Props) {
  return (
    <div style={box}>
      <h3 style={title}>Monthly Overview</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const box: React.CSSProperties = {
  background: "#111827",
  padding: 20,
  borderRadius: 16,
  marginBottom: 28,
};

const title: React.CSSProperties = {
  marginBottom: 12,
  fontWeight: 700,
  color: "#f3f4f6",
};