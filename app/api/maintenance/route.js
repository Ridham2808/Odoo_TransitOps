// app/api/maintenance/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const createMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  serviceType: z.string().min(1, "Service type is required").trim(),
  cost: z.number({ invalid_type_error: "Must be a valid number" }).nonnegative("Cost must be non-negative"),
  date: z.string().transform((val) => new Date(val)),
  status: z.enum(["ACTIVE", "COMPLETED"]).default("ACTIVE"),
});

// GET: list all maintenance logs
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertView(user.role, "maintenance");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const logs = await prisma.maintenanceLog.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNo: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to list maintenance logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: log a service record
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertEdit(user.role, "maintenance");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createMaintenanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify vehicle exists and is not RETIRED
      const vehicle = await tx.vehicle.findUnique({
        where: { id: data.vehicleId },
      });

      if (!vehicle) {
        throw { status: 404, message: "Vehicle not found" };
      }

      if (vehicle.status === "RETIRED") {
        throw { status: 400, message: "Cannot log service record for a retired vehicle" };
      }

      // 2. Create MaintenanceLog
      const log = await tx.maintenanceLog.create({
        data,
        include: {
          vehicle: {
            select: {
              id: true,
              registrationNo: true,
              name: true,
              status: true,
            },
          },
        },
      });

      // 3. Auto vehicle status transition:
      // If status is ACTIVE -> set vehicle status to IN_SHOP
      // If status is COMPLETED -> set vehicle status to AVAILABLE (unless RETIRED)
      let nextStatus = vehicle.status;
      if (data.status === "ACTIVE") {
        nextStatus = "IN_SHOP";
      } else if (data.status === "COMPLETED" && vehicle.status !== "RETIRED") {
        nextStatus = "AVAILABLE";
      }

      if (nextStatus !== vehicle.status) {
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { status: nextStatus },
        });
      }

      return log;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to create maintenance log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
