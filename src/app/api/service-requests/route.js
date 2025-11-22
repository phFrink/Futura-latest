import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification, NotificationTemplates, getUserIdsByRole, isCertifiedHomeowner } from "@/lib/notification-helper";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * GET /api/service-requests
 * Get service requests, optionally filtered by homeowner_id
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("user_id");

    let homeownerIdToUse = userId;

    // If user_id is provided, look up homeowner_id
    if (userId) {
      const { data: homeownerData, error: homeownerError } = await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (homeownerError) {
        console.error("❌ Error fetching homeowner:", homeownerError);
        return NextResponse.json({
          success: true,
          data: [],
          message: "No homeowner profile found for this user",
        });
      }

      homeownerIdToUse = homeownerData?.contract_id;
    }

    // Build query
    let query = supabaseAdmin
      .from("request_tbl")
      .select("*")
      .order("created_date", { ascending: false });

    // Filter by homeowner if provided
    if (homeownerIdToUse) {
      query = query.eq("contract_id", homeownerIdToUse);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching requests:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Found ${data?.length || 0} service requests`);

    return NextResponse.json({
      success: true,
      data: data || [],
      message: "Service requests fetched successfully",
    });
  } catch (error) {
    console.error("❌ Service requests API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/service-requests
 * Create a new service request
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, request_type, priority, user_id } = body;

    console.log("📝 Creating service request:", {
      title,
      request_type,
      priority,
    });

    // Validate required fields
    if (!title || !description || !request_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, description, and request type are required",
        },
        { status: 400 }
      );
    }

    let homeownerIdToUse = null;
    let selectPropertyId = null;
    // If user_id is provided, look up homeowner_id
    if (user_id) {
      const { data: homeownerData, error: homeownerError } = await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (homeownerError || !homeownerData) {
        return NextResponse.json(
          {
            success: false,
            error: "Homeowner profile not found. Please contact support.",
            data: homeownerData,
          },
          { status: 404 }
        );
      }

      homeownerIdToUse = homeownerData.contract_id;
      selectPropertyId = homeownerData.property_id;
    }

    if (!homeownerIdToUse) {
      return NextResponse.json(
        {
          success: false,
          error: "Homeowner ID is required",
          data: homeownerIdToUse,
        },
        { status: 400 }
      );
    }

    // Insert service request
    const { data, error } = await supabaseAdmin
      .from("request_tbl")
      .insert([
        {
          title,
          description,
          request_type,
          priority: priority || "medium",
          user_id: user_id,
          contract_id: homeownerIdToUse,
          property_id: selectPropertyId || null,
          status: "pending",
          created_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating request:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ Service request created:", data.id);

    // Send notification to admins
    try {
      const adminIds = await getUserIdsByRole(supabaseAdmin, "admin");
      const customerServiceIds = await getUserIdsByRole(supabaseAdmin, "customer service");
      const allRecipients = [...adminIds, ...customerServiceIds];

      if (allRecipients.length > 0) {
        const notificationData = NotificationTemplates.SERVICE_REQUEST_CREATED({
          clientName: homeownerData?.client_name || "Unknown",
          title: title,
          requestType: request_type,
        });

        await createNotification(supabaseAdmin, {
          ...notificationData,
          recipientIds: allRecipients,
        });
      }
    } catch (notifError) {
      console.error("⚠️ Failed to send notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Service request created successfully",
    });
  } catch (error) {
    console.error("❌ Service request creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/service-requests
 * Update service request status and send notifications
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, user_id } = body;

    if (!id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Request ID and status are required",
        },
        { status: 400 }
      );
    }

    // Update the request
    const { data, error } = await supabaseAdmin
      .from("request_tbl")
      .update({ status, updated_date: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        property_contracts!contract_id(contract_id, client_name, user_id)
      `)
      .single();

    if (error) throw error;

    console.log("✅ Service request updated:", data.id);

    // Send notification to homeowner based on status change
    try {
      const userId = data.property_contracts?.user_id || user_id;

      if (userId) {
        // Check if homeowner is certified before sending notification
        const isCertified = await isCertifiedHomeowner(supabaseAdmin, userId);

        if (isCertified) {
          let notificationTemplate = null;

          if (status === "approved" || status === "in_progress") {
            notificationTemplate = NotificationTemplates.SERVICE_REQUEST_APPROVED({
              title: data.title,
            });
          } else if (status === "completed") {
            notificationTemplate = NotificationTemplates.SERVICE_REQUEST_COMPLETED({
              title: data.title,
            });
          } else if (status === "declined" || status === "cancelled") {
            notificationTemplate = NotificationTemplates.SERVICE_REQUEST_DECLINED({
              title: data.title,
            });
          } else if (status === "pending") {
            notificationTemplate = NotificationTemplates.SERVICE_REQUEST_REVERTED({
              title: data.title,
            });
          }

          if (notificationTemplate) {
            await createNotification(supabaseAdmin, {
              ...notificationTemplate,
              recipientId: userId,
            });

            console.log("✅ Service request notification sent to homeowner");
          }
        } else {
          console.log("ℹ️ Homeowner is not certified - skipping notification");
        }
      }
    } catch (notifError) {
      console.error("⚠️ Failed to send notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Service request updated successfully",
    });
  } catch (error) {
    console.error("❌ Service request update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
