"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  // Handle mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Refresh session to get latest state
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log("🔍 ProtectedRoute - Session check:", {
          hasSession: !!session,
          error: error?.message,
          pathname
        });

        // If no session, redirect based on current route
        if (!session || error) {
          console.log("❌ No session found, redirecting to login");
          setIsAuthorized(false);
          setIsLoading(false);
          // Use window.location for hard redirect
          window.location.href = "/login";
          return;
        }

        // Get user role
        const userRole = session.user?.user_metadata?.role?.toLowerCase();
        console.log("🔐 Protected route check:", {
          userRole,
          requiredRoles,
          pathname,
          rawRole: session.user?.user_metadata?.role,
          fullMetadata: session.user?.user_metadata
        });

        // Check if user has required role
        if (requiredRoles.length > 0) {
          const normalizedRoles = requiredRoles.map((r) => r.toLowerCase());
          console.log("🔍 Role check details:", {
            userRole,
            normalizedRoles,
            includes: normalizedRoles.includes(userRole),
            hasUserRole: !!userRole
          });

          if (!userRole || !normalizedRoles.includes(userRole)) {
            console.log("❌ Access denied - insufficient permissions", {
              reason: !userRole ? "No role found" : "Role not in allowed list",
              userRole,
              requiredRoles: normalizedRoles
            });
            router.replace("/dashboard");
            return;
          }
        }

        // User is authorized
        console.log("✅ Access granted");
        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        if (pathname === '/dashboard') {
          router.replace("/");
        } else {
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Auth state change:", event, "Has session:", !!session);

      if (event === "SIGNED_OUT" || !session) {
        console.log("🔓 User signed out, forcing redirect to login");
        setIsAuthorized(false);
        // Force hard redirect
        window.location.href = "/login";
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent hydration mismatch - don't render anything until mounted
  if (!mounted) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  return isAuthorized ? children : null;
}
