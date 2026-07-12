// lib/apiAuth.js
// Helpers for API route handlers to read the authenticated user
// from the x-user-* headers injected by middleware.js.
// Also provides assertRole / assertEdit shortcuts for API guards.

import { NextResponse } from "next/server";
import { canEdit as _canEdit, canView as _canView } from "@/lib/permissions";

/**
 * Read the authenticated user from request headers.
 * Returns null if no session (middleware should have caught this,
 * but guards against direct API calls without session).
 *
 * @param {Request} request
 * @returns {{ id: string, email: string, name: string, role: string } | null}
 */
export function getRequestUser(request) {
  const id    = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  const name  = request.headers.get("x-user-name");
  const role  = request.headers.get("x-user-role");

  if (!id || !role) return null;
  return { id, email, name, role };
}

/**
 * Convenience wrapper — returns a 401 response if no user,
 * or a 403 if the user's role cannot edit the given section.
 * Returns null on success (caller continues).
 *
 * Usage:
 *   const guard = requireEdit(request, "fleet");
 *   if (guard) return guard;
 *
 * @param {Request} request
 * @param {string}  section
 * @returns {NextResponse | null}
 */
export function requireEdit(request, section) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!_canEdit(user.role, section)) {
    return NextResponse.json(
      { error: `Forbidden: ${user.role} cannot edit '${section}'` },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Require at least view access (returns 401/403 otherwise).
 */
export function requireView(request, section) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!_canView(user.role, section)) {
    return NextResponse.json(
      { error: `Forbidden: ${user.role} cannot access '${section}'` },
      { status: 403 }
    );
  }
  return null;
}
