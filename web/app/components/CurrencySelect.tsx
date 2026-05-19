"use client";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

const currencies = ["TRY", "USD", "EUR"];

export default function CurrencySelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "10px",
        borderRadius: 10,
        background: "#111827",
        color: "#fff",
        border: "1px solid #263042",
        cursor: "pointer",
      }}
    >
      {currencies.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}