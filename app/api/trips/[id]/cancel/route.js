// app/api/trips/[id]/cancel/route.js
// POST — cancel a DRAFT or DISPATCHED trip
//  Body: { reason?: string }
//  In a transaction:
//    1. Sets trip to CANCELLED + stores cancelReason
//    2. Restores vehicle + driver to AVAILABLE only if they were ON_TRIP

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertEdit } from "@/lib/permissions";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().trim().optional(),
});

export async function POST(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { assertEdit(user.role, "trips"); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 403 }); }

  const { id } = params;

  let body = {};
  try { body = await request.json(); }
  catch { /* reason is optional */ }

  const parsed = cancelSchema.safeParse(body);
  const reason = parsed.success ? (parsed.data.reason ?? null) : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id },
        include: { vehicle: true, driver: true },
      });

      if (!trip) throw { status: 404, message: "Trip not found" };
      if (trip.status === "COMPLETED")
        throw { status: 409, message: "Completed trips cannot be cancelled" };
      if (trip.status === "CANCELLED")
        throw { status: 409, message: "Trip is already cancelled" };

      const wasDispatched = trip.status === "DISPATCHED";

      // Update trip to CANCELLED
      const updates = [
        tx.trip.update({
          where: { id },
          data: {
            status:       "CANCELLED",
            cancelReason: reason,
          },
          include: {
            vehicle: { select: { id: true, registrationNo: true, name: true, type: true, maxLoadCapacity: true, status: true } },
            driver:  { select: { id: true, name: true, licenseNumber: true, status: true } },
          },
        }),
      ];

      // Restore statuses only if they were flipped to ON_TRIP
      if (wasDispatched) {
        if (trip.vehicleId && trip.vehicle?.status === "ON_TRIP") {
          updates.push(
            tx.vehicle.update({
              where: { id: trip.vehicleId },
              data:  { status: "AVAILABLE" },
            })
          );
        }
        if (trip.driverId && trip.driver?.status === "ON_TRIP") {
          updates.push(
            tx.driver.update({
              where: { id: trip.driverId },
              data:  { status: "AVAILABLE" },
            })
          );
        }
      }

      const [updatedTrip] = await Promise.all(updates);
      return updatedTrip;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/trips/[id]/cancel]", err);
    return NextResponse.json({ error: "Failed to cancel trip" }, { status: 500 });
  }
}
