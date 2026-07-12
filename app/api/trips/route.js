// app/api/trips/route.js
// GET  — list all trips (with vehicle + driver relations)
// POST — create a new trip (stores as DRAFT)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const createTripSchema = z.object({
  source:          z.string().min(1, "Source is required").trim(),
  destination:     z.string().min(1, "Destination is required").trim(),
  vehicleId:       z.string().min(1, "Vehicle is required"),
  driverId:        z.string().min(1, "Driver is required"),
  cargoWeight:     z.number({ invalid_type_error: "Must be a valid number" }).positive("Cargo weight must be > 0"),
  plannedDistance: z.number({ invalid_type_error: "Must be a valid number" }).positive("Planned distance must be > 0"),
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function generateTripCode() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `TRP-${ts}-${rand}`;
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { assertView(user.role, "trips"); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }); }

  try {
    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get("status"); // optional filter

    const trips = await prisma.trip.findMany({
      where:   statusFilter ? { status: statusFilter } : {},
      include: {
        vehicle: { select: { id: true, registrationNo: true, name: true, type: true, maxLoadCapacity: true, status: true } },
        driver:  { select: { id: true, name: true, licenseNumber: true, status: true, licenseExpiry: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trips);
  } catch (err) {
    console.error("[GET /api/trips]", err);
    return NextResponse.json({ error: "Failed to load trips" }, { status: 500 });
  }
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { assertEdit(user.role, "trips"); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }); }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = parsed.data;

  try {
    // Validate vehicle exists and is AVAILABLE
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    if (vehicle.status !== "AVAILABLE")
      return NextResponse.json({ error: "VEHICLE_NOT_AVAILABLE", message: "Selected vehicle is no longer available" }, { status: 409 });
    if (cargoWeight > vehicle.maxLoadCapacity)
      return NextResponse.json({
        error:   "CAPACITY_EXCEEDED",
        message: `Cargo weight (${cargoWeight} kg) exceeds vehicle capacity (${vehicle.maxLoadCapacity} kg)`,
      }, { status: 422 });

    // Validate driver exists, is AVAILABLE, and license not expired
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver)
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    if (driver.status !== "AVAILABLE")
      return NextResponse.json({ error: "DRIVER_NOT_AVAILABLE", message: "Selected driver is not available" }, { status: 409 });
    if (driver.status === "SUSPENDED")
      return NextResponse.json({ error: "DRIVER_SUSPENDED", message: "Driver is suspended" }, { status: 409 });
    if (new Date(driver.licenseExpiry) < new Date())
      return NextResponse.json({ error: "LICENSE_EXPIRED", message: "Driver's license has expired" }, { status: 409 });

    // Create the trip as DRAFT
    const trip = await prisma.trip.create({
      data: {
        tripCode: generateTripCode(),
        source,
        destination,
        vehicleId,
        driverId,
        cargoWeight,
        plannedDistance,
        status: "DRAFT",
      },
      include: {
        vehicle: { select: { id: true, registrationNo: true, name: true, type: true, maxLoadCapacity: true } },
        driver:  { select: { id: true, name: true, licenseNumber: true, status: true } },
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    console.error("[POST /api/trips]", err);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
