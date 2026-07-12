import { NextResponse } from "next/server";
import { verifyToken, extractToken } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/api/auth/login"];

// Role-based route access control
const ROLE_ACCESS = {
  "/fleet":       ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/drivers":     ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  "/trips":       ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/fuel":        ["FLEET_MANAGER", "DISPATCHER", "FINANCIAL_ANALYST"],
  "/maintenance": ["FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/analytics":   ["FLEET_MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  "/settings":    ["FLEET_MANAGER"],
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Extract and verify token
  const token = extractToken(
    request.headers.get("authorization"),
    request.headers.get("cookie")
  );

  if (!token) {
    // API routes return 401, page routes redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("token");
    return res;
  }

  // Role-based access check for page routes
  if (!pathname.startsWith("/api/")) {
    const matchedRoute = Object.keys(ROLE_ACCESS).find((r) =>
      pathname.startsWith(r)
    );
    if (matchedRoute) {
      const allowedRoles = ROLE_ACCESS[matchedRoute];
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // Forward user info to route handlers via headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id",    payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-name",  payload.name);
  requestHeaders.set("x-user-role",  payload.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
