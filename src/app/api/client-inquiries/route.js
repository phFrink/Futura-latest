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

const supabaseAdmin = createSupabaseAdmin();

// GET endpoint to fetch client inquiries
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const clientEmail = searchParams.get("clientEmail");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    console.log("API: Fetching client inquiries with filters:", {
      roleId,
      status,
      userId,
      clientEmail,
      limit,
      offset,
    });

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from("client_inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (roleId) {
      query = query.eq("role_id", roleId);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (clientEmail) {
      query = query.eq("client_email", clientEmail);
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset) {
      query = query.range(
        parseInt(offset),
        parseInt(offset) + parseInt(limit || 10) - 1
      );
    }

    const { data: inquiries, error, count } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to fetch inquiries: " + error.message,
        },
        { status: 400 }
      );
    }

    console.log(`Found ${inquiries.length} inquiries (total: ${count})`);

    return NextResponse.json({
      success: true,
      data: inquiries,
      total: count,
      message: `Found ${inquiries.length} inquiries`,
    });
  } catch (error) {
    console.error("Fetch client inquiries error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch inquiries: " + error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a specific inquiry
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return NextResponse.json(
        { success: false, message: "Inquiry ID is required" },
        { status: 400 }
      );
    }

    console.log("API: Deleting inquiry:", inquiryId);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Delete inquiry
    const { error } = await supabaseAdmin
      .from("client_inquiries")
      .delete()
      .eq("inquiry_id", inquiryId);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to delete inquiry: " + error.message,
        },
        { status: 400 }
      );
    }

    console.log("Inquiry deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    console.error("Delete inquiry error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to delete inquiry: " + error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update inquiry status
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { inquiryId, status } = body;

    if (!inquiryId || !status) {
      return NextResponse.json(
        { success: false, message: "Inquiry ID and status are required" },
        { status: 400 }
      );
    }

    console.log("API: Updating inquiry status:", inquiryId, "→", status);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "approved", "declined", "in_progress", "responded", "closed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Update inquiry status
    const { data, error } = await supabaseAdmin
      .from("client_inquiries")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("inquiry_id", inquiryId)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to update inquiry: " + error.message,
        },
        { status: 400 }
      );
    }

    console.log("Inquiry status updated successfully");

    return NextResponse.json({
      success: true,
      data: data,
      message: "Inquiry status updated successfully",
    });
  } catch (error) {
    console.error("Update inquiry error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to update inquiry: " + error.message,
      },
      { status: 500 }
    );
  }
}
