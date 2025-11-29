"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Admin Supabase client (uses default storage key)
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
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

const AdminNotificationContext = createContext();

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    return false;
  }
  return context;
};

export const AdminNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("initializing");

  // Load notifications from Admin API
  const loadNotifications = async () => {
    try {
      console.log("🔍 [ADMIN CONTEXT] Loading notifications from API...");

      // Get session from admin client
      const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();

      if (sessionError) {
        console.error("❌ [ADMIN CONTEXT] Error getting session:", sessionError);
        setLoading(false);
        return;
      }

      if (!session) {
        console.warn("⚠️ [ADMIN CONTEXT] No active session found");
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get current user ID and role from session
      const user = session.user;
      const userId = user?.id;
      const userRole = user?.user_metadata?.role?.toLowerCase();

      console.log("👤 [ADMIN CONTEXT] Current User Info:");
      console.log("  - User ID:", userId);
      console.log("  - User Email:", user?.email);
      console.log("  - User Role:", userRole);

      if (!userId) {
        console.error("❌ [ADMIN CONTEXT] No user ID found in session!");
        setLoading(false);
        return;
      }

      // Build query params for admin API
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (userRole) params.append("role", userRole);

      console.log("📤 [ADMIN CONTEXT] Fetching from /api/notifications/admin");
      console.log("📤 [ADMIN CONTEXT] Params:", params.toString());

      const response = await fetch(`/api/notifications/admin?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error("❌ [ADMIN CONTEXT] API returned error:", result.error);
        return;
      }

      const data = result.notifications;

      console.log("✅ [ADMIN CONTEXT] Loaded", data?.length || 0, "notifications");

      // Transform API data to component format
      const transformedNotifications = (data || []).map((notification) => ({
        id: notification.id,
        type: notification.notification_type,
        table: notification.source_table,
        tableName: notification.source_table_display_name,
        data: notification.data,
        timestamp: notification.created_at,
        read: notification.status === "read",
        action: getActionFromUrl(notification.action_url),
        action_url: notification.action_url,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        recipient_id: notification.recipient_id,
        recipient_role: notification.recipient_role,
      }));

      setNotifications(transformedNotifications);

      // Count unread notifications
      const unread = transformedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
      console.log("🔔 [ADMIN CONTEXT] Unread count:", unread);
    } catch (error) {
      console.error("❌ [ADMIN CONTEXT] Exception in loadNotifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert action URL to action text
  const getActionFromUrl = (actionUrl) => {
    if (!actionUrl) return "View Details";

    const actionMap = {
      "/properties": "View Properties",
      "/homeowners": "View Homeowners",
      "/service-requests": "View Requests",
      "/inquiries": "View Inquiries",
      "/complaints": "View Complaints",
      "/announcements": "View Announcements",
      "/reservations": "View Appointments",
      "/billing": "View Billing",
      "/transactions": "View Transactions",
      "/dashboard": "Go to Dashboard",
    };

    return actionMap[actionUrl] || "View Details";
  };

  // Check if notification is for current user (admin-specific logic)
  const isNotificationForCurrentUser = (notification, userInfo = currentUser) => {
    if (!userInfo) {
      console.warn("⚠️ [ADMIN CONTEXT] No current user set");
      return false;
    }

    const recipientRole = notification.recipient_role?.toLowerCase();
    const recipientId = notification.recipient_id;
    const userId = userInfo.id;
    const userRole = userInfo.role?.toLowerCase();

    console.log("🔍 [ADMIN CONTEXT] Checking notification visibility:");
    console.log("  - recipient_role:", recipientRole);
    console.log("  - recipient_id:", recipientId);
    console.log("  - user role:", userRole);

    // Admin/staff users can see:
    // 1. Role-based notifications (recipient_role matches)
    // 2. Broadcast notifications (recipient_role = "all")
    // 3. Notifications specifically for them (recipient_id matches)
    // 4. NEVER homeowner notifications

    // Exclude homeowner notifications
    if (recipientRole === 'homeowner' || recipientRole === 'home owner') {
      console.log("  ❌ Homeowner notification - excluded");
      return false;
    }

    // Broadcast to all staff
    if (recipientRole === "all") {
      console.log("  ✅ Broadcast notification");
      return true;
    }

    // Role matches
    if (recipientRole && recipientRole === userRole) {
      if (!recipientId || recipientId === userId) {
        console.log("  ✅ Role-based notification");
        return true;
      }
    }

    // Specific user ID matches
    if (recipientId === userId) {
      console.log("  ✅ User-specific notification");
      return true;
    }

    console.log("  ❌ Not for current user");
    return false;
  };

  // Set up real-time subscription
  useEffect(() => {
    console.log("🚀 [ADMIN CONTEXT] Setting up...");

    let notificationSubscription = null;
    let reconnectTimeout = null;
    let pollingInterval = null;

    const setupRealtimeSubscription = async () => {
      try {
        // Get current user info from session
        const { data: { session } } = await supabaseAdmin.auth.getSession();

        if (!session) {
          console.warn("⚠️ [ADMIN CONTEXT] No session for real-time subscription");
          await loadNotifications();
          return;
        }

        const user = session.user;
        const userInfo = {
          id: user.id,
          role: user.user_metadata?.role?.toLowerCase(),
        };
        setCurrentUser(userInfo);
        console.log("👤 [ADMIN CONTEXT] User set:", userInfo);

        // Initial load
        await loadNotifications();

        // Set up real-time listener
        console.log("📡 [ADMIN CONTEXT] Setting up real-time subscription...");
        notificationSubscription = supabaseAdmin
          .channel("admin_notifications_realtime", {
            config: {
              broadcast: { self: true },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications_tbl",
            },
            (payload) => {
              console.log("🆕 [ADMIN CONTEXT] New notification received:", payload);

              // Check if notification is for current user
              if (!isNotificationForCurrentUser(payload.new, userInfo)) {
                console.log("⏭️ [ADMIN CONTEXT] Skipping - not for current user");
                return;
              }

              const newNotification = {
                id: payload.new.id,
                type: payload.new.notification_type,
                table: payload.new.source_table,
                tableName: payload.new.source_table_display_name,
                data: payload.new.data,
                timestamp: payload.new.created_at,
                read: false,
                action: getActionFromUrl(payload.new.action_url),
                action_url: payload.new.action_url,
                priority: payload.new.priority,
                title: payload.new.title,
                message: payload.new.message,
                icon: payload.new.icon,
                recipient_id: payload.new.recipient_id,
                recipient_role: payload.new.recipient_role,
              };

              console.log("✅ [ADMIN CONTEXT] Adding notification:", newNotification.title);

              // Add to notifications list
              setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
              setUnreadCount((prev) => prev + 1);

              // Show browser notification if permission granted
              if (Notification.permission === "granted") {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: "/favicon.ico",
                  tag: `notification-${newNotification.id}`,
                  requireInteraction: newNotification.priority === "urgent",
                });
              }

              // Play sound for high priority notifications
              if (
                newNotification.priority === "urgent" ||
                newNotification.priority === "high"
              ) {
                try {
                  const audio = new Audio(
                    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuV2/LNeSsFJHfH8N2QQAoUXrTp66hVFA=="
                  );
                  audio.volume = 0.3;
                  audio.play().catch(() => {});
                } catch (error) {
                  // Ignore audio errors
                }
              }
            }
          )
          .subscribe((status) => {
            console.log("📡 [ADMIN CONTEXT] Subscription status:", status);
            setSubscriptionStatus(status);

            if (status === "SUBSCRIBED") {
              console.log("✅ [ADMIN CONTEXT] Real-time subscription active!");
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              console.error(`❌ [ADMIN CONTEXT] Subscription ${status}! Reconnecting...`);
              reconnectTimeout = setTimeout(() => {
                console.log("🔄 [ADMIN CONTEXT] Attempting to reconnect...");
                if (notificationSubscription) {
                  supabaseAdmin.removeChannel(notificationSubscription);
                }
                setupRealtimeSubscription();
              }, 5000);
            }
          });

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch (error) {
        console.error("❌ [ADMIN CONTEXT] Error setting up subscription:", error);
        setSubscriptionStatus("error");
      }
    };

    setupRealtimeSubscription();

    // Set up polling as fallback (every 30 seconds)
    pollingInterval = setInterval(() => {
      console.log("🔄 [ADMIN CONTEXT] Polling for new notifications...");
      loadNotifications();
    }, 30000);

    // Cleanup
    return () => {
      if (notificationSubscription) {
        supabaseAdmin.removeChannel(notificationSubscription);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Mark notification as read
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

      if (!result.success) {
        console.error("Error marking notification as read:", result.error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);

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
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Clear all notifications (mark as archived)
  const clearNotifications = async () => {
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
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    subscriptionStatus,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshNotifications: loadNotifications,
  };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  );
};

export default AdminNotificationContext;
