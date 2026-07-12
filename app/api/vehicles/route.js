// app/api/vehicles/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

// Zod validation schema for POST
const createVehicleSchema = z.object({
  registrationNo: z
    .string()
    .min(1, "Registration number is required")
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(1, "Name/Model is required").trim(),
  type: z.enum(["VAN", "TRUCK", "MINI"]),
  maxLoadCapacity: z.number().positive("Max load capacity must be greater than 0"),
  odometer: z.number().nonnegative("Odometer must be non-negative").default(0),
  acquisitionCost: z.number().positive("Acquisition cost must be greater than 0"),
  status: z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]).default("AVAILABLE"),
});

// GET: list vehicles or check registrationNo uniqueness
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertView(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;

  // 1. Check uniqueness query helper: ?checkUnique=XYZ&excludeId=123
  if (searchParams.has("checkUnique")) {
    const regNo = searchParams.get("checkUnique").trim().toUpperCase();
    const excludeId = searchParams.get("excludeId");

    const existing = await prisma.vehicle.findFirst({
      where: {
        registrationNo: regNo,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ unique: !existing });
  }

  // 2. Normal List
  const typeFilter = searchParams.get("type"); // e.g. "VAN", "TRUCK", "MINI", "ALL"
  const statusFilter = searchParams.get("status"); // e.g. "AVAILABLE", etc
  const search = searchParams.get("search")?.trim(); // e.g. regNo search

  const where = {};

  if (typeFilter && typeFilter !== "ALL") {
    where.type = typeFilter;
  }
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }
  if (search) {
    where.registrationNo = {
      contains: search,
      mode: "insensitive",
    };
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Failed to list vehicles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create vehicle
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertEdit(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Double check uniqueness in route handler before creating to avoid P2002 where possible
    const existing = await prisma.vehicle.findUnique({
      where: { registrationNo: data.registrationNo },
    });

    if (existing) {
      return NextResponse.json(
        { error: "REGISTRATION_NO_EXISTS", message: "Registration number already exists" },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.create({ data });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    // Catch database level uniqueness constraint violation just in case
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "REGISTRATION_NO_EXISTS", message: "Registration number already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create vehicle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
