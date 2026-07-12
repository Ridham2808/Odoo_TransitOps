"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Truck, Zap, Wrench, Route, Activity, Users, TrendingUp, RefreshCw, ChevronDown,
} from "lucide-react";
import { useUser } from "@/lib/userContext";
import StatusBadge from "@/components/ui/StatusBadge";

// ── KPI card config ────────────────────────────────────────────────────────
const KPI_CONFIG = [
  { key: "activeVehicles",    label: "Active Vehicles",    Icon: Truck,      accent: "var(--status-blue)"    },
  { key: "availableVehicles", label: "Available Vehicles",  Icon: Zap,        accent: "var(--status-green)"   },
  { key: "inMaintenance",     label: "In Maintenance",      Icon: Wrench,     accent: "var(--status-neutral)" },
  { key: "activeTrips",       label: "Active Trips",        Icon: Route,      accent: "var(--status-blue)"    },
  { key: "pendingTrips",      label: "Pending Trips",       Icon: Activity,   accent: "var(--status-neutral)" },
  { key: "driversOnDuty",     label: "Drivers On Duty",     Icon: Users,      accent: "var(--status-green)"   },
  { key: "fleetUtilization",  label: "Fleet Utilization",   Icon: TrendingUp, accent: "#fff"                  },
];

// ── Status bar config ──────────────────────────────────────────────────────
const STATUS_BARS = [
  { key: "available", label: "Available", color: "var(--status-green)"   },
  { key: "onTrip",    label: "On Trip",   color: "var(--status-blue)"    },
  { key: "inShop",    label: "In Shop",   color: "var(--status-neutral)" },
  { key: "retired",   label: "Retired",   color: "var(--status-red)"     },
];

// ── ETA formatter ──────────────────────────────────────────────────────────
function formatEta(minutes) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 14, radius = 4, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, Icon, accent, loading, isPercent }) {
  return (
    <div
      style={{
        padding:       "14px 16px",
        background:    "var(--surface)",
        border:        "1px solid var(--border)",
        borderTop:     `2px solid ${accent}`,
        borderRadius:   8,
        display:        "flex",
        flexDirection:  "column",
        gap:            8,
        minWidth:       0,
        transition:    "border-color 200ms ease",
        cursor:        "default",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {loading ? <Skel w="60%" h={10} /> : (
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--subtle)" }}>
            {label}
          </span>
        )}
        <div style={{
          width: 22, height: 22, borderRadius: 5, flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 11, height: 11, color: accent, opacity: loading ? 0.3 : 1 }} />
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <Skel w="45%" h={28} radius={6} />
      ) : (
        <div style={{
          fontSize:      28,
          fontWeight:    700,
          letterSpacing: "-0.04em",
          color:         "#fff",
          lineHeight:    1,
        }}>
          {isPercent ? `${value}%` : String(value).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

// ── Filter Select ──────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--subtle)", letterSpacing: "0.04em", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            appearance:    "none",
            background:    "var(--surface)",
            border:        "1px solid var(--border)",
            borderRadius:   5,
            padding:       "4px 26px 4px 8px",
            fontSize:       11,
            fontWeight:    500,
            color:         "var(--foreground)",
            cursor:        "pointer",
            letterSpacing: "-0.01em",
            outline:       "none",
            transition:    "border-color 150ms",
          }}
          onFocus={(e)  => (e.target.style.borderColor = "var(--border-strong)")}
          onBlur={(e)   => (e.target.style.borderColor = "var(--border)")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown style={{
          position: "absolute", right: 7, top: "50%",
          transform: "translateY(-50%)",
          width: 11, height: 11, color: "var(--subtle)", pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { name } = useUser();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Filter state
  const [vehicleType, setVehicleType] = useState("ALL");
  const [status,      setStatus]      = useState("ALL");
  const [region,      setRegion]      = useState("ALL");

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (vehicleType !== "ALL") params.set("vehicleType", vehicleType);
      if (region      !== "ALL") params.set("region",      region);

      const res  = await fetch(`/api/dashboard/kpis?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [vehicleType, region]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const bd = data?.vehicleBreakdown ?? {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.03em", color: "#fff", marginBottom: 2 }}>
            {greeting}{name ? `, ${name.split(" ")[0]}` : ""} 👋
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Here's what's happening across your fleet today.
          </p>
        </div>
        <button
          onClick={fetchKpis}
          title="Refresh data"
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 10px", borderRadius: 5,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--muted)", fontSize: 11, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 150ms",
          }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--foreground)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--muted)"; }}
        >
          <RefreshCw style={{ width: 11, height: 11, animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* ── Filters row ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:             16,
          padding:        "10px 14px",
          background:     "var(--surface)",
          border:         "1px solid var(--border)",
          borderRadius:    7,
          flexWrap:       "wrap",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginRight: 2 }}>
          Filters
        </span>
        <FilterSelect
          label="Vehicle Type:"
          value={vehicleType}
          onChange={setVehicleType}
          options={[
            { value: "ALL",   label: "All Types" },
            { value: "VAN",   label: "Van"       },
            { value: "TRUCK", label: "Truck"     },
            { value: "MINI",  label: "Mini"      },
          ]}
        />
        <FilterSelect
          label="Status:"
          value={status}
          onChange={setStatus}
          options={[
            { value: "ALL",       label: "All Statuses" },
            { value: "AVAILABLE", label: "Available"    },
            { value: "ON_TRIP",   label: "On Trip"      },
            { value: "IN_SHOP",   label: "In Shop"      },
            { value: "RETIRED",   label: "Retired"      },
          ]}
        />
        <FilterSelect
          label="Region:"
          value={region}
          onChange={setRegion}
          options={[
            { value: "ALL",   label: "All Regions" },
            { value: "North", label: "North"       },
            { value: "South", label: "South"       },
            { value: "East",  label: "East"        },
            { value: "West",  label: "West"        },
          ]}
        />
        {(vehicleType !== "ALL" || status !== "ALL" || region !== "ALL") && (
          <button
            onClick={() => { setVehicleType("ALL"); setStatus("ALL"); setRegion("ALL"); }}
            style={{ fontSize: 11, color: "var(--status-red)", background: "none", border: "none", cursor: "pointer", marginLeft: "auto", letterSpacing: "-0.01em" }}
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.06)", border: "1px dashed rgba(248,113,113,0.4)", borderRadius: 7, fontSize: 12, color: "var(--status-red)" }}>
          {error} — <button onClick={fetchKpis} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--status-red)", textDecoration: "underline", fontSize: 12 }}>retry</button>
        </div>
      )}

      {/* ── 7 KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {KPI_CONFIG.map(({ key, label, icon, accent }) => (
          <KpiCard
            key={key}
            label={label}
            icon={icon}
            accent={accent}
            loading={loading}
            isPercent={key === "fleetUtilization"}
            value={data?.[key] ?? 0}
          />
        ))}
      </div>

      {/* ── Bottom two-column ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, alignItems: "start" }}>

        {/* ── Recent Trips table ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>Recent Trips</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Last 6 dispatched trips</div>
            </div>
            <Link
              href="/trips"
              style={{ fontSize: 11, color: "var(--subtle)", textDecoration: "none", letterSpacing: "-0.01em", transition: "color 150ms" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--subtle)")}
            >
              View all →
            </Link>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Trip", "Vehicle", "Driver", "Status", "ETA"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--subtle)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {[90, 70, 80, 60, 50].map((w, j) => (
                      <td key={j} style={{ padding: "10px 16px" }}>
                        <Skel w={w} h={11} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.recentTrips?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "28px 16px", textAlign: "center", fontSize: 12, color: "var(--subtle)" }}>
                    No trips yet
                  </td>
                </tr>
              ) : (
                (data?.recentTrips ?? []).map((trip) => (
                  <tr
                    key={trip.id}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 150ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.01em", fontFamily: "monospace" }}>
                        {trip.tripCode}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {trip.vehicleType && (
                          <span style={{ fontSize: 9, color: "var(--subtle)", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: 3, letterSpacing: "0.04em" }}>
                            {trip.vehicleType}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--foreground-2)" }}>{trip.vehicle}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--foreground-2)" }}>
                      {trip.driver}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <StatusBadge status={trip.status} />
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      {formatEta(trip.etaMin)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Vehicle Status panel ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>Vehicle Status</div>
            {loading ? (
              <Skel w={60} h={10} style={{ marginTop: 4 }} />
            ) : (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {bd.total ?? 0} vehicles total
              </div>
            )}
          </div>

          {/* Status bars */}
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {STATUS_BARS.map(({ key, label, color }) => {
                const count   = bd[key]   ?? 0;
                const total   = bd.total  ?? 1;
                const pct     = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div key={key}>
                    {/* Label row */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "var(--foreground-2)", letterSpacing: "-0.01em" }}>{label}</span>
                      </div>
                      {loading ? (
                        <Skel w={30} h={11} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                          <span style={{ fontSize: 10, color: "var(--subtle)" }}>{pct}%</span>
                        </div>
                      )}
                    </div>

                    {/* Bar track */}
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      {loading ? (
                        <div className="skeleton" style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <div style={{
                          height:       "100%",
                          width:        `${pct}%`,
                          background:   color,
                          borderRadius:  3,
                          minWidth:     pct > 0 ? 4 : 0,
                          transition:   "width 600ms cubic-bezier(0.4,0,0.2,1)",
                          opacity:      0.85,
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fleet utilization summary */}
            {!loading && (
              <div style={{
                marginTop:  16,
                padding:    "10px 12px",
                background: "rgba(255,255,255,0.03)",
                border:     "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 10, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Utilization
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.04em", color: "#fff" }}>
                    {data?.fleetUtilization ?? 0}%
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>fleet on trip</span>
                </div>
                {/* Mini bar */}
                <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: "100%", width: `${data?.fleetUtilization ?? 0}%`, background: "#fff", borderRadius: 2, opacity: 0.7, transition: "width 600ms ease" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
