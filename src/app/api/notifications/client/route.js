import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase Admin client
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ Missing Supabase credentials");
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

// GET - Fetch client/homeowner notifications (ONLY where recipient_id matches)
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      console.error("❌ Supabase admin client not initialized");
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
    const userId = searchParams.get("userId");

    console.log("📥 [CLIENT API] Fetching client notifications...");
    console.log("🔍 User ID:", userId);

    if (!userId) {
      console.warn("⚠️ [CLIENT API] No userId provided - returning empty");
      return NextResponse.json(
        {
          success: true,
          count: 0,
          unreadCount: 0,
          notifications: [],
          warning: "User ID required for client notifications",
        },
        { status: 200 }
      );
    }

    // STRICT FILTER for clients: ONLY notifications where recipient_id EXACTLY matches
    console.log(`🔒 [CLIENT API] STRICT filter: recipient_id = ${userId}`);

    let query = supabaseAdmin
      .from("notifications_tbl")
      .select("*")
      .eq('recipient_id', userId)  // EXACT match ONLY
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching client notifications:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ [CLIENT API] Fetched notifications:", data?.length || 0);
    console.log(`✅ All ${data?.length || 0} notifications have recipient_id = ${userId}`);

    // Debug: Show what notifications were returned
    if (data && data.length > 0) {
      console.log("📋 Client Notifications:");
      data.forEach((notif, index) => {
        console.log(`  ${index + 1}. "${notif.title}"`);
        console.log(`     - recipient_role: "${notif.recipient_role}"`);
        console.log(`     - recipient_id: ${notif.recipient_id}`);
        console.log(`     - ✅ Matches user: ${notif.recipient_id === userId}`);
      });
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
    console.error("❌ Exception in client notifications API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
