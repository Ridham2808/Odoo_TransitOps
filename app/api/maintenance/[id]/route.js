// app/api/maintenance/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertEdit } from "@/lib/permissions";
import { z } from "zod";

const updateMaintenanceSchema = z.object({
  serviceType: z.string().min(1, "Service type is required").trim().optional(),
  cost: z.number({ invalid_type_error: "Must be a valid number" }).nonnegative("Cost must be non-negative").optional(),
  date: z.string().transform((val) => new Date(val)).optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});

// PATCH: update maintenance log and propagate status
export async function PATCH(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertEdit(user.role, "maintenance");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const parsed = updateMaintenanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the log
      const log = await tx.maintenanceLog.findUnique({
        where: { id },
        include: { vehicle: true },
      });

      if (!log) {
        throw { status: 404, message: "Maintenance record not found" };
      }

      // 2. Perform the log update
      const updatedLog = await tx.maintenanceLog.update({
        where: { id },
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

      // 3. Status transition logic if status has changed
      if (data.status && data.status !== log.status) {
        const vehicle = log.vehicle;

        let nextStatus = vehicle.status;
        if (data.status === "ACTIVE") {
          // If toggled to ACTIVE and vehicle is not RETIRED -> set vehicle to IN_SHOP
          if (vehicle.status !== "RETIRED") {
            nextStatus = "IN_SHOP";
          }
        } else if (data.status === "COMPLETED") {
          // If toggled to COMPLETED and vehicle is not RETIRED -> set vehicle to AVAILABLE
          if (vehicle.status !== "RETIRED") {
            nextStatus = "AVAILABLE";
          }
        }

        if (nextStatus !== vehicle.status) {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: { status: nextStatus },
          });
        }
      }

      return updatedLog;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to update maintenance log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: delete maintenance log
export async function DELETE(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertEdit(user.role, "maintenance");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id } = params;

  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    await prisma.maintenanceLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete maintenance log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
