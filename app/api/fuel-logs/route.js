// app/api/fuel-logs/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const fuelLogSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  tripId: z.string().optional().nullable(),
  date: z.string().transform((val) => new Date(val)),
  liters: z.number({ invalid_type_error: "Must be a valid number" }).positive("Liters must be greater than 0"),
  cost: z.number({ invalid_type_error: "Must be a valid number" }).positive("Cost must be greater than 0"),
});

// GET: list all fuel logs
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertView(user.role, "fuel");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const logs = await prisma.fuelLog.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNo: true,
            name: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripCode: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch fuel logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create a new fuel log
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertEdit(user.role, "fuel");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = fuelLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Verify trip exists if provided
    if (data.tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: data.tripId },
      });
      if (!trip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
    }

    const log = await prisma.fuelLog.create({
      data,
      include: {
        vehicle: { select: { id: true, registrationNo: true, name: true } },
        trip: { select: { id: true, tripCode: true } },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Failed to create fuel log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
