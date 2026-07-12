"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard },
  { label: "Fleet",          href: "/fleet",         icon: Truck           },
  { label: "Drivers",        href: "/drivers",       icon: Users           },
  { label: "Trips",          href: "/trips",         icon: Route           },
  { label: "Maintenance",    href: "/maintenance",   icon: Wrench          },
  { label: "Fuel & Expenses",href: "/fuel",          icon: Fuel            },
  { label: "Analytics",      href: "/analytics",     icon: BarChart3       },
  { label: "Settings",       href: "/settings",      icon: Settings        },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "sidebar",
          mobileOpen && "open"
        )}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground tracking-tight leading-none">
              TransitOps
            </div>
            <div className="text-[10px] text-muted mt-0.5 leading-none">
              Fleet Operations
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn("sidebar-item", isActive && "active")}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="text-[10px] text-muted text-center">
            TransitOps v0.1.0
          </div>
        </div>
      </aside>
    </>
  );
}
