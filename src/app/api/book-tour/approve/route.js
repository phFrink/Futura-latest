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

// POST endpoint to approve appointment (Customer Service)
export async function POST(request) {
  try {
    const { appointment_id, approver_id, approval_notes } = await request.json();
    console.log("✅ API: Approving appointment:", appointment_id);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get approver role
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(approver_id);

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to verify user role",
        },
        { status: 400 }
      );
    }

    const approverRole = userData.user?.user_metadata?.role?.toLowerCase();

    console.log("✅ Approver role:", approverRole);

    // Check if user has permission to approve
    if (!['admin', 'customer service', 'sales representative'].includes(approverRole)) {
      return NextResponse.json(
        {
          success: false,
          message: `You do not have permission to approve appointments. Your role: ${approverRole}`,
        },
        { status: 403 }
      );
    }

    // Get the current appointment to check its status
    const { data: currentAppointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq('appointment_id', appointment_id)
      .single();

    if (fetchError || !currentAppointment) {
      console.error("❌ Fetch error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          message: `Appointment not found. Error: ${fetchError?.message || 'No appointment found'}`,
        },
        { status: 404 }
      );
    }

    console.log("✅ Current appointment status:", currentAppointment.status);

    let updateData = {};
    let newStatus = '';
    let successMessage = '';

    // Customer Service approval: pending -> cs_approved
    if (['admin', 'customer service'].includes(approverRole) && currentAppointment.status === 'pending') {
      updateData = {
        status: 'cs_approved',
        cs_approved_by: approver_id,
        cs_approved_at: new Date().toISOString(),
        cs_approval_notes: approval_notes || null,
        updated_at: new Date().toISOString(),
      };
      newStatus = 'pending';
      successMessage = 'Appointment approved by Customer Service. Awaiting Sales Representative approval.';
    }
    // Sales Representative approval: cs_approved -> sales_approved
    else if (['admin', 'sales representative'].includes(approverRole) && currentAppointment.status === 'cs_approved') {
      updateData = {
        status: 'sales_approved',
        sales_approved_by: approver_id,
        sales_approved_at: new Date().toISOString(),
        sales_approval_notes: approval_notes || null,
        updated_at: new Date().toISOString(),
      };
      newStatus = 'cs_approved';
      successMessage = 'Appointment fully approved by Sales Representative!';
    }
    else {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot approve appointment. Current status: ${currentAppointment.status}, Your role: ${approverRole}`,
        },
        { status: 400 }
      );
    }

    console.log("✅ Updating appointment with data:", updateData);
    console.log("✅ Matching status:", newStatus);

    // Update appointment
    const { data: appointment, error: updateError } = await supabaseAdmin
      .from("appointments")
      .update(updateData)
      .eq('appointment_id', appointment_id)
      .eq('status', newStatus)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          message: `Failed to update appointment. Error: ${updateError.message}. Status was: ${newStatus}`,
        },
        { status: 400 }
      );
    }

    if (!appointment) {
      console.error("❌ No appointment returned after update");
      return NextResponse.json(
        {
          success: false,
          message: 'Appointment not found or already processed. Expected status: ' + newStatus,
        },
        { status: 400 }
      );
    }

    console.log("✅ Appointment approved successfully", appointment);

    return NextResponse.json({
      success: true,
      data: appointment,
      message: successMessage,
    });
  } catch (error) {
    console.error("❌ Approve appointment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to approve appointment: " + error.message,
      },
      { status: 500 }
    );
  }
}
