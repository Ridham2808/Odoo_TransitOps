// app/api/trips/[id]/dispatch/route.js
// POST — dispatch a DRAFT trip → DISPATCHED
//  Re-validates ALL constraints at the moment of dispatch (not just creation).
//  Uses a Prisma transaction so vehicle + driver status flip atomically.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertEdit } from "@/lib/permissions";

export async function POST(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { assertEdit(user.role, "trips"); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }); }

  const { id } = params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the trip row
      const trip = await tx.trip.findUnique({
        where: { id },
        include: {
          vehicle: true,
          driver:  true,
        },
      });

      if (!trip)           throw { status: 404, message: "Trip not found" };
      if (trip.status !== "DRAFT")
        throw { status: 409, message: `Trip is already ${trip.status} — cannot dispatch` };

      const { vehicle, driver } = trip;

      // 2. Re-validate vehicle at dispatch time
      if (!vehicle)
        throw { status: 422, message: "No vehicle assigned to this trip" };
      if (vehicle.status !== "AVAILABLE")
        throw { status: 409, message: `Vehicle ${vehicle.registrationNo} is no longer AVAILABLE (current status: ${vehicle.status})` };
      if (trip.cargoWeight > vehicle.maxLoadCapacity)
        throw { status: 422, message: `Cargo weight (${trip.cargoWeight} kg) exceeds vehicle capacity (${vehicle.maxLoadCapacity} kg) — dispatch blocked` };

      // 3. Re-validate driver at dispatch time
      if (!driver)
        throw { status: 422, message: "No driver assigned to this trip" };
      if (driver.status === "SUSPENDED")
        throw { status: 409, message: `Driver ${driver.name} is SUSPENDED — dispatch blocked` };
      if (driver.status !== "AVAILABLE")
        throw { status: 409, message: `Driver ${driver.name} is not AVAILABLE (current status: ${driver.status})` };
      if (new Date(driver.licenseExpiry) < new Date())
        throw { status: 409, message: `Driver ${driver.name}'s license has expired — dispatch blocked` };

      // 4. All checks pass → atomic update
      const [updatedTrip] = await Promise.all([
        tx.trip.update({
          where: { id },
          data:  { status: "DISPATCHED" },
          include: {
            vehicle: { select: { id: true, registrationNo: true, name: true, type: true, maxLoadCapacity: true, status: true } },
            driver:  { select: { id: true, name: true, licenseNumber: true, status: true } },
          },
        }),
        tx.vehicle.update({
          where: { id: vehicle.id },
          data:  { status: "ON_TRIP" },
        }),
        tx.driver.update({
          where: { id: driver.id },
          data:  { status: "ON_TRIP" },
        }),
      ]);

      return updatedTrip;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/trips/[id]/dispatch]", err);
    return NextResponse.json({ error: "Failed to dispatch trip" }, { status: 500 });
  }
}
