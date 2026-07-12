// app/api/trips/[id]/complete/route.js
// POST — complete a DISPATCHED trip
//  Body: { finalOdometer: number, fuelConsumed: number, fuelCostPerLitre?: number }
//  In a single transaction:
//    1. Sets trip to COMPLETED + records finalOdometer + fuelConsumed + completedAt
//    2. Updates vehicle's odometer
//    3. Creates a FuelLog linked to vehicle + trip
//    4. Flips vehicle + driver back to AVAILABLE

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertEdit } from "@/lib/permissions";
import { z } from "zod";

const completeSchema = z.object({
  finalOdometer: z.number({ invalid_type_error: "Must be a number" }).nonnegative("Odometer must be ≥ 0"),
  fuelConsumed:  z.number({ invalid_type_error: "Must be a number" }).nonnegative("Fuel consumed must be ≥ 0"),
  fuelCostPerLitre: z.number({ invalid_type_error: "Must be a number" }).nonnegative().default(0),
});

export async function POST(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { assertEdit(user.role, "trips"); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }); }

  const { id } = params;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { finalOdometer, fuelConsumed, fuelCostPerLitre } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the trip
      const trip = await tx.trip.findUnique({
        where: { id },
        include: { vehicle: true, driver: true },
      });

      if (!trip)                   throw { status: 404, message: "Trip not found" };
      if (trip.status !== "DISPATCHED")
        throw { status: 409, message: `Trip must be DISPATCHED to complete (current: ${trip.status})` };
      if (!trip.vehicle || !trip.driver)
        throw { status: 422, message: "Trip missing vehicle or driver assignment" };

      const totalFuelCost = fuelConsumed * fuelCostPerLitre;

      // 2. Update trip → COMPLETED
      const [updatedTrip] = await Promise.all([
        tx.trip.update({
          where: { id },
          data: {
            status:        "COMPLETED",
            finalOdometer,
            fuelConsumed,
            completedAt:   new Date(),
          },
          include: {
            vehicle: { select: { id: true, registrationNo: true, name: true, type: true, maxLoadCapacity: true, status: true } },
            driver:  { select: { id: true, name: true, licenseNumber: true, status: true } },
          },
        }),

        // 3. Update vehicle odometer + set AVAILABLE
        tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: {
            odometer: finalOdometer,
            status:   "AVAILABLE",
          },
        }),

        // 4. Flip driver back to AVAILABLE
        tx.driver.update({
          where: { id: trip.driverId },
          data:  { status: "AVAILABLE" },
        }),

        // 5. Create FuelLog entry
        tx.fuelLog.create({
          data: {
            vehicleId: trip.vehicleId,
            tripId:    id,
            date:      new Date(),
            liters:    fuelConsumed,
            cost:      totalFuelCost,
          },
        }),
      ]);

      return updatedTrip;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/trips/[id]/complete]", err);
    return NextResponse.json({ error: "Failed to complete trip" }, { status: 500 });
  }
}
