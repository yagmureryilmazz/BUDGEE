"use client";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
};

export default function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div
      style={{
        minHeight: 220,
        borderRadius: 16,
        border: "1px dashed #334155",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.75), rgba(15,23,42,0.45))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "rgba(37,99,235,0.16)",
            color: "#93c5fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#f8fafc",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#94a3b8",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    </div>
  );
}