// app/api/analytics/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView } from "@/lib/permissions";

export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertView(user.role, "analytics");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    // 1. Fetch settings to get ratePerKm
    const settings = await prisma.settings.findFirst();
    const ratePerKm = settings?.ratePerKm ?? 25;

    // 2. Fetch completed trips, fuel logs, maintenance logs, and vehicles
    const [completedTrips, allFuelLogs, allMaintenanceLogs, activeVehicles] = await Promise.all([
      prisma.trip.findMany({
        where: { status: "COMPLETED" },
        select: {
          plannedDistance: true,
          fuelConsumed: true,
          createdAt: true,
          completedAt: true,
          vehicleId: true,
        },
      }),
      prisma.fuelLog.findMany({
        select: {
          cost: true,
          vehicleId: true,
        },
      }),
      prisma.maintenanceLog.findMany({
        select: {
          cost: true,
          vehicleId: true,
        },
      }),
      prisma.vehicle.findMany({
        where: { NOT: { status: "RETIRED" } },
        select: {
          id: true,
          registrationNo: true,
          name: true,
          type: true,
          acquisitionCost: true,
          status: true,
        },
      }),
    ]);

    // ── KPI 1: Fuel Efficiency ───────────────────────────────────────────────
    // Fuel Efficiency (average planned distance ÷ fuel consumed across completed trips, in km/l)
    const totalPlannedDistance = completedTrips.reduce((sum, t) => sum + (t.plannedDistance ?? 0), 0);
    const totalFuelConsumed = completedTrips.reduce((sum, t) => sum + (t.fuelConsumed ?? 0), 0);
    const fuelEfficiency = totalFuelConsumed > 0 ? (totalPlannedDistance / totalFuelConsumed) : 0;

    // ── KPI 2: Fleet Utilization ─────────────────────────────────────────────
    // Formula: active vehicles ÷ total non-retired vehicles
    const totalVehiclesCount = activeVehicles.length;
    const activeVehiclesCount = activeVehicles.filter((v) => v.status === "ON_TRIP").length;
    const fleetUtilization = totalVehiclesCount > 0 ? (activeVehiclesCount / totalVehiclesCount) * 100 : 0;

    // ── KPI 3: Operational Cost ──────────────────────────────────────────────
    const totalFuelCost = allFuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const totalMaintenanceCost = allMaintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

    // ── KPI 4 & Table: Vehicle ROI Breakdown ──────────────────────────────────
    // Compute per-vehicle operational costs and distance
    const fuelByVehicle = allFuelLogs.reduce((acc, log) => {
      acc[log.vehicleId] = (acc[log.vehicleId] || 0) + log.cost;
      return acc;
    }, {});

    const maintenanceByVehicle = allMaintenanceLogs.reduce((acc, log) => {
      acc[log.vehicleId] = (acc[log.vehicleId] || 0) + log.cost;
      return acc;
    }, {});

    const completedDistByVehicle = completedTrips.reduce((acc, trip) => {
      if (trip.vehicleId) {
        acc[trip.vehicleId] = (acc[trip.vehicleId] || 0) + (trip.plannedDistance ?? 0);
      }
      return acc;
    }, {});

    // Compute detailed ROI list
    const vehicleRoiList = activeVehicles.map((v) => {
      const fuelCost = fuelByVehicle[v.id] ?? 0;
      const maintenanceCost = maintenanceByVehicle[v.id] ?? 0;
      const distance = completedDistByVehicle[v.id] ?? 0;
      const revenue = distance * ratePerKm;
      const opCost = fuelCost + maintenanceCost;
      const netEarnings = revenue - opCost;
      const roi = v.acquisitionCost > 0 ? (netEarnings / v.acquisitionCost) * 100 : 0;

      return {
        id: v.id,
        registrationNo: v.registrationNo,
        name: v.name,
        type: v.type,
        revenue,
        fuelCost,
        maintenanceCost,
        acquisitionCost: v.acquisitionCost,
        roi: Math.round(roi * 100) / 100, // round to 2 decimals
        totalOpCost: opCost,
      };
    });

    // Average vehicle ROI %
    const totalRoiSum = vehicleRoiList.reduce((sum, v) => sum + v.roi, 0);
    const avgFleetRoi = vehicleRoiList.length > 0 ? (totalRoiSum / vehicleRoiList.length) : 0;

    // ── Chart 1: Monthly Revenue (Completed Trips) ───────────────────────────
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenueMap = {};

    completedTrips.forEach((trip) => {
      const date = trip.completedAt ?? trip.createdAt;
      if (date) {
        const monthIndex = new Date(date).getMonth();
        const monthName = months[monthIndex];
        const rev = (trip.plannedDistance ?? 0) * ratePerKm;
        monthlyRevenueMap[monthName] = (monthlyRevenueMap[monthName] || 0) + rev;
      }
    });

    const monthlyRevenue = months.map((m) => ({
      name: m,
      revenue: monthlyRevenueMap[m] ?? 0,
    }));

    // ── Chart 2: Top Costliest Vehicles ──────────────────────────────────────
    const topCostliestVehicles = [...vehicleRoiList]
      .filter((v) => v.totalOpCost > 0)
      .sort((a, b) => b.totalOpCost - a.totalOpCost)
      .slice(0, 5)
      .map((v) => ({
        name: v.registrationNo,
        model: v.name,
        cost: v.totalOpCost,
      }));

    return NextResponse.json({
      depotName: settings?.depotName ?? "Main Logistics Hub, Mumbai",
      ratePerKm,
      kpis: {
        fuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        fleetUtilization: Math.round(fleetUtilization * 10) / 10,
        totalOperationalCost,
        avgFleetRoi: Math.round(avgFleetRoi * 10) / 10,
      },
      monthlyRevenue,
      topCostliestVehicles,
      vehicleRoiList,
    });
  } catch (error) {
    console.error("Failed to compile reports & analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
