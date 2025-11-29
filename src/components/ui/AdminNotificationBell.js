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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const AdminNotificationBell = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Load notifications from admin API
  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log("🔔 Loading notifications from /api/notifications/admin");

      const response = await fetch("/api/notifications/admin?limit=50");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error("❌ API returned error:", result.error);
        return;
      }

      console.log("✅ Loaded", result.notifications?.length || 0, "notifications");
      setNotifications(result.notifications || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (error) {
      console.error("❌ Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();

    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const getNotificationDescription = (notification) => {
    // Use the message from the database if available
    if (notification.message) {
      return notification.message;
    }

    // Fallback description
    return `New notification from ${notification.source_table_display_name || "system"}`;
  };

  const getNotificationIcon = (notification) => {
    // Use icon from database if available
    if (notification.icon) {
      return notification.icon;
    }

    // Fallback icon mapping
    const iconMap = {
      Property: "🏠",
      Homeowner: "👥",
      "Service Request": "🔧",
      Inquiry: "❓",
      Complaint: "⚠️",
      Announcement: "📢",
      Reservation: "📅",
      Billing: "💳",
      Transaction: "💰",
    };
    return iconMap[notification.source_table_display_name] || "📋";
  };

  const handleNotificationClick = async (notification) => {
    if (notification.status === "unread") {
      setActionLoading(notification.id);
      await markAsRead(notification.id);
      setActionLoading(null);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: notificationId,
          status: "read",
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, status: "read" } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading("mark-all");

    try {
      const unreadNotifications = notifications.filter((n) => n.status === "unread");

      for (const notification of unreadNotifications) {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: notification.id,
            status: "read",
          }),
        });
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: "read" }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearNotifications = async () => {
    setActionLoading("clear-all");

    try {
      for (const notification of notifications) {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: notification.id,
            status: "archived",
          }),
        });
      }

      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setActionLoading("refresh");
    await loadNotifications();
    setActionLoading(null);
  };

  const handleViewDetails = (e, notification) => {
    e.stopPropagation();

    // Mark as read first
    if (notification.status === "unread") {
      markAsRead(notification.id);
    }

    // Navigate to action URL if available
    const actionUrl = notification.action_url;
    if (actionUrl) {
      setIsOpen(false);
      router.push(actionUrl);
    }
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
          {!loading && unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.div>
          )}

          {/* Pulse animation for unread notifications */}
          {!loading && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 rounded-full animate-ping opacity-75"></div>
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
                          Notifications
                        </h3>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                          {unreadCount} new
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
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium mb-1">No notifications yet</p>
                        <p className="text-xs mb-3">
                          Notifications will appear here when new data is added
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
                              notification.status === "unread"
                                ? "bg-blue-50/50 border-l-4 border-l-blue-500"
                                : ""
                            }`}
                            onClick={() => handleNotificationClick(notification)}
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
                                    {notification.title || "New Notification"}
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
                                  {notification.status === "unread" && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                  {getNotificationDescription(notification)}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-slate-400">
                                    {formatDistanceToNow(
                                      new Date(notification.created_at),
                                      { addSuffix: true }
                                    )}
                                  </p>
                                  {notification.action_url && (
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
                {!loading && notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {notifications.length} notification
                        {notifications.length !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          router.push('/notifications');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View All
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

export default AdminNotificationBell;
