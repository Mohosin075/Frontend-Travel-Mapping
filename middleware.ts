import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const dashboardRoutes = ["/dashboard"];

const adminOnlyDashboardPrefixes = [
  "/dashboard/users-roles",
  "/dashboard/categories",
  "/dashboard/business",
  "/dashboard/rewards",
  "/dashboard/reviews-verification",
  "/dashboard/reports",
  "/dashboard/settings",
  "/dashboard/subscription",
  "/dashboard/notification",
];

const guestAllowedExact = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/set-password",
  "/otp-verify",
  "/reset-password",
  "/privacy-policy",
  "/terms-of-service",
  "/success",
  "/cancel",
  "/payment-failed",
  "/claim-promo",
  "/pricing",
  "/contact",
  "/how-it-works",
]);

function isAdminOnlyDashboardPath(pathname: string): boolean {
  return adminOnlyDashboardPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function safeInternalPath(pathname: string, search: string): string {
  const next = `${pathname}${search || ""}`;
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const userRole = request.cookies.get("userRole")?.value;
  const loggedInFlag = request.cookies.get("loggedIn")?.value === "1";
  const isLoggedIn = Boolean(accessToken || loggedInFlag || userRole);

  const isGuestAllowed =
    guestAllowedExact.has(pathname) ||
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname === "/details" ||
    pathname.startsWith("/details/") ||
    pathname === "/claim-promo" ||
    pathname.startsWith("/claim-promo");

  if (!isLoggedIn && !isGuestAllowed) {
    const loginRequiredFlag = request.nextUrl.searchParams.get("loginRequired") === "1";
    if (loginRequiredFlag) {
      return NextResponse.next();
    }

    const isDashboardRoute = pathname.startsWith("/dashboard");
    if (isDashboardRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", safeInternalPath(pathname, search));
      return NextResponse.redirect(loginUrl);
    }

    const targetUrl = new URL(request.url);
    targetUrl.searchParams.set("loginRequired", "1");
    targetUrl.searchParams.set("redirect", safeInternalPath(pathname, search));
    return NextResponse.redirect(targetUrl);
  }

  // If a logged-in user visits root "/", immediately redirect to /maps on the edge/server
  // (except when verifying a Stripe checkout session)
  if (pathname === "/" && isLoggedIn) {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    const loginRequiredFlag = request.nextUrl.searchParams.get("loginRequired") === "1";
    if (!sessionId && !loginRequiredFlag) {
      return NextResponse.redirect(new URL("/maps", request.url));
    }
  }

  const isDashboardRoute = dashboardRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isDashboardRoute && isLoggedIn) {
    let role = (userRole || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

    // Fallback: If userRole cookie is missing or still "user", check JWT accessToken payload
    if ((!role || role === "user") && accessToken) {
      try {
        const parts = accessToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8"),
          );
          if (payload?.role) {
            role = String(payload.role).trim().toLowerCase().replace(/[\s-]+/g, "_");
          }
        }
      } catch {
        // ignore decode errors
      }
    }

    // If map_editor is trying to access an admin-only dashboard path, redirect to main /dashboard
    if (role === "map_editor" && isAdminOnlyDashboardPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|pdf)$).*)",
  ],
};
