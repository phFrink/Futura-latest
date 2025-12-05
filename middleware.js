import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// Define protected routes and their allowed roles
const roleBasedRoutes = {
  // Admin only routes
  "/settings": ["admin"],
  "/settings/users": ["admin"],

  // Admin and Manager routes
  "/homeowners": ["admin", "customer service"],
  "/staff": ["admin", "customer service"],
  "/branches": ["admin", "customer service"],

  // Admin, Manager, and Staff routes
  "/services": ["admin", "customer service", "sales representative"],
  "/requests": ["admin", "customer service", "sales representative"],
  "/messages": ["admin", "customer service", "sales representative"],
  "/complaints": ["admin", "customer service", "sales representative"],
  "/announcements": ["admin", "customer service", "sales representative"],
  "/homeowner-announcement": ["admin", "customer service"],
  "/events": ["admin", "customer service", "sales representative"],
  "/payments": ["admin", "customer service", "sales representative"],

  // All authenticated staff/admin users can access (homeowners use client portal)
  "/dashboard": [
    "admin",
    "customer service",
    "sales representative",
    "collection",
  ],
  "/location": [
    "admin",
    "customer service",
    "sales representative",
    "collection",
  ],
  "/profile": [
    "admin",
    "customer service",
    "sales representative",
    "collection",
  ],
};

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/client-home",
  "/client-login",
  "/client-signup",
  "/client-bookings",
  "/client-account",
  "/client-requests",
  "/client-forgot-password",
  "/client-reset-password",
  "/client-complaints",
];
export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get the pathname
  const pathname = req.nextUrl.pathname;

  console.log("Middleware checking path:", pathname, "Is public?", publicRoutes.includes(pathname));

  // Allow public routes (including all client-* routes)
  if (publicRoutes.includes(pathname) || pathname.startsWith('/client-')) {
    return res;
  }

  // Refresh session to ensure we have the latest state
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Redirect to login if not authenticated or session error
  if (!session || error) {
    // Redirect to homepage for dashboard, login for other routes
    if (pathname === "/dashboard") {
      console.log("No session found on dashboard, redirecting to homepage");
      return NextResponse.redirect(new URL("/", req.url));
    }

    console.log("No session found, redirecting to login");
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Get user role from user metadata
  const userRole = session.user?.user_metadata?.role?.toLowerCase();

  console.log(" Middleware check:", {
    pathname,
    userRole,
    userId: session.user.id,
    email: session.user.email,
    fullMetadata: session.user.user_metadata,
  });

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      const normalizedRoles = allowedRoles.map((r) => r.toLowerCase());

      if (!userRole || !normalizedRoles.includes(userRole)) {
        console.log(" Access denied:", { route, userRole, allowedRoles });

        // Redirect to dashboard with error message
        const redirectUrl = new URL("/dashboard", req.url);
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }

      console.log("Access granted:", { route, userRole });
      break;
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
