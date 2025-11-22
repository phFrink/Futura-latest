import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

// POST endpoint for admin to approve transfer request
export async function POST(request) {
  try {
    const body = await request.json();
    const { transfer_request_id, approved, rejection_reason, approved_by_name } = body;

    console.log("Admin approval action:", {
      transfer_request_id,
      approved,
      approved_by: approved_by_name,
    });

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!transfer_request_id) {
      return NextResponse.json(
        { success: false, message: "Transfer request ID is required" },
        { status: 400 }
      );
    }

    // Get the transfer request
    const { data: transferRequest, error: fetchError } = await supabaseAdmin
      .from("contract_transfer_requests")
      .select("*")
      .eq("id", transfer_request_id)
      .single();

    if (fetchError || !transferRequest) {
      return NextResponse.json(
        { success: false, message: "Transfer request not found" },
        { status: 404 }
      );
    }

    if (approved) {
      // Admin approved the transfer - execute the actual transfer
      console.log("Admin approved transfer request. Executing transfer...");

      // Get contract details
      const { data: contract, error: contractError } = await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("contract_id", transferRequest.contract_id)
        .single();

      if (contractError || !contract) {
        return NextResponse.json(
          { success: false, message: "Contract not found" },
          { status: 404 }
        );
      }

      // Update contract with new client info
      const { error: updateError } = await supabaseAdmin
        .from("property_contracts")
        .update({
          client_name: transferRequest.new_client_name,
          client_email: transferRequest.new_client_email,
          client_phone: transferRequest.new_client_phone,
          client_address: transferRequest.new_client_address,
          updated_at: new Date().toISOString(),
        })
        .eq("contract_id", transferRequest.contract_id);

      if (updateError) {
        console.error("Error updating contract:", updateError);
        return NextResponse.json(
          { success: false, message: "Failed to update contract" },
          { status: 400 }
        );
      }

      // Update transfer request status to approved
      const { error: statusError } = await supabaseAdmin
        .from("contract_transfer_requests")
        .update({
          request_status: "approved",
          approved_by: approved_by_name,
          approved_at: new Date().toISOString(),
          approval_notes: rejection_reason || null,
        })
        .eq("id", transfer_request_id);

      if (statusError) {
        console.error("Error updating transfer request status:", statusError);
        return NextResponse.json(
          { success: false, message: "Failed to update transfer request" },
          { status: 400 }
        );
      }

      // Send notification to customer service who requested it
      try {
        const notificationData = {
          notification_type: "transfer_approved",
          source_table: "contract_transfer_requests",
          source_table_display_name: "Transfer Approved",
          source_record_id: transfer_request_id,
          title: "Contract Transfer Approved",
          message: `Your transfer request for contract ${contract.contract_number} has been approved by ${approved_by_name}. The contract has been successfully transferred to ${transferRequest.new_client_name}.`,
          priority: "high",
          status: "unread",
          recipient_role: "customer_service",
          action_url: "/contracts/transfers",
          data: {
            transfer_request_id,
            contract_id: transferRequest.contract_id,
            contract_number: contract.contract_number,
            approved_by: approved_by_name,
          },
        };

        await supabaseAdmin
          .from("notifications_tbl")
          .insert(notificationData);
      } catch (notifError) {
        console.warn("Warning: Could not create notification:", notifError.message);
      }

      return NextResponse.json({
        success: true,
        message: "Transfer approved successfully. Contract has been transferred.",
        data: transferRequest,
      });
    } else {
      // Admin rejected the transfer
      console.log("Admin rejected transfer request:", rejection_reason);

      // Update transfer request status to rejected
      const { error: statusError } = await supabaseAdmin
        .from("contract_transfer_requests")
        .update({
          request_status: "rejected",
          approved_by: approved_by_name,
          approved_at: new Date().toISOString(),
          approval_notes: rejection_reason || "No reason provided",
        })
        .eq("id", transfer_request_id);

      if (statusError) {
        console.error("Error updating transfer request status:", statusError);
        return NextResponse.json(
          { success: false, message: "Failed to update transfer request" },
          { status: 400 }
        );
      }

      // Send notification to customer service
      try {
        const notificationData = {
          notification_type: "transfer_rejected",
          source_table: "contract_transfer_requests",
          source_table_display_name: "Transfer Rejected",
          source_record_id: transfer_request_id,
          title: "Contract Transfer Rejected",
          message: `Your transfer request for contract ${transferRequest.contract_id} has been rejected by ${approved_by_name}. Reason: ${rejection_reason || "No reason provided"}`,
          priority: "high",
          status: "unread",
          recipient_role: "customer_service",
          action_url: "/contracts/transfers",
          data: {
            transfer_request_id,
            contract_id: transferRequest.contract_id,
            approved_by: approved_by_name,
            rejection_reason,
          },
        };

        await supabaseAdmin
          .from("notifications_tbl")
          .insert(notificationData);
      } catch (notifError) {
        console.warn("Warning: Could not create notification:", notifError.message);
      }

      return NextResponse.json({
        success: true,
        message: "Transfer request rejected.",
        data: transferRequest,
      });
    }
  } catch (error) {
    console.error("Error in transfer approval:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
