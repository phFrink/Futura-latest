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

// Create Supabase admin client
const supabaseAdmin = createSupabaseAdmin();

// POST endpoint to reject appointment
export async function POST(request) {
  try {
    const { appointment_id, rejector_id, rejection_reason } = await request.json();
    console.log("❌ API: Rejecting appointment:", appointment_id);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate rejection reason
    if (!rejection_reason || !rejection_reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rejection reason is required',
        },
        { status: 400 }
      );
    }

    // Get rejector role
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(rejector_id);

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify user role",
        },
        { status: 400 }
      );
    }

    const rejectorRole = userData.user?.user_metadata?.role?.toLowerCase();

    console.log("❌ Rejector role:", rejectorRole);

    // Check if user has permission to reject
    if (!['admin', 'customer service', 'sales representative'].includes(rejectorRole)) {
      return NextResponse.json(
        {
          success: false,
          message: `You do not have permission to reject appointments. Your role: ${rejectorRole}`,
        },
        { status: 403 }
      );
    }

    // Update appointment status to rejected (can reject from pending, cs_approved, or sales_approved)
    const { data: appointment, error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        status: 'rejected',
        rejected_by: rejector_id,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('appointment_id', appointment_id)
      .in('status', ['pending', 'cs_approved', 'sales_approved'])
      .select()
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          message: 'Appointment not found or already processed',
        },
        { status: 400 }
      );
    }

    console.log("✅ Appointment rejected successfully");

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Appointment has been rejected',
    });
  } catch (error) {
    console.error("❌ Reject appointment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to reject appointment: " + error.message,
      },
      { status: 500 }
    );
  }
}
