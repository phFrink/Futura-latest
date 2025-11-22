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

export async function GET(request) {
  try {
    console.log("🧪 Creating test notification...");

    // Insert test notification
    const { data: notificationData, error: notificationError } =
      await supabaseAdmin
        .from("notifications_tbl")
        .insert({
          notification_type: "test",
          source_table: "test",
          source_table_display_name: "Test Notification",
          source_record_id: null,
          title: "Test Notification",
          message: `This is a test notification created at ${new Date().toLocaleString()}`,
          icon: "🧪",
          priority: "high",
          status: "unread",
          recipient_role: "admin",
          data: {
            test: true,
            created_at: new Date().toISOString(),
          },
          action_url: "/dashboard",
        })
        .select();

    if (notificationError) {
      console.error("❌ Error creating test notification:", notificationError);
      return NextResponse.json(
        {
          success: false,
          error: notificationError.message,
          details: notificationError,
        },
        { status: 500 }
      );
    }

    console.log("✅ Test notification created:", notificationData);

    return NextResponse.json(
      {
        success: true,
        message: "Test notification created successfully",
        notification: notificationData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Exception creating test notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title = "Custom Test Notification",
      message = "This is a custom test notification",
      priority = "normal",
      icon = "📢",
    } = body;

    console.log("🧪 Creating custom test notification...");

    // Insert custom test notification
    const { data: notificationData, error: notificationError } =
      await supabaseAdmin
        .from("notifications_tbl")
        .insert({
          notification_type: "test",
          source_table: "test",
          source_table_display_name: "Test Notification",
          source_record_id: null,
          title: title,
          message: message,
          icon: icon,
          priority: priority,
          status: "unread",
          recipient_role: "admin",
          data: {
            test: true,
            created_at: new Date().toISOString(),
            custom: true,
          },
          action_url: "/dashboard",
        })
        .select();

    if (notificationError) {
      console.error("❌ Error creating test notification:", notificationError);
      return NextResponse.json(
        {
          success: false,
          error: notificationError.message,
          details: notificationError,
        },
        { status: 500 }
      );
    }

    console.log("✅ Custom test notification created:", notificationData);

    return NextResponse.json(
      {
        success: true,
        message: "Custom test notification created successfully",
        notification: notificationData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Exception creating custom test notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
