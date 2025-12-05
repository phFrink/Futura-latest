"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Create TWO Supabase clients - one for admin (default storage) and one for client (custom storage)

// Admin Supabase client (uses default 'sb-' storage key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Uses default storage key for admin
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

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

// Helper function to detect which client to use based on active session
const getActiveSupabaseClient = async () => {
  // Check client session first (homeowner)
  const { data: { session: clientSession } } = await supabaseClient.auth.getSession();
  if (clientSession) {
    console.log(" Using CLIENT Supabase client (futura-client-auth)");
    return { client: supabaseClient, userType: 'client' };
  }

  // Check admin session (default storage)
  const { data: { session: adminSession } } = await supabaseAdmin.auth.getSession();
  if (adminSession) {
    console.log(" Using ADMIN Supabase client (default storage)");
    return { client: supabaseAdmin, userType: 'admin' };
  }

  console.warn("No active session found in either client");
  return { client: null, userType: null };
};

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
      console.log("Loading notifications from API...");

      // Get the active Supabase client (admin or client)
      const { client: activeClient, userType } = await getActiveSupabaseClient();

      if (!activeClient) {
        console.warn(" No active session found - user not logged in");
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get session from the active client
      const { data: { session }, error: sessionError } = await activeClient.auth.getSession();

      if (sessionError) {
        console.error(" Error getting session:", sessionError);
        setLoading(false);
        return;
      }

      if (!session) {
        console.warn("No active session found");
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get current user ID and role from session
      const user = session.user;
      const userId = user?.id;
      const userRole = user?.user_metadata?.role?.toLowerCase();

      console.log("Current User Info (from session):");
      console.log("  - User Type:", userType);
      console.log("  - User ID:", userId);
      console.log("  - User Email:", user?.email);
      console.log("  - User Role:", userRole);
      console.log("  - Full user_metadata:", user?.user_metadata);

      if (!userId) {
        console.error(" No user ID found in session!");
        setLoading(false);
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (userRole) params.append("role", userRole);

      // Determine which API endpoint to use
      const normalizedRole = userRole?.toLowerCase().replace(/\s+/g, '');
      const apiEndpoint = normalizedRole === 'homeowner'
        ? '/api/notifications/client'  // Client API for homeowners
        : '/api/notifications/admin';   // Admin API for staff/admin

      console.log("Using API endpoint:", apiEndpoint);
      console.log("Fetching notifications with params:", params.toString());
      const response = await fetch(`${apiEndpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error("API returned error:", result.error);
        return;
      }

      const data = result.notifications;

      console.log("Loaded notifications from API:", data);
      console.log("Loaded notifications from API:", data?.length || 0);

      // Debug: Show what notifications were returned and for which roles
      if (data && data.length > 0) {
        console.log("Notifications received:");
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

      //  NO client-side filtering needed - APIs handle it!
      // - Admin API already excludes homeowner notifications
      // - Client API already filters by recipient_id
      console.log(`Received ${transformedNotifications.length} notifications from ${apiEndpoint}`);
      console.log("Final notifications (from API):", transformedNotifications);

      setNotifications(transformedNotifications);

      // Count unread notifications
      const unread = transformedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
      console.log("Unread count:", unread);
    } catch (error) {
      console.error("Exception in loadNotifications:", error);
    } finally {
      setLoading(false);
      console.log("Loading complete");
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
      console.warn("No current user set, skipping notification");
      return false;
    }

    const recipientRole = notification.recipient_role?.toLowerCase();
    const recipientId = notification.recipient_id;
    const userId = userInfo.id;
    const userRole = userInfo.role?.toLowerCase();
    const normalizedRole = userRole?.replace(/\s+/g, '');

    console.log("Checking notification visibility:");
    console.log("  - Notification recipient_role:", recipientRole);
    console.log("  - Notification recipient_id:", recipientId);
    console.log("  - Current user ID:", userId);
    console.log("  - Current user role:", userRole);
    console.log("  - Notification object:", notification);

    // STRICT FILTER for Homeowners: ONLY notifications with exact recipient_id match
    if (normalizedRole === 'homeowner') {
      console.log("STRICT Homeowner filter applied in real-time");
      // Homeowners ONLY see notifications where recipient_id EXACTLY matches
      // NO broadcast (recipient_role="all"), NO role-based notifications
      if (recipientId === userId) {
        console.log("  Notification is for specific homeowner (ID match)");
        return true;
      } else {
        console.log("   Notification is NOT for this homeowner (recipient_id mismatch or null)");
        return false;
      }
    }

    // For non-homeowner roles (admin, staff, etc.):
    // These users can see:
    // 1. Role-based notifications (recipient_id is null/not set)
    // 2. Broadcast notifications (recipient_role = "all")
    // 3. Notifications specifically for them (recipient_id matches)

    // If recipient_role is "all", staff/admin users should see it
    if (recipientRole === "all") {
      console.log("  Notification is for ALL staff users");
      return true;
    }

    // If role matches current user's role
    if (recipientRole && recipientRole === userRole) {
      // If no specific recipient_id is set (role-based notification), show it
      if (!recipientId) {
        console.log("   Notification is role-based (no recipient_id) and matches user's role");
        return true;
      }
      // If recipient_id is set, it must match the current user
      if (recipientId === userId) {
        console.log("   Notification is for specific user in matching role");
        return true;
      } else {
        console.log("   Notification has recipient_id for different user in same role");
        return false;
      }
    }

    // If specific user ID is set but role doesn't match, check if it's for this user
    if (recipientId === userId) {
      console.log("   Notification is specifically for this user (ID match)");
      return true;
    }

    console.log("  Notification is NOT for current user");
    console.log("     - recipient_role:", recipientRole, "!== user role:", userRole);
    console.log("     - recipient_id:", recipientId, "!== user ID:", userId);
    return false;
  };

  // Set up real-time subscription
  useEffect(() => {
    console.log(" RealNotificationProvider mounted - Setting up...");

    let notificationSubscription = null;
    let reconnectTimeout = null;
    let pollingInterval = null;
    let activeSupabaseClient = null; // Store the active client for cleanup

    // Get current user and set up subscription
    const setupRealtimeSubscription = async () => {
      try {
        // Get the active Supabase client (admin or client)
        const { client: activeClient, userType } = await getActiveSupabaseClient();
        activeSupabaseClient = activeClient; // Store for cleanup

        if (!activeClient) {
          console.warn("No session found for real-time subscription");
          await loadNotifications();
          return;
        }

        // Get current user info from session
        const { data: { session } } = await activeClient.auth.getSession();
        if (session?.user) {
          const user = session.user;
          const userInfo = {
            id: user.id,
            role: user.user_metadata?.role?.toLowerCase(),
            userType: userType, // 'admin' or 'client'
          };
          setCurrentUser(userInfo);
          console.log("Current user set for real-time subscription:", userInfo);
        }

        // Initial load
        await loadNotifications();

        // Set up real-time listener for new notifications
        console.log("Setting up real-time subscription using", userType, "client...");
        notificationSubscription = activeClient
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
              console.log(" New notification received via realtime:", payload);

              // Check if notification is for current user BEFORE adding to state
              if (!isNotificationForCurrentUser(payload.new, userInfo)) {
                console.log("Skipping notification - not for current user");
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

              console.log("Adding notification to state:", newNotification.title);

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
          .subscribe((statusUpdate) => {
            console.log("Subscription status:", statusUpdate);
            setSubscriptionStatus(statusUpdate);

            if (statusUpdate === "SUBSCRIBED") {
              console.log(" Real-time subscription active!");
              // Clear any reconnect timeout
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
              }
            } else if (statusUpdate === "CHANNEL_ERROR" || statusUpdate === "TIMED_OUT" || statusUpdate === "CLOSED") {
              console.error("Real-time subscription error! Status:", statusUpdate);
              // Attempt to reconnect after 5 seconds
              if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
              }
              reconnectTimeout = setTimeout(() => {
                console.log("Attempting to reconnect...");
                if (notificationSubscription && activeSupabaseClient) {
                  try {
                    activeSupabaseClient.removeChannel(notificationSubscription);
                  } catch (err) {
                    console.error("Error removing channel:", err);
                  }
                }
                setupRealtimeSubscription().catch(err => {
                  console.error("Reconnection failed:", err);
                });
              }, 5000);
            }
          });

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch (error) {
        console.error("Error setting up realtime subscription:", error);
        setSubscriptionStatus("error");
      }
    };

    // Start the subscription
    setupRealtimeSubscription();

    // Set up polling as fallback (every 30 seconds)
    pollingInterval = setInterval(() => {
      console.log("Polling for new notifications (fallback)...");
      loadNotifications();
    }, 30000);

    // Cleanup subscription on unmount
    return () => {
      if (notificationSubscription && activeSupabaseClient) {
        activeSupabaseClient.removeChannel(notificationSubscription);
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
        console.log("Test notification created:", result);
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
