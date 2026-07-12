"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Truck, Users, Route,
  Wrench, Fuel, BarChart3, Settings, Zap, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/userContext";
import { canView, canEdit } from "@/lib/permissions";

// Map every nav item to its permission section key
const NAV_ITEMS = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard, section: "dashboard"   },
  { label: "Fleet",           href: "/fleet",       icon: Truck,           section: "fleet"       },
  { label: "Drivers",         href: "/drivers",     icon: Users,           section: "drivers"     },
  { label: "Trips",           href: "/trips",       icon: Route,           section: "trips"       },
  { label: "Maintenance",     href: "/maintenance", icon: Wrench,          section: "maintenance" },
  { label: "Fuel & Expenses", href: "/fuel",        icon: Fuel,            section: "fuel"        },
  { label: "Analytics",       href: "/analytics",   icon: BarChart3,       section: "analytics"   },
  { label: "Settings",        href: "/settings",    icon: Settings,        section: "settings"    },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname  = usePathname();
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
          <div
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Zap style={{ width: 13, height: 13, color: "#fff" }} />
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
            // RBAC: skip items the role has no access to
            if (role && !canView(role, item.section)) return null;
            // While loading, show all items (skeleton state)
            if (loading) {
              return (
                <div key={item.href} className="sidebar-item" style={{ opacity: 0.3 }}>
                  <item.icon style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.4 }} />
                  <span>{item.label}</span>
                </div>
              );
            }

            const Icon     = item.icon;
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
                <Icon
                  style={{
                    width: 14, height: 14, flexShrink: 0,
                    color:   isActive ? "#fff" : "currentColor",
                    opacity: isActive ? 1 : 0.55,
                  }}
                />
                <span style={{ flex: 1, letterSpacing: "-0.01em" }}>{item.label}</span>

                {/* View-only indicator dot */}
                {viewOnly && !isActive && (
                  <span
                    title="View only"
                    style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--subtle)",
                      flexShrink: 0,
                      opacity: 0.5,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Role info footer ── */}
        <div
          style={{
            padding:    "10px 14px 12px",
            borderTop:  "1px solid var(--sidebar-border)",
            flexShrink: 0,
          }}
        >
          {role && (
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:             7,
                marginBottom:    8,
                padding:        "6px 8px",
                borderRadius:    5,
                background:     "rgba(255,255,255,0.03)",
                border:         "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Avatar initial */}
              <div
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}
              >
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