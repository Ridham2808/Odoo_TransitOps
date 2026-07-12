// middleware.js
// Verifies Supabase session on every protected request.
// Forwards x-user-id / x-user-role headers to route handlers.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

// Role-based page access
const ROLE_ACCESS = {
  "/fleet":       ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/drivers":     ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/trips":       ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/fuel":        ["FLEET_MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  "/maintenance": ["FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/analytics":   ["FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/settings":    ["FLEET_MANAGER"],
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes and Next.js internals
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Read Supabase session from the cookie
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role  = user.user_metadata?.role ?? "DISPATCHER";
  const name  = user.user_metadata?.name ?? user.email;
  const email = user.email;
  const id    = user.id;

  // Role guard for page routes
  if (!pathname.startsWith("/api/")) {
    const matchedRoute = Object.keys(ROLE_ACCESS).find((r) =>
      pathname.startsWith(r)
    );
    if (matchedRoute && !ROLE_ACCESS[matchedRoute].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Forward user context to route handlers
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
