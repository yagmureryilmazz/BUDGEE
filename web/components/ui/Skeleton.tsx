"use client";

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: React.CSSProperties;
};

export default function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 10,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          "linear-gradient(90deg, #111827 25%, #1f2937 50%, #111827 75%)",
        backgroundSize: "200% 100%",
        animation: "pulse-shimmer 1.6s linear infinite",
        ...style,
      }}
    />
  );
}