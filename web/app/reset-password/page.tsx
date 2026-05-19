"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  checkPassword,
  getStrengthScore,
  getStrengthLabel,
  getStrengthColor,
  RULE_LABELS,
} from "../../lib/passwordStrength";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const strengthScore = getStrengthScore(newPassword);
  const canSubmit = !loading && !!token && strengthScore === 5 && newPassword === confirmPassword;

  async function handleReset() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Reset failed.");
      }

      setMessage("Password updated successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💸</div>
          <h1 style={titleStyle}>BUDGEE</h1>
          <p style={subtitleStyle}>Set a new password for your account.</p>
        </div>

        {/* New Password */}
        <label style={labelStyle}>New Password</label>
        <div style={inputWrap}>
          <input
            style={inputStyle}
            type={showNew ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button style={eyeButton} onClick={() => setShowNew((p) => !p)}>
            {showNew ? "Hide" : "Show"}
          </button>
        </div>
        {/* Strength bar */}
        {newPassword.length > 0 && (() => {
          const checks = checkPassword(newPassword);
          const color = getStrengthColor(strengthScore);
          const rules = RULE_LABELS["en"];
          return (
            <div style={{ marginTop: -8, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 99,
                    backgroundColor: i <= strengthScore ? color : "#1f2937",
                    transition: "background-color 0.2s",
                  }} />
                ))}
                <span style={{ fontSize: 11, fontWeight: 800, color, marginLeft: 8, whiteSpace: "nowrap" }}>
                  {getStrengthLabel(strengthScore, "en")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px" }}>
                {(Object.keys(checks) as (keyof typeof checks)[]).map((key) => (
                  <div key={key} style={{ fontSize: 11, color: checks[key] ? "#4ade80" : "#64748b", fontWeight: 700 }}>
                    {checks[key] ? "✓" : "✗"} {rules[key]}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Confirm Password */}
        <label style={labelStyle}>Confirm New Password</label>
        <div style={inputWrap}>
          <input
            style={{ ...inputStyle, borderColor: mismatch ? "#ef4444" : "#263042" }}
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button style={eyeButton} onClick={() => setShowConfirm((p) => !p)}>
            {showConfirm ? "Hide" : "Show"}
          </button>
        </div>
        {mismatch && (
          <p style={{ ...hintStyle, color: "#f87171" }}>Passwords do not match.</p>
        )}

        {/* Submit */}
        <button
          style={{ ...buttonStyle, opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? "pointer" : "not-allowed" }}
          onClick={handleReset}
          disabled={!canSubmit}
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>

        {message && <p style={successStyle}>✅ {message}</p>}
        {error && <p style={errorStyle}>⚠️ {error}</p>}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#0b0f17",
  color: "#f3f4f6",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 20,
  padding: 32,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
  color: "#f8fafc",
  letterSpacing: 2,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#94a3b8",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#cbd5e1",
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 6,
};

const inputWrap: React.CSSProperties = {
  position: "relative",
  marginBottom: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 72px 14px 16px",
  borderRadius: 12,
  border: "1px solid #263042",
  background: "#0f172a",
  color: "#f3f4f6",
  fontSize: 15,
  outline: "none",
};

const eyeButton: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#93c5fd",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  padding: "4px 6px",
};

const hintStyle: React.CSSProperties = {
  color: "#f59e0b",
  fontSize: 12,
  margin: "-10px 0 12px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 15,
  marginTop: 4,
};

const successStyle: React.CSSProperties = {
  color: "#86efac",
  marginTop: 14,
  fontSize: 14,
};

const errorStyle: React.CSSProperties = {
  color: "#fca5a5",
  marginTop: 14,
  fontSize: 14,
};
