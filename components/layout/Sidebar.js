"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { canView, canEdit } from "@/lib/permissions";
import LordIcon from "@/components/ui/LordIcon";

// Map every nav item to its permission section key + Lordicon icon name
const NAV_ITEMS = [
  { label: "Dashboard",       href: "/dashboard",   icon: "dashboard",   section: "dashboard"   },
  { label: "Fleet",           href: "/fleet",        icon: "truck",       section: "fleet"       },
  { label: "Drivers",         href: "/drivers",      icon: "users",       section: "drivers"     },
  { label: "Trips",           href: "/trips",        icon: "route",       section: "trips"       },
  { label: "Maintenance",     href: "/maintenance",  icon: "wrench",      section: "maintenance" },
  { label: "Fuel & Expenses", href: "/fuel",         icon: "fuel",        section: "fuel"        },
  { label: "Analytics",       href: "/analytics",    icon: "analytics",   section: "analytics"   },
  { label: "Settings",        href: "/settings",     icon: "settings",    section: "settings"    },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { role, name, loading } = useUser();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        />
      )}

      <aside className={cn("sidebar", mobileOpen && "open")}>
        {/* ── Logo ── */}
        <div className="sidebar-logo">
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <LordIcon
              name="zap"
              size={16}
              trigger="loop"
              colors="primary:#000000,secondary:#333333"
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1 }}>
              TransitOps
            </div>
            <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: 2, lineHeight: 1 }}>
              Fleet Operations
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2, display: "flex" }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav" style={{ paddingTop: 8 }}>
          {NAV_ITEMS.map((item) => {
            if (role && !canView(role, item.section)) return null;

            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

            const viewOnly = role && canView(role, item.section) && !canEdit(role, item.section);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn("sidebar-item", isActive && "active")}
                title={viewOnly ? `${item.label} (view only)` : item.label}
              >
                <LordIcon
                  name={item.icon}
                  size={16}
                  trigger={isActive ? "loop" : "hover"}
                  colors={
                    isActive
                      ? "primary:#ffffff,secondary:#aaaaaa"
                      : "primary:#555555,secondary:#333333"
                  }
                />

                <span style={{ flex: 1, letterSpacing: "-0.01em" }}>{item.label}</span>

                {viewOnly && !isActive && (
                  <span title="View only" style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "var(--subtle)", flexShrink: 0, opacity: 0.5,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── User footer ── */}
        <div style={{
          padding: "10px 14px 12px",
          borderTop: "1px solid var(--sidebar-border)",
          flexShrink: 0,
        }}>
          {role && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              marginBottom: 8, padding: "6px 8px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-2)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name}
                </div>
                <div style={{ fontSize: 9, color: "var(--subtle)", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {role?.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          )}
          <div style={{ fontSize: 10, color: "var(--subtle)", letterSpacing: "0.04em" }}>
            v0.1.0 · RBAC enabled
          </div>
        </div>
      </aside>
    </>
  );
}