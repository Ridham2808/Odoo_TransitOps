// app/api/notifications/license-expiry/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth";
import { sendLicenseExpirySummaryEmail } from "@/lib/mail";

// POST: Trigger license expiry summary email
export async function POST(request) {
  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Fetch Settings to get adminEmail
    const settings = await prisma.settings.findFirst();
    const adminEmail = settings?.adminEmail ?? "admin@transitops.local";

    // 2. Query drivers whose licenseExpiry is within the next 30 days (including already expired)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const expiringDrivers = await prisma.driver.findMany({
      where: {
        licenseExpiry: {
          lte: targetDate,
        },
      },
      orderBy: {
        licenseExpiry: "asc",
      },
    });

    if (expiringDrivers.length === 0) {
      return NextResponse.json({
        message: "No expiring or expired licenses found within the next 30 days.",
        sent: false,
        count: 0,
      });
    }

    // 3. Send email summary
    await sendLicenseExpirySummaryEmail({
      adminEmail,
      expiringDrivers,
    });

    // VERCEL CRON / NODE-CRON note:
    // In production, a serverless Vercel Cron Job config or a node-cron server daemon
    // would invoke this endpoint daily at 08:00 AM (e.g. GET /api/notifications/license-expiry with token auth).
    
    return NextResponse.json({
      message: `License expiry reminders sent to ${adminEmail}`,
      sent: true,
      count: expiringDrivers.length,
    });
  } catch (error) {
    console.error("Failed to send license notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
