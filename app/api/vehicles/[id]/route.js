// app/api/vehicles/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const updateVehicleSchema = z.object({
  registrationNo: z
    .string()
    .min(1, "Registration number is required")
    .transform((val) => val.trim().toUpperCase())
    .optional(),
  name: z.string().min(1, "Name/Model is required").trim().optional(),
  type: z.enum(["VAN", "TRUCK", "MINI"]).optional(),
  maxLoadCapacity: z.number().positive("Max load capacity must be greater than 0").optional(),
  odometer: z.number().nonnegative("Odometer must be non-negative").optional(),
  acquisitionCost: z.number().positive("Acquisition cost must be greater than 0").optional(),
  status: z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]).optional(),
});

// GET: fetch single vehicle
export async function GET(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertView(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Failed to fetch vehicle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: update vehicle
export async function PATCH(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEdit(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Check uniqueness if registrationNo is changing
    if (data.registrationNo && data.registrationNo !== existingVehicle.registrationNo) {
      const duplicate = await prisma.vehicle.findUnique({
        where: { registrationNo: data.registrationNo },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "REGISTRATION_NO_EXISTS", message: "Registration number already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "REGISTRATION_NO_EXISTS", message: "Registration number already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to update vehicle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: remove vehicle
export async function DELETE(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEdit(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            trips: true,
            maintenanceLogs: true,
            fuelLogs: true,
          },
        },
      },
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Check if vehicle has linked records. If it does, we shouldn't let them hard delete or we should handle it.
    // The prompt says "Implement full CRUD via GET/POST /api/vehicles and GET/PATCH/DELETE /api/vehicles/[id]".
    // If there are trips, hard delete will fail due to foreign key constraints.
    // Let's delete the vehicle. If it fails due to foreign key, return 400.
    await prisma.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Check for foreign key constraints: Prisma P2003
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: "DEPENDENCY_ERROR",
          message: "Cannot delete vehicle because it is linked to trips, fuel logs, or maintenance records.",
        },
        { status: 400 }
      );
    }
    console.error("Failed to delete vehicle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
