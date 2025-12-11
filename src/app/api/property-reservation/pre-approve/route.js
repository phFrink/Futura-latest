import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification, NotificationTemplates, isCertifiedHomeowner } from "@/lib/notification-helper";

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

export async function POST(request) {
  try {
    const { reservation_id, approved_by, notes } = await request.json();
    console.log("API: Pre-approving reservation:", reservation_id);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

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

    const { data: reservation, error: updateError } = await supabaseAdmin
      .from("property_reservations")
      .update({
        status: "pre-approved",
        updated_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservation_id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          message: "Failed to pre-approve reservation: " + updateError.message,
        },
        { status: 400 }
      );
    }

    console.log("Reservation pre-approved successfully:", reservation_id);

    try {
      const isCertified = await isCertifiedHomeowner(supabaseAdmin, reservation.user_id);

      if (isCertified && reservation.user_id) {
        await createNotification(supabaseAdmin, {
          message: `Your reservation for ${reservation.property_title} has been pre-approved! Please upload your supporting documents to complete the approval process.`,
          type: 'reservation_pre_approved',
          data: {
            reservationId: reservation.reservation_id,
            trackingNumber: reservation.tracking_number,
            propertyId: reservation.property_id,
            propertyTitle: reservation.property_title,
            clientName: reservation.client_name,
            clientEmail: reservation.client_email,
            reservationFee: reservation.reservation_fee,
            status: "pre-approved",
            notes: notes || null,
          },
          recipientId: reservation.user_id,
          recipientRole: null,
        });
        console.log(`Pre-approval notification sent to certified homeowner: ${reservation.user_id}`);
      } else {
        console.log(`User is not a certified homeowner - skipping notification: ${reservation.user_id}`);
      }
    } catch (notificationError) {
      console.error("Exception creating notification:", notificationError);
    }

    return NextResponse.json({
      success: true,
      data: {
        reservation,
      },
      message: "Reservation pre-approved successfully! Client can now upload supporting documents.",
    });
  } catch (error) {
    console.error("Pre-approve reservation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to pre-approve reservation: " + error.message,
      },
      { status: 500 }
    );
  }
}