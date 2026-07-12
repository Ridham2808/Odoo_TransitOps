"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Info, Download } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";
import { generatePdfFromTable } from "@/lib/pdf";

// Zod schema for vehicle validation
const vehicleSchema = z.object({
  registrationNo: z
    .string()
    .min(1, "Registration number is required")
    .min(3, "Registration number must be at least 3 characters")
    .max(20, "Registration number must be under 20 characters")
    .regex(/^[A-Z0-9 -]+$/i, "Invalid characters in registration number")
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(1, "Name/Model is required")
    .min(2, "Name/Model must be at least 2 characters")
    .max(50, "Name/Model must be under 50 characters")
    .trim(),
  type: z.enum(["VAN", "TRUCK", "MINI"], {
    required_error: "Please select a vehicle type",
  }),
  maxLoadCapacity: z
    .number({ invalid_type_error: "Must be a valid number" })
    .positive("Max load capacity must be greater than 0"),
  odometer: z
    .number({ invalid_type_error: "Must be a valid number" })
    .nonnegative("Odometer must be non-negative")
    .default(0),
  acquisitionCost: z
    .number({ invalid_type_error: "Must be a valid number" })
    .positive("Acquisition cost must be greater than 0"),
  status: z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]).default("AVAILABLE"),
});

export default function FleetClient() {
  const { role } = useUser();
  const toast = useToast();

  const isEditAllowed = role === "FLEET_MANAGER";

  // List & Filter states
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null); // null means adding
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete modal states
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
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
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registrationNo: "",
      name: "",
      type: "TRUCK",
      maxLoadCapacity: "",
      odometer: 0,
      acquisitionCost: "",
      status: "AVAILABLE",
    },
  });

  // Fetch vehicles
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/vehicles?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Error",
        message: "Failed to load vehicle registry. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, searchQuery]);

  const handleExportPDF = () => {
    const headers = ["Reg. No.", "Name/Model", "Type", "Capacity", "Odometer", "Acq. Cost", "Status"];
    const rows = vehicles.map((v) => [
      v.registrationNo,
      v.name,
      v.type,
      `${v.maxLoadCapacity} kg`,
      `${v.odometer.toLocaleString()} km`,
      `INR ${v.acquisitionCost.toLocaleString()}`,
      v.status,
    ]);

    generatePdfFromTable(headers, rows, "Vehicle Registry Report", "Active Transit Fleet List");
    toast({
      type: "success",
      title: "PDF Exported",
      message: "Filtered vehicle registry PDF downloaded successfully.",
    });
  };

  // Open modal for Adding
  const handleAddClick = () => {
    setEditingVehicle(null);
    setApiError("");
    reset({
      registrationNo: "",
      name: "",
      type: "TRUCK",
      maxLoadCapacity: "",
      odometer: 0,
      acquisitionCost: "",
      status: "AVAILABLE",
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleEditClick = (vehicle) => {
    setEditingVehicle(vehicle);
    setApiError("");
    reset({
      registrationNo: vehicle.registrationNo,
      name: vehicle.name,
      type: vehicle.type,
      maxLoadCapacity: vehicle.maxLoadCapacity,
      odometer: vehicle.odometer,
      acquisitionCost: vehicle.acquisitionCost,
      status: vehicle.status,
    });
    setIsModalOpen(true);
  };

  // Submit handler (Add or Update)
  const onSubmit = async (data) => {
    setSubmitting(true);
    setApiError("");

    try {
      // 1. Perform client-side async validation for uniqueness via API
      const uniqueRes = await fetch(
        `/api/vehicles?checkUnique=${encodeURIComponent(
          data.registrationNo
        )}${editingVehicle ? `&excludeId=${editingVehicle.id}` : ""}`
      );
      if (!uniqueRes.ok) throw new Error("Unique check API failed");
      const { unique } = await uniqueRes.json();

      if (!unique) {
        setError("registrationNo", {
          type: "manual",
          message: "Registration number already exists",
        });
        setSubmitting(false);
        return;
      }

      // 2. Perform the actual POST/PATCH request
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles";
      const method = editingVehicle ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        if (res.status === 409 || resData.error === "REGISTRATION_NO_EXISTS") {
          setError("registrationNo", {
            type: "manual",
            message: "Registration number already exists",
          });
          return;
        }
        throw new Error(resData.message || "Failed to save vehicle");
      }

      toast({
        type: "success",
        title: "Success",
        message: editingVehicle
          ? "Vehicle updated successfully"
          : "Vehicle added successfully",
      });

      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete vehicle");
      }

      toast({
        type: "success",
        title: "Deleted",
        message: "Vehicle deleted successfully",
      });

      setVehicleToDelete(null);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Delete failed",
        message: err.message || "Failed to delete vehicle.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="text-heading">Vehicle Registry</h1>
          <p className="text-subheading" style={{ marginTop: 4 }}>
            Manage the transit fleet configurations, status, and constraints.
          </p>
        </div>

        {/* Actions Container */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExportPDF}
            className="btn btn-secondary"
            style={{
              padding: "7px 14px",
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Export PDF
          </button>
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
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
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
            placeholder="Search by Reg. Number..."
            style={{ paddingLeft: 30 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--subtle)", textTransform: "uppercase" }}>Type:</span>
          <select
            className="input"
            style={{ width: 120, height: 32, padding: "0 28px 0 10px" }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="VAN">VAN</option>
            <option value="TRUCK">TRUCK</option>
            <option value="MINI">MINI</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--subtle)", textTransform: "uppercase" }}>Status:</span>
          <select
            className="input"
            style={{ width: 130, height: 32, padding: "0 28px 0 10px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ON_TRIP">ON_TRIP</option>
            <option value="IN_SHOP">IN_SHOP</option>
            <option value="RETIRED">RETIRED</option>
          </select>
        </div>
      </div>

      {/* ── Vehicle Table ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Reg. Number</th>
              <th>Name / Model</th>
              <th>Type</th>
              <th>Max Capacity</th>
              <th>Odometer</th>
              <th>Acquisition Cost</th>
              <th>Status</th>
              {isEditAllowed && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isEditAllowed ? 8 : 7} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  <div style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", width: 18, height: 18, animation: "spin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
                  Loading vehicles...
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={isEditAllowed ? 8 : 7} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  No vehicles found matching the filters.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ fontWeight: 600, color: "#fff", letterSpacing: "0.02em" }}>{v.registrationNo}</td>
                  <td>{v.name}</td>
                  <td>
                    <span style={{ fontSize: 11, background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                      {v.type}
                    </span>
                  </td>
                  <td>{v.maxLoadCapacity.toLocaleString()} kg</td>
                  <td>{v.odometer.toLocaleString()} km</td>
                  <td>₹{v.acquisitionCost.toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${
                        v.status === "AVAILABLE"
                          ? "badge-green"
                          : v.status === "ON_TRIP"
                          ? "badge-blue"
                          : v.status === "IN_SHOP"
                          ? "badge-neutral"
                          : "badge-red"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  {isEditAllowed && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          onClick={() => handleEditClick(v)}
                          className="btn btn-ghost"
                          style={{ padding: 4 }}
                          title="Edit vehicle"
                        >
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          onClick={() => setVehicleToDelete(v)}
                          className="btn btn-ghost"
                          style={{ padding: 4 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-red)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                          title="Delete vehicle"
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
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
            Registration numbers must be unique. Retired or In Shop vehicles are excluded from the Trip Dispatcher.
          </span>
        </div>
      </div>

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
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => !submitting && setIsModalOpen(false)}
          />

          {/* Modal Container */}
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
                {editingVehicle ? "Edit Vehicle Settings" : "Register New Vehicle"}
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

              {/* Registration Number */}
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. MH-12-PQ-9999"
                  style={{ textTransform: "uppercase" }}
                  {...register("registrationNo")}
                />
                {errors.registrationNo && (
                  <span className="form-error">{errors.registrationNo.message}</span>
                )}
              </div>

              {/* Name/Model */}
              <div className="form-group">
                <label className="form-label">Name / Model</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Tata Prima 4025.S"
                  {...register("name")}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              {/* Type */}
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select className="input" {...register("type")}>
                  <option value="VAN">VAN</option>
                  <option value="TRUCK">TRUCK</option>
                  <option value="MINI">MINI</option>
                </select>
                {errors.type && <span className="form-error">{errors.type.message}</span>}
              </div>

              {/* Grid fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Max Load Capacity */}
                <div className="form-group">
                  <label className="form-label">Max Load (kg)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 15000"
                    {...register("maxLoadCapacity", { valueAsNumber: true })}
                  />
                  {errors.maxLoadCapacity && (
                    <span className="form-error">{errors.maxLoadCapacity.message}</span>
                  )}
                </div>

                {/* Odometer */}
                <div className="form-group">
                  <label className="form-label">Odometer (km)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 24000"
                    {...register("odometer", { valueAsNumber: true })}
                  />
                  {errors.odometer && <span className="form-error">{errors.odometer.message}</span>}
                </div>
              </div>

              {/* Acquisition Cost + Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Acquisition Cost */}
                <div className="form-group">
                  <label className="form-label">Acq. Cost (₹)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 4500000"
                    {...register("acquisitionCost", { valueAsNumber: true })}
                  />
                  {errors.acquisitionCost && (
                    <span className="form-error">{errors.acquisitionCost.message}</span>
                  )}
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" {...register("status")}>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ON_TRIP">ON_TRIP</option>
                    <option value="IN_SHOP">IN_SHOP</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                  {errors.status && <span className="form-error">{errors.status.message}</span>}
                </div>
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
                  {submitting ? "Saving..." : "Save Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {vehicleToDelete && (
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
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => !deleting && setVehicleToDelete(null)}
          />

          {/* Modal Content */}
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
              Delete Vehicle Registry?
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to delete vehicle{" "}
              <strong style={{ color: "#fff" }}>{vehicleToDelete.registrationNo}</strong>? This action
              cannot be undone, and will fail if the vehicle has active logs or assignments.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
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
