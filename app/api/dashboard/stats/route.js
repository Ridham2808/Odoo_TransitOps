// app/api/dashboard/stats/route.js
// Returns KPI summary for the dashboard home page

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireView } from "@/lib/apiAuth";

export async function GET(request) {
  const guard = requireView(request, "dashboard");
  if (guard) return guard;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      openMaintenance,
      tripsToday,
      tripsThisMonth,
      recentTrips,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: { in: ["AVAILABLE", "ON_TRIP"] } } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: { in: ["AVAILABLE", "ON_TRIP"] } } }),
      prisma.maintenanceLog.count({ where: { status: "ACTIVE" } }),
      prisma.trip.count({ where: { createdAt: { gte: today } } }),
      prisma.trip.count({ where: { createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } }),
      prisma.trip.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, tripCode: true, source: true, destination: true, status: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      openMaintenance,
      tripsToday,
      tripsThisMonth,
      recentTrips,
    });
  } catch (err) {
    console.error("[/api/dashboard/stats]", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}