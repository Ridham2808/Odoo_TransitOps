// middleware.js
// Edge-compatible auth guard + RBAC route guard.
// Reads the Supabase session from cookie (no Node.js APIs).
// Attaches x-user-* headers to every protected request.

import { NextResponse } from "next/server";

// ── Routes that never require auth ────────────────────────────────────────
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

// ── Per-route access map (role → section key from lib/permissions.js) ─────
// These must match the href prefixes used in the sidebar.
const ROUTE_SECTION = {
  "/dashboard":  "dashboard",
  "/fleet":      "fleet",
  "/drivers":    "drivers",
  "/trips":      "trips",
  "/maintenance":"maintenance",
  "/fuel-expenses": "fuel",
  "/analytics":  "analytics",
  "/settings":   "settings",
};

// ── RBAC permission matrix (copy of lib/permissions.js — edge cannot import) ─
const PERMISSIONS = {
  FLEET_MANAGER:     { dashboard:"view", fleet:"edit",  drivers:"edit",  trips:null,    fuel:null,    analytics:"edit",  settings:"view", maintenance:"edit"  },
  DISPATCHER:        { dashboard:"view", fleet:"view",  drivers:null,    trips:"edit",  fuel:null,    analytics:null,    settings:"view", maintenance:"view"  },
  SAFETY_OFFICER:    { dashboard:"view", fleet:null,    drivers:"edit",  trips:"view",  fuel:null,    analytics:null,    settings:"view", maintenance:null    },
  FINANCIAL_ANALYST: { dashboard:"view", fleet:"view",  drivers:null,    trips:null,    fuel:"edit",  analytics:"edit",  settings:"view", maintenance:"view"  },
};

function canAccess(role, section) {
  return !!(PERMISSIONS[role]?.[section]);
}

// ── Edge-safe JWT payload decoder (no crypto, just base64 decode) ──────────
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded  = base64 + "=".repeat((4 - base64.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// ── Extract Supabase session payload from cookie header ───────────────────
function getSessionPayload(cookieHeader) {
  if (!cookieHeader) return null;

  // Format 1: sb-<ref>-auth-token=<urlencoded JSON array>
  const newFmt = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (newFmt) {
    try {
      const decoded = decodeURIComponent(newFmt[1]);
      const parsed  = JSON.parse(decoded);
      const token   = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
      if (token) return decodeJwtPayload(token);
    } catch { /* fall through */ }
  }

  // Format 2: sb-access-token=<jwt>  (set by our /api/auth/login)
  const oldFmt = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  if (oldFmt) return decodeJwtPayload(decodeURIComponent(oldFmt[1]));

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // Allow public auth paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Auth check ──────────────────────────────────────────────────────────
  const cookieHeader = request.headers.get("cookie") ?? "";
  const payload      = getSessionPayload(cookieHeader);

  if (!payload?.sub) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Extract user info
  const userId = payload.sub;
  const email  = payload.email ?? "";
  const meta   = payload.user_metadata ?? {};
  const role   = meta.role ?? "";
  const name   = meta.name ?? email;

  // ── RBAC page guard ─────────────────────────────────────────────────────
  if (!pathname.startsWith("/api/")) {
    const section = Object.keys(ROUTE_SECTION).find((r) =>
      r === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(r)
    );
    if (section && role && !canAccess(role, ROUTE_SECTION[section])) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // ── Forward user context as headers to route handlers ───────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id",    userId);
  requestHeaders.set("x-user-email", email);
  requestHeaders.set("x-user-name",  name);
  requestHeaders.set("x-user-role",  role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
