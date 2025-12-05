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

// POST endpoint to transfer contract ownership
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      contract_id,
      new_user_id,
      new_client_name,
      new_client_email,
      new_client_phone,
      new_client_address,
      relationship,
      transfer_reason,
      transfer_notes,
    } = body;

    console.log("API: Transferring contract:", {
      contract_id,
      new_user_id,
      new_client_name,
      new_client_email,
      relationship,
    });

    // Validate required fields
    if (
      !contract_id ||
      !new_client_name ||
      !new_client_email ||
      !relationship ||
      !transfer_reason
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Warn if new_user_id is missing
    if (!new_user_id) {
      console.warn(
        "new_user_id is missing - reservation will not be updated"
      );
    }

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
        },
        { status: 500 }
      );
    }

    // Get the current contract details
    const { data: currentContract, error: contractError } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("contract_id", contract_id)
      .single();

    if (contractError || !currentContract) {
      console.error(" Contract fetch error:", contractError);
      return NextResponse.json(
        {
          success: false,
          message: "Contract not found",
          error: contractError?.message,
        },
        { status: 404 }
      );
    }

    // Validate contract status - cannot transfer cancelled or completed contracts
    if (
      currentContract.contract_status === "cancelled" ||
      currentContract.contract_status === "completed"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot transfer a ${currentContract.contract_status} contract`,
        },
        { status: 400 }
      );
    }

    // Store original client info for history
    const original_client_info = {
      client_name: currentContract.client_name,
      client_email: currentContract.client_email,
      client_phone: currentContract.client_phone,
      client_address: currentContract.client_address,
    };

    // Update the contract with new client information
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from("property_contracts")
      .update({
        client_name: new_client_name,
        client_email: new_client_email,
        client_phone: new_client_phone,
        client_address: new_client_address,
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", contract_id)
      .select()
      .single();

    if (updateError) {
      console.error("Contract update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update contract",
          error: updateError.message,
        },
        { status: 400 }
      );
    }

    // Update the associated reservation with new user_id and client info
    if (currentContract.reservation_id && new_user_id) {
      console.log(
        `Updating reservation ${currentContract.reservation_id} with new user_id: ${new_user_id}`
      );

      const { data: updatedReservation, error: reservationError } =
        await supabaseAdmin
          .from("property_reservations")
          .update({
            user_id: new_user_id,
            client_name: new_client_name,
            client_email: new_client_email,
            client_phone: new_client_phone || currentContract.client_phone,
            client_address:
              new_client_address || currentContract.client_address,
            updated_at: new Date().toISOString(),
          })
          .eq("reservation_id", currentContract.reservation_id)
          .select()
          .single();

      if (reservationError) {
        console.error("Reservation update error:", reservationError);
        console.error("Error details:", {
          message: reservationError.message,
          code: reservationError.code,
          details: reservationError.details,
          hint: reservationError.hint,
        });
        // Log the error but don't fail the transfer if reservation update fails
        console.warn(
          "Failed to update reservation, but contract transfer succeeded"
        );
      } else {
        console.log("Reservation updated successfully");
        console.log("Updated reservation data:", updatedReservation);
      }
    } else {
      if (!currentContract.reservation_id) {
        console.log(
          "No reservation_id found in contract, skipping reservation update"
        );
      } else if (!new_user_id) {
        console.log("No new_user_id provided, skipping reservation update");
      }
    }

    // Create transfer history record in contract_transfer_history table
    // First check if table exists, if not we'll skip this step
    const { data: transferHistory, error: historyError } = await supabaseAdmin
      .from("contract_transfer_history")
      .insert({
        contract_id: contract_id,
        original_client_name: original_client_info.client_name,
        original_client_email: original_client_info.client_email,
        original_client_phone: original_client_info.client_phone,
        original_client_address: original_client_info.client_address,
        new_client_name: new_client_name,
        new_client_email: new_client_email,
        new_client_phone: new_client_phone,
        new_client_address: new_client_address,
        relationship: relationship,
        transfer_reason: transfer_reason,
        transfer_notes: transfer_notes || null,
        transferred_at: new Date().toISOString(),
      })
      .select()
      .single();

    // If the table doesn't exist, log but don't fail the transfer
    if (historyError) {
      console.warn(
        "Could not create transfer history record (table may not exist):",
        historyError.message
      );
    } else {
      console.log("Transfer history created:", transferHistory);
    }

    // Create notifications for old owner and new owner
    try {
      console.log("Looking up users for notifications...");
      console.log("Old owner email:", original_client_info.client_email);
      console.log("New owner email:", new_client_email);

      // Find the old owner's user ID by email from Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        console.error(" Error listing users from auth:", authError);
      } else {
        console.log(" Successfully listed", authUsers?.users?.length || 0, "users from auth");
      }

      const oldOwnerUser = authUsers?.users?.find(
        (user) => user.email === original_client_info.client_email
      );

      console.log("Old owner user found:", oldOwnerUser ? `Yes (ID: ${oldOwnerUser.id})` : 'No');

      // Create notification for old owner (original client)
      if (!authError && oldOwnerUser) {
        const oldOwnerNotification = {
          notification_type: "contract_transfer",
          source_table: "property_contracts",
          source_table_display_name: "Contract Transfer",
          source_record_id: contract_id,
          title: "Contract Transferred",
          message: `Your contract for ${
            currentContract.property_title || "property"
          } (Contract #${
            currentContract.contract_number
          }) has been transferred to ${new_client_name}. Relationship: ${relationship}. Reason: ${transfer_reason}`,
          icon: "🔄",
          priority: "high",
          status: "unread",
          recipient_id: oldOwnerUser.id,
          recipient_role: "home owner",
          data: {
            contract_id: contract_id,
            contract_number: currentContract.contract_number,
            property_title: currentContract.property_title,
            new_owner_name: new_client_name,
            relationship: relationship,
            transfer_reason: transfer_reason,
            action_url: "/certified-homeowner", // Admin URL
            client_action_url: "/client-contract-to-sell", // Client URL
          },
          action_url: "/certified-homeowner",
        };

        console.log("Attempting to create notification for old owner:", oldOwnerNotification);

        const { data: oldOwnerNotifData, error: oldOwnerNotifError } = await supabaseAdmin
          .from("notifications_tbl")
          .insert(oldOwnerNotification)
          .select();

        if (oldOwnerNotifError) {
          console.error(
            "Could not create notification for old owner:",
            oldOwnerNotifError
          );
          console.error(" Full error details:", {
            message: oldOwnerNotifError.message,
            details: oldOwnerNotifError.details,
            hint: oldOwnerNotifError.hint,
            code: oldOwnerNotifError.code,
          });
        } else {
          console.log(
            "Notification sent to old owner:",
            original_client_info.client_email,
            "Notification ID:", oldOwnerNotifData?.[0]?.id
          );
        }
      } else {
        console.warn(
          " Could not find old owner user account:",
          original_client_info.client_email,
          "Error:", authError?.message
        );
      }

      // Create notification for new owner
      if (new_user_id) {
        console.log(" Using provided new_user_id:", new_user_id);
        const newOwnerNotification = {
          notification_type: "contract_transfer",
          source_table: "property_contracts",
          source_table_display_name: "Contract Transfer",
          source_record_id: contract_id,
          title: "Contract Transferred to You",
          message: `A contract for ${
            currentContract.property_title || "property"
          } (Contract #${
            currentContract.contract_number
          }) has been transferred to you from ${
            original_client_info.client_name
          }. Relationship: ${relationship}. Reason: ${transfer_reason}. Please review the contract details.`,
          icon: "📄",
          priority: "high",
          status: "unread",
          recipient_id: new_user_id,
          recipient_role: "home owner",
          data: {
            contract_id: contract_id,
            contract_number: currentContract.contract_number,
            property_title: currentContract.property_title,
            previous_owner_name: original_client_info.client_name,
            relationship: relationship,
            transfer_reason: transfer_reason,
            action_url: "/certified-homeowner", // Admin URL
            client_action_url: "/client-contract-to-sell", // Client URL
          },
          action_url: "/certified-homeowner",
        };

        console.log("Attempting to create notification for new owner:", newOwnerNotification);

        const { data: newOwnerNotifData, error: newOwnerNotifError } = await supabaseAdmin
          .from("notifications_tbl")
          .insert(newOwnerNotification)
          .select();

        if (newOwnerNotifError) {
          console.error(
            "Could not create notification for new owner:",
            newOwnerNotifError
          );
          console.error("Full error details:", {
            message: newOwnerNotifError.message,
            details: newOwnerNotifError.details,
            hint: newOwnerNotifError.hint,
            code: newOwnerNotifError.code,
          });
        } else {
          console.log("Notification sent to new owner:", new_client_email, "Notification ID:", newOwnerNotifData?.[0]?.id);
        }
      } else {
        // Try to find new owner by email if user_id not provided
        console.log("No new_user_id provided, searching by email:", new_client_email);
        const newOwnerUser = authUsers?.users?.find(
          (user) => user.email === new_client_email
        );

        console.log("New owner user found by email:", newOwnerUser ? `Yes (ID: ${newOwnerUser.id})` : 'No');

        if (newOwnerUser) {
          const newOwnerNotification = {
            notification_type: "contract_transfer",
            source_table: "property_contracts",
            source_table_display_name: "Contract Transfer",
            source_record_id: contract_id,
            title: "Contract Transferred to You",
            message: `A contract for ${
              currentContract.property_title || "property"
            } (Contract #${
              currentContract.contract_number
            }) has been transferred to you from ${
              original_client_info.client_name
            }. Relationship: ${relationship}. Reason: ${transfer_reason}. Please review the contract details.`,
            icon: "📄",
            priority: "high",
            status: "unread",
            recipient_id: newOwnerUser.id,
            recipient_role: "home owner",
            data: {
              contract_id: contract_id,
              contract_number: currentContract.contract_number,
              property_title: currentContract.property_title,
              previous_owner_name: original_client_info.client_name,
              relationship: relationship,
              transfer_reason: transfer_reason,
              action_url: "/certified-homeowner", // Admin URL
              client_action_url: "/client-contract-to-sell", // Client URL
            },
            action_url: "/certified-homeowner",
          };

          console.log("Attempting to create notification for new owner (via email lookup):", newOwnerNotification);

          const { data: newOwnerNotifData, error: newOwnerNotifError } = await supabaseAdmin
            .from("notifications_tbl")
            .insert(newOwnerNotification)
            .select();

          if (newOwnerNotifError) {
            console.error(
              "Could not create notification for new owner:",
              newOwnerNotifError
            );
            console.error("Full error details:", {
              message: newOwnerNotifError.message,
              details: newOwnerNotifError.details,
              hint: newOwnerNotifError.hint,
              code: newOwnerNotifError.code,
            });
          } else {
            console.log("Notification sent to new owner:", new_client_email, "Notification ID:", newOwnerNotifData?.[0]?.id);
          }
        } else {
          console.warn(
            "Could not find new owner user account:",
            new_client_email
          );
        }
      }
    } catch (notificationError) {
      console.warn(
        "Error creating notifications:",
        notificationError.message
      );
      // Don't fail the transfer if notifications fail
    }

    console.log("Contract transferred successfully");

    return NextResponse.json({
      success: true,
      message: "Contract transferred successfully",
      data: {
        contract: updatedContract,
        transfer_history: transferHistory,
        original_client: original_client_info,
      },
    });
  } catch (error) {
    console.error("Transfer contract error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to transfer contract: " + error.message,
      },
      { status: 500 }
    );
  }
}
