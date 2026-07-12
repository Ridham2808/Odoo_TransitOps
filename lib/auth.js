// lib/auth.js
// Auth utilities — hybrid model:
//   • Supabase handles login/register/session (passwords, tokens, cookies)
//   • Prisma User table stores role + profile (synced on first login)
//   • JWT from Supabase session carries the role via user_metadata

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// ── Server-side: get current user from request headers ──────────────────────
// Middleware reads the Supabase session and forwards user info as headers.

/**
 * Get the authenticated user's role and id from request headers
 * (set by middleware after verifying the Supabase session).
 *
 * @param {import('next/server').NextRequest} request
 * @returns {{ id: string, email: string, name: string, role: string } | null}
 */
export function getUserFromHeaders(request) {
  const id    = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  const name  = request.headers.get("x-user-name");
  const role  = request.headers.get("x-user-role");

  if (!id || !role) return null;
  return { id, email, name, role };
}

// ── Role access helpers ──────────────────────────────────────────────────────

export const ROLES = {
  FLEET_MANAGER:    "FLEET_MANAGER",
  DISPATCHER:       "DISPATCHER",
  SAFETY_OFFICER:   "SAFETY_OFFICER",
  FINANCIAL_ANALYST:"FINANCIAL_ANALYST",
};

/**
 * Check if a role is allowed based on an allowlist.
 * @param {string} role
 * @param {string[]} allowed
 */
export function hasRole(role, allowed) {
  return allowed.includes(role);
}

/**
 * Throw a 403-compatible error if role not in allowed list.
 * Used in API handlers:  assertRole(role, ["FLEET_MANAGER", "DISPATCHER"])
 */
export function assertRole(role, allowed) {
  if (!hasRole(role, allowed)) {
    throw new RoleError("Forbidden: insufficient role");
  }
}

export class RoleError extends Error {
  constructor(message) {
    super(message);
    this.name = "RoleError";
    this.status = 403;
  }
}

// ── Sync Supabase user → Prisma User record ──────────────────────────────────

/**
 * After Supabase login, ensure a matching Prisma User row exists.
 * Role must be pre-set in Supabase user_metadata.role when the user was created.
 *
 * @param {{ id: string, email: string, user_metadata: { name?: string, role?: string } }} supabaseUser
 * @returns {Promise<import('@prisma/client').User>}
 */
export async function syncUserToPrisma(supabaseUser) {
  const role = supabaseUser.user_metadata?.role ?? "DISPATCHER";
  const name = supabaseUser.user_metadata?.name ?? supabaseUser.email;

  return prisma.user.upsert({
    where:  { id: supabaseUser.id },
    update: { name, role },
    create: {
      id:           supabaseUser.id,
      name,
      email:        supabaseUser.email,
      passwordHash: "", // Supabase manages the actual password
      role,
    },
  });
}

// ── Admin: create a user via service role (bypasses email confirmation) ──────

/**
 * Create a new user in Supabase Auth + Prisma in one call.
 * Only usable server-side with the service role key.
 *
 * @param {{ email: string, password: string, name: string, role: string }} opts
 */
export async function createUser({ email, password, name, role }) {
  const supabaseAdmin = createServerSupabaseClient();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation for hackathon
    user_metadata: { name, role },
  });

  if (error) throw new Error(error.message);

  const prismaUser = await prisma.user.upsert({
    where:  { id: data.user.id },
    update: { name, role, email },
    create: {
      id:           data.user.id,
      name,
      email,
      passwordHash: "",
      role,
    },
  });

  return prismaUser;
}

// ── Legacy bcrypt helpers (kept for seed script compatibility) ────────────────
import bcrypt from "bcryptjs";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
