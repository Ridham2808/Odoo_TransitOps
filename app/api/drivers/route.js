// app/api/drivers/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

// Zod validation schema for POST
const createDriverSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .transform((val) => val.trim().toUpperCase()),
  licenseCategory: z.enum(["LMV", "HMV"]),
  licenseExpiry: z.string().transform((val) => new Date(val)),
  contactNumber: z.string().min(1, "Contact number is required").trim(),
  safetyScore: z
    .number({ invalid_type_error: "Must be a valid integer" })
    .int()
    .min(0, "Safety score cannot be negative")
    .max(100, "Safety score cannot exceed 100")
    .default(100),
  status: z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]).default("AVAILABLE"),
});

// GET: list drivers or check licenseNumber uniqueness
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertView(user.role, "drivers");
  } catch (err) {
    try {
      assertView(user.role, "trips");
    } catch {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
  }

  const { searchParams } = request.nextUrl;

  // 1. Check uniqueness helper: ?checkUnique=XYZ&excludeId=123
  if (searchParams.has("checkUnique")) {
    const licNo = searchParams.get("checkUnique").trim().toUpperCase();
    const excludeId = searchParams.get("excludeId");

    const existing = await prisma.driver.findFirst({
      where: {
        licenseNumber: licNo,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ unique: !existing });
  }

  // 2. Normal List
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        trips: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format output with trip statistics
    const formattedDrivers = drivers.map((d) => {
      const totalTrips = d.trips.length;
      const completedTrips = d.trips.filter((t) => t.status === "COMPLETED").length;
      const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;

      const { trips, ...driverData } = d;
      return {
        ...driverData,
        totalTrips,
        completedTrips,
        completionRate,
      };
    });

    return NextResponse.json(formattedDrivers);
  } catch (error) {
    console.error("Failed to list drivers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create driver
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEdit(user.role, "drivers");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check duplicate license
    const existing = await prisma.driver.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "LICENSE_NUMBER_EXISTS", message: "License number already exists" },
        { status: 409 }
      );
    }

    const driver = await prisma.driver.create({ data });
    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "LICENSE_NUMBER_EXISTS", message: "License number already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create driver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
