"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Trash2,
  CheckCheck,
  Loader2,
  RefreshCw,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminNotifications } from "@/contexts/AdminNotificationContext";
import { useClientNotifications } from "@/contexts/ClientNotificationContext";
import { formatDistanceToNow } from "date-fns";
import { isEmpty } from "lodash";
import { createClient } from "@supabase/supabase-js";

// Admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

// Client Supabase client
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'futura-client-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

const SmartNotificationBell = () => {
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Get hooks for both contexts
  const adminContext = useAdminNotifications();
  const clientContext = useClientNotifications();

  // Determine user role on mount with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeout;

    const getUserRole = async () => {
      try {
        console.log("SmartNotificationBell - Attempting to get user role (attempt", retryCount + 1, ")");

        // Check client session first (homeowner)
        const { data: { session: clientSession }, error: clientError } = await supabaseClient.auth.getSession();

        if (clientError) {
          console.warn("SmartNotificationBell - Client session error:", clientError);
        }

        if (clientSession?.user) {
          console.log("SmartNotificationBell - Client session found");
          console.log("   - User ID:", clientSession.user.id);
          console.log("   - User Email:", clientSession.user.email);
          console.log("   - User Metadata:", clientSession.user.user_metadata);

          setUserRole('homeowner');
          setRoleLoading(false);
          console.log("SmartNotificationBell - User is CLIENT/HOMEOWNER");
          return true;
        }

        // Check admin session (staff/admin)
        const { data: { session: adminSession }, error: adminError } = await supabaseAdmin.auth.getSession();

        if (adminError) {
          console.warn("SmartNotificationBell - Admin session error:", adminError);
        }

        if (adminSession?.user) {
          console.log("SmartNotificationBell - Admin session found");
          console.log("   - User ID:", adminSession.user.id);
          console.log("   - User Email:", adminSession.user.email);
          console.log("   - User Metadata:", adminSession.user.user_metadata);

          const role = adminSession.user.user_metadata?.role?.toLowerCase();

          if (!role) {
            console.warn("SmartNotificationBell - No role found in user_metadata");
            console.log("   - Full user object:", adminSession.user);

            // Retry if no role found and we haven't exceeded max retries
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`SmartNotificationBell - Retrying in 1 second... (${retryCount}/${maxRetries})`);
              retryTimeout = setTimeout(getUserRole, 1000);
              return false;
            } else {
              console.error("SmartNotificationBell - Max retries reached, role still not found");
              // Set a default role for admin users without explicit role
              setUserRole('admin');
              setRoleLoading(false);
              return true;
            }
          }

          setUserRole(role);
          setRoleLoading(false);
          console.log("SmartNotificationBell - User role:", role);
          return true;
        }

        // No session found - retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`SmartNotificationBell - No active session found, retrying in 1 second... (${retryCount}/${maxRetries})`);
          retryTimeout = setTimeout(getUserRole, 1000);
          return false;
        } else {
          console.warn("SmartNotificationBell - Max retries reached, no session found");
          setRoleLoading(false);
          return false;
        }
      } catch (error) {
        console.error("SmartNotificationBell - Error getting user role:", error);

        // Retry on error if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`SmartNotificationBell - Retrying after error in 1 second... (${retryCount}/${maxRetries})`);
          retryTimeout = setTimeout(getUserRole, 1000);
          return false;
        }
        setRoleLoading(false);
        return false;
      }
    };

    getUserRole();

    // Cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  // Determine which context to use based on user role
  const normalizedRole = userRole?.toLowerCase().replace(/\s+/g, '');
  const isHomeowner = normalizedRole === 'homeowner';

  // Use the appropriate context
  const context = isHomeowner ? clientContext : adminContext;

  // Show loading state while detecting user role
  if (roleLoading) {
    return (
      <div className="relative p-2">
        <Bell className="w-6 h-6 text-slate-400 animate-pulse" />
      </div>
    );
  }

  // If context is not available after loading, show nothing
  if (!context || !userRole) {
    console.warn("SmartNotificationBell - No context or user role available");
    console.log("   - User Role:", userRole);
    console.log("   - Context:", context ? "Available" : "Not Available");
    return null;
  }

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshNotifications,
  } = context;

  // Debug logging
  React.useEffect(() => {
    console.log("SmartNotificationBell - User Role:", userRole);
    console.log("SmartNotificationBell - Is Homeowner:", isHomeowner);
    console.log("SmartNotificationBell - Notifications:", notifications);
    console.log("SmartNotificationBell - Unread count:", unreadCount);
  }, [userRole, isHomeowner, notifications, unreadCount]);

  const getNotificationDescription = (notification) => {
    // Use the message from the database if available
    if (notification.message) {
      return notification.message;
    }

    // Fallback to generating description from data
    if (!notification.data) {
      return `You have a new notification.`;
    }

    const data = notification.data;

    // Client-specific descriptions
    if (isHomeowner) {
      const descriptions = {
        "Service Request": `Your service request "${
          data.title || "request"
        }" has been ${data.status || "updated"}.`,
        Complaint: `Your complaint "${
          data.subject || "complaint"
        }" has been ${data.status || "updated"}.`,
        Announcement: `New announcement: "${
          data.title || "Announcement"
        }" has been published.`,
        Payment: `Payment ${
          data.amount ? "of ₱" + Number(data.amount).toLocaleString() : ""
        } has been processed.`,
        Contract: `Your contract has been ${data.status || "updated"}.`,
      };
      return descriptions[notification.tableName] || notification.message || `You have a new notification.`;
    }

    // Admin-specific descriptions
    const descriptions = {
      Property: `New property "${
        data.property_code || data.unit_number || "unit"
      }" has been added.`,
      Homeowner: `New homeowner "${
        data.full_name || "resident"
      }" has been registered.`,
      "Service Request": `${data.request_type || "Service"} request: "${
        data.title || "New request"
      }" has been submitted.`,
      Inquiry: `New inquiry from ${data.full_name || "visitor"}: "${
        data.subject || "General inquiry"
      }".`,
      Complaint: `New ${data.complaint_type || "general"} complaint: "${
        data.subject || "Complaint"
      }" has been filed.`,
      Announcement: `New announcement: "${
        data.title || "Announcement"
      }" has been published.`,
      Reservation: `New reservation for ${
        data.facility_name || "facility"
      } on ${data.reservation_date || "scheduled date"}.`,
    };

    return (
      descriptions[notification.tableName] ||
      notification.message ||
      `A new ${notification.tableName?.toLowerCase() || "item"} has been added.`
    );
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      setActionLoading(notification.id);
      await markAsRead(notification.id);
      setActionLoading(null);
    }
  };

  const handleViewDetails = async (e, notification) => {
    e.stopPropagation();

    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const actionUrl = notification.data?.client_action_url ||
                      notification.data?.action_url ||
                      notification.action_url;

    if (actionUrl) {
      setIsOpen(false);
      router.push(actionUrl);
    }
  };

  const canViewDetails = (notification) => {
    const actionUrl = notification.data?.client_action_url ||
                      notification.data?.action_url ||
                      notification.action_url;

    if (!actionUrl) return false;

    // Homeowners can only access client routes
    if (isHomeowner) {
      return actionUrl.startsWith('/client-');
    }

    // Admins can access non-client routes
    return !actionUrl.startsWith('/client-');
  };

  const getNotificationIcon = (notification) => {
    if (notification.icon) {
      return notification.icon;
    }

    const iconMap = isHomeowner ? {
      "Service Request": "🔧",
      Complaint: "⚠️",
      Announcement: "📢",
      Payment: "💰",
      Contract: "📄",
      Reservation: "📅",
    } : {
      Property: "🏠",
      Homeowner: "👥",
      "Service Request": "🔧",
      Inquiry: "❓",
      Complaint: "⚠️",
      Announcement: "📢",
      Reservation: "📅",
    };

    return iconMap[notification.tableName] || "🔔";
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading("mark-all");
    await markAllAsRead();
    setActionLoading(null);
  };

  const handleClearNotifications = async () => {
    setActionLoading("clear-all");
    await clearNotifications();
    setActionLoading(null);
  };

  const handleRefresh = async () => {
    setActionLoading("refresh");
    await refreshNotifications();
    setActionLoading(null);
  };

  return (
    <>
      <style jsx>{`
        .notification-dropdown {
          z-index: 999999 !important;
          position: absolute !important;
        }
        .notification-backdrop {
          z-index: 999998 !important;
          position: fixed !important;
        }
      `}</style>

      <div className="relative z-[100]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
          title="Notifications"
        >
          <Bell className="w-6 h-6" />

          {loading && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
          )}

          {!loading && unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.div>
          )}

          {!loading && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="notification-backdrop fixed inset-0"
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="notification-dropdown absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200"
                style={{
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                  zIndex: 999999,
                  position: "absolute",
                  top: "100%",
                  right: 0,
                }}
              >
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bell className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {isHomeowner ? "My Notifications" : "Notifications"}
                        </h3>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleRefresh}
                        disabled={actionLoading === "refresh"}
                        className="p-1 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
                        title="Refresh notifications"
                      >
                        {actionLoading === "refresh" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>

                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          disabled={actionLoading === "mark-all"}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                          title="Mark all as read"
                        >
                          {actionLoading === "mark-all" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCheck className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={handleClearNotifications}
                        disabled={actionLoading === "clear-all"}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                        title="Clear all notifications"
                      >
                        {actionLoading === "clear-all" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="px-4 py-8 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
                    <p className="text-sm text-slate-500">
                      Loading notifications...
                    </p>
                  </div>
                )}

                {!loading && (
                  <div className="max-h-96 overflow-y-auto">
                    {isEmpty(notifications) ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium mb-1">No notifications yet</p>
                        <p className="text-xs mb-3">
                          {isHomeowner
                            ? "You'll receive notifications about your requests and updates here"
                            : "Notifications will appear here when new data is added"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notification, index) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors relative ${
                              !notification.read
                                ? "bg-blue-50/50 border-l-4 border-l-blue-500"
                                : ""
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            {actionLoading === notification.id && (
                              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                              </div>
                            )}

                            <div className="flex items-start gap-3">
                              <div className="text-lg leading-none mt-1 flex-shrink-0">
                                {getNotificationIcon(notification)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    {notification.title || `New Update`}
                                  </p>
                                  {notification.priority && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        notification.priority === "urgent"
                                          ? "bg-red-100 text-red-700 border border-red-200"
                                          : notification.priority === "high"
                                          ? "bg-orange-100 text-orange-700 border border-orange-200"
                                          : notification.priority === "normal"
                                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                                          : "bg-gray-100 text-gray-700 border border-gray-200"
                                      }`}
                                    >
                                      {notification.priority}
                                    </span>
                                  )}
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                  {getNotificationDescription(notification)}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-slate-400">
                                    {formatDistanceToNow(
                                      new Date(notification.timestamp),
                                      { addSuffix: true }
                                    )}
                                  </p>
                                  {canViewDetails(notification) && (
                                    <button
                                      onClick={(e) => handleViewDetails(e, notification)}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors hover:underline"
                                    >
                                      View Details →
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!loading && notifications && notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {notifications.length} notification
                        {notifications.length !== 1 ? "s" : ""}
                      </span>
                      {isHomeowner && (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            router.push('/client-home');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Home className="w-3 h-3" />
                          Go to Home
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default SmartNotificationBell;
