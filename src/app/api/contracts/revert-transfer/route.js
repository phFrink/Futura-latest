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

// POST endpoint to revert contract transfer
export async function POST(request) {
  try {
    const body = await request.json();
    const { contract_id, transfer_id } = body;

    console.log("API: Reverting contract transfer:", {
      contract_id,
      transfer_id,
    });

    // Validate required fields
    if (!contract_id || !transfer_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: contract_id and transfer_id",
        },
        { status: 400 }
      );
    }

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get the transfer history record
    const { data: transferRecord, error: transferError } = await supabaseAdmin
      .from("contract_transfer_history")
      .select("*")
      .eq("transfer_id", transfer_id)
      .eq("contract_id", contract_id)
      .single();

    if (transferError || !transferRecord) {
      console.error("Transfer record fetch error:", transferError);
      return NextResponse.json(
        {
          success: false,
          message: "Transfer record not found",
          error: transferError?.message,
        },
        { status: 404 }
      );
    }

    // Get the current contract
    const { data: currentContract, error: contractError } =
      await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("contract_id", contract_id)
        .single();

    if (contractError || !currentContract) {
      console.error("Contract fetch error:", contractError);
      return NextResponse.json(
        {
          success: false,
          message: "Contract not found",
          error: contractError?.message,
        },
        { status: 404 }
      );
    }

    // Revert the contract back to original owner
    const { data: revertedContract, error: revertError } = await supabaseAdmin
      .from("property_contracts")
      .update({
        client_name: transferRecord.original_client_name,
        client_email: transferRecord.original_client_email,
        client_phone: transferRecord.original_client_phone,
        client_address: transferRecord.original_client_address,
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", contract_id)
      .select()
      .single();

    if (revertError) {
      console.error("Contract revert error:", revertError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to revert contract",
          error: revertError.message,
        },
        { status: 400 }
      );
    }

    // Revert the associated reservation if it exists
    if (currentContract.reservation_id) {
      // We need to find the original user_id - we can try to look it up by email
      const { data: originalUser } = await supabaseAdmin.auth.admin.listUsers();

      const originalUserRecord = originalUser?.users?.find(
        (user) => user.email === transferRecord.original_client_email
      );

      if (originalUserRecord) {
        const { error: reservationError } = await supabaseAdmin
          .from("property_reservations")
          .update({
            user_id: originalUserRecord.id,
            client_name: transferRecord.original_client_name,
            client_email: transferRecord.original_client_email,
            client_phone: transferRecord.original_client_phone,
            client_address: transferRecord.original_client_address,
            updated_at: new Date().toISOString(),
          })
          .eq("reservation_id", currentContract.reservation_id);

        if (reservationError) {
          console.error("Reservation revert error:", reservationError);
          console.warn("Failed to revert reservation, but contract revert succeeded");
        } else {
          console.log("Reservation reverted successfully");
        }
      } else {
        console.warn("Original user not found in auth, skipping reservation revert");
      }
    }

    // Delete the transfer history record
    const { error: deleteError } = await supabaseAdmin
      .from("contract_transfer_history")
      .delete()
      .eq("transfer_id", transfer_id);

    if (deleteError) {
      console.error("Transfer history delete error:", deleteError);
      console.warn("Failed to delete transfer history, but contract reverted successfully");
    } else {
      console.log("Transfer history record deleted");
    }

    // Create notifications for current owner and original owner
    try {
      // Find users by email from Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      // Find the current owner's user ID by email (the person losing the contract)
      const currentOwnerUser = authUsers?.users?.find(
        (user) => user.email === transferRecord.new_client_email
      );

      // Create notification for current owner (they're losing the contract)
      if (!authError && currentOwnerUser) {
        const currentOwnerNotification = {
          notification_type: "contract_transfer_revert",
          source_table: "property_contracts",
          source_table_display_name: "Contract Transfer Revert",
          source_record_id: contract_id,
          title: "Contract Transfer Reverted",
          message: `The contract for ${currentContract.property_title || 'property'} (Contract #${currentContract.contract_number}) that was transferred to you has been reverted back to the original owner ${transferRecord.original_client_name}.`,
          icon: "↩️",
          priority: "high",
          status: "unread",
          recipient_id: currentOwnerUser.id,
          recipient_role: "home owner",
          data: {
            contract_id: contract_id,
            contract_number: currentContract.contract_number,
            property_title: currentContract.property_title,
            original_owner_name: transferRecord.original_client_name,
            revert_reason: "Transfer reverted by administrator",
            action_url: "/certified-homeowner", // Admin URL
            client_action_url: "/client-contract-to-sell", // Client URL
          },
          action_url: "/certified-homeowner",
        };

        console.log("Attempting to create notification for current owner:", currentOwnerNotification);

        const { data: currentOwnerNotifData, error: currentOwnerNotifError } = await supabaseAdmin
          .from("notifications_tbl")
          .insert(currentOwnerNotification)
          .select();

        if (currentOwnerNotifError) {
          console.error(" Could not create notification for current owner:", currentOwnerNotifError);
          console.error(" Full error details:", {
            message: currentOwnerNotifError.message,
            details: currentOwnerNotifError.details,
            hint: currentOwnerNotifError.hint,
            code: currentOwnerNotifError.code,
          });
        } else {
          console.log("Notification sent to current owner (losing contract):", transferRecord.new_client_email, "Notification ID:", currentOwnerNotifData?.[0]?.id);
        }
      } else {
        console.warn("Could not find current owner user account:", transferRecord.new_client_email, "Error:", authError?.message);
      }

      // Find the original owner's user ID by email (the person getting the contract back)
      const originalOwnerUser = authUsers?.users?.find(
        (user) => user.email === transferRecord.original_client_email
      );

      // Create notification for original owner (they're getting the contract back)
      if (originalOwnerUser) {
        const originalOwnerNotification = {
          notification_type: "contract_transfer_revert",
          source_table: "property_contracts",
          source_table_display_name: "Contract Transfer Revert",
          source_record_id: contract_id,
          title: "Contract Restored to You",
          message: `Your contract for ${currentContract.property_title || 'property'} (Contract #${currentContract.contract_number}) has been restored back to you. The previous transfer to ${transferRecord.new_client_name} has been reverted.`,
          icon: "✅",
          priority: "high",
          status: "unread",
          recipient_id: originalOwnerUser.id,
          recipient_role: "home owner",
          data: {
            contract_id: contract_id,
            contract_number: currentContract.contract_number,
            property_title: currentContract.property_title,
            previous_transfer_recipient: transferRecord.new_client_name,
            revert_reason: "Transfer reverted by administrator",
            action_url: "/certified-homeowner", // Admin URL
            client_action_url: "/client-contract-to-sell", // Client URL
          },
          action_url: "/certified-homeowner",
        };

        console.log(" Attempting to create notification for original owner:", originalOwnerNotification);

        const { data: originalOwnerNotifData, error: originalOwnerNotifError } = await supabaseAdmin
          .from("notifications_tbl")
          .insert(originalOwnerNotification)
          .select();

        if (originalOwnerNotifError) {
          console.error("Could not create notification for original owner:", originalOwnerNotifError);
          console.error("Full error details:", {
            message: originalOwnerNotifError.message,
            details: originalOwnerNotifError.details,
            hint: originalOwnerNotifError.hint,
            code: originalOwnerNotifError.code,
          });
        } else {
          console.log("Notification sent to original owner (getting contract back):", transferRecord.original_client_email, "Notification ID:", originalOwnerNotifData?.[0]?.id);
        }
      } else {
        console.warn("Could not find original owner user account:", transferRecord.original_client_email);
      }
    } catch (notificationError) {
      console.warn("Error creating revert notifications:", notificationError.message);
      // Don't fail the revert if notifications fail
    }

    console.log("Contract transfer reverted successfully");

    return NextResponse.json({
      success: true,
      message: "Contract transfer reverted successfully",
      data: {
        contract: revertedContract,
        original_owner: {
          name: transferRecord.original_client_name,
          email: transferRecord.original_client_email,
        },
      },
    });
  } catch (error) {
    console.error("Revert transfer error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to revert transfer: " + error.message,
      },
      { status: 500 }
    );
  }
}
