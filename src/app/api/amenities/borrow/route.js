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

/**
 * PATCH /api/amenities/borrow
 * Update the status of an amenity borrow request
 */
export async function PATCH(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the request details first
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from("amenity_borrow_requests")
      .select("*, amenities(*)")
      .eq("id", id)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json(
        { success: false, error: "Borrow request not found" },
        { status: 404 }
      );
    }

    // Update the request status
    const { data, error } = await supabaseAdmin
      .from("amenity_borrow_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating request:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Update amenity availability based on status
    if (status === "approved" || status === "borrowed") {
      // Decrease available quantity
      const newAvailableQty =
        requestData.amenities.available_quantity - requestData.quantity;

      await supabaseAdmin
        .from("amenities")
        .update({ available_quantity: newAvailableQty })
        .eq("amenity_id", requestData.amenity_id);
    } else if (
      status === "returned" &&
      (requestData.status === "approved" || requestData.status === "borrowed")
    ) {
      // Increase available quantity when returned
      const newAvailableQty =
        requestData.amenities.available_quantity + requestData.quantity;

      await supabaseAdmin
        .from("amenities")
        .update({ available_quantity: newAvailableQty })
        .eq("amenity_id", requestData.amenity_id);
    } else if (
      status === "declined" &&
      (requestData.status === "approved" || requestData.status === "borrowed")
    ) {
      // Increase available quantity if previously approved/borrowed
      const newAvailableQty =
        requestData.amenities.available_quantity + requestData.quantity;

      await supabaseAdmin
        .from("amenities")
        .update({ available_quantity: newAvailableQty })
        .eq("amenity_id", requestData.amenity_id);
    }

    // Send notification to user
    if (requestData.user_id) {
      const statusMessages = {
        approved: {
          title: "Amenity Borrow Request Approved",
          message: `Your request to borrow ${requestData.amenities.name} has been approved.`,
          icon: "✅",
        },
        declined: {
          title: "Amenity Borrow Request Declined",
          message: `Your request to borrow ${requestData.amenities.name} has been declined.`,
          icon: "❌",
        },
        returned: {
          title: "Amenity Returned",
          message: `Thank you for returning ${requestData.amenities.name}.`,
          icon: "🔄",
        },
      };

      const statusInfo = statusMessages[status];

      if (statusInfo) {
        const notificationData = {
          title: statusInfo.title,
          message: statusInfo.message,
          icon: statusInfo.icon,
          priority: "high",
          recipient_role: "client",
          notification_type: "amenity_borrow_update",
          source_table: "amenity_borrow_requests",
          source_table_display_name: "Amenity Borrowing",
          source_record_id: id,
          action_url: "/client-amenities",
          data: {
            user_id: requestData.user_id,
            request_id: id,
            amenity_name: requestData.amenities.name,
            status: status,
          },
        };

        // Send notification
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notificationData),
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Borrow request ${status} successfully`,
    });
  } catch (error) {
    console.error("Error in PATCH /api/amenities/borrow:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
