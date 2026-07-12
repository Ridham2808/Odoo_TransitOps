// app/api/drivers/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const updateDriverSchema = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .transform((val) => val.trim().toUpperCase())
    .optional(),
  licenseCategory: z.enum(["LMV", "HMV"]).optional(),
  licenseExpiry: z.string().transform((val) => new Date(val)).optional(),
  contactNumber: z.string().min(1, "Contact number is required").trim().optional(),
  safetyScore: z
    .number({ invalid_type_error: "Must be a valid integer" })
    .int()
    .min(0, "Safety score cannot be negative")
    .max(100, "Safety score cannot exceed 100")
    .optional(),
  status: z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]).optional(),
});

// GET: fetch single driver
export async function GET(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertView(user.role, "drivers");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        trips: {
          select: { status: true },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const totalTrips = driver.trips.length;
    const completedTrips = driver.trips.filter((t) => t.status === "COMPLETED").length;
    const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;

    const { trips, ...driverData } = driver;
    return NextResponse.json({
      ...driverData,
      totalTrips,
      completedTrips,
      completionRate,
    });
  } catch (error) {
    console.error("Failed to fetch driver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: update driver
export async function PATCH(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEdit(user.role, "drivers");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const parsed = updateDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check existence
    const existingDriver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Check license number uniqueness
    if (data.licenseNumber && data.licenseNumber !== existingDriver.licenseNumber) {
      const duplicate = await prisma.driver.findUnique({
        where: { licenseNumber: data.licenseNumber },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "LICENSE_NUMBER_EXISTS", message: "License number already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.driver.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "LICENSE_NUMBER_EXISTS", message: "License number already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to update driver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: remove driver
export async function DELETE(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEdit(user.role, "drivers");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const existingDriver = await prisma.driver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    await prisma.driver.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Check foreign key dependencies (Prisma P2003)
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: "DEPENDENCY_ERROR",
          message: "Cannot delete driver because they are linked to active trips or records.",
        },
        { status: 400 }
      );
    }
    console.error("Failed to delete driver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
