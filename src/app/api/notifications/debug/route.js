import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Function to create Supabase admin client safely
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
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

// Debug endpoint to check notification filtering
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("🔍 DEBUG: Checking notifications for userId:", userId);

    // Get ALL notifications to see what's in the database
    const { data: allNotifications, error: allError } = await supabaseAdmin
      .from("notifications_tbl")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (allError) {
      return NextResponse.json(
        { error: allError.message },
        { status: 500 }
      );
    }

    console.log(`📊 Total notifications in database: ${allNotifications.length}`);

    // Analyze the data
    const analysis = {
      total: allNotifications.length,
      withRecipientId: allNotifications.filter(n => n.recipient_id !== null).length,
      withoutRecipientId: allNotifications.filter(n => n.recipient_id === null).length,
      forThisUser: allNotifications.filter(n => n.recipient_id === userId).length,
      forAll: allNotifications.filter(n => n.recipient_role === 'all').length,
      byRole: {},
      sampleNotifications: allNotifications.slice(0, 5).map(n => ({
        id: n.id,
        title: n.title,
        recipient_id: n.recipient_id,
        recipient_role: n.recipient_role,
        created_at: n.created_at
      }))
    };

    // Count by role
    allNotifications.forEach(n => {
      const role = n.recipient_role || 'null';
      analysis.byRole[role] = (analysis.byRole[role] || 0) + 1;
    });

    console.log("📊 Analysis:", analysis);

    // Now test the actual filter query
    let testQuery = supabaseAdmin
      .from("notifications_tbl")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (userId) {
      // Apply the same filter as the main API
      testQuery = testQuery.or(`recipient_id.eq.${userId},recipient_role.eq.all`);
    }

    const { data: filteredNotifications, error: filterError } = await testQuery;

    if (filterError) {
      console.error("❌ Filter error:", filterError);
    }

    console.log(`✅ Filtered notifications: ${filteredNotifications?.length || 0}`);

    return NextResponse.json({
      success: true,
      userId: userId,
      analysis: analysis,
      allNotifications: allNotifications,
      filteredNotifications: filteredNotifications,
      filterApplied: userId ? `recipient_id.eq.${userId},recipient_role.eq.all` : 'none',
      message: userId
        ? `Found ${filteredNotifications?.length || 0} notifications for user ${userId}`
        : `Showing all ${allNotifications.length} notifications (no userId provided)`
    });

  } catch (error) {
    console.error("❌ Debug error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint to fix existing notifications
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not configured" },
        { status: 500 }
      );
    }

    const { action, userId } = await request.json();

    if (action === 'assign_to_user') {
      // Update all notifications without recipient_id to be assigned to this user
      console.log(`🔧 Assigning all NULL recipient_id notifications to user: ${userId}`);

      const { data, error } = await supabaseAdmin
        .from('notifications_tbl')
        .update({ recipient_id: userId })
        .is('recipient_id', null)
        .is('recipient_role', null)
        .select();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${data.length} notifications`,
        updated: data
      });
    }

    if (action === 'set_all_to_broadcast') {
      // Set all notifications without recipient_id/role to 'all'
      console.log(`🔧 Setting all NULL notifications to recipient_role='all'`);

      const { data, error } = await supabaseAdmin
        .from('notifications_tbl')
        .update({ recipient_role: 'all' })
        .is('recipient_id', null)
        .is('recipient_role', null)
        .select();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${data.length} notifications to broadcast`,
        updated: data
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "assign_to_user" or "set_all_to_broadcast"' },
      { status: 400 }
    );

  } catch (error) {
    console.error("❌ Fix error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
