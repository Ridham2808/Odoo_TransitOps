"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import Papa from "papaparse";
import { 
  BarChart3, Fuel, Percent, DollarSign, Download, Info, 
  ShieldAlert, TrendingUp, TrendingDown, ArrowRight 
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useUser } from "@/lib/userContext";
import { useToast } from "@/components/ui/Toast";

export default function AnalyticsClient() {
  const { role } = useUser();
  const toast = useToast();

  const isFleetManager = role === "FLEET_MANAGER";
  const isFinancialAnalyst = role === "FINANCIAL_ANALYST";
  const hasAccess = isFleetManager || isFinancialAnalyst;

  // Data states
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch reports data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load reports & analytics");
      const resData = await res.json();
      setData(resData);
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Load Error",
        message: "Failed to compile fleet reports. Please retry.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess && mounted) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, mounted]);

  // Export Table to CSV using Papaparse
  const handleExportCSV = () => {
    if (!data?.vehicleRoiList) return;

    const dataToExport = data.vehicleRoiList.map((v) => ({
      "Registration Number": v.registrationNo,
      "Vehicle Model": v.name,
      "Vehicle Type": v.type,
      "Approx. Revenue (INR)": v.revenue,
      "Fuel Cost (INR)": v.fuelCost,
      "Maintenance Cost (INR)": v.maintenanceCost,
      "Acquisition Cost (INR)": v.acquisitionCost,
      "Total Operational Cost (INR)": v.totalOpCost,
      "Vehicle ROI (%)": v.roi,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `TransitOps_Fleet_ROI_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      type: "success",
      title: "Export Completed",
      message: "CSV report downloaded successfully.",
    });
  };

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Fleet Operational & ROI Report", 14, 20);

    // Subtitle (Depot Name)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Depot: ${data.depotName || "All Depots"}`, 14, 26);

    // Timestamp
    const timestamp = `Generated: ${new Date().toLocaleString("en-IN")}`;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(timestamp, 14, 32);

    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 35, pageWidth - 14, 35);

    // ── KPI Summary Cards ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Key Performance Indicators (KPIs)", 14, 44);

    // Draw 4 KPI blocks
    const kpis = [
      { label: "Fuel Efficiency", val: `${data.kpis.fuelEfficiency} km/l` },
      { label: "Fleet Utilization", val: `${data.kpis.fleetUtilization}%` },
      { label: "Operational Cost", val: `INR ${data.kpis.totalOperationalCost.toLocaleString()}` },
      { label: "Avg Fleet ROI", val: `${data.kpis.avgFleetRoi}%` },
    ];

    const boxWidth = 43;
    const boxHeight = 18;
    const boxGap = 3.5;
    let startX = 14;
    const startY = 48;

    kpis.forEach((kpi, idx) => {
      const x = startX + idx * (boxWidth + boxGap);
      
      // Draw background box
      doc.setFillColor(248, 249, 250);
      doc.rect(x, startY, boxWidth, boxHeight, "F");
      doc.setDrawColor(230, 230, 230);
      doc.rect(x, startY, boxWidth, boxHeight, "S");

      // Draw label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, x + 3, startY + 5);

      // Draw value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(20, 20, 20);
      doc.text(kpi.val, x + 3, startY + 12);
    });

    // ── Top Costliest Vehicles Table ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Top Costliest Vehicles", 14, 76);

    const headers = ["Vehicle Reg No", "Model / Name", "Total Operational Cost"];
    const rows = data.topCostliestVehicles.map((v) => [
      v.name,
      v.model,
      `INR ${v.cost.toLocaleString()}`,
    ]);

    doc.autoTable({
      startY: 80,
      head: [headers],
      body: rows,
      theme: "striped",
      headStyles: {
        fillColor: [24, 24, 24],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [50, 50, 50],
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`TransitOps_Analytics_Report_${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      type: "success",
      title: "PDF Exported",
      message: "Analytics PDF report downloaded successfully.",
    });
  };

  // Render unauthorized screen
  if (mounted && !hasAccess) {
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
            Only the Fleet Manager and Financial Analyst roles are permitted to access reports.
          </p>
        </div>
      </div>
    );
  }

  // Prevent hydration discrepancies
  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="text-heading">Reports & Analytics</h1>
          <p className="text-subheading" style={{ marginTop: 4 }}>
            Monitor fleet ROI performance, fuel efficiency, and monthly operational revenue trends.
          </p>
        </div>

        {/* Export Buttons */}
        {!loading && data && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleExportCSV}
              className="btn btn-secondary"
            >
              <Download style={{ width: 14, height: 14 }} />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-primary"
            >
              <Download style={{ width: 14, height: 14 }} />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "var(--muted)" }}>
          <div style={{ display: "inline-block", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", width: 24, height: 24, animation: "spin 1s linear infinite", marginRight: 10, verticalAlign: "middle" }} />
          Compiling analytics records...
        </div>
      ) : (
        <>
          {/* ── KPI Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {/* KPI 1: Fuel Efficiency */}
            <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--subtle)" }}>
                  Fuel Efficiency
                </span>
                <Fuel style={{ width: 14, height: 14, color: "var(--status-green)" }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginTop: 10 }}>
                {data.kpis.fuelEfficiency} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>km/l</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--subtle)", marginTop: 6 }}>
                Average across completed trips
              </p>
            </div>

            {/* KPI 2: Fleet Utilization */}
            <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--subtle)" }}>
                  Fleet Utilization
                </span>
                <Percent style={{ width: 14, height: 14, color: "var(--status-blue)" }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginTop: 10 }}>
                {data.kpis.fleetUtilization}%
              </div>
              <p style={{ fontSize: 11, color: "var(--subtle)", marginTop: 6 }}>
                Active (On Trip) / Total fleet
              </p>
            </div>

            {/* KPI 3: Operational Cost */}
            <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--subtle)" }}>
                  Operational Cost
                </span>
                <DollarSign style={{ width: 14, height: 14, color: "#F59E0B" }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginTop: 10 }}>
                ₹{data.kpis.totalOperationalCost.toLocaleString()}
              </div>
              <p style={{ fontSize: 11, color: "var(--subtle)", marginTop: 6 }}>
                Sum of fuel & maintenance
              </p>
            </div>

            {/* KPI 4: Vehicle ROI */}
            <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--subtle)" }}>
                  Vehicle Avg ROI
                </span>
                <TrendingUp style={{ width: 14, height: 14, color: "var(--foreground)" }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginTop: 10 }}>
                {data.kpis.avgFleetRoi}%
              </div>
              <p style={{ fontSize: 11, color: "var(--subtle)", marginTop: 6 }}>
                Approximated fleet ROI sum
              </p>
            </div>
          </div>

          {/* ── Recharts Chart Columns ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
            {/* Chart 1: Monthly Revenue */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 16 }}>
                Monthly Revenue (Approximated)
              </h3>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--subtle)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--subtle)" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 11 }}
                      labelStyle={{ color: "var(--muted)" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="revenue" fill="var(--status-blue)" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Costliest Vehicles */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 16 }}>
                Top Costliest Vehicles
              </h3>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.topCostliestVehicles} 
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: -5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--subtle)" fontSize={11} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--subtle)" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 11 }}
                      labelStyle={{ color: "var(--muted)" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="cost" fill="var(--status-neutral)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── ROI Table ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              Vehicle ROI Performance Registry
            </h3>
            
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Approx. Revenue</th>
                    <th>Fuel Cost</th>
                    <th>Maintenance</th>
                    <th>Acquisition</th>
                    <th style={{ textAlign: "right" }}>Computed ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicleRoiList.map((v) => {
                    const isPositive = v.roi >= 0;
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff" }}>{v.registrationNo}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{v.name}</div>
                          </div>
                        </td>
                        <td>{v.type}</td>
                        <td>₹{v.revenue.toLocaleString()}</td>
                        <td>₹{v.fuelCost.toLocaleString()}</td>
                        <td>₹{v.maintenanceCost.toLocaleString()}</td>
                        <td>₹{v.acquisitionCost.toLocaleString()}</td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className={`badge ${isPositive ? "badge-green" : "badge-red"}`}
                            style={{ fontWeight: 600 }}
                          >
                            {isPositive ? (
                              <TrendingUp style={{ width: 10, height: 10, marginRight: 2, display: "inline-block", verticalAlign: "middle" }} />
                            ) : (
                              <TrendingDown style={{ width: 10, height: 10, marginRight: 2, display: "inline-block", verticalAlign: "middle" }} />
                            )}
                            {v.roi}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Note / Caption explaining formula exactly like wireframe */}
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
                  <strong>ROI Formula:</strong> (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost. 
                  Revenue approximated as Settings ratePerKm (₹{data.ratePerKm}) × completed trip distance.
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
