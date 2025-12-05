"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const MaintenanceContext = createContext({});

export const useMaintenanceContext = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenanceContext must be used within MaintenanceProvider");
  }
  return context;
};

export function MaintenanceProvider({ children }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const supabase = createClientComponentClient();

  // Track consecutive failures - only show maintenance after 3 consecutive failures
  const consecutiveFailuresRef = useRef(0);
  const FAILURE_THRESHOLD = 3;

  const checkSupabaseHealth = useCallback(async () => {
    try {
      // Use auth session check - more reliable and doesn't require table permissions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const { error } = await supabase.auth.getSession();

      clearTimeout(timeoutId);

      // Only treat it as failure if it's a real network/connection error
      const isRealError = error && (
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('Failed to fetch') ||
        error.status >= 500
      );

      if (isRealError) {
        console.error("Supabase health check failed:", error);
        consecutiveFailuresRef.current += 1;

        // Only enter maintenance mode after threshold is reached
        if (consecutiveFailuresRef.current >= FAILURE_THRESHOLD) {
          setIsMaintenanceMode(true);
          setRetryCount((prev) => prev + 1);
        }
        return false;
      }

      // Success - reset failure counter
      consecutiveFailuresRef.current = 0;

      // If we were in maintenance mode and now it's working
      if (isMaintenanceMode) {
        setIsMaintenanceMode(false);
        setRetryCount(0);
      }

      setLastCheckTime(new Date());
      return true;
    } catch (error) {
      // Only treat as failure if it's a network error
      const isNetworkError = error.name === "AbortError" ||
                            error.message?.includes('fetch') ||
                            error.message?.includes('network');

      if (isNetworkError) {
        console.error("Supabase health check error:", error);
        consecutiveFailuresRef.current += 1;

        // Only enter maintenance mode after threshold is reached
        if (consecutiveFailuresRef.current >= FAILURE_THRESHOLD) {
          setIsMaintenanceMode(true);
          setRetryCount((prev) => prev + 1);
        }
        return false;
      }

      // For other errors, don't trigger maintenance
      consecutiveFailuresRef.current = 0;
      setLastCheckTime(new Date());
      return true;
    }
  }, [supabase, isMaintenanceMode]);

  const retryConnection = useCallback(() => {
    // Reset failure count on manual retry
    consecutiveFailuresRef.current = 0;
    checkSupabaseHealth();
  }, [checkSupabaseHealth]);

  useEffect(() => {
    // Delay initial health check by 2 seconds to allow app to initialize
    const initialCheckTimeout = setTimeout(() => {
      checkSupabaseHealth();
    }, 2000);

    // Set up periodic health checks every 30 seconds
    const intervalId = setInterval(checkSupabaseHealth, 30000);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log("Network connection restored, checking Supabase...");
      consecutiveFailuresRef.current = 0;
      checkSupabaseHealth();
    };

    const handleOffline = () => {
      console.log("Network connection lost");
      consecutiveFailuresRef.current = FAILURE_THRESHOLD; // Immediately trigger maintenance
      setIsMaintenanceMode(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkSupabaseHealth]);

  const value = {
    isMaintenanceMode,
    lastCheckTime,
    retryCount,
    retryConnection,
    checkHealth: checkSupabaseHealth,
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
}
