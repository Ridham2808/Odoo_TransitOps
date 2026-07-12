"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, AlertCircle, ArrowRight, Zap } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

const schema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  remember: z.boolean().optional(),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [authError, setAuthError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(data) {
    setLoading(true);
    setAuthError("");
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email, password: data.password,
      });
      if (error) {
        setAuthError(
          error.message.toLowerCase().includes("invalid")
            ? "Invalid email or password."
            : error.message
        );
        return;
      }
      if (authData.session) { router.push("/dashboard"); router.refresh(); }
    } catch { setAuthError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Subtle background grid (Supabase-style) ── */}
      <div
        className="grid-bg"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      {/* ── Glow spots ── */}
      <div
        style={{
          position: "absolute",
          top: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          right: -100,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
      <div
        style={{
          width: 400,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "48px 44px",
          position: "relative",
          background: "rgba(255,255,255,0.01)",
        }}
        className="hidden lg:flex"
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 72 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap style={{ width: 16, height: 16, color: "#000" }} />
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "#fff",
            }}
          >
            TransitOps
          </span>
        </div>

        {/* Headline */}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Fleet ops,<br />
            <span style={{ color: "var(--subtle)" }}>fully in control.</span>
          </h1>

          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, maxWidth: 280 }}>
            One platform for dispatch, drivers, maintenance, and financial reporting.
          </p>

          {/* Role pills */}
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { role: "Fleet Manager",     scope: "Full platform access"               },
              { role: "Dispatcher",        scope: "Trips, Fleet, Fuel"                  },
              { role: "Safety Officer",    scope: "Drivers & Maintenance"               },
              { role: "Financial Analyst", scope: "Expenses & Analytics"                },
            ].map(({ role, scope }) => (
              <div
                key={role}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-2)", letterSpacing: "-0.01em" }}>{role}</span>
                <span style={{ fontSize: 11, color: "var(--subtle)" }}>{scope}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 32 }}>
          <p style={{ fontSize: 10, color: "var(--subtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            TransitOps · RBAC · v0.1.0
          </p>
        </div>
      </div>

      {/* ══════════════════════ RIGHT PANEL — FORM ══════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          position: "relative",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Mobile logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}
            className="lg:hidden"
          >
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: 13, height: 13, color: "#000" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>TransitOps</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", color: "#fff", marginBottom: 4 }}>
              Sign in
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Enter your credentials to access your account</p>
          </div>

          {/* Error */}
          {authError && (
            <div
              className="animate-slide-up"
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 7,
                background: "rgba(248,113,113,0.07)",
                border: "1px solid rgba(248,113,113,0.18)",
                marginBottom: 18,
              }}
            >
              <AlertCircle style={{ width: 14, height: 14, color: "var(--status-red)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "var(--status-red)", lineHeight: 1.4 }}>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
                style={{ borderColor: errors.email ? "rgba(248,113,113,0.5)" : "" }}
                {...register("email")}
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label className="form-label" htmlFor="password">Password</label>
                <button
                  type="button"
                  style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", transition: "color var(--t)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                >
                  Forgot password?
                </button>
              </div>
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
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--subtle)", display: "flex", padding: 2,
                    transition: "color var(--t)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--subtle)")}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            {/* Remember me */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                {...register("remember")}
                style={{ width: 13, height: 13, accentColor: "#fff", cursor: "pointer" }}
              />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Keep me signed in</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", height: 38, fontSize: 13, fontWeight: 600, marginTop: 4, gap: 8 }}
            >
              {loading ? (
                <><Spinner size={14} /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight style={{ width: 14, height: 14 }} /></>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}