"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    setIsLoggedIn(true);

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.is_admin) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return (
    <div style={nav}>
      <div style={logo}>💸 BUDGEE</div>

      <div style={links}>
        <a href="/dashboard">Dashboard</a>
        <a href="/transactions">Transactions</a>
        <a href="/budgets">Budgets</a>
        <a href="/savings-goals">Savings</a>

        {/* ✅ YENİ EKLEDİK */}
        <a href="/currency">💱 Currency</a>

        {isAdmin && <a href="/admin">👑 Admin</a>}

        {isLoggedIn && (
          <button onClick={logout} style={logoutBtn}>
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

const nav: React.CSSProperties = {
  width: "100%",
  padding: "14px 24px",
  background: "#020617",
  borderBottom: "1px solid #1e293b",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logo: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 18,
  color: "#f8fafc",
};

const links: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "center",
};

const logoutBtn: React.CSSProperties = {
  background: "#ef4444",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  color: "#fff",
  cursor: "pointer",
};