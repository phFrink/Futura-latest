"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Client Supabase client (uses 'futura-client-auth' storage key)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'futura-client-auth', // Client-specific storage key
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

const ClientNotificationContext = createContext();

export const useClientNotifications = () => {
  const context = useContext(ClientNotificationContext);
  if (!context) {
    return false;
  }
  return context;
};

export const ClientNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("initializing");

  // Load notifications from Client API
  const loadNotifications = async () => {
    try {
      console.log("🔍 [CLIENT CONTEXT] Loading notifications from API...");

      // Get session from client
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error("❌ [CLIENT CONTEXT] Error getting session:", sessionError);
        setLoading(false);
        return;
      }

      if (!session) {
        console.warn("⚠️ [CLIENT CONTEXT] No active session found");
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get current user ID from session
      const userId = session.user?.id;

      console.log("👤 [CLIENT CONTEXT] Current User Info:");
      console.log("  - User ID:", userId);
      console.log("  - User Email:", session.user?.email);

      if (!userId) {
        console.error("❌ [CLIENT CONTEXT] No user ID found in session!");
        setLoading(false);
        return;
      }

      // Build query params for client API
      const params = new URLSearchParams();
      params.append("userId", userId);

      console.log("📤 [CLIENT CONTEXT] Fetching from /api/notifications/client");
      console.log("📤 [CLIENT CONTEXT] Params:", params.toString());

      const response = await fetch(`/api/notifications/client?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error("❌ [CLIENT CONTEXT] API returned error:", result.error);
        return;
      }

      const data = result.notifications;

      console.log("✅ [CLIENT CONTEXT] Loaded", data?.length || 0, "notifications");

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
      console.log("🔔 [CLIENT CONTEXT] Unread count:", unread);
    } catch (error) {
      console.error("❌ [CLIENT CONTEXT] Exception in loadNotifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert action URL to action text
  const getActionFromUrl = (actionUrl) => {
    if (!actionUrl) return "View Details";

    const actionMap = {
      "/client-home": "Go to Home",
      "/client-service-requests": "View Requests",
      "/client-complaints": "View Complaints",
      "/client-announcements": "View Announcements",
      "/client-billing": "View Billing",
      "/client-profile": "View Profile",
    };

    return actionMap[actionUrl] || "View Details";
  };

  // Set up real-time subscription
  useEffect(() => {
    console.log("🚀 [CLIENT CONTEXT] Setting up...");

    let notificationSubscription = null;
    let reconnectTimeout = null;
    let pollingInterval = null;

    const setupRealtimeSubscription = async () => {
      try {
        // Get current user info from session
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
          console.warn("⚠️ [CLIENT CONTEXT] No session for real-time subscription");
          await loadNotifications();
          return;
        }

        const userId = session.user?.id;
        setCurrentUserId(userId);
        console.log("👤 [CLIENT CONTEXT] User ID set:", userId);

        // Initial load
        await loadNotifications();

        // Set up real-time listener
        console.log("📡 [CLIENT CONTEXT] Setting up real-time subscription...");
        notificationSubscription = supabaseClient
          .channel("client_notifications_realtime", {
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
              console.log("🆕 [CLIENT CONTEXT] New notification received:", payload);

              // STRICT filter: Only notifications where recipient_id EXACTLY matches
              if (payload.new.recipient_id !== userId) {
                console.log("⏭️ [CLIENT CONTEXT] Skipping - recipient_id doesn't match");
                console.log(`   Expected: ${userId}, Got: ${payload.new.recipient_id}`);
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

              console.log("✅ [CLIENT CONTEXT] Adding notification:", newNotification.title);

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
            console.log("📡 [CLIENT CONTEXT] Subscription status:", status);
            setSubscriptionStatus(status);

            if (status === "SUBSCRIBED") {
              console.log("✅ [CLIENT CONTEXT] Real-time subscription active!");
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              console.error(`❌ [CLIENT CONTEXT] Subscription ${status}! Reconnecting...`);
              reconnectTimeout = setTimeout(() => {
                console.log("🔄 [CLIENT CONTEXT] Attempting to reconnect...");
                if (notificationSubscription) {
                  supabaseClient.removeChannel(notificationSubscription);
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
        console.error("❌ [CLIENT CONTEXT] Error setting up subscription:", error);
        setSubscriptionStatus("error");
      }
    };

    setupRealtimeSubscription();

    // Set up polling as fallback (every 30 seconds)
    pollingInterval = setInterval(() => {
      console.log("🔄 [CLIENT CONTEXT] Polling for new notifications...");
      loadNotifications();
    }, 30000);

    // Cleanup
    return () => {
      if (notificationSubscription) {
        supabaseClient.removeChannel(notificationSubscription);
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
    <ClientNotificationContext.Provider value={value}>
      {children}
    </ClientNotificationContext.Provider>
  );
};

export default ClientNotificationContext;
