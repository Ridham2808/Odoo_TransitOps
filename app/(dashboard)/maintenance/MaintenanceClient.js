"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wrench, Calendar, DollarSign, Info, ShieldAlert, CheckCircle, Clock, Trash2, ArrowRight } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";

// Zod schema for maintenance record form validation
const maintenanceSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle selection is required"),
  serviceType: z
    .string()
    .min(1, "Service type is required")
    .min(3, "Service type must be at least 3 characters")
    .max(100, "Service type must be under 100 characters")
    .trim(),
  cost: z
    .number({ invalid_type_error: "Must be a valid cost" })
    .nonnegative("Cost cannot be negative"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["ACTIVE", "COMPLETED"]).default("ACTIVE"),
});

export default function MaintenanceClient() {
  const { role } = useUser();
  const toast = useToast();

  const isFleetManager = role === "FLEET_MANAGER";

  // Data states
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // react-hook-form setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicleId: "",
      serviceType: "",
      cost: "",
      date: new Date().toISOString().split("T")[0], // default to today
      status: "ACTIVE",
    },
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch maintenance logs
      const logsRes = await fetch("/api/maintenance");
      if (!logsRes.ok) throw new Error("Failed to load logs");
      const logsData = await logsRes.json();
      setLogs(logsData);

      // 2. Fetch all vehicles to list in the dropdown
      const vehiclesRes = await fetch("/api/vehicles");
      if (!vehiclesRes.ok) throw new Error("Failed to load vehicles");
      const vehiclesData = await vehiclesRes.json();

      // Only display non-RETIRED vehicles
      const nonRetired = vehiclesData.filter((v) => v.status !== "RETIRED");
      setVehicles(nonRetired);
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Error",
        message: "Failed to load maintenance records. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFleetManager) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFleetManager]);

  // Submit new log
  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to log service record");

      toast({
        type: "success",
        title: "Record Saved",
        message: "Service record logged successfully.",
      });

      reset({
        vehicleId: "",
        serviceType: "",
        cost: "",
        date: new Date().toISOString().split("T")[0],
        status: "ACTIVE",
      });

      fetchData();
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Submission failed",
        message: err.message || "Failed to log service record.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle maintenance status (ACTIVE <-> COMPLETED)
  const handleToggleStatus = async (log) => {
    const nextStatus = log.status === "ACTIVE" ? "COMPLETED" : "ACTIVE";
    setActionLoadingId(log.id);
    try {
      const res = await fetch(`/api/maintenance/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update record");

      toast({
        type: "success",
        title: "Status Updated",
        message: `Service record marked as ${nextStatus.toLowerCase()}`,
      });

      fetchData();
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Update failed",
        message: err.message || "Failed to update service record.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete log
  const handleDeleteLog = async (logId) => {
    if (!confirm("Are you sure you want to delete this service record?")) return;
    setActionLoadingId(logId);
    try {
      const res = await fetch(`/api/maintenance/${logId}`, {
        method: "DELETE",
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to delete record");

      toast({
        type: "success",
        title: "Record Deleted",
        message: "Service record deleted successfully.",
      });

      fetchData();
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Delete failed",
        message: err.message || "Failed to delete record.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Format Date for view
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Handle Unauthorized view
  if (!isFleetManager) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--status-red)",
          }}
        >
          <ShieldAlert style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Access Forbidden</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, maxWidth: 360 }}>
            Only the Fleet Manager has permissions to view or update vehicle maintenance logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div>
        <h1 className="text-heading">Vehicle Maintenance</h1>
        <p className="text-subheading" style={{ marginTop: 4 }}>
          Log workshop entries, track service costs, and monitor available fleet statuses.
        </p>
      </div>

      {/* ── Two column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
        
        {/* ── Left Column: Form ── */}
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
            <Wrench style={{ width: 14, height: 14, color: "var(--subtle)" }} />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Log Service Record</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Vehicle dropdown */}
            <div className="form-group">
              <label className="form-label">Vehicle</label>
              <select className="input" {...register("vehicleId")}>
                <option value="" disabled>Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} — {v.name} ({v.status})
                  </option>
                ))}
              </select>
              {errors.vehicleId && <span className="form-error">{errors.vehicleId.message}</span>}
            </div>

            {/* Service Type */}
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Engine Oil Change"
                {...register("serviceType")}
              />
              {errors.serviceType && <span className="form-error">{errors.serviceType.message}</span>}
            </div>

            {/* Cost */}
            <div className="form-group">
              <label className="form-label">Service Cost (₹)</label>
              <div style={{ position: "relative" }}>
                <DollarSign
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 12,
                    height: 12,
                    color: "var(--subtle)",
                  }}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 5000"
                  style={{ paddingLeft: 26 }}
                  {...register("cost", { valueAsNumber: true })}
                />
              </div>
              {errors.cost && <span className="form-error">{errors.cost.message}</span>}
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label">Service Date</label>
              <input type="date" className="input" {...register("date")} />
              {errors.date && <span className="form-error">{errors.date.message}</span>}
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="input" {...register("status")}>
                <option value="ACTIVE">Active (In Shop)</option>
                <option value="COMPLETED">Completed (Available)</option>
              </select>
              {errors.status && <span className="form-error">{errors.status.message}</span>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: 6 }}>
              {submitting ? "Saving..." : "Save Record"}
            </button>
          </form>

          {/* Stepper / Flow caption */}
          <div
            style={{
              marginTop: 10,
              padding: 12,
              background: "rgba(255,255,255,0.01)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--subtle)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Status Transitions
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-green" style={{ fontSize: 9, padding: "1px 5px" }}>Available</span>
                <ArrowRight style={{ width: 10, height: 10 }} />
                <span>Log Active Record</span>
                <ArrowRight style={{ width: 10, height: 10 }} />
                <span className="badge badge-neutral" style={{ fontSize: 9, padding: "1px 5px" }}>In Shop</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-neutral" style={{ fontSize: 9, padding: "1px 5px" }}>In Shop</span>
                <ArrowRight style={{ width: 10, height: 10 }} />
                <span>Mark Completed</span>
                <ArrowRight style={{ width: 10, height: 10 }} />
                <span className="badge badge-green" style={{ fontSize: 9, padding: "1px 5px" }}>Available</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          
          {/* Table Container */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service Details</th>
                  <th>Cost</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                      <div style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", width: 18, height: 18, animation: "spin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                      No service records logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isActionLoading = actionLoadingId === log.id;
                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff" }}>{log.vehicle.registrationNo}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{log.vehicle.name}</div>
                          </div>
                        </td>
                        <td>{log.serviceType}</td>
                        <td style={{ fontWeight: 500, color: "#fff" }}>₹{log.cost.toLocaleString()}</td>
                        <td>{formatDate(log.date)}</td>
                        <td>
                          <span className={`badge ${log.status === "ACTIVE" ? "badge-neutral" : "badge-green"}`}>
                            {log.status === "ACTIVE" ? (
                              <><Clock style={{ width: 10, height: 10, marginRight: 2 }} /> ACTIVE</>
                            ) : (
                              <><CheckCircle style={{ width: 10, height: 10, marginRight: 2 }} /> COMPLETED</>
                            )}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            {log.status === "ACTIVE" && (
                              <button
                                onClick={() => handleToggleStatus(log)}
                                disabled={isActionLoading}
                                className="btn btn-secondary"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                              >
                                {isActionLoading ? "..." : "Complete"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              disabled={isActionLoading}
                              className="btn btn-ghost"
                              style={{ padding: 4 }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-red)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Note under the table */}
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
                In Shop vehicles are removed from the dispatch pool.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
