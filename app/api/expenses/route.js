// app/api/expenses/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const expenseSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  tripId: z.string().optional().nullable(),
  toll: z.number({ invalid_type_error: "Must be a valid number" }).nonnegative("Toll cost must be non-negative").default(0),
  other: z.number({ invalid_type_error: "Must be a valid number" }).nonnegative("Other costs must be non-negative").default(0),
  date: z.string().transform((val) => new Date(val)),
});

// GET: list all expenses
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertView(user.role, "fuel");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  try {
    const expenses = await prisma.expense.findMany({
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

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create a new expense record
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
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify vehicle exists if provided
    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
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

    const expense = await prisma.expense.create({
      data,
      include: {
        vehicle: { select: { id: true, registrationNo: true, name: true } },
        trip: { select: { id: true, tripCode: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
