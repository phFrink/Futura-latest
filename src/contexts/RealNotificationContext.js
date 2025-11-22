"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with realtime enabled
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

const RealNotificationContext = createContext();

export const useRealNotifications = () => {
  const context = useContext(RealNotificationContext);
  if (!context) {
    // throw new Error(
    //   "useRealNotifications must be used within a RealNotificationProvider"
    // );

    return false;
  }
  return context;
};

export const RealNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("initializing");

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      console.log("🔍 Loading notifications from API...");

      // Get current user ID and role
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const userRole = user?.user_metadata?.role?.toLowerCase();

      console.log("👤 Current User Info:");
      console.log("  - User ID:", userId);
      console.log("  - User Email:", user?.email);
      console.log("  - User Role:", userRole);
      console.log("  - Full user_metadata:", user?.user_metadata);
      console.log("  - Full user object:", user);

      // Build query params
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (userRole) params.append("role", userRole);

      console.log("📤 Fetching notifications with params:", params.toString());
      const response = await fetch(`/api/notifications?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error("❌ API returned error:", result.error);
        return;
      }

      const data = result.notifications;

      console.log("✅ Loaded notifications from API:", data);
      console.log("✅ Loaded notifications from API:", data?.length || 0);

      // Debug: Show what notifications were returned and for which roles
      if (data && data.length > 0) {
        console.log("📋 Notifications received:");
        data.forEach((notif, index) => {
          console.log(`  ${index + 1}. "${notif.title}"`);
          console.log(`     - recipient_role: "${notif.recipient_role}"`);
          console.log(`     - recipient_id: ${notif.recipient_id || 'null'}`);
          console.log(`     - Who can see this?`);
          console.log(`       • Admin: ${notif.recipient_role === 'admin' || notif.recipient_role === 'all' ? '✅ YES' : '❌ NO'}`);
          console.log(`       • Sales Rep: ${notif.recipient_role === 'sales representative' || notif.recipient_role === 'all' ? '✅ YES' : '❌ NO'}`);
          console.log(`       • Customer Service: ${notif.recipient_role === 'customer service' || notif.recipient_role === 'all' ? '✅ YES' : '❌ NO'}`);
          console.log(`       • Collection: ${notif.recipient_role === 'collection' || notif.recipient_role === 'all' ? '✅ YES' : '❌ NO'}`);
        });
      }

      // Transform API data to match our component format
      const transformedNotifications = (data || []).map((notification) => ({
        id: notification.id,
        type: notification.notification_type,
        table: notification.source_table,
        tableName: notification.source_table_display_name,
        data: notification.data,
        timestamp: notification.created_at,
        read: notification.status === "read",
        action: getActionFromUrl(notification.action_url),
        action_url: notification.action_url, // Keep the actual URL
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        recipient_id: notification.recipient_id,
        recipient_role: notification.recipient_role,
      }));

      // STRICT client-side filter for homeowners: ONLY show notifications where
      // recipient_id EXACTLY matches current userId (NO broadcast, NO role-based)
      let filteredNotifications = transformedNotifications;
      if (userId && userRole === 'home owner') {
        console.log('🔒 STRICT Client-side homeowner filter: ONLY showing notifications with exact recipient_id match');
        filteredNotifications = transformedNotifications.filter(notification => {
          // STRICT: Only accept if recipient_id EXACTLY matches userId
          const isExactMatch = notification.recipient_id === userId;

          if (!isExactMatch) {
            console.log(`❌ Filtered out notification: "${notification.title}" (recipient_id: ${notification.recipient_id || 'NULL'}, expected: ${userId})`);
          }

          return isExactMatch;
        });

        console.log(`✅ STRICT Filter: ${transformedNotifications.length} → ${filteredNotifications.length} notifications for user ${userId}`);
        console.log(`✅ All notifications have recipient_id = ${userId}`);
      }

      setNotifications(filteredNotifications);
      console.log("📦 Final notifications:", filteredNotifications);

      // Count unread notifications from filtered list
      const unread = filteredNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
      console.log("🔔 Unread count:", unread);
    } catch (error) {
      console.error("❌ Exception in loadNotifications:", error);
    } finally {
      setLoading(false);
      console.log("✅ Loading complete");
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

  // Check if notification is for current user
  const isNotificationForCurrentUser = (notification, userInfo = currentUser) => {
    if (!userInfo) {
      console.warn("⚠️ No current user set, skipping notification");
      return false;
    }

    const recipientRole = notification.recipient_role?.toLowerCase();
    const recipientId = notification.recipient_id;
    const userId = userInfo.id;
    const userRole = userInfo.role?.toLowerCase();

    console.log("🔍 Checking notification visibility:");
    console.log("  - Notification recipient_role:", recipientRole);
    console.log("  - Notification recipient_id:", recipientId);
    console.log("  - Current user ID:", userId);
    console.log("  - Current user role:", userRole);
    console.log("  - Notification object:", notification);

    // If specific user ID is set, check if it matches (HIGHEST PRIORITY)
    if (recipientId) {
      if (recipientId === userId) {
        console.log("  ✅ Notification is for specific user (ID match)");
        return true;
      } else {
        console.log("  ❌ Notification has recipient_id but doesn't match current user");
        return false;
      }
    }

    // If recipient_role is "all", everyone should see it
    if (recipientRole === "all") {
      console.log("  ✅ Notification is for ALL users");
      return true;
    }

    // If role matches current user's role
    if (recipientRole && recipientRole === userRole) {
      console.log("  ✅ Notification is for user's role");
      return true;
    }

    console.log("  ❌ Notification is NOT for current user");
    return false;
  };

  // Set up real-time subscription
  useEffect(() => {
    console.log("🚀 RealNotificationProvider mounted - Setting up...");

    let notificationSubscription = null;
    let reconnectTimeout = null;
    let pollingInterval = null;

    // Get current user and set up subscription
    const setupRealtimeSubscription = async () => {
      try {
        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userInfo = {
            id: user.id,
            role: user.user_metadata?.role?.toLowerCase(),
          };
          setCurrentUser(userInfo);
          console.log("👤 Current user set:", userInfo);
        }

        // Initial load
        await loadNotifications();

        // Set up real-time listener for new notifications
        console.log("📡 Setting up real-time subscription...");
        notificationSubscription = supabase
          .channel("notifications_realtime", {
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
              console.log("🆕 New notification received via realtime:", payload);

              // Check if notification is for current user BEFORE adding to state
              if (!isNotificationForCurrentUser(payload.new, userInfo)) {
                console.log("⏭️ Skipping notification - not for current user");
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
              };

              console.log("✅ Adding notification to state:", newNotification.title);

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
            console.log("📡 Subscription status:", status);
            setSubscriptionStatus(status);

            if (status === "SUBSCRIBED") {
              console.log("✅ Real-time subscription active!");
              // Clear any reconnect timeout
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              console.error(`❌ Real-time subscription ${status}! Will attempt to reconnect...`);
              // Attempt to reconnect after 5 seconds
              reconnectTimeout = setTimeout(() => {
                console.log("🔄 Attempting to reconnect...");
                if (notificationSubscription) {
                  supabase.removeChannel(notificationSubscription);
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
        console.error("❌ Error setting up realtime subscription:", error);
        setSubscriptionStatus("error");
      }
    };

    // Start the subscription
    setupRealtimeSubscription();

    // Set up polling as fallback (every 30 seconds)
    pollingInterval = setInterval(() => {
      console.log("🔄 Polling for new notifications (fallback)...");
      loadNotifications();
    }, 30000);

    // Cleanup subscription on unmount
    return () => {
      if (notificationSubscription) {
        supabase.removeChannel(notificationSubscription);
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
      // Mark all unread notifications as read
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
      // Archive all notifications
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

  // Create manual test notification (for testing purposes)
  const createTestNotification = async (type = "test") => {
    try {
      const testData = {
        property_tbl: {
          property_code: `TEST-${Date.now()}`,
          unit_number: `A${Math.floor(Math.random() * 100)}`,
          property_type: "townhouse",
        },
        homeowner_tbl: {
          full_name: `Test User ${Date.now()}`,
          email: `test${Date.now()}@example.com`,
          phone: "09123456789",
        },
        request_tbl: {
          request_type: "urgent",
          title: `Test Emergency Request ${Date.now()}`,
          priority: "urgent",
        },
        complaint_tbl: {
          complaint_type: "noise",
          subject: `Test Complaint ${Date.now()}`,
          priority: "high",
        },
      };

      const tableNames = Object.keys(testData);
      const selectedTable =
        type === "test"
          ? tableNames[Math.floor(Math.random() * tableNames.length)]
          : type;
      const data = testData[selectedTable] || testData.homeowner_tbl;

      // Call the Supabase function to create notification
      const { data: result, error } = await supabase.rpc("notifications_tbl", {
        p_source_table: selectedTable,
        p_source_table_display_name: selectedTable
          .replace("_tbl", "")
          .replace("_", " "),
        p_source_record_id: Math.floor(Math.random() * 1000),
        p_data: data,
        p_notification_type: "insert",
        p_priority: data.priority || "normal",
      });

      if (error) {
        console.error("Error creating test notification:", error);
      } else {
        console.log("✅ Test notification created:", result);
      }
    } catch (error) {
      console.error("Error creating test notification:", error);
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
    createTestNotification,
    refreshNotifications: loadNotifications,
  };

  return (
    <RealNotificationContext.Provider value={value}>
      {children}
    </RealNotificationContext.Provider>
  );
};

export default RealNotificationContext;
