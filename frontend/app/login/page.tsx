"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type LoginResult = {
  access_token: string;
  user: { name: string; role: string };
};

const demoRoles = [
  { label: "Admin", email: "admin@company-a.demo", desc: "Full permissions & live publishing" },
  { label: "Editor", email: "editor@company-a.demo", desc: "Create & edit draft revisions" },
  { label: "Consultant", email: "consultant@company-a.demo", desc: "Lead CRM & AI reply approval" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@company-a.demo");
  const [password, setPassword] = useState("DemoPass!2026");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Unable to sign in.");
      const result = body as LoginResult;
      sessionStorage.setItem("tour-cmf-token", result.access_token);
      sessionStorage.setItem("tour-cmf-user", JSON.stringify(result.user));
      const destinations: Record<string, string> = { admin: "/admin", editor: "/editor", consultant: "/consultant" };
      window.location.assign(destinations[result.user.role] ?? "/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)",
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "2.5rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: 800,
              margin: "0 auto 1rem",
              boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)",
            }}
          >
            T
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              color: "#0f766e",
              background: "#ccfbf1",
              padding: "0.2rem 0.65rem",
              borderRadius: "999px",
            }}
          >
            Staff Workspace
          </span>
          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
              margin: "0.75rem 0 0.25rem",
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0 }}>
            Sign in to manage itineraries, rates, and traveler inquiries.
          </p>
        </div>

        {/* 1-Click Demo Role Switcher */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748b",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            Quick Select Demo Account
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {demoRoles.map((r) => {
              const active = email === r.email;
              return (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setEmail(r.email)}
                  style={{
                    padding: "0.55rem 0.25rem",
                    border: `1px solid ${active ? "#0f766e" : "#e2e8f0"}`,
                    background: active ? "#f0fdfa" : "#f8fafc",
                    color: active ? "#0f766e" : "#334155",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "0.35rem",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.7rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                color: "#0f172a",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "0.35rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "0.7rem 4.5rem 0.7rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", color: "#0f172a", outline: "none", fontFamily: "inherit" }}
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: ".65rem", top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#0f766e", cursor: "pointer", fontWeight: 700, fontSize: ".8rem" }}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {message && (
            <div
              style={{
                padding: "0.65rem 0.85rem",
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
              role="alert"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.8rem",
              borderRadius: "8px",
              background: "#0f766e",
              color: "#fff",
              border: 0,
              fontSize: "0.92rem",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 4px 12px rgba(15, 118, 110, 0.3)",
              transition: "all 0.15s ease",
              marginTop: "0.5rem",
            }}
          >
            {loading ? "Verifying Credentials…" : "Sign In to Workspace"}
          </button>
        </form>

        <div style={{ marginTop: "1.75rem", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
          <Link
            href="/"
            style={{
              fontSize: "0.82rem",
              color: "#64748b",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Return to public website
          </Link>
        </div>
      </div>
    </div>
  );
}
