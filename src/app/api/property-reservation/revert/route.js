import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification, NotificationTemplates } from "@/lib/notification-helper";

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

// POST endpoint to revert a reservation back to pending
export async function POST(request) {
  try {
    const { reservation_id } = await request.json();
    console.log("🔄 API: Reverting reservation to pending:", reservation_id);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!reservation_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing reservation ID",
          message: "Reservation ID is required",
        },
        { status: 400 }
      );
    }

    // Check if reservation exists and can be reverted (get full details for notification)
    const { data: existingReservation, error: fetchError } = await supabaseAdmin
      .from("property_reservations")
      .select("*")
      .eq("reservation_id", reservation_id)
      .single();

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: fetchError.message,
          message: "Failed to find reservation: " + fetchError.message,
        },
        { status: 400 }
      );
    }

    // Allow reverting both approved and rejected reservations
    if (existingReservation.status !== "approved" && existingReservation.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
          message: "Only approved or rejected reservations can be reverted to pending",
        },
        { status: 400 }
      );
    }

    // Update reservation status to pending
    const { data: reservation, error: updateError } = await supabaseAdmin
      .from("property_reservations")
      .update({
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservation_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          message: "Failed to revert reservation: " + updateError.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ Reservation reverted to pending successfully:", reservation_id);

    // Send notification to the client
    try {
      await createNotification(supabaseAdmin, {
        ...NotificationTemplates.RESERVATION_REVERTED({
          reservationId: existingReservation.reservation_id,
          trackingNumber: existingReservation.tracking_number,
          propertyId: existingReservation.property_id,
          propertyTitle: existingReservation.property_title,
          clientName: existingReservation.client_name,
          clientEmail: existingReservation.client_email,
          reservationFee: existingReservation.reservation_fee,
          status: "pending",
        }),
        recipientId: existingReservation.user_id, // Send to specific client
        recipientRole: null, // Override role-based targeting
      });
      console.log(`✅ Revert notification sent to user: ${existingReservation.user_id}`);
    } catch (notificationError) {
      console.error("❌ Exception creating notification:", notificationError);
      // Don't fail the revert if notification fails
    }

    // Delete any associated pending transactions
    const { error: deleteTransactionError } = await supabaseAdmin
      .from("reservation_transactions")
      .delete()
      .eq("reservation_id", reservation_id)
      .eq("payment_status", "pending");

    if (deleteTransactionError) {
      console.error("⚠️ Transaction deletion error:", deleteTransactionError);
      // Don't fail the revert if transaction deletion fails
      // Just log the error
    } else {
      console.log("✅ Associated pending transactions deleted");
    }

    return NextResponse.json({
      success: true,
      data: reservation,
      message: "Reservation reverted to pending successfully!",
    });
  } catch (error) {
    console.error("❌ Revert reservation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to revert reservation: " + error.message,
      },
      { status: 500 }
    );
  }
}
