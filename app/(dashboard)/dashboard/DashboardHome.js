"use client";

import { useState, useEffect } from "react";
import {
  Truck, Users, Route, Wrench,
  TrendingUp, TrendingDown, Activity,
  ArrowRight, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";

const ROLE_LABELS = {
  FLEET_MANAGER:     "Fleet Manager",
  DISPATCHER:        "Dispatcher",
  SAFETY_OFFICER:    "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};

// Quick-access cards per role
const ROLE_QUICKLINKS = {
  FLEET_MANAGER:     ["/fleet", "/maintenance", "/drivers", "/analytics"],
  DISPATCHER:        ["/trips", "/fleet", "/drivers", "/fuel"],
  SAFETY_OFFICER:    ["/drivers", "/maintenance", "/trips", "/analytics"],
  FINANCIAL_ANALYST: ["/fuel", "/analytics", "/trips"],
};

const NAV_META = {
  "/fleet":       { label: "Fleet",           icon: Truck,    desc: "Manage your vehicle fleet"    },
  "/drivers":     { label: "Drivers",          icon: Users,    desc: "Driver profiles & licenses"   },
  "/trips":       { label: "Trips",            icon: Route,    desc: "Dispatch & track trips"       },
  "/maintenance": { label: "Maintenance",      icon: Wrench,   desc: "Service logs & schedules"     },
  "/fuel":        { label: "Fuel & Expenses",  icon: Activity, desc: "Fuel logs & cost tracking"    },
  "/analytics":   { label: "Analytics",        icon: TrendingUp, desc: "Fleet performance insights" },
};

function KpiCard({ label, value, sub, trend, icon: Icon, accentColor }) {
  const up = trend > 0;
  return (
    <div className="kpi-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value" style={{ marginTop: 6 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 15, height: 15, color: accentColor ?? "var(--muted)" }} />
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12 }}>
          {up
            ? <TrendingUp style={{ width: 11, height: 11, color: "var(--status-green)" }} />
            : <TrendingDown style={{ width: 11, height: 11, color: "var(--status-red)" }} />
          }
          <span className="kpi-delta" style={{ color: up ? "var(--status-green)" : "var(--status-red)" }}>
            {Math.abs(trend)}%
          </span>
          <span style={{ fontSize: 11, color: "var(--subtle)" }}>vs last month</span>
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });

    // Fetch summary stats from API
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const role      = user?.user_metadata?.role ?? "";
  const name      = user?.user_metadata?.name ?? "there";
  const quickLinks = ROLE_QUICKLINKS[role] ?? Object.keys(NAV_META);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Page header */}
      <div>
        <h1 className="text-heading" style={{ fontSize: 22 }}>
          {greeting}, {name.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Here's what's happening across your fleet today.
        </p>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <KpiCard
          label="Active Vehicles"
          value={loading ? "—" : (stats?.activeVehicles ?? "—")}
          sub={loading ? "" : `${stats?.totalVehicles ?? "—"} total`}
          trend={4}
          icon={Truck}
          accentColor="var(--status-blue)"
        />
        <KpiCard
          label="Trips Today"
          value={loading ? "—" : (stats?.tripsToday ?? "—")}
          sub={loading ? "" : `${stats?.tripsThisMonth ?? "—"} this month`}
          trend={12}
          icon={Route}
          accentColor="var(--status-green)"
        />
        <KpiCard
          label="Active Drivers"
          value={loading ? "—" : (stats?.activeDrivers ?? "—")}
          sub={loading ? "" : `${stats?.totalDrivers ?? "—"} total`}
          trend={-2}
          icon={Users}
          accentColor="var(--foreground)"
        />
        <KpiCard
          label="Open Maintenance"
          value={loading ? "—" : (stats?.openMaintenance ?? "—")}
          sub="vehicles in shop"
          icon={Wrench}
          accentColor="var(--status-neutral)"
        />
      </div>

      {/* Quick access */}
      <div>
        <div className="text-label" style={{ marginBottom: 12 }}>Quick Access</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {quickLinks.map((href) => {
            const meta = NAV_META[href];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "all 150ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.background   = "var(--surface-elevated)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background   = "var(--surface)";
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 14, height: 14, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{meta.desc}</div>
                </div>
                <ArrowRight style={{ width: 14, height: 14, color: "var(--subtle)", flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Status summary */}
      {stats?.recentTrips?.length > 0 && (
        <div>
          <div className="text-label" style={{ marginBottom: 12 }}>Recent Trips</div>
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip Code</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--accent)" }}>
                      {trip.tripCode}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      {trip.source} → {trip.destination}
                    </td>
                    <td>
                      <StatusBadge
                        color={
                          trip.status === "COMPLETED" ? "green"
                          : trip.status === "DISPATCHED" ? "blue"
                          : trip.status === "CANCELLED" ? "red"
                          : "amber"
                        }
                        label={trip.status}
                      />
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      {new Date(trip.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
