"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { ROLE_LABELS } from "@/lib/permissions";
import LordIcon from "@/components/ui/LordIcon";

export default function Topbar({ onMenuClick }) {
  const router                  = useRouter();
  const { name, role, email }   = useUser();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef                 = useRef(null);

  const initials  = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const roleLabel = ROLE_LABELS[role] ?? role ?? "";

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="topbar">
      {/* Hamburger — mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden"
        aria-label="Open sidebar"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex" }}
      >
        <LordIcon name="menu" size={18} trigger="click" colors="primary:#888888,secondary:#555555" />
      </button>

      {/* Search */}
      <div className="search-input-wrap hidden sm:flex">
        <LordIcon name="search" size={13} trigger="hover" colors="primary:#555555,secondary:#333333"
          style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input type="search" placeholder="Search…" aria-label="Global search" style={{ paddingLeft: 30 }} />
      </div>

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>

        {/* Bell */}
        <button
          aria-label="Notifications"
          style={{
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "1px solid transparent", borderRadius: 6, cursor: "pointer",
            transition: "all var(--t)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          <LordIcon name="bell" size={16} trigger="hover" colors="primary:#555555,secondary:#333333" />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

        {/* User dropdown */}
        <div ref={dropRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDropOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 8px 4px 4px",
              background: dropOpen ? "var(--surface-hover)" : "transparent",
              border: "1px solid",
              borderColor: dropOpen ? "var(--border-strong)" : "transparent",
              borderRadius: 6, cursor: "pointer", transition: "all var(--t)",
            }}
            onMouseEnter={(e) => { if (!dropOpen) { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.borderColor = "var(--border)"; } }}
            onMouseLeave={(e) => { if (!dropOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
          >
            {/* Avatar */}
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
              letterSpacing: 0,
            }}>
              {initials}
            </div>

            {/* Name + role */}
            <div className="hidden sm:block" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {name?.split(" ")[0] || "—"}
              </div>
              {roleLabel && (
                <div className="role-badge" style={{ marginTop: 2, display: "inline-block" }}>
                  {roleLabel}
                </div>
              )}
            </div>

            <LordIcon
              name="chevronDown"
              size={12}
              trigger="hover"
              colors="primary:#555555,secondary:#333333"
              style={{ transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform var(--t)" }}
            />
          </button>

          {/* Dropdown */}
          {dropOpen && (
            <div
              className="animate-fade-in"
              style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                width: 210,
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                overflow: "hidden", zIndex: 100,
              }}
            >
              {/* Header */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.01em" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 1 }}>{email}</div>
                  </div>
                </div>
                {/* Role pill */}
                <span style={{
                  fontSize: 10, fontWeight: 600, color: "var(--muted)",
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  padding: "2px 7px", borderRadius: 4,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "inline-block",
                }}>
                  {roleLabel}
                </span>
              </div>

              {/* Sign out */}
              <div style={{ padding: "4px" }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 8px", borderRadius: 5,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, color: "var(--status-red)",
                    textAlign: "left", transition: "background var(--t)",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <LordIcon name="logout" size={14} trigger="hover" colors="primary:#F87171,secondary:#cc5555" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}