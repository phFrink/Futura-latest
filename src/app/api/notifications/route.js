import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// GET - Fetch all notifications
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";
    const status = searchParams.get("status"); // unread, read, archived
    const priority = searchParams.get("priority"); // urgent, high, normal, low
    const role = searchParams.get("role"); // Filter by recipient_role
    const userId = searchParams.get("userId"); // Filter by recipient_id

    console.log("📥 Fetching notifications...");
    console.log("🔍 User Role:", role);
    console.log("🔍 User ID:", userId);

    let query = supabaseAdmin
      .from("notifications_tbl")
      .select("*")
      .neq("status", "archived") // Exclude archived by default
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    // Filter notifications by userId (specific user) OR role (role-based)
    if (userId && role) {
      console.log(`🔍 Applying filter for userId: "${userId}" and role: "${role}"`);

      // Homeowners (clients) ONLY see notifications specifically for them OR notifications for "all"
      if (role === 'homeowner') {
        console.log(`🔒 Homeowner filter: showing only notifications assigned to them or broadcast to all`);
        // Homeowners can ONLY see:
        // 1. Notifications where recipient_id matches their userId (specifically assigned)
        // 2. Notifications with recipient_role = 'all' (broadcast to everyone)
        // This is a strict filter to prevent seeing any role-based notifications
        query = query.or(`recipient_id.eq.${userId},recipient_role.eq.all`);
      } else {
        // Admin/staff roles see notifications that are either:
        // 1. Specifically for them (recipient_id matches)
        // 2. For their role (recipient_role matches)
        // 3. For all users (recipient_role = 'all')
        const filterQuery = `recipient_id.eq.${userId},recipient_role.eq.${role},recipient_role.eq.all`;
        console.log(`🔒 Filter applied: ${filterQuery}`);
        query = query.or(filterQuery);
      }
    } else if (role) {
      console.log(`🔍 Applying filter for role only: "${role}"`);

      // All roles (including admin) only see notifications for their role or "all"
      const filterQuery = `recipient_role.eq.${role},recipient_role.eq.all`;
      console.log(`🔒 Filter applied: ${filterQuery}`);
      query = query.or(filterQuery);

      // Additional safety: exclude NULL recipient_role when no userId
      query = query.not('recipient_role', 'is', null);
    } else if (userId) {
      console.log(`🔍 Applying filter for userId only: "${userId}"`);

      // Only show notifications specifically for this user OR broadcast to all
      const filterQuery = `recipient_id.eq.${userId},recipient_role.eq.all`;
      query = query.or(filterQuery);
    } else {
      console.log("⚠️ No role or userId provided - showing all notifications");
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching notifications:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    console.log("✅ Fetched notifications:", data?.length || 0);

    // Debug: Log what notifications were returned
    if (data && data.length > 0) {
      console.log("📋 Notification recipient roles:", data.map(n => ({
        title: n.title,
        recipient_role: n.recipient_role,
        recipient_id: n.recipient_id
      })));
    }

    // Calculate counts
    const unreadCount = data?.filter((n) => n.status === "unread").length || 0;
    const totalCount = data?.length || 0;

    return NextResponse.json(
      {
        success: true,
        count: totalCount,
        unreadCount: unreadCount,
        notifications: data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Exception fetching notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Create a new notification
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      notification_type = "manual",
      source_table = "manual",
      source_table_display_name = "Manual Notification",
      source_record_id = null,
      title,
      message,
      icon = "📢",
      priority = "normal",
      status = "unread",
      recipient_role = "admin",
      data = {},
      action_url = null,
    } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and message are required",
        },
        { status: 400 }
      );
    }

    console.log("📝 Creating notification:", title);

    const { data: notificationData, error: notificationError } =
      await supabaseAdmin
        .from("notifications_tbl")
        .insert({
          notification_type,
          source_table,
          source_table_display_name,
          source_record_id,
          title,
          message,
          icon,
          priority,
          status,
          recipient_role,
          data,
          action_url,
        })
        .select();

    if (notificationError) {
      console.error("❌ Error creating notification:", notificationError);
      return NextResponse.json(
        {
          success: false,
          error: notificationError.message,
          details: notificationError,
        },
        { status: 500 }
      );
    }

    console.log("✅ Notification created:", notificationData);

    return NextResponse.json(
      {
        success: true,
        message: "Notification created successfully",
        notification: notificationData[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Exception creating notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Update notification (mark as read, etc.)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status, read_at } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Notification ID is required",
        },
        { status: 400 }
      );
    }

    console.log("🔄 Updating notification:", id);

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (read_at !== undefined) {
      updateData.read_at = read_at;
    } else if (status === "read") {
      updateData.read_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("notifications_tbl")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ Error updating notification:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    console.log("✅ Notification updated:", data);

    return NextResponse.json(
      {
        success: true,
        message: "Notification updated successfully",
        notification: data[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Exception updating notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll"); // New parameter to clear all notifications

    // Clear all notifications (admin only)
    if (clearAll === "true") {
      console.log("🗑️ Clearing ALL notifications...");

      const { error } = await supabaseAdmin
        .from("notifications_tbl")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

      if (error) {
        console.error("❌ Error clearing all notifications:", error);
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            details: error,
          },
          { status: 500 }
        );
      }

      console.log("✅ All notifications cleared successfully");

      return NextResponse.json(
        {
          success: true,
          message: "All notifications cleared successfully",
        },
        { status: 200 }
      );
    }

    // Delete single notification
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Notification ID is required",
        },
        { status: 400 }
      );
    }

    console.log("🗑️ Deleting notification:", id);

    const { data, error } = await supabaseAdmin
      .from("notifications_tbl")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("❌ Error deleting notification:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    console.log("✅ Notification deleted:", data);

    return NextResponse.json(
      {
        success: true,
        message: "Notification deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Exception deleting notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Fix existing notifications with incorrect recipient_role, or get diagnostics
// This endpoint cleans up old notifications that have recipient_role='all' when they should be role-specific
export async function PATCH(request) {
  try {
    const { action } = await request.json();

    if (action === 'fix_notification_roles') {
      console.log("🔧 Starting notification role cleanup...");

      // Fix notifications with specific titles to have correct roles
      const updates = [
        {
          titles: ['New User Registered'],
          old_role: 'all',
          new_role: 'admin',
          reason: 'User registration notifications should only go to admins'
        },
        {
          titles: ['New Property Reservation', 'New Property Inquiry'],
          old_role: 'all',
          new_role: 'sales representative',
          reason: 'Reservation and inquiry notifications should only go to sales reps'
        },
      ];

      let totalFixed = 0;

      for (const update of updates) {
        for (const title of update.titles) {
          console.log(`🔄 Updating "${title}" from role="${update.old_role}" to role="${update.new_role}"...`);

          const { data, error } = await supabaseAdmin
            .from('notifications_tbl')
            .update({ recipient_role: update.new_role })
            .eq('title', title)
            .eq('recipient_role', update.old_role)
            .select();

          if (error) {
            console.error(`❌ Error updating ${title}:`, error);
          } else {
            console.log(`✅ Updated ${data?.length || 0} notifications for "${title}"`);
            totalFixed += data?.length || 0;
          }
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: `Notification role cleanup completed! Fixed ${totalFixed} notifications.`,
          fixedCount: totalFixed,
        },
        { status: 200 }
      );
    } else if (action === 'diagnose') {
      // Get current user and check what they should see
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(
        request.headers.get('x-user-id') || ''
      );

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found. Please provide x-user-id header or pass user in body',
          },
          { status: 400 }
        );
      }

      const userId = user.id;
      const userRole = user.user_metadata?.role?.toLowerCase() || 'unknown';

      console.log(`🔍 Diagnostics for user: ${userId} (role: ${userRole})`);

      // Get all notifications for this user based on the filter
      const { data: allNotifications } = await supabaseAdmin
        .from('notifications_tbl')
        .select('id, title, recipient_role, recipient_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Count notifications by role
      const roleGroups = {};
      allNotifications?.forEach(notif => {
        const key = `role:${notif.recipient_role || 'null'}, id:${notif.recipient_id || 'null'}`;
        roleGroups[key] = (roleGroups[key] || 0) + 1;
      });

      return NextResponse.json(
        {
          success: true,
          user: { id: userId, role: userRole },
          summaryByRole: roleGroups,
          sampleNotifications: allNotifications?.slice(0, 10) || [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action provided. Use "fix_notification_roles" or "diagnose"',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Exception in PATCH handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
