import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase Admin client
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase credentials");
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const supabaseAdmin = createSupabaseAdmin();

// GET - Fetch admin notifications (EXCLUDE all homeowner notifications)
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      console.error("Supabase admin client not initialized");
      return NextResponse.json(
        {
          success: true,
          count: 0,
          unreadCount: 0,
          notifications: [],
          warning: "Notification service unavailable",
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";
    const status = searchParams.get("status"); // optional: filter by status (unread, read)

    console.log("[ADMIN API] Fetching admin notifications...");
    console.log("Limit:", limit);
    console.log("Status filter:", status || "all (except archived)");

    // Simple query: Get all non-archived, non-homeowner notifications
    let query = supabaseAdmin
      .from("notifications_tbl")
      .select("*")
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    // CRITICAL: Exclude all homeowner notifications
    // This excludes any notification where recipient_role contains "home" and "owner"
    console.log("Excluding all homeowner notifications");
    query = query.not('recipient_role', 'ilike', '%home%owner%');

    // Optional: Filter by status (unread, read)
    if (status) {
      console.log(`Filtering by status: ${status}`);
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching admin notifications:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    console.log("[ADMIN API] Fetched notifications:", data?.length || 0);

    // Debug: Show what notifications were returned
    if (data && data.length > 0) {
      console.log(" Admin Notifications:");
      data.slice(0, 5).forEach((notif, index) => {
        console.log(`  ${index + 1}. "${notif.title}"`);
        console.log(`     - recipient_role: "${notif.recipient_role}"`);
        console.log(`     - recipient_id: ${notif.recipient_id || 'null'}`);
        console.log(`     - status: ${notif.status}`);
      });
      if (data.length > 5) {
        console.log(`  ... and ${data.length - 5} more notifications`);
      }
    }

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
    console.error(" Exception in admin notifications API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
