"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Route, 
  Truck, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play, 
  CheckSquare, 
  Trash2, 
  MapPin, 
  Scale, 
  Navigation,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";

// Zod validation schema for creating a trip
const tripSchema = z.object({
  source: z.string().min(1, "Source is required").trim(),
  destination: z.string().min(1, "Destination is required").trim(),
  vehicleId: z.string().min(1, "Please select a vehicle"),
  driverId: z.string().min(1, "Please select a driver"),
  cargoWeight: z
    .number({ invalid_type_error: "Must be a valid number" })
    .positive("Cargo weight must be greater than 0"),
  plannedDistance: z
    .number({ invalid_type_error: "Must be a valid number" })
    .positive("Planned distance must be greater than 0"),
});

export default function TripsClient() {
  const { role, loading: userLoading } = useUser();
  const toast = useToast();

  const isEditAllowed = role === "FLEET_MANAGER" || role === "DISPATCHER";
  const isViewAllowed = role === "FLEET_MANAGER" || role === "DISPATCHER" || role === "SAFETY_OFFICER";

  // Data states
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selection & Details states
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Completion Form states
  const [compOdometer, setCompOdometer] = useState("");
  const [compFuel, setCompFuel] = useState("");
  const [compFuelRate, setCompFuelRate] = useState("100"); // default fuel cost per liter
  const [compLoading, setCompLoading] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e) => {
      setSearchQuery(e.detail || "");
    };
    window.addEventListener("global-search", handleGlobalSearch);
    return () => window.removeEventListener("global-search", handleGlobalSearch);
  }, []);

  // Sorting states
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortHeader = (field, label) => {
    const isSorted = sortField === field;
    const arrow = isSorted ? (sortDirection === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        onClick={() => handleSort(field)}
        style={{ cursor: "pointer", userSelect: "none" }}
        className="hover-text-white"
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {label}
          <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>{arrow}</span>
        </span>
      </th>
    );
  };

  // react-hook-form setup for Create Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      source: "",
      destination: "",
      vehicleId: "",
      driverId: "",
      cargoWeight: "",
      plannedDistance: "",
    },
  });

  // Watch fields for live validation
  const watchedVehicleId = watch("vehicleId");
  const watchedCargoWeight = watch("cargoWeight");

  // Find selected vehicle details for live validation
  const selectedVehicleObj = vehicles.find((v) => v.id === watchedVehicleId);
  const vehicleCapacity = selectedVehicleObj?.maxLoadCapacity ?? 0;
  const cargoWeightNum = parseFloat(watchedCargoWeight) || 0;
  const isOverweight = watchedVehicleId && cargoWeightNum > vehicleCapacity;
  const weightDifference = cargoWeightNum - vehicleCapacity;

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch trips
      const tripsRes = await fetch("/api/trips");
      if (!tripsRes.ok) throw new Error("Failed to fetch trips");
      const tripsData = await tripsRes.json();
      setTrips(tripsData);

      // Fetch vehicles
      const vehiclesRes = await fetch("/api/vehicles");
      if (!vehiclesRes.ok) throw new Error("Failed to fetch vehicles");
      const vehiclesData = await vehiclesRes.json();
      setVehicles(vehiclesData);

      // Fetch drivers
      const driversRes = await fetch("/api/drivers");
      if (!driversRes.ok) throw new Error("Failed to fetch drivers");
      const driversData = await driversRes.json();
      setDrivers(driversData);
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Error loading data",
        message: "Could not sync registries. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isViewAllowed) {
      fetchData();
    }
  }, [isViewAllowed]);

  // Filtered trips
  const filteredTrips = trips.filter((t) => {
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesSearch = 
      t.tripCode.toLowerCase().includes(query) ||
      t.source.toLowerCase().includes(query) ||
      t.destination.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    if (typeof aVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  // Calculate standard stats for available vehicles & drivers
  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE");
  
  // A driver is available if status is AVAILABLE and license is NOT expired
  const isLicenseExpired = (dateStr) => {
    if (!dateStr) return true;
    return new Date(dateStr) < new Date();
  };
  const availableDrivers = drivers.filter(
    (d) => d.status === "AVAILABLE" && !isLicenseExpired(d.licenseExpiry)
  );

  // Submit Create Form
  const onSubmit = async (data) => {
    if (isOverweight) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to create trip draft");
      }

      toast({
        type: "success",
        title: "Draft Created",
        message: `Trip ${resData.tripCode} has been created in DRAFT.`,
      });

      reset();
      fetchData();
    } catch (err) {
      toast({
        type: "error",
        title: "Creation Failed",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch Action
  const handleDispatch = async (tripId) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/dispatch`, {
        method: "POST",
      });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || "Dispatch validation failed");
      }

      toast({
        type: "success",
        title: "Trip Dispatched",
        message: "Status changed to DISPATCHED. Vehicle & Driver now ON_TRIP.",
      });

      // Update selected trip view
      setSelectedTrip(resData);
      fetchData();
    } catch (err) {
      toast({
        type: "error",
        title: "Dispatch Blocked",
        message: err.message || "Could not dispatch trip.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Action
  const handleComplete = async (e) => {
    e.preventDefault();
    if (!compOdometer || !compFuel) {
      toast({
        type: "warning",
        title: "Missing Fields",
        message: "Please enter final odometer and fuel consumed.",
      });
      return;
    }

    const odoNum = parseFloat(compOdometer);
    const fuelNum = parseFloat(compFuel);
    const rateNum = parseFloat(compFuelRate) || 0;

    if (odoNum <= (selectedTrip?.vehicle?.odometer ?? 0)) {
      toast({
        type: "error",
        title: "Odometer Error",
        message: `Final odometer must exceed vehicle's current odometer (${selectedTrip?.vehicle?.odometer ?? 0} km).`,
      });
      return;
    }

    setCompLoading(true);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalOdometer: odoNum,
          fuelConsumed: fuelNum,
          fuelCostPerLitre: rateNum,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to complete trip");
      }

      toast({
        type: "success",
        title: "Trip Completed",
        message: "Trip completed successfully. Logs and registry statuses updated.",
      });

      setCompOdometer("");
      setCompFuel("");
      setSelectedTrip(resData);
      fetchData();
    } catch (err) {
      toast({
        type: "error",
        title: "Completion Failed",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setCompLoading(false);
    }
  };

  // Cancel Action
  const handleCancelSubmit = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to cancel trip");
      }

      toast({
        type: "success",
        title: "Trip Cancelled",
        message: "Trip has been marked as CANCELLED.",
      });

      setIsCancelModalOpen(false);
      setCancelReason("");
      setSelectedTrip(resData);
      fetchData();
    } catch (err) {
      toast({
        type: "error",
        title: "Cancellation Failed",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // Get active step index based on status for stepper
  const getActiveStep = (status) => {
    switch (status) {
      case "DRAFT":
        return 0;
      case "DISPATCHED":
        return 1;
      case "COMPLETED":
        return 2;
      case "CANCELLED":
        return 3;
      default:
        return 0;
    }
  };

  const activeStep = selectedTrip ? getActiveStep(selectedTrip.status) : 0;

  // Render Access Denied for unauthorized roles (like Financial Analyst)
  if (!userLoading && !isViewAllowed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 16 }}>
        <div style={{ padding: 16, borderRadius: "50%", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
          <ShieldAlert style={{ width: 42, height: 42, color: "var(--status-red)" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--foreground)" }}>Access Denied</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, maxWidth: 360 }}>
            Your role ({role?.replace(/_/g, " ")}) does not have view access to the Trip Dispatcher registry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 28, alignItems: "start" }}>
      
      {/* ══════════════════════ LEFT COLUMN: STEPPER + FORM / DETAILS ══════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Visual Progress Stepper */}
        <div style={{ padding: 20, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--subtle)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {selectedTrip ? `Trip State: ${selectedTrip.tripCode}` : "New Trip Creation Flow"}
          </span>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            
            {/* Stepper bar background */}
            <div style={{ position: "absolute", left: "6%", right: "6%", top: "40%", height: 2, background: "var(--border)", zIndex: 1 }} />
            
            {/* Stepper bar fill (active progress) */}
            {(!selectedTrip || selectedTrip.status !== "CANCELLED") && (
              <div 
                style={{ 
                  position: "absolute", 
                  left: "6%", 
                  width: `${activeStep * 44}%`, 
                  top: "40%", 
                  height: 2, 
                  background: "var(--status-blue)", 
                  zIndex: 2,
                  transition: "width 300ms ease"
                }} 
              />
            )}

            {[
              { label: "Draft", status: "DRAFT", desc: "Plan constraints" },
              { label: "Dispatched", status: "DISPATCHED", desc: "Lock vehicle/driver" },
              { label: "Completed", status: "COMPLETED", desc: "Record odometer" },
              { label: "Cancelled", status: "CANCELLED", desc: "Revert statuses" },
            ].map((step, idx) => {
              const isCancelled = selectedTrip?.status === "CANCELLED";
              let isActive = false;
              let isDone = false;

              if (isCancelled) {
                if (step.status === "CANCELLED") isActive = true;
              } else {
                if (idx === activeStep) isActive = true;
                if (idx < activeStep) isDone = true;
              }

              return (
                <div key={step.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 3, width: "20%" }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isDone 
                        ? "var(--status-blue)" 
                        : isActive 
                        ? (step.status === "CANCELLED" ? "var(--status-red-bg)" : "var(--surface-hover)")
                        : "var(--surface)",
                      border: "2px solid",
                      borderColor: isDone 
                        ? "var(--status-blue)" 
                        : isActive 
                        ? (step.status === "CANCELLED" ? "var(--status-red)" : "var(--status-blue)")
                        : "var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: isDone || isActive ? "#fff" : "var(--subtle)",
                      transition: "all 300ms ease"
                    }}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500, color: isActive ? "#fff" : "var(--muted)", marginTop: 6 }}>
                    {step.label}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--subtle)", textAlign: "center", marginTop: 2, display: "none" }}>
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Action Area: Either Create Trip Form OR Selected Trip Details */}
        {!selectedTrip ? (
          /* ── CREATE TRIP FORM ── */
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Create Dispatch Assignment</h2>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                Assign an available driver and vehicle constraint layout.
              </p>
            </div>

            {/* Check edit permission */}
            {!isEditAllowed ? (
              <div style={{ display: "flex", gap: 8, padding: 12, background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", borderRadius: 6 }}>
                <Info style={{ width: 14, height: 14, color: "var(--muted)", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                  You are logged in as a <strong>{role?.replace(/_/g, " ")}</strong>. You have view-only access and cannot create trips.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                
                {/* Source & Destination */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Source</label>
                    <div style={{ position: "relative" }}>
                      <MapPin style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--subtle)" }} />
                      <input 
                        type="text" 
                        placeholder="e.g. Depot A" 
                        className="input" 
                        style={{ paddingLeft: 28 }}
                        {...register("source")}
                      />
                    </div>
                    {errors.source && <span className="form-error">{errors.source.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination</label>
                    <div style={{ position: "relative" }}>
                      <Navigation style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--subtle)" }} />
                      <input 
                        type="text" 
                        placeholder="e.g. Hub B" 
                        className="input" 
                        style={{ paddingLeft: 28 }}
                        {...register("destination")}
                      />
                    </div>
                    {errors.destination && <span className="form-error">{errors.destination.message}</span>}
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div className="form-group">
                  <label className="form-label">Assigned Vehicle</label>
                  <select className="input" {...register("vehicleId")}>
                    <option value="">Select an available vehicle...</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNo} – {v.name} ({v.type} | capacity: {v.maxLoadCapacity} kg)
                      </option>
                    ))}
                  </select>
                  {errors.vehicleId && <span className="form-error">{errors.vehicleId.message}</span>}
                </div>

                {/* Driver Selection */}
                <div className="form-group">
                  <label className="form-label">Assigned Driver</label>
                  <select className="input" {...register("driverId")}>
                    <option value="">Select an available driver...</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} – License: {d.licenseNumber} (safety score: {d.safetyScore}/100)
                      </option>
                    ))}
                  </select>
                  {errors.driverId && <span className="form-error">{errors.driverId.message}</span>}
                </div>

                {/* Cargo Weight & Distance */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Cargo Weight (kg)</label>
                    <div style={{ position: "relative" }}>
                      <Scale style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--subtle)" }} />
                      <input 
                        type="number" 
                        placeholder="e.g. 500" 
                        className="input" 
                        style={{ paddingLeft: 28 }}
                        {...register("cargoWeight", { valueAsNumber: true })}
                      />
                    </div>
                    {errors.cargoWeight && <span className="form-error">{errors.cargoWeight.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Planned Distance (km)</label>
                    <div style={{ position: "relative" }}>
                      <Navigation style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--subtle)" }} />
                      <input 
                        type="number" 
                        placeholder="e.g. 150" 
                        className="input" 
                        style={{ paddingLeft: 28 }}
                        {...register("plannedDistance", { valueAsNumber: true })}
                      />
                    </div>
                    {errors.plannedDistance && <span className="form-error">{errors.plannedDistance.message}</span>}
                  </div>
                </div>

                {/* Overweight Capacity Exceeded Live Callout */}
                {isOverweight && (
                  <div
                    className="animate-slide-up"
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: "rgba(248,113,113,0.04)",
                      border: "1.5px dashed var(--status-red)",
                    }}
                  >
                    <AlertTriangle style={{ width: 14, height: 14, color: "var(--status-red)", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 11, color: "var(--status-red)", lineHeight: 1.4 }}>
                      <strong>Vehicle Capacity exceeded!</strong>
                      <div style={{ marginTop: 2 }}>
                        Vehicle Capacity: {vehicleCapacity.toLocaleString()} kg / Cargo Weight: {cargoWeightNum.toLocaleString()} kg
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>
                        Capacity exceeded by {weightDifference.toLocaleString()} kg — dispatch blocked.
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || isOverweight}
                  className="btn btn-primary"
                  style={{ width: "100%", height: 38, fontWeight: 600, marginTop: 8 }}
                >
                  {submitting ? "Saving Draft..." : "Create Trip Draft"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ── SELECTED TRIP DETAILS & LIFE-CYCLE TRANSITIONS ── */
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <span className={`badge ${
                  selectedTrip.status === "DRAFT"
                    ? "badge-neutral"
                    : selectedTrip.status === "DISPATCHED"
                    ? "badge-blue"
                    : selectedTrip.status === "COMPLETED"
                    ? "badge-green"
                    : "badge-red"
                }`}>
                  {selectedTrip.status}
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginTop: 6 }}>
                  Trip details: {selectedTrip.tripCode}
                </h2>
              </div>
              
              <button
                onClick={() => setSelectedTrip(null)}
                className="btn btn-ghost"
                style={{ padding: "4px 8px", fontSize: 11 }}
              >
                Close / Create New
              </button>
            </div>

            {/* Content Details Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, borderBottom: "1px solid var(--border)", paddingBottom: 20, marginBottom: 20 }}>
              
              {/* Route */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 10, color: "var(--subtle)", textTransform: "uppercase" }}>Source</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{selectedTrip.source}</span>
                </div>
                <ArrowRight style={{ width: 14, height: 14, color: "var(--subtle)" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 10, color: "var(--subtle)", textTransform: "uppercase" }}>Destination</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{selectedTrip.destination}</span>
                </div>
              </div>

              {/* Vehicle & Driver Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                
                {/* Vehicle card */}
                <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 6 }}>
                  <span style={{ fontSize: 9, color: "var(--subtle)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    <Truck style={{ width: 10, height: 10 }} /> Vehicle
                  </span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginTop: 4 }}>
                    {selectedTrip.vehicle?.registrationNo || "Unassigned"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    {selectedTrip.vehicle?.name || "No vehicle linked"}
                  </div>
                </div>

                {/* Driver card */}
                <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 6 }}>
                  <span style={{ fontSize: 9, color: "var(--subtle)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    <UserIcon style={{ width: 10, height: 10 }} /> Driver
                  </span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginTop: 4 }}>
                    {selectedTrip.driver?.name || "Unassigned"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    License: {selectedTrip.driver?.licenseNumber || "—"}
                  </div>
                </div>

              </div>

              {/* Distance & Cargo Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: "var(--subtle)" }}>Cargo Weight:</span>{" "}
                  <strong style={{ color: "var(--foreground-2)" }}>{selectedTrip.cargoWeight.toLocaleString()} kg</strong>
                </div>
                <div>
                  <span style={{ color: "var(--subtle)" }}>Planned Distance:</span>{" "}
                  <strong style={{ color: "var(--foreground-2)" }}>{selectedTrip.plannedDistance.toLocaleString()} km</strong>
                </div>
              </div>

              {/* Status details / reasons */}
              {selectedTrip.status === "CANCELLED" && selectedTrip.cancelReason && (
                <div style={{ padding: 10, background: "rgba(248,113,113,0.02)", border: "1.5px dashed rgba(248,113,113,0.2)", borderRadius: 6 }}>
                  <span style={{ fontSize: 9, color: "var(--status-red)", textTransform: "uppercase", fontWeight: 600 }}>Cancellation Reason</span>
                  <p style={{ fontSize: 12, color: "var(--foreground-2)", marginTop: 4 }}>{selectedTrip.cancelReason}</p>
                </div>
              )}
            </div>

            {/* Stepper transitions & forms */}
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Transition Trip Lifecycle
              </h3>

              {!isEditAllowed ? (
                <div style={{ display: "flex", gap: 8, padding: 10, background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border)", borderRadius: 6 }}>
                  <Info style={{ width: 12, height: 12, color: "var(--muted)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    You are in read-only mode ({role?.replace(/_/g, " ")}). Transition actions are blocked.
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  
                  {/* DRAFT -> Dispatching options */}
                  {selectedTrip.status === "DRAFT" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleDispatch(selectedTrip.id)}
                        disabled={submitting}
                        className="btn btn-primary"
                        style={{ flex: 1, height: 36, fontWeight: 600 }}
                      >
                        <Play style={{ width: 13, height: 13 }} />
                        Dispatch Assignment
                      </button>

                      <button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="btn btn-danger"
                        style={{ height: 36 }}
                      >
                        Cancel Trip
                      </button>
                    </div>
                  )}

                  {/* DISPATCHED -> Complete Form or Cancel */}
                  {selectedTrip.status === "DISPATCHED" && (
                    <form onSubmit={handleComplete} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, background: "var(--surface-elevated)", border: "1px solid var(--border-strong)", borderRadius: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--status-blue)", textTransform: "uppercase" }}>
                        Trip Delivery Reporting
                      </span>

                      {/* Final Odometer */}
                      <div className="form-group">
                        <label className="form-label">Final Odometer (km)</label>
                        <input
                          type="number"
                          className="input"
                          placeholder={`Current: ${selectedTrip.vehicle?.odometer ?? 0} km`}
                          value={compOdometer}
                          onChange={(e) => setCompOdometer(e.target.value)}
                        />
                      </div>

                      {/* Fuel consumed */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div className="form-group">
                          <label className="form-label">Fuel Consumed (L)</label>
                          <input
                            type="number"
                            className="input"
                            placeholder="e.g. 45"
                            value={compFuel}
                            onChange={(e) => setCompFuel(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Cost/Litre (₹)</label>
                          <input
                            type="number"
                            className="input"
                            value={compFuelRate}
                            onChange={(e) => setCompFuelRate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button
                          type="submit"
                          disabled={compLoading}
                          className="btn btn-primary"
                          style={{ flex: 1, height: 36, fontWeight: 600 }}
                        >
                          <CheckSquare style={{ width: 13, height: 13 }} />
                          {compLoading ? "Processing..." : "Complete Trip"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="btn btn-danger"
                          style={{ height: 36 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Completed / Cancelled final logs info */}
                  {selectedTrip.status === "COMPLETED" && (
                    <div style={{ display: "flex", gap: 8, padding: 12, background: "rgba(74,222,128,0.03)", border: "1px dashed rgba(74,222,128,0.2)", borderRadius: 6 }}>
                      <CheckCircle style={{ width: 14, height: 14, color: "var(--status-green)", flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 11, color: "var(--status-green)", lineHeight: 1.4 }}>
                        <strong>Trip Completed</strong>
                        <div style={{ marginTop: 2 }}>
                          Final Odometer: {selectedTrip.finalOdometer?.toLocaleString()} km
                        </div>
                        <div>
                          Fuel Consumed: {selectedTrip.fuelConsumed?.toLocaleString()} liters
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTrip.status === "CANCELLED" && (
                    <div style={{ display: "flex", gap: 8, padding: 12, background: "rgba(248,113,113,0.03)", border: "1px dashed rgba(248,113,113,0.2)", borderRadius: 6 }}>
                      <XCircle style={{ width: 14, height: 14, color: "var(--status-red)", flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 11, color: "var(--status-red)", lineHeight: 1.4 }}>
                        This trip assignment has been cancelled. Vehicle and driver registries are restored to AVAILABLE.
                      </span>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ══════════════════════ RIGHT COLUMN: LIVE BOARD ══════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Live Board Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="text-heading">Transit Live Board</h2>
            <p className="text-subheading" style={{ marginTop: 2 }}>
              Track constraints, assignments, and active runs.
            </p>
          </div>

          {/* Filter badges */}
          <div style={{ display: "flex", gap: 4 }}>
            {["ALL", "DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"].map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`btn ${active ? "btn-secondary" : "btn-ghost"}`}
                  style={{
                    padding: "3px 8px",
                    fontSize: 10,
                    textTransform: "capitalize",
                    background: active ? "var(--surface-hover)" : "transparent",
                    color: active ? "#fff" : "var(--muted)",
                  }}
                >
                  {status === "ALL" ? "All" : status.toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Board Card Container */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", minHeight: "400px" }}>
          
          <table className="data-table">
            <thead>
              <tr>
                {renderSortHeader("tripCode", "Trip Code")}
                {renderSortHeader("source", "Route")}
                <th>Assignments</th>
                {renderSortHeader("status", "Status")}
                <th>Status Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)" }}>
                    <div style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", width: 18, height: 18, animation: "spin 1s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
                    Syncing live board...
                  </td>
                </tr>
              ) : sortedTrips.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)" }}>
                    No active trips found matching the selected status.
                  </td>
                </tr>
              ) : (
                sortedTrips.map((t) => {
                  const isSelected = selectedTrip?.id === t.id;
                  
                  // Construct status note
                  let statusNote = "";
                  if (t.status === "DRAFT") {
                    statusNote = !t.driverId ? "Awaiting driver" : "Ready to dispatch";
                  } else if (t.status === "DISPATCHED") {
                    // Generate a pseudo ETA (planned distance / 50 km/h average)
                    const hours = (t.plannedDistance / 55).toFixed(1);
                    statusNote = `In Transit (ETA: ~${hours}h)`;
                  } else if (t.status === "COMPLETED") {
                    statusNote = "Odometer updated";
                  } else if (t.status === "CANCELLED") {
                    statusNote = t.cancelReason ? `Reason: ${t.cancelReason}` : "Cancelled";
                  }

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrip(isSelected ? null : t)}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        background: isSelected ? "rgba(255,255,255,0.02)" : "transparent",
                      }}
                    >
                      <td style={{ fontWeight: 600, color: "var(--foreground)", fontFamily: "monospace", fontSize: 11 }}>
                        {t.tripCode}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-2)" }}>
                            {t.source} → {t.destination}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>
                            {t.plannedDistance} km · {t.cargoWeight} kg
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Truck style={{ width: 10, height: 10, color: "var(--subtle)" }} />
                            {t.vehicle?.registrationNo ?? "Unassigned"}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <UserIcon style={{ width: 10, height: 10, color: "var(--subtle)" }} />
                            {t.driver?.name ?? "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          t.status === "DRAFT"
                            ? "badge-neutral"
                            : t.status === "DISPATCHED"
                            ? "badge-blue"
                            : t.status === "COMPLETED"
                            ? "badge-green"
                            : "badge-red"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {statusNote}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {/* Caption mandated by prompt */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.01)", display: "flex", alignItems: "center", gap: 8 }}>
            <Info style={{ width: 12, height: 12, color: "var(--muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.01em" }}>
              On Complete: odometer → fuel log → expenses → Vehicle & Driver Available.
            </span>
          </div>

        </div>

      </div>

      {/* ── CANCELLATION MODAL ── */}
      {isCancelModalOpen && (
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
            onClick={() => !cancelLoading && setIsCancelModalOpen(false)}
          />

          {/* Modal Container */}
          <div
            className="animate-scale-up"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 380,
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
              Cancel Trip Assignment?
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
              Provide an optional reason below. This will mark the trip as Cancelled and instantly restore the vehicle and driver status to AVAILABLE.
            </p>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label">Cancellation Reason</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Vehicle went to shop"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelLoading}
                className="btn btn-secondary"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={cancelLoading}
                className="btn btn-danger"
                style={{ minWidth: 90 }}
              >
                {cancelLoading ? "Cancelling..." : "Cancel Trip"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
