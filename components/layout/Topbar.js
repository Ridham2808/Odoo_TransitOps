"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { ROLE_LABELS } from "@/lib/permissions";

export default function Topbar({ onMenuClick }) {
  const router              = useRouter();
  const { name, role, email } = useUser();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef             = useRef(null);

  const initials  = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const roleLabel = ROLE_LABELS[role] ?? role ?? "";

  // Close dropdown on outside click
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
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden"
        aria-label="Open sidebar"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", padding: 4, display: "flex",
        }}
      >
        <Menu style={{ width: 18, height: 18 }} />
      </button>

      {/* Search */}
      <div className="search-input-wrap hidden sm:flex">
        <Search className="search-icon" style={{ width: 13, height: 13 }} />
        <input type="search" placeholder="Search…" aria-label="Global search" />
      </div>

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        {/* Bell */}
        <button
          aria-label="Notifications"
          style={{
            width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "1px solid transparent",
            borderRadius: 6, cursor: "pointer",
            color: "var(--subtle)", transition: "all var(--t)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-hover)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "var(--subtle)";
          }}
        >
          <Bell style={{ width: 14, height: 14 }} />
        </button>

        {/* Vertical divider */}
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
            onMouseEnter={(e) => {
              if (!dropOpen) {
                e.currentTarget.style.background  = "var(--surface-hover)";
                e.currentTarget.style.borderColor = "var(--border)";
              }
            }}
            onMouseLeave={(e) => {
              if (!dropOpen) {
                e.currentTarget.style.background  = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, color: "#fff", flexShrink: 0,
              }}
            >
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

            <ChevronDown
              style={{
                width: 12, height: 12, color: "var(--subtle)", flexShrink: 0,
                transform: dropOpen ? "rotate(180deg)" : "none",
                transition: "transform var(--t)",
              }}
            />
          </button>

          {/* Dropdown panel */}
          {dropOpen && (
            <div
              className="animate-fade-in"
              style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                width: 200,
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)",
                overflow: "hidden",
                zIndex: 100,
              }}
            >
              {/* Header */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.01em" }}>{name}</div>
                <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>{email}</div>
              </div>

              {/* Role pill */}
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                <span
                  style={{
                    fontSize: 10, fontWeight: 500, color: "var(--muted)",
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    padding: "2px 6px", borderRadius: 4,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
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
                  <LogOut style={{ width: 12, height: 12 }} />
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