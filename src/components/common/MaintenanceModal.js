"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { useMaintenanceContext } from "@/contexts/MaintenanceContext";

export default function MaintenanceModal() {
  const { isMaintenanceMode, lastCheckTime, retryCount, retryConnection } =
    useMaintenanceContext();
  const [isRetrying, setIsRetrying] = useState(false);
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (!lastCheckTime) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((new Date() - lastCheckTime) / 1000);
      if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      else setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastCheckTime]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryConnection();
    setTimeout(() => setIsRetrying(false), 2000);
  };

  return (
    <AnimatePresence>
      {isMaintenanceMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          style={{ margin: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl"
          >
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500" />
              <motion.div
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                  backgroundSize: "200% 200%",
                }}
              />
            </div>

            {/* Content */}
            <div className="relative p-8">
              {/* Icon */}
              <div className="mb-6 flex justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  className="rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-4 shadow-lg"
                >
                  <WifiOff className="h-12 w-12 text-white" />
                </motion.div>
              </div>

              {/* Title */}
              <h2 className="mb-3 text-center text-3xl font-bold text-white">
                Service Temporarily Unavailable
              </h2>

              {/* Description */}
              <p className="mb-6 text-center text-gray-300">
                We're experiencing connectivity issues with our services. Our team has been
                notified and is working to resolve this as quickly as possible.
              </p>

              {/* Status Info */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                  <div className="flex items-center gap-2 text-gray-300">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <span className="text-sm">Connection Status</span>
                  </div>
                  <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                    Offline
                  </span>
                </div>

                {lastCheckTime && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">Last Check</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400">{timeAgo}</span>
                  </div>
                )}

                {retryCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                    <div className="flex items-center gap-2 text-gray-300">
                      <RefreshCw className="h-4 w-4 text-purple-400" />
                      <span className="text-sm">Retry Attempts</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400">{retryCount}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <motion.div
                    animate={isRetrying ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: isRetrying ? Infinity : 0, ease: "linear" }}
                    className="flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`h-5 w-5 ${isRetrying ? "animate-spin" : ""}`} />
                    <span>{isRetrying ? "Checking Connection..." : "Retry Connection"}</span>
                  </motion.div>

                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-400">
                    Automatically retrying every 30 seconds
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-700 pt-4">
                <Wifi className="h-4 w-4 text-gray-500" />
                <p className="text-xs text-gray-500">
                  Check your internet connection or contact support if this persists
                </p>
              </div>
            </div>

            {/* Animated border */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
              }}
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
