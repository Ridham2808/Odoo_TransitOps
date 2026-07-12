// app/api/settings/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertEdit } from "@/lib/permissions";
import { z } from "zod";

const settingsSchema = z.object({
  depotName: z.string().min(1, "Depot Name is required").trim(),
  currency: z.string().min(1, "Currency is required").trim(),
  distanceUnit: z.string().min(1, "Distance Unit is required").trim(),
});

// GET: fetch settings
export async function GET(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.settings.findFirst();
    return NextResponse.json(
      settings ?? {
        depotName: "Main Depot",
        currency: "INR",
        distanceUnit: "km",
        ratePerKm: 25,
      }
    );
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: update settings
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only FLEET_MANAGER can edit Settings
  if (user.role !== "FLEET_MANAGER") {
    return NextResponse.json(
      { error: "Forbidden", message: "Only the Fleet Manager can modify general settings" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if settings row exists
    const existing = await prisma.settings.findFirst();

    let settings;
    if (existing) {
      settings = await prisma.settings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          ...data,
          ratePerKm: 25, // default
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
