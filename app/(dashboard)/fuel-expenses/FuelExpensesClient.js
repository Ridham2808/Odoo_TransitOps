"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Fuel, DollarSign, Calendar, Info, ShieldAlert, Plus, 
  Search, FileSpreadsheet, Percent, Wrench, Layers, Tag 
} from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";

// Zod schema for Fuel Log
const fuelSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  tripId: z.string().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  liters: z.number({ invalid_type_error: "Must be a valid number" }).positive("Liters must be greater than 0"),
  cost: z.number({ invalid_type_error: "Must be a valid number" }).positive("Cost must be greater than 0"),
});

// Zod schema for Other Expense
const expenseSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  tripId: z.string().optional().nullable(),
  toll: z.number({ invalid_type_error: "Must be a valid number" }).nonnegative("Toll cannot be negative").default(0),
  other: z.number({ invalid_type_error: "Must be a valid number" }).nonnegative("Other cannot be negative").default(0),
  date: z.string().min(1, "Date is required"),
});

export default function FuelExpensesClient() {
  const { role } = useUser();
  const toast = useToast();

  const isFinancialAnalyst = role === "FINANCIAL_ANALYST";
  const isFleetManager = role === "FLEET_MANAGER";
  const hasAccess = isFinancialAnalyst || isFleetManager;
  const isEditAllowed = isFinancialAnalyst;

  // Data states
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState("ALL");

  // Modals
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Form Hooks
  const fuelForm = useForm({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      vehicleId: "",
      tripId: "",
      date: new Date().toISOString().split("T")[0],
      liters: "",
      cost: "",
    },
  });

  const expenseForm = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      vehicleId: "",
      tripId: "",
      toll: 0,
      other: 0,
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Fetch all records
  const fetchData = async () => {
    setLoading(true);
    try {
      const [fuelRes, expenseRes, maintRes, vehiclesRes, tripsRes] = await Promise.all([
        fetch("/api/fuel-logs"),
        fetch("/api/expenses"),
        fetch("/api/maintenance"),
        fetch("/api/vehicles"),
        fetch("/api/trips"),
      ]);

      if (!fuelRes.ok || !expenseRes.ok || !maintRes.ok || !vehiclesRes.ok || !tripsRes.ok) {
        throw new Error("One or more network requests failed");
      }

      const [fuelData, expenseData, maintData, vehiclesData, tripsData] = await Promise.all([
        fuelRes.json(),
        expenseRes.json(),
        maintRes.json(),
        vehiclesRes.json(),
        tripsRes.json(),
      ]);

      setFuelLogs(fuelData);
      setExpenses(expenseData);
      setMaintenanceLogs(maintData);
      setVehicles(vehiclesData);
      setTrips(tripsData);
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Load Error",
        message: "Failed to load expenses data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  // Compute maintenance cost map (vehicleId -> total cost)
  const maintenanceCostByVehicle = maintenanceLogs.reduce((acc, log) => {
    const vid = log.vehicleId;
    acc[vid] = (acc[vid] || 0) + log.cost;
    return acc;
  }, {});

  // Handle Fuel Log submit
  const onFuelSubmit = async (data) => {
    setSubmitting(true);
    setApiError("");
    try {
      const res = await fetch("/api/fuel-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tripId: data.tripId || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to log fuel");

      toast({
        type: "success",
        title: "Fuel Logged",
        message: "Fuel consumption record saved successfully.",
      });

      setIsFuelModalOpen(false);
      fuelForm.reset({
        vehicleId: "",
        tripId: "",
        date: new Date().toISOString().split("T")[0],
        liters: "",
        cost: "",
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Expense submit
  const onExpenseSubmit = async (data) => {
    setSubmitting(true);
    setApiError("");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          vehicleId: data.vehicleId || null,
          tripId: data.tripId || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to log expense");

      toast({
        type: "success",
        title: "Expense Logged",
        message: "Other operational cost saved successfully.",
      });

      setIsExpenseModalOpen(false);
      expenseForm.reset({
        vehicleId: "",
        tripId: "",
        toll: 0,
        other: 0,
        date: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter fuel logs
  const filteredFuelLogs = fuelLogs.filter((log) => {
    if (selectedVehicleFilter === "ALL") return true;
    return log.vehicleId === selectedVehicleFilter;
  });

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    if (selectedVehicleFilter === "ALL") return true;
    return exp.vehicleId === selectedVehicleFilter;
  });

  // Filter maintenance records to compute final live operational cost
  const filteredMaintenanceLogs = maintenanceLogs.filter((log) => {
    if (selectedVehicleFilter === "ALL") return true;
    return log.vehicleId === selectedVehicleFilter;
  });

  // Compute live totals based on currently filtered views
  const totalFuelCost = filteredFuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalMaintenanceCost = filteredMaintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  // Format date display
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Access check view
  if (!hasAccess) {
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
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Access Forbidden</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, maxWidth: 360 }}>
            Only the Financial Analyst and Fleet Manager roles are permitted to access this module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="text-heading">Operational Costs & Expenses</h1>
          <p className="text-subheading" style={{ marginTop: 4 }}>
            Monitor fuel logs, miscellaneous expenses, maintenance totals, and live operational stats.
          </p>
        </div>

        {/* Buttons (Financial Analyst only) */}
        {isEditAllowed && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="btn btn-secondary"
            >
              <Fuel style={{ width: 14, height: 14 }} />
              Log Fuel
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="btn"
              style={{
                background: "#F59E0B",
                color: "#000000",
                borderColor: "#F59E0B",
                fontWeight: 600,
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
              Add Expense
            </button>
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--subtle)", textTransform: "uppercase", fontWeight: 600 }}>
            Filter by Vehicle:
          </span>
          <select
            className="input"
            style={{ width: 180, height: 32, padding: "0 28px 0 10px" }}
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
          >
            <option value="ALL">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNo} — {v.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <Info style={{ width: 12, height: 12 }} />
          <span>Table summaries re-calculate live based on the selected vehicle.</span>
        </div>
      </div>

      {/* ── Two tables grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        
        {/* Table 1: Fuel Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
            <Fuel style={{ width: 14, height: 14, color: "var(--status-green)" }} />
            Fuel Logs
          </h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Date</th>
                  <th>Liters</th>
                  <th style={{ textAlign: "right" }}>Fuel Cost</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                      Loading fuel logs...
                    </td>
                  </tr>
                ) : filteredFuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                      No fuel logs recorded.
                    </td>
                  </tr>
                ) : (
                  filteredFuelLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ fontWeight: 600, color: "var(--foreground)" }}>{log.vehicle.registrationNo}</td>
                      <td>{formatDate(log.date)}</td>
                      <td>{log.liters.toLocaleString()} L</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--status-green)" }}>
                        ₹{log.cost.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Other Expenses */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
            <DollarSign style={{ width: 14, height: 14, color: "var(--status-blue)" }} />
            Other Expenses (Toll/Misc)
          </h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip / Vehicle</th>
                  <th>Toll</th>
                  <th>Other</th>
                  <th>Maintenance</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                      Loading operational costs...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                      No operational expenses recorded.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const maintCost = exp.vehicleId ? (maintenanceCostByVehicle[exp.vehicleId] ?? 0) : 0;
                    const rowTotal = exp.toll + exp.other + maintCost;

                    return (
                      <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
                              {exp.trip?.tripCode ?? "Unassigned"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                              {exp.vehicle?.registrationNo ?? "Unassigned"}
                            </div>
                          </div>
                        </td>
                        <td>₹{exp.toll.toLocaleString()}</td>
                        <td>₹{exp.other.toLocaleString()}</td>
                        <td style={{ color: maintCost > 0 ? "var(--status-blue)" : "var(--muted)" }}>
                          ₹{maintCost.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--foreground)" }}>
                          ₹{rowTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Total Operational Cost prominent row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          marginTop: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileSpreadsheet style={{ width: 16, height: 16, color: "#F59E0B" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              Total Operational Cost (Auto)
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Computed live by summing Fuel Logs (₹{totalFuelCost.toLocaleString()}) + Maintenance Logs (₹{totalMaintenanceCost.toLocaleString()})
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Operational Sum
          </span>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#F59E0B", letterSpacing: "-0.03em", marginTop: 2 }}>
            ₹{totalOperationalCost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── LOG FUEL MODAL ── */}
      {isFuelModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyCenter: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={() => !submitting && setIsFuelModalOpen(false)} />
          
          <div className="animate-scale-up" style={{ position: "relative", width: "100%", maxWidth: 400, background: "var(--surface-elevated)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.7)", overflow: "hidden", margin: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Log Fuel Refill</h2>
              <button onClick={() => setIsFuelModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>

            <form onSubmit={fuelForm.handleSubmit(onFuelSubmit)} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {apiError && (
                <div style={{ display: "flex", gap: 8, padding: 10, background: "rgba(248,113,113,0.06)", border: "1px dashed rgba(248,113,113,0.3)", borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--status-red)" }}>{apiError}</span>
                </div>
              )}

              {/* Vehicle select */}
              <div className="form-group">
                <label className="form-label">Vehicle</label>
                <select className="input" {...fuelForm.register("vehicleId")}>
                  <option value="" disabled>Select vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNo} — {v.name}</option>
                  ))}
                </select>
                {fuelForm.formState.errors.vehicleId && <span className="form-error">{fuelForm.formState.errors.vehicleId.message}</span>}
              </div>

              {/* Trip select (optional) */}
              <div className="form-group">
                <label className="form-label">Trip (Optional)</label>
                <select className="input" {...fuelForm.register("tripId")}>
                  <option value="">Unassigned / No Trip</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>{t.tripCode} ({t.source} ➔ {t.destination})</option>
                  ))}
                </select>
              </div>

              {/* Liters */}
              <div className="form-group">
                <label className="form-label">Liters Refilled</label>
                <input type="number" className="input" placeholder="e.g. 50" {...fuelForm.register("liters", { valueAsNumber: true })} />
                {fuelForm.formState.errors.liters && <span className="form-error">{fuelForm.formState.errors.liters.message}</span>}
              </div>

              {/* Cost */}
              <div className="form-group">
                <label className="form-label">Cost (₹)</label>
                <input type="number" className="input" placeholder="e.g. 5000" {...fuelForm.register("cost", { valueAsNumber: true })} />
                {fuelForm.formState.errors.cost && <span className="form-error">{fuelForm.formState.errors.cost.message}</span>}
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Refill Date</label>
                <input type="date" className="input" {...fuelForm.register("date")} />
                {fuelForm.formState.errors.date && <span className="form-error">{fuelForm.formState.errors.date.message}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setIsFuelModalOpen(false)} disabled={submitting} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minWidth: 100 }}>{submitting ? "Saving..." : "Log Fuel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      {isExpenseModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyCenter: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={() => !submitting && setIsExpenseModalOpen(false)} />
          
          <div className="animate-scale-up" style={{ position: "relative", width: "100%", maxWidth: 400, background: "var(--surface-elevated)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.7)", overflow: "hidden", margin: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Log Operational Expense</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>

            <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {apiError && (
                <div style={{ display: "flex", gap: 8, padding: 10, background: "rgba(248,113,113,0.06)", border: "1px dashed rgba(248,113,113,0.3)", borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--status-red)" }}>{apiError}</span>
                </div>
              )}

              {/* Vehicle select (optional) */}
              <div className="form-group">
                <label className="form-label">Vehicle (Optional)</label>
                <select className="input" {...expenseForm.register("vehicleId")}>
                  <option value="">Unassigned / No Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNo} — {v.name}</option>
                  ))}
                </select>
              </div>

              {/* Trip select (optional) */}
              <div className="form-group">
                <label className="form-label">Trip (Optional)</label>
                <select className="input" {...expenseForm.register("tripId")}>
                  <option value="">Unassigned / No Trip</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>{t.tripCode} ({t.source} ➔ {t.destination})</option>
                  ))}
                </select>
              </div>

              {/* Toll Cost */}
              <div className="form-group">
                <label className="form-label">Toll Fees (₹)</label>
                <input type="number" className="input" placeholder="e.g. 500" {...expenseForm.register("toll", { valueAsNumber: true })} />
                {expenseForm.formState.errors.toll && <span className="form-error">{expenseForm.formState.errors.toll.message}</span>}
              </div>

              {/* Other Cost */}
              <div className="form-group">
                <label className="form-label">Miscellaneous Costs (₹)</label>
                <input type="number" className="input" placeholder="e.g. 1500" {...expenseForm.register("other", { valueAsNumber: true })} />
                {expenseForm.formState.errors.other && <span className="form-error">{expenseForm.formState.errors.other.message}</span>}
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Expense Date</label>
                <input type="date" className="input" {...expenseForm.register("date")} />
                {expenseForm.formState.errors.date && <span className="form-error">{expenseForm.formState.errors.date.message}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} disabled={submitting} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minWidth: 100 }}>{submitting ? "Saving..." : "Add Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline X icon placeholder for modal close
function X({ ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
