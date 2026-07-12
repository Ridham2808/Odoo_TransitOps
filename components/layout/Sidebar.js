"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Truck, Users, Route,
  Wrench, Fuel, BarChart3, Settings, Zap, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Fleet",           href: "/fleet",       icon: Truck           },
  { label: "Drivers",         href: "/drivers",     icon: Users           },
  { label: "Trips",           href: "/trips",       icon: Route           },
  { label: "Maintenance",     href: "/maintenance", icon: Wrench          },
  { label: "Fuel & Expenses", href: "/fuel",        icon: Fuel            },
  { label: "Analytics",       href: "/analytics",   icon: BarChart3       },
  { label: "Settings",        href: "/settings",    icon: Settings        },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();

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
        {/* Logo */}
        <div className="sidebar-logo">
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" style={{ paddingTop: 8 }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn("sidebar-item", active && "active")}
              >
                <Icon
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    color: active ? "#fff" : "currentColor",
                    opacity: active ? 1 : 0.6,
                  }}
                />
                <span style={{ letterSpacing: "-0.01em" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--sidebar-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 10, color: "var(--subtle)", letterSpacing: "0.04em" }}>
            v0.1.0 · RBAC enabled
          </div>
        </div>
      </aside>
    </>
  );
}
