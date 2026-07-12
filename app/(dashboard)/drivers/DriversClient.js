"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";

// Zod validation schema for driver profile
const driverSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters")
    .trim(),
  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .min(5, "License number must be at least 5 characters")
    .max(30, "License number must be under 30 characters")
    .regex(/^[A-Z0-9/-]+$/i, "Invalid characters in license number")
    .transform((val) => val.trim().toUpperCase()),
  licenseCategory: z.enum(["LMV", "HMV"], {
    required_error: "License category is required",
  }),
  licenseExpiry: z.string().min(1, "License expiry date is required"),
  contactNumber: z
    .string()
    .min(1, "Contact number is required")
    .regex(/^[+0-9 -]+$/, "Invalid contact number format")
    .trim(),
  safetyScore: z
    .number({ invalid_type_error: "Must be a valid integer" })
    .int()
    .min(0, "Safety score cannot be negative")
    .max(100, "Safety score cannot exceed 100")
    .default(100),
  status: z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]).default("AVAILABLE"),
});

export default function DriversClient() {
  const { role } = useUser();
  const toast = useToast();

  const isEditAllowed = role === "SAFETY_OFFICER" || role === "FLEET_MANAGER";

  // Data & loading states
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete states
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // react-hook-form setup
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: "",
      licenseNumber: "",
      licenseCategory: "LMV",
      licenseExpiry: "",
      contactNumber: "",
      safetyScore: 100,
      status: "AVAILABLE",
    },
  });

  // Fetch all drivers
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drivers");
      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data);

      // Re-sync selected driver if it is in the list
      if (selectedDriver) {
        const updatedSelected = data.find((d) => d.id === selectedDriver.id);
        setSelectedDriver(updatedSelected || null);
      }
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Error",
        message: "Failed to load driver registry. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format date display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Check if date is expired
  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // Open modal for Adding
  const handleAddClick = () => {
    setEditingDriver(null);
    setApiError("");
    reset({
      name: "",
      licenseNumber: "",
      licenseCategory: "LMV",
      licenseExpiry: "",
      contactNumber: "",
      safetyScore: 100,
      status: "AVAILABLE",
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleEditClick = (driver, e) => {
    e.stopPropagation(); // prevent selecting row
    setEditingDriver(driver);
    setApiError("");

    // Format ISO string date to YYYY-MM-DD for date input
    const expiryDateFormatted = driver.licenseExpiry
      ? new Date(driver.licenseExpiry).toISOString().split("T")[0]
      : "";

    reset({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiry: expiryDateFormatted,
      contactNumber: driver.contactNumber,
      safetyScore: driver.safetyScore,
      status: driver.status,
    });
    setIsModalOpen(true);
  };

  // Add / Edit form submit handler
  const onSubmit = async (data) => {
    setSubmitting(true);
    setApiError("");

    try {
      // 1. Perform client-side uniqueness check via API
      const uniqueRes = await fetch(
        `/api/drivers?checkUnique=${encodeURIComponent(
          data.licenseNumber
        )}${editingDriver ? `&excludeId=${editingDriver.id}` : ""}`
      );
      if (!uniqueRes.ok) throw new Error("Unique check API failed");
      const { unique } = await uniqueRes.json();

      if (!unique) {
        setError("licenseNumber", {
          type: "manual",
          message: "License number already exists",
        });
        setSubmitting(false);
        return;
      }

      // 2. Submit the form data
      const url = editingDriver ? `/api/drivers/${editingDriver.id}` : "/api/drivers";
      const method = editingDriver ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        if (res.status === 409 || resData.error === "LICENSE_NUMBER_EXISTS") {
          setError("licenseNumber", {
            type: "manual",
            message: "License number already exists",
          });
          return;
        }
        throw new Error(resData.message || "Failed to save driver");
      }

      toast({
        type: "success",
        title: "Success",
        message: editingDriver
          ? "Driver profile updated successfully"
          : "Driver profile added successfully",
      });

      setIsModalOpen(false);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete driver logic
  const handleDeleteConfirm = async () => {
    if (!driverToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${driverToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete driver");
      }

      toast({
        type: "success",
        title: "Deleted",
        message: "Driver profile removed successfully",
      });

      if (selectedDriver?.id === driverToDelete.id) {
        setSelectedDriver(null);
      }
      setDriverToDelete(null);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Delete failed",
        message: err.message || "Failed to delete driver.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Inline Status Toggle change
  const handleStatusToggle = async (newStatus) => {
    if (!selectedDriver) return;
    try {
      const res = await fetch(`/api/drivers/${selectedDriver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to change status");

      toast({
        type: "success",
        title: "Status Updated",
        message: `Driver status changed to ${newStatus}`,
      });

      // Refresh list
      fetchDrivers();
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Error",
        message: err.message || "Failed to toggle status.",
      });
    }
  };

  // Filtered driver list
  const filteredDrivers = drivers.filter((d) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(query) ||
      d.licenseNumber.toLowerCase().includes(query) ||
      d.contactNumber.toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="text-heading">Drivers & Safety Profiles</h1>
          <p className="text-subheading" style={{ marginTop: 4 }}>
            Monitor license validations, safety scores, and toggle active status.
          </p>
        </div>

        {/* Add Driver Button */}
        {isEditAllowed && (
          <button
            onClick={handleAddClick}
            className="btn"
            style={{
              background: "#F59E0B",
              color: "#000000",
              borderColor: "#F59E0B",
              fontWeight: 600,
              padding: "7px 14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#D97706";
              e.currentTarget.style.borderColor = "#D97706";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F59E0B";
              e.currentTarget.style.borderColor = "#F59E0B";
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add Driver
          </button>
        )}
      </div>

      {/* ── Search Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 13,
              height: 13,
              color: "var(--subtle)",
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search by Driver Name, License, or Phone Number..."
            style={{ paddingLeft: 30 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>License No.</th>
              <th>Category</th>
              <th>Expiry Date</th>
              <th>Contact No.</th>
              <th>Trip Completion %</th>
              <th>Safety Score</th>
              <th>Status</th>
              {isEditAllowed && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isEditAllowed ? 9 : 8} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  <div style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", width: 18, height: 18, animation: "spin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
                  Loading driver profiles...
                </td>
              </tr>
            ) : filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={isEditAllowed ? 9 : 8} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  No drivers found.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((d) => {
                const expired = isExpired(d.licenseExpiry);
                const isSelected = selectedDriver?.id === d.id;

                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDriver(isSelected ? null : d)}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      background: isSelected ? "rgba(255,255,255,0.02)" : "transparent",
                      transition: "background 150ms",
                    }}
                  >
                    <td style={{ fontWeight: 600, color: "#fff" }}>{d.name}</td>
                    <td>{d.licenseNumber}</td>
                    <td>
                      <span style={{ fontSize: 11, background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                        {d.licenseCategory}
                      </span>
                    </td>
                    <td>
                      {expired ? (
                        <span style={{ color: "var(--status-red)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {formatDate(d.licenseExpiry)}
                          <span style={{ fontSize: 9, background: "var(--status-red-bg)", color: "var(--status-red)", border: "1px solid rgba(248,113,113,0.2)", padding: "1px 4px", borderRadius: 3 }}>
                            EXPIRED
                          </span>
                        </span>
                      ) : (
                        formatDate(d.licenseExpiry)
                      )}
                    </td>
                    <td>{d.contactNumber}</td>
                    <td>{d.completionRate}%</td>
                    <td>
                      <span
                        className={`badge ${
                          d.safetyScore >= 90
                            ? "badge-green"
                            : d.safetyScore >= 75
                            ? "badge-blue"
                            : d.safetyScore >= 50
                            ? "badge-neutral"
                            : "badge-red"
                        }`}
                      >
                        {d.safetyScore} / 100
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          d.status === "AVAILABLE"
                            ? "badge-green"
                            : d.status === "ON_TRIP"
                            ? "badge-blue"
                            : d.status === "OFF_DUTY"
                            ? "badge-neutral"
                            : "badge-red"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    {isEditAllowed && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            onClick={(e) => handleEditClick(d, e)}
                            className="btn btn-ghost"
                            style={{ padding: 4 }}
                          >
                            <Edit2 style={{ width: 13, height: 13 }} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDriverToDelete(d);
                            }}
                            className="btn btn-ghost"
                            style={{ padding: 4 }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-red)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Small Note Under Table */}
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
            Expired license or Suspended status → blocked from trip assignment. Click any row to manage driver status.
          </span>
        </div>
      </div>

      {/* ── TOGGLE STAT ROW (CONTROL ROW BELOW TABLE) ── */}
      {selectedDriver && isEditAllowed && (
        <div
          className="animate-slide-up"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
            <span style={{ fontSize: 12, color: "#fff" }}>
              Toggle status for <strong style={{ color: "var(--status-blue)" }}>{selectedDriver.name}</strong>
            </span>
            <span style={{ fontSize: 11, color: "var(--subtle)" }}>
              (Current: {selectedDriver.status})
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"].map((status) => {
              const active = selectedDriver.status === status;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    textTransform: "capitalize",
                    borderColor: status === "SUSPENDED" && !active ? "rgba(248,113,113,0.3)" : "",
                    color: status === "SUSPENDED" && !active ? "var(--status-red)" : "",
                  }}
                >
                  {status.toLowerCase().replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => !submitting && setIsModalOpen(false)}
          />

          <div
            className="animate-scale-up"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 440,
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                {editingDriver ? "Edit Driver Profile" : "Register New Driver"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {apiError && (
                <div style={{ display: "flex", gap: 8, padding: 10, background: "rgba(248,113,113,0.06)", border: "1px dashed rgba(248,113,113,0.3)", borderRadius: 6 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: "var(--status-red)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--status-red)" }}>{apiError}</span>
                </div>
              )}

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Ramesh Kumar"
                  {...register("name")}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              {/* License Number */}
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. DL-1420110012345"
                  style={{ textTransform: "uppercase" }}
                  {...register("licenseNumber")}
                />
                {errors.licenseNumber && <span className="form-error">{errors.licenseNumber.message}</span>}
              </div>

              {/* Grid 1: Expiry + Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="input" {...register("licenseCategory")}>
                    <option value="LMV">LMV (Light)</option>
                    <option value="HMV">HMV (Heavy)</option>
                  </select>
                  {errors.licenseCategory && <span className="form-error">{errors.licenseCategory.message}</span>}
                </div>

                {/* Expiry Date */}
                <div className="form-group">
                  <label className="form-label">License Expiry Date</label>
                  <input
                    type="date"
                    className="input"
                    {...register("licenseExpiry")}
                  />
                  {errors.licenseExpiry && <span className="form-error">{errors.licenseExpiry.message}</span>}
                </div>
              </div>

              {/* Grid 2: Phone + Safety */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                {/* Contact */}
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. +91 98765 43210"
                    {...register("contactNumber")}
                  />
                  {errors.contactNumber && <span className="form-error">{errors.contactNumber.message}</span>}
                </div>

                {/* Safety Score */}
                <div className="form-group">
                  <label className="form-label">Safety Score</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="100"
                    {...register("safetyScore", { valueAsNumber: true })}
                  />
                  {errors.safetyScore && <span className="form-error">{errors.safetyScore.message}</span>}
                </div>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Initial Status</label>
                <select className="input" {...register("status")}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_TRIP">ON_TRIP</option>
                  <option value="OFF_DUTY">OFF_DUTY</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
                {errors.status && <span className="form-error">{errors.status.message}</span>}
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minWidth: 100 }}
                >
                  {submitting ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {driverToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => !deleting && setDriverToDelete(null)}
          />

          <div
            className="animate-scale-up"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 380,
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 10 }}>
              Delete Driver Profile?
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to delete driver{" "}
              <strong style={{ color: "#fff" }}>{driverToDelete.name}</strong>? This action cannot be
              undone, and will fail if the driver is linked to active trips.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDriverToDelete(null)}
                disabled={deleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="btn btn-danger"
                style={{ minWidth: 80 }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
