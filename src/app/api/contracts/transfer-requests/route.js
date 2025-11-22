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

// GET endpoint to fetch pending transfer requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const query = supabaseAdmin
      .from("contract_transfer_requests")
      .select(`
        *,
        contracts:contract_id(contract_number, property_title, client_name, client_email)
      `)
      .eq("request_status", status)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transfer requests:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error("Error in GET transfer requests:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint for customer service to request contract transfer
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
      requested_by_user_id,
      requested_by_name,
    } = body;

    console.log("Transfer Request: Customer service requesting contract transfer:", {
      contract_id,
      new_client_name,
      requested_by_name,
    });

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

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

    // Check if contract exists
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("contract_id", contract_id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        {
          success: false,
          message: "Contract not found",
        },
        { status: 404 }
      );
    }

    // Check if there's already a pending request for this contract
    const { data: existingRequest } = await supabaseAdmin
      .from("contract_transfer_requests")
      .select("id")
      .eq("contract_id", contract_id)
      .eq("request_status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "A transfer request for this contract is already pending admin approval",
        },
        { status: 400 }
      );
    }

    // Create transfer request
    const { data: transferRequest, error: createError } = await supabaseAdmin
      .from("contract_transfer_requests")
      .insert({
        contract_id,
        original_client_name: contract.client_name,
        original_client_email: contract.client_email,
        original_client_phone: contract.client_phone,
        original_client_address: contract.client_address,
        new_client_name,
        new_client_email,
        new_client_phone,
        new_client_address,
        new_user_id: new_user_id || null,
        relationship,
        transfer_reason,
        transfer_notes,
        requested_by_user_id,
        requested_by_name,
        request_status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating transfer request:", createError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create transfer request",
        },
        { status: 400 }
      );
    }

    console.log("Transfer Request created successfully:", transferRequest.id);

    // Notify admins about the new transfer request
    try {
      const notificationData = {
        notification_type: "transfer_request_pending",
        source_table: "contract_transfer_requests",
        source_table_display_name: "Transfer Request",
        source_record_id: transferRequest.id,
        title: "New Contract Transfer Request",
        message: `${requested_by_name} has requested to transfer contract ${contract.contract_number} from ${contract.client_name} to ${new_client_name}. Reason: ${transfer_reason}`,
        priority: "high",
        status: "unread",
        recipient_role: "admin",
        action_url: "/contracts/transfer-requests",
        data: {
          transfer_request_id: transferRequest.id,
          contract_id,
          contract_number: contract.contract_number,
          property_title: contract.property_title,
          requested_by: requested_by_name,
          reason: transfer_reason,
        },
      };

      await supabaseAdmin
        .from("notifications_tbl")
        .insert(notificationData);
    } catch (notifError) {
      console.warn("Warning: Could not create admin notification:", notifError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Transfer request submitted successfully. Awaiting admin approval.",
      data: transferRequest,
    });
  } catch (error) {
    console.error("Error in POST transfer request:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
