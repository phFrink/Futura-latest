/**
 * Route Access Control
 * Defines which roles can access which routes
 */

// Define protected routes and their allowed roles (must match middleware.js)
export const roleBasedRoutes = {
  // Admin only routes
  "/settings": ["admin"],
  "/settings/users": ["admin"],

  // Admin and Customer Service routes
  "/homeowners": ["admin", "customer service"],
  "/staff": ["admin", "customer service"],
  "/branches": ["admin", "customer service"],
  "/homeowner-announcement": ["admin", "customer service"],

  // Admin, Customer Service, and Sales Representative routes
  "/services": ["admin", "customer service", "sales representative"],
  "/requests": ["admin", "customer service", "sales representative"],
  "/service-requests": ["admin", "customer service", "sales representative"],
  "/messages": ["admin", "customer service", "sales representative"],
  "/complaints": ["admin", "customer service", "sales representative"],
  "/announcements": ["admin", "customer service", "sales representative"],
  "/events": ["admin", "customer service", "sales representative"],
  "/payments": ["admin", "customer service", "sales representative"],
  "/inquiries": ["admin", "customer service", "sales representative"],
  "/client-inquiries": ["admin", "customer service", "sales representative"],
  "/client-reservation": ["admin", "customer service", "sales representative"],
  "/reservations": ["admin", "customer service", "sales representative"],
  "/property-reservation": ["admin", "customer service", "sales representative"],
  "/client-bookings": ["admin", "customer service", "sales representative"],
  "/properties": ["admin", "customer service", "sales representative"],
  "/properties/lot": ["admin", "customer service", "sales representative"],
  "/properties/proptype": ["admin", "customer service", "sales representative"],
  "/property-map": ["admin", "customer service", "sales representative"],

  // Collection routes
  "/billing": ["admin", "customer service", "collection"],
  "/transactions": ["admin", "customer service", "collection"],
  "/loans": ["admin", "customer service", "collection"],

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
  "/reports": [
    "admin",
    "customer service",
    "sales representative",
    "collection",
  ],
};

/**
 * Check if a user role has access to a specific route
 * @param {string} route - The route path (e.g., "/complaints")
 * @param {string} userRole - The user's role (e.g., "admin", "sales representative")
 * @returns {boolean} - True if user has access, false otherwise
 */
export function hasRouteAccess(route, userRole) {
  if (!route || !userRole) return false;

  // Normalize role to lowercase
  const normalizedRole = userRole.toLowerCase();

  // Check if route is defined in roleBasedRoutes
  for (const [routePath, allowedRoles] of Object.entries(roleBasedRoutes)) {
    // Check if the notification route starts with a defined route path
    if (route.startsWith(routePath)) {
      const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
      return normalizedAllowedRoles.includes(normalizedRole);
    }
  }

  // If route is not in roleBasedRoutes, assume it's accessible (like public routes)
  return true;
}

/**
 * Get a user-friendly message when access is denied
 * @param {string} route - The route path
 * @returns {string} - User-friendly message
 */
export function getAccessDeniedMessage(route) {
  return `You don't have permission to access this page. Please contact your administrator if you need access to ${route}.`;
}
