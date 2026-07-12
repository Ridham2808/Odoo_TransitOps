// app/api/vehicles/[id]/documents/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { assertView, assertEdit } from "@/lib/permissions";
import { z } from "zod";

const documentSchema = z.object({
  type: z.string().min(1, "Document type is required").trim(),
  fileUrl: z.string().min(1, "File link is required"),
  expiryDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
});

// GET: fetch all documents of a vehicle
export async function GET(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertView(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id: vehicleId } = params;

  try {
    const docs = await prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Failed to fetch vehicle documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: upload a new document for a vehicle
export async function POST(request, { params }) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertEdit(user.role, "fleet");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const { id: vehicleId } = params;

  try {
    const body = await request.json();
    const parsed = documentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, fileUrl, expiryDate } = parsed.data;

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId,
        type,
        fileUrl,
        expiryDate,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Failed to create vehicle document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
