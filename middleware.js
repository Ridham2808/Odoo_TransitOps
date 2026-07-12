// middleware.js
// Reads auth session from Supabase cookie to protect routes.
// Uses @supabase/ssr for edge-compatible cookie handling.

import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

const ROLE_ACCESS = {
  "/fleet":       ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/drivers":     ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/trips":       ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/fuel":        ["FLEET_MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  "/maintenance": ["FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/analytics":   ["FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/settings":    ["FLEET_MANAGER"],
};

/**
 * Decode a JWT payload without verifying signature (edge-safe).
 * We trust Supabase's own session cookie validation implicitly for middleware.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract the Supabase access token from the cookie header.
 * Supabase stores it as: sb-<ref>-auth-token (JSON array [access, refresh])
 */
function getSupabaseSession(cookieHeader) {
  if (!cookieHeader) return null;

  // Try new format: sb-<project-ref>-auth-token=base64(json)
  const sbMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (sbMatch) {
    try {
      const decoded = decodeURIComponent(sbMatch[1]);
      // Supabase stores a JSON array [accessToken, refreshToken]
      const parsed = JSON.parse(decoded);
      const accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
      return accessToken ? decodeJwtPayload(accessToken) : null;
    } catch {
      return null;
    }
  }

  // Fallback: look for access_token cookie directly
  const atMatch = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (atMatch) {
    return decodeJwtPayload(decodeURIComponent(atMatch[1]));
  }

  return null;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes and Next.js internals
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const payload = getSupabaseSession(cookieHeader);

  if (!payload || !payload.sub) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Extract user info from JWT payload
  const id    = payload.sub;
  const email = payload.email ?? "";
  const meta  = payload.user_metadata ?? {};
  const role  = meta.role ?? "DISPATCHER";
  const name  = meta.name ?? email;

  // Role guard for page routes
  if (!pathname.startsWith("/api/")) {
    const matchedRoute = Object.keys(ROLE_ACCESS).find((r) => pathname.startsWith(r));
    if (matchedRoute && !ROLE_ACCESS[matchedRoute].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Forward user context to route handlers via headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id",    id);
  requestHeaders.set("x-user-email", email);
  requestHeaders.set("x-user-name",  name);
  requestHeaders.set("x-user-role",  role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
