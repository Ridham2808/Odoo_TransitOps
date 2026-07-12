"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, EyeOff, AlertTriangle, ArrowRight, Zap, ChevronDown,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";

const ROLES = [
  { value: "FLEET_MANAGER",     label: "Fleet Manager"     },
  { value: "DISPATCHER",        label: "Dispatcher"        },
  { value: "SAFETY_OFFICER",    label: "Safety Officer"    },
  { value: "FINANCIAL_ANALYST", label: "Financial Analyst" },
];

const schema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  role:     z.enum(["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"], {
    required_error: "Select your role",
  }),
  remember: z.boolean().optional(),
});

// ── Input component ──────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--subtle)",
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: "var(--status-red)" }}>{error}</span>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [authError, setAuthError]     = useState("");
  const [isLocked, setIsLocked]       = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(data) {
    setLoading(true);
    setAuthError("");
    setIsLocked(false);

    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: data.email, password: data.password, role: data.role }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 423 || json.error === "ACCOUNT_LOCKED") {
          setIsLocked(true);
        }
        setAuthError(json.message ?? "Invalid credentials. Account locked after 5 failed attempts.");
        return;
      }

      // Success — redirect to dashboard
      router.push("/dashboard");
      router.refresh();

    } catch {
      setAuthError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display:   "flex",
        background: "var(--bg)",
        position:  "relative",
        overflow:  "hidden",
      }}
    >
      {/* Background grid */}
      <div
        className="grid-bg"
        style={{ position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none" }}
      />

      {/* Glow spots */}
      <div style={{ position: "absolute", top: -120, left: -120, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -150, right: -100, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 65%)", pointerEvents: "none" }} />

      {/* ══════════ LEFT PANEL ══════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width:         400,
          flexShrink:    0,
          borderRight:   "1px solid var(--border)",
          flexDirection: "column",
          padding:       "48px 44px",
          background:    "rgba(255,255,255,0.01)",
          position:      "relative",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 64 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ width: 16, height: 16, color: "#000" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1 }}>
              TransitOps
            </div>
            <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>
              Smart Transport Operations Platform
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.15, color: "#fff", marginBottom: 14 }}>
          One login,<br />
          <span style={{ color: "var(--subtle)" }}>four roles.</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, marginBottom: 40, maxWidth: 280 }}>
          Access is scoped the moment you sign in. No extra steps.
        </p>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { role: "Fleet Manager",     scope: "Fleet & Maintenance" },
            { role: "Dispatcher",        scope: "Dashboard & Trips"    },
            { role: "Safety Officer",    scope: "Drivers & Compliance" },
            { role: "Financial Analyst", scope: "Fuel, Expenses & Analytics" },
          ].map(({ role, scope }) => (
            <div
              key={role}
              style={{
                display:       "flex",
                alignItems:    "center",
                justifyContent:"space-between",
                padding:       "9px 12px",
                borderRadius:   6,
                background:    "rgba(255,255,255,0.03)",
                border:        "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-2)", letterSpacing: "-0.01em" }}>
                {role}
              </span>
              <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                {scope}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", paddingTop: 32 }}>
          <p style={{ fontSize: 10, color: "var(--subtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            TransitOps · RBAC · v0.1.0
          </p>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL — FORM ══════════ */}
      <div
        style={{
          flex:            1,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          padding:         "32px 24px",
          position:        "relative",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: 13, height: 13, color: "#000" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>TransitOps</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", color: "#fff", marginBottom: 4 }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Enter your credentials to continue</p>
          </div>

          {/* ── Lockout / error callout ── */}
          {authError && (
            <div
              className="animate-slide-up"
              style={{
                display:      "flex",
                gap:           10,
                padding:      "11px 13px",
                borderRadius:  7,
                background:   "rgba(248,113,113,0.06)",
                border:       `1.5px dashed rgba(248,113,113,${isLocked ? "0.6" : "0.35"})`,
                marginBottom:  20,
              }}
            >
              <AlertTriangle
                style={{ width: 14, height: 14, color: "var(--status-red)", flexShrink: 0, marginTop: 1 }}
              />
              <div>
                <p style={{ fontSize: 12, color: "var(--status-red)", lineHeight: 1.5 }}>
                  {authError}
                </p>
                {isLocked && (
                  <p style={{ fontSize: 11, color: "rgba(248,113,113,0.6)", marginTop: 3 }}>
                    Try again in 15 minutes.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Email */}
            <Field label="Email" error={errors.email?.message}>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
                style={{ borderColor: errors.email ? "rgba(248,113,113,0.5)" : "" }}
                {...register("email")}
              />
            </Field>

            {/* Password */}
            <Field label="Password" error={errors.password?.message}>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 38, borderColor: errors.password ? "rgba(248,113,113,0.5)" : "" }}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  style={{
                    position:  "absolute",
                    right:      10,
                    top:       "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border:     "none",
                    cursor:    "pointer",
                    color:     "var(--subtle)",
                    display:   "flex",
                    padding:    2,
                    transition: "color var(--t)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--subtle)")}
                >
                  {showPass
                    ? <EyeOff style={{ width: 14, height: 14 }} />
                    : <Eye    style={{ width: 14, height: 14 }} />
                  }
                </button>
              </div>
            </Field>

            {/* Role */}
            <Field label="Role (RBAC)" error={errors.role?.message}>
              <div style={{ position: "relative" }}>
                <select
                  id="role"
                  className="input"
                  defaultValue=""
                  style={{ borderColor: errors.role ? "rgba(248,113,113,0.5)" : "" }}
                  {...register("role")}
                >
                  <option value="" disabled>Select your role…</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </Field>

            {/* Remember + Forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  {...register("remember")}
                  style={{ width: 13, height: 13, accentColor: "#fff", cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Remember me</span>
              </label>
              <button
                type="button"
                style={{ fontSize: 12, color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", transition: "color var(--t)", letterSpacing: "-0.01em" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--subtle)")}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", height: 38, fontSize: 13, fontWeight: 600, marginTop: 4 }}
            >
              {loading ? (
                <><Spinner size={14} /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight style={{ width: 14, height: 14 }} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}