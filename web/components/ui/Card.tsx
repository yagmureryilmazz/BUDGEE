"use client";

type CardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export default function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 18,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}