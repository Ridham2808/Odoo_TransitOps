// app/api/dashboard/kpis/route.js
// Single endpoint that returns all 7 KPIs + vehicle breakdown + recent trips.
// Supports ?vehicleType=VAN|TRUCK|MINI  &region=<depot name>  filters.

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { requireView }  from "@/lib/apiAuth";

export async function GET(request) {
  const guard = requireView(request, "dashboard");
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const vehicleType = searchParams.get("vehicleType"); // VAN | TRUCK | MINI | null
  const region      = searchParams.get("region");      // depot name fragment | null

  // ── Vehicle filters ──────────────────────────────────────────────────
  const vehicleWhere = {};
  if (vehicleType && vehicleType !== "ALL") {
    vehicleWhere.type = vehicleType;
  }
  if (region && region !== "ALL") {
    vehicleWhere.region = { contains: region, mode: "insensitive" };
  }

  try {
    // Run all queries in parallel for speed
    const [
      vehicleGroups,
      tripGroups,
      driversOnDuty,
      recentTrips,
    ] = await Promise.all([
      // Group vehicles by status (with type/region filter)
      prisma.vehicle.groupBy({
        by:    ["status"],
        where: vehicleWhere,
        _count: { _all: true },
      }),

      // Group trips by status (no vehicle filter — trips are status-independent)
      prisma.trip.groupBy({
        by:    ["status"],
        _count: { _all: true },
      }),

      // Drivers who are available or on a trip
      prisma.driver.count({
        where: { status: { in: ["AVAILABLE", "ON_TRIP"] } },
      }),

      // Recent trips for the table
      prisma.trip.findMany({
        take:    6,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { registrationNo: true, type: true } },
          driver:  { select: { name: true } },
        },
      }),
    ]);

    // ── Aggregate vehicle counts ────────────────────────────────────────────
    const vehicleByStatus = Object.fromEntries(
      vehicleGroups.map((g) => [g.status, g._count._all])
    );

    const available    = vehicleByStatus["AVAILABLE"] ?? 0;
    const onTrip       = vehicleByStatus["ON_TRIP"]   ?? 0;
    const inShop       = vehicleByStatus["IN_SHOP"]   ?? 0;
    const retired      = vehicleByStatus["RETIRED"]   ?? 0;
    const totalVehicles = available + onTrip + inShop + retired;
    const activeVehicles = available + onTrip + inShop; // non-Retired

    // ── Aggregate trip counts ───────────────────────────────────────────────
    const tripByStatus = Object.fromEntries(
      tripGroups.map((g) => [g.status, g._count._all])
    );
    const activeTrips  = tripByStatus["DISPATCHED"] ?? 0;
    const pendingTrips = tripByStatus["DRAFT"]      ?? 0;

    // ── Fleet utilization ───────────────────────────────────────────────────
    const utilization = activeVehicles > 0
      ? Math.round((onTrip / activeVehicles) * 100)
      : 0;

    // ── Shape recent trips ──────────────────────────────────────────────────
    const shapedTrips = recentTrips.map((t) => {
      const distKm = t.plannedDistance ?? 0;
      const etaMin = distKm > 0 ? Math.round((distKm / 40) * 60) : null; // 40 km/h avg
      return {
        id:          t.id,
        tripCode:    t.tripCode,
        vehicle:     t.vehicle?.registrationNo ?? "—",
        vehicleType: t.vehicle?.type ?? null,
        driver:      t.driver?.name ?? "—",
        status:      t.status,
        origin:      t.source,
        destination: t.destination,
        etaMin,
      };
    });

    return NextResponse.json({
      // ── 7 KPI values ──
      activeVehicles,
      availableVehicles: available,
      inMaintenance:     inShop,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization:  utilization,

      // ── Vehicle status breakdown (for proportion bars) ──
      vehicleBreakdown: { available, onTrip, inShop, retired, total: totalVehicles },

      // ── Recent trips table ──
      recentTrips: shapedTrips,

      // ── Filter options (for dynamic region list) ──
      filters: { vehicleType, region },
    });

  } catch (err) {
    console.error("[/api/dashboard/kpis]", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data", detail: err.message },
      { status: 500 }
    );
  }
}
