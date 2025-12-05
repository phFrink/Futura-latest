import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification, NotificationTemplates, isCertifiedHomeowner } from "@/lib/notification-helper";

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

// POST endpoint to reject a reservation
export async function POST(request) {
  try {
    const { reservation_id, rejected_by, reason } = await request.json();
    console.log("API: Rejecting reservation:", reservation_id);

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

    // Update reservation status to rejected
    const { data: reservation, error: updateError } = await supabaseAdmin
      .from("property_reservations")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservation_id)
      .select()
      .single();

    if (updateError) {
      console.error(" Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          message: "Failed to reject reservation: " + updateError.message,
        },
        { status: 400 }
      );
    }

    console.log("Reservation rejected successfully:", reservation_id);

    // Send rejection notification to the client if they are certified
    try {
      const isCertified = await isCertifiedHomeowner(supabaseAdmin, reservation.user_id);

      if (isCertified && reservation.user_id) {
        await createNotification(supabaseAdmin, {
          ...NotificationTemplates.RESERVATION_REJECTED({
            reservationId: reservation.reservation_id,
            trackingNumber: reservation.tracking_number,
            propertyId: reservation.property_id,
            propertyTitle: reservation.property_title,
            clientName: reservation.client_name,
            clientEmail: reservation.client_email,
            reservationFee: reservation.reservation_fee,
            status: "rejected",
            notes: reason || null,
          }),
          recipientId: reservation.user_id, // Send to specific client
          recipientRole: null, // Override role-based targeting
        });
        console.log(`Rejection notification sent to certified homeowner: ${reservation.user_id}`);
      } else {
        console.log(`User is not a certified homeowner - skipping notification: ${reservation.user_id}`);
      }
    } catch (notificationError) {
      console.error("Exception creating notification:", notificationError);
      // Don't fail the rejection if notification fails
    }

    return NextResponse.json({
      success: true,
      data: reservation,
      message: "Reservation rejected successfully!",
    });
  } catch (error) {
    console.error("Reject reservation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to reject reservation: " + error.message,
      },
      { status: 500 }
    );
  }
}
