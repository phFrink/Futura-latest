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
import { useRealNotifications } from "@/contexts/RealNotificationContext";
import { formatDistanceToNow } from "date-fns";
import { isEmpty } from "lodash";

const ClientNotificationBell = () => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshNotifications,
  } = useRealNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID on mount
  React.useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          console.log("🔔 ClientNotificationBell - Current User ID:", user.id);
        }
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
  }, []);

  // ADDITIONAL SAFEGUARD: Filter notifications one more time in component
  // This ensures ONLY notifications for the current user are displayed
  const filteredNotifications = React.useMemo(() => {
    if (!currentUserId) return notifications;

    const filtered = notifications.filter(notification => {
      // STRICT: Only show if recipient_id exactly matches current user
      const isMatch = notification.recipient_id === currentUserId;

      if (!isMatch) {
        console.warn(`🚨 ClientNotificationBell BLOCKED notification: "${notification.title}"`);
        console.warn(`   - recipient_id: ${notification.recipient_id || 'NULL'}`);
        console.warn(`   - expected: ${currentUserId}`);
      }

      return isMatch;
    });

    console.log(`🔔 ClientNotificationBell - Component-level filter: ${notifications.length} → ${filtered.length} notifications`);
    return filtered;
  }, [notifications, currentUserId]);

  // Recalculate unread count from filtered notifications
  const filteredUnreadCount = React.useMemo(() => {
    return filteredNotifications.filter(n => !n.read).length;
  }, [filteredNotifications]);

  // Debug logging
  React.useEffect(() => {
    console.log("🔔 ClientNotificationBell - Notifications:", filteredNotifications);
    console.log("🔔 ClientNotificationBell - Unread count:", filteredUnreadCount);
    console.log("🔔 ClientNotificationBell - Loading:", loading);
  }, [filteredNotifications, filteredUnreadCount, loading]);

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

    return (
      descriptions[notification.tableName] ||
      notification.message ||
      `You have a new notification.`
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
    e.stopPropagation(); // Prevent notification click event

    // Get the client action URL - prioritize client_action_url
    const actionUrl = notification.data?.client_action_url ||
                      notification.data?.action_url ||
                      notification.action_url;

    console.log(`🔗 Client accessing notification URL: ${actionUrl}`);

    // Clients should only navigate to client-specific routes
    if (actionUrl && !actionUrl.startsWith('/client-')) {
      console.warn(`🚫 Client attempted to access non-client route: ${actionUrl}`);
      alert(`This notification is not accessible from your account.`);
      return;
    }

    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (actionUrl) {
      setIsOpen(false); // Close the dropdown
      router.push(actionUrl); // Navigate to the URL
    }
  };

  // Check if client can view this notification's action URL
  const canViewDetails = (notification) => {
    // Prioritize client_action_url for clients
    const actionUrl = notification.data?.client_action_url ||
                      notification.data?.action_url ||
                      notification.action_url;
    if (!actionUrl) return false;
    // Clients can only access routes starting with /client-
    return actionUrl.startsWith('/client-');
  };

  const getNotificationIcon = (notification) => {
    // Use icon from database if available
    if (notification.icon) {
      return notification.icon;
    }

    // Fallback icon mapping for client notifications
    const iconMap = {
      "Service Request": "🔧",
      Complaint: "⚠️",
      Announcement: "📢",
      Payment: "💰",
      Contract: "📄",
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
      {/* Custom CSS for notification dropdown z-index priority */}
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
        {/* Bell Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
          title="Notifications"
        >
          <Bell className="w-6 h-6" />

          {/* Loading indicator */}
          {loading && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
          )}

          {/* Notification Badge */}
          {!loading && filteredUnreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            >
              {filteredUnreadCount > 99 ? "99+" : filteredUnreadCount}
            </motion.div>
          )}

          {/* Pulse animation for unread notifications */}
          {!loading && filteredUnreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          )}
        </button>

        {/* Notification Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="notification-backdrop fixed inset-0"
                onClick={() => setIsOpen(false)}
              />

              {/* Dropdown Panel */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="notification-dropdown absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200"
                style={{
                  boxShadow:
                    "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                  zIndex: 999999,
                  position: "absolute",
                  top: "100%",
                  right: 0,
                }}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bell className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          My Notifications
                        </h3>
                      </div>
                      {filteredUnreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                          {filteredUnreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Refresh Button */}
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

                      {filteredUnreadCount > 0 && (
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

                {/* Loading State */}
                {loading && (
                  <div className="px-4 py-8 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
                    <p className="text-sm text-slate-500">
                      Loading notifications...
                    </p>
                  </div>
                )}

                {/* Notifications List */}
                {!loading && (
                  <div className="max-h-96 overflow-y-auto">
                    {isEmpty(filteredNotifications) ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium mb-1">No notifications yet</p>
                        <p className="text-xs mb-3">
                          You'll receive notifications about your requests and complaints here
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredNotifications &&
                          filteredNotifications?.map((notification, index) => (
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
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                            >
                              {/* Loading overlay for individual notifications */}
                              {actionLoading === notification.id && (
                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                </div>
                              )}

                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="text-lg leading-none mt-1 flex-shrink-0">
                                  {getNotificationIcon(notification)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-slate-900 text-sm">
                                      {notification.title ||
                                        `New Update`}
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
                                    {(notification.action_url || notification.data?.action_url) && canViewDetails(notification) && (
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

                {/* Footer */}
                {!loading && filteredNotifications && filteredNotifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {filteredNotifications.length} notification
                        {filteredNotifications.length !== 1 ? "s" : ""}
                      </span>
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

export default ClientNotificationBell;
