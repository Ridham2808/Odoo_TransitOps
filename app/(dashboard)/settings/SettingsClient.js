"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings as SettingsIcon, ShieldCheck, CheckCircle2, Circle, AlertTriangle, Save, Info } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";
import { PERMISSIONS, ROLE_LABELS } from "@/lib/permissions";

const settingsSchema = z.object({
  depotName: z.string().min(1, "Depot Name is required").trim(),
  currency: z.string().min(1, "Currency is required"),
  distanceUnit: z.string().min(1, "Distance Unit is required"),
});

export default function SettingsClient() {
  const { role } = useUser();
  const toast = useToast();

  const isFleetManager = role === "FLEET_MANAGER";

  // Data states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      depotName: "",
      currency: "INR",
      distanceUnit: "km",
    },
  });

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setValue("depotName", data.depotName);
        setValue("currency", data.currency);
        setValue("distanceUnit", data.distanceUnit);
      } catch (err) {
        console.error(err);
        toast({
          type: "error",
          title: "Load Error",
          message: "Failed to load general settings.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save changes handler
  const onSubmit = async (data) => {
    if (!isFleetManager) return;
    setSaving(true);
    setApiError("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to save settings");

      toast({
        type: "success",
        title: "Settings Saved",
        message: "General configuration updated successfully.",
      });
    } catch (err) {
      console.error(err);
      setApiError(err.message || "Failed to update configuration.");
    } finally {
      setSaving(false);
    }
  };

  // RBAC permissions helper to display table cells
  const renderRbacCell = (val) => {
    if (val === "edit") {
      return (
        <span
          className="badge badge-green"
          style={{
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 6px",
          }}
        >
          <CheckCircle2 style={{ width: 10, height: 10 }} />
          edit
        </span>
      );
    }
    if (val === "view") {
      return (
        <span
          className="badge badge-blue"
          style={{
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 6px",
          }}
        >
          <Circle style={{ width: 10, height: 10, fill: "var(--status-blue)", opacity: 0.7 }} />
          view
        </span>
      );
    }
    return <span style={{ color: "var(--subtle)", fontWeight: 500 }}>—</span>;
  };

  const columns = [
    { key: "fleet", label: "Fleet" },
    { key: "drivers", label: "Drivers" },
    { key: "trips", label: "Trips" },
    { key: "fuel", label: "Fuel/Exp." },
    { key: "analytics", label: "Analytics" },
  ];

  const roles = ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div>
        <h1 className="text-heading">System Settings</h1>
        <p className="text-subheading" style={{ marginTop: 4 }}>
          Adjust depot properties, currencies, and view the active system RBAC permission matrix.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "var(--muted)" }}>
          <div style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", width: 20, height: 20, animation: "spin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
          Loading settings...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
          
          {/* ── Left Column: General Configuration ── */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <SettingsIcon style={{ width: 14, height: 14, color: "var(--subtle)" }} />
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>General Configurations</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {apiError && (
                <div style={{ display: "flex", gap: 8, padding: 10, background: "rgba(248,113,113,0.06)", border: "1px dashed rgba(248,113,113,0.3)", borderRadius: 6 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: "var(--status-red)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--status-red)" }}>{apiError}</span>
                </div>
              )}

              {/* Depot Name */}
              <div className="form-group">
                <label className="form-label">Depot Name</label>
                <input
                  type="text"
                  className="input"
                  disabled={!isFleetManager}
                  placeholder="e.g. Mumbai Logistics Depot"
                  {...register("depotName")}
                />
                {errors.depotName && <span className="form-error">{errors.depotName.message}</span>}
              </div>

              {/* Currency */}
              <div className="form-group">
                <label className="form-label">System Currency</label>
                <select className="input" disabled={!isFleetManager} {...register("currency")}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
                {errors.currency && <span className="form-error">{errors.currency.message}</span>}
              </div>

              {/* Distance Unit */}
              <div className="form-group">
                <label className="form-label">Distance Unit</label>
                <select className="input" disabled={!isFleetManager} {...register("distanceUnit")}>
                  <option value="km">Kilometers (km)</option>
                  <option value="mi">Miles (mi)</option>
                </select>
                {errors.distanceUnit && <span className="form-error">{errors.distanceUnit.message}</span>}
              </div>

              {/* Save Button (Fleet Manager only) */}
              {isFleetManager ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 6 }}
                >
                  <Save style={{ width: 14, height: 14 }} />
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 10,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed var(--border)",
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                >
                  <Info style={{ width: 12, height: 12, color: "var(--subtle)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    You must be a Fleet Manager to modify General configurations.
                  </span>
                </div>
              )}
            </form>
          </div>

          {/* ── Right Column: RBAC Permission Matrix Table ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck style={{ width: 15, height: 15, color: "var(--status-blue)" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Role-Based Access (RBAC)</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>System permissions generated live from source module</div>
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    {columns.map((c) => (
                      <th key={c.key} style={{ textAlign: "center" }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ fontWeight: 600, color: "#fff" }}>
                        {ROLE_LABELS[r] ?? r}
                      </td>
                      {columns.map((c) => (
                        <td key={c.key} style={{ textAlign: "center" }}>
                          {renderRbacCell(PERMISSIONS[r]?.[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.01)",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info style={{ width: 12, height: 12, color: "var(--muted)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  Every role is permitted to view this RBAC matrix and access the main Dashboard page.
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
