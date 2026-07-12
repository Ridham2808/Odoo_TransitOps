// app/api/auth/login/route.js
// Server-side login: checks lockout, verifies credentials via Supabase,
// validates role match, updates failedLogins in Prisma.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const LOCKOUT_THRESHOLD = 5;          // failed attempts before lock
const LOCKOUT_MINUTES   = 15;         // lock duration in minutes

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
  role:     z.enum(["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]),
});

export async function POST(request) {
  // ── 1. Parse & validate body ──────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password, role: submittedRole } = parsed.data;

  // ── 2. Check Prisma user for lockout ─────────────────────────────────────
  let prismaUser = await prisma.user.findUnique({ where: { email } }).catch(() => null);

  if (prismaUser?.lockedUntil && new Date(prismaUser.lockedUntil) > new Date()) {
    return NextResponse.json(
      { error: "ACCOUNT_LOCKED", message: "Invalid credentials. Account locked after 5 failed attempts." },
      { status: 423 }
    );
  }

  // ── 3. Attempt Supabase auth ──────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // ── 4. Handle Supabase failure ────────────────────────────────────────────
  if (authError || !authData?.user) {
    await incrementFailedLogins(email, prismaUser);
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Invalid credentials. Account locked after 5 failed attempts." },
      { status: 401 }
    );
  }

  // ── 5. Verify role matches stored role ────────────────────────────────────
  // Treat role mismatch identically to invalid credentials — don't leak which part failed.
  const actualRole = authData.user.user_metadata?.role;
  if (actualRole !== submittedRole) {
    await incrementFailedLogins(email, prismaUser);
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Invalid credentials. Account locked after 5 failed attempts." },
      { status: 401 }
    );
  }

  // ── 6. Success — reset failed logins, sync Prisma User ───────────────────
  await prisma.user.upsert({
    where:  { email },
    update: {
      failedLogins: 0,
      lockedUntil:  null,
      name:         authData.user.user_metadata?.name ?? email,
      role:         actualRole,
    },
    create: {
      id:           authData.user.id,
      email,
      name:         authData.user.user_metadata?.name ?? email,
      passwordHash: "",   // Supabase manages the actual password
      role:         actualRole,
      failedLogins: 0,
    },
  }).catch(() => null); // non-blocking — don't fail login on Prisma write error

  // ── 7. Set Supabase session cookies on the response ───────────────────────
  const response = NextResponse.json({
    ok:   true,
    role: actualRole,
    name: authData.user.user_metadata?.name ?? email,
  });

  // Set access + refresh tokens as httpOnly cookies
  const { access_token, refresh_token, expires_in } = authData.session;

  response.cookies.set("sb-access-token", access_token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   expires_in,
    path:     "/",
  });

  response.cookies.set("sb-refresh-token", refresh_token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7,   // 7 days
    path:     "/",
  });

  return response;
}

// ── Helper: increment failed logins and lock if threshold reached ──────────
async function incrementFailedLogins(email, existingUser) {
  const current    = existingUser?.failedLogins ?? 0;
  const newCount   = current + 1;
  const shouldLock = newCount >= LOCKOUT_THRESHOLD;

  await prisma.user.upsert({
    where:  { email },
    update: {
      failedLogins: newCount,
      lockedUntil:  shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null,
    },
    create: {
      email,
      name:         email,
      passwordHash: "",
      role:         "DISPATCHER",    // placeholder — overwritten on first real login
      failedLogins: newCount,
      lockedUntil:  shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
    },
  }).catch(() => null);
}