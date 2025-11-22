import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // This is the admin key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    const { firstName, lastName, email, password, phone, address } =
      await request.json();

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Construct full name
    const fullName = `${firstName} ${lastName}`;

    // Create user with Admin API - All data stored in user_metadata
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone || "",
          address: address || "",
          role: "home owner",
        },
      });

    if (authError) {
      console.error("Auth error:", authError);

      // Check for duplicate email
      if (
        authError.message.includes("already registered") ||
        authError.message.includes("already exists")
      ) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Insert notification into notifications_tbl for real-time display
    try {
      const { data: notificationData, error: notificationError } =
        await supabaseAdmin
          .from("notifications_tbl")
          .insert({
            notification_type: "user_registration",
            source_table: "auth.users",
            source_table_display_name: "User Registration",
            source_record_id: null, // Set to null since it expects integer but we have UUID
            title: "New User Registered",
            message: `${fullName} (${email}) has successfully registered for an account.`,
            icon: "👤",
            priority: "normal",
            status: "unread",
            recipient_role: "admin", // Notify all admins
            data: {
              user_id: authData.user.id, // Store UUID in data field instead
              email: authData.user.email,
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              phone: phone || "",
              address: address || "",
              registered_at: new Date().toISOString(),
            },
            action_url: "/settings/users",
          })
          .select();

      if (notificationError) {
        console.error("❌ Notification insert error:", notificationError);
        console.error(
          "Error details:",
          JSON.stringify(notificationError, null, 2)
        );
      } else {
        console.log("✅ Notification created successfully for:", fullName);
        console.log("Notification data:", notificationData);
      }
    } catch (notificationError) {
      console.error("❌ Exception creating notification:", notificationError);
      // Don't fail the signup if notification fails
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          user_metadata: authData.user.user_metadata,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
