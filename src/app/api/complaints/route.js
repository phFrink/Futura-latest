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
 * GET /api/complaints
 * Get complaints, optionally filtered by user_id
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("user_id");

    let contractIdToUse = userId;

    // If user_id is provided, look up contract_id
    if (userId) {
      const { data: contractData, error: contractError } = await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (contractError) {
        console.error("Error fetching contract:", contractError);
        return NextResponse.json({
          success: true,
          data: [],
          message: "No contract found for this user",
        });
      }

      contractIdToUse = contractData?.contract_id;
    }

    // Build query
    let query = supabaseAdmin
      .from("complaint_tbl")
      .select(`
        *,
        property_contracts!contract_id(contract_id, client_name),
        property_info_tbl!property_id(property_id, property_title)
      `)
      .order("created_date", { ascending: false });

    // Filter by contract if provided
    if (contractIdToUse) {
      query = query.eq("contract_id", contractIdToUse);
    }

    const { data, error } = await query;

    if (error) {
      console.error(" Error fetching complaints:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    console.log(`Found ${data?.length || 0} complaints`);

    return NextResponse.json({
      success: true,
      data: data || [],
      message: "Complaints fetched successfully",
    });
  } catch (error) {
    console.error("Complaints API error:", error);
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
 * POST /api/complaints
 * Create a new complaint
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, description, complaint_type, severity, user_id } = body;

    console.log("Creating complaint:", {
      subject,
      complaint_type,
      severity,
    });

    // Validate required fields
    if (!subject || !description || !complaint_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Subject, description, and complaint type are required",
        },
        { status: 400 }
      );
    }

    let contractIdToUse = null;
    let selectPropertyId = null;
    // If user_id is provided, look up contract_id
    if (user_id) {
      const { data: contractData, error: contractError } = await supabaseAdmin
        .from("property_contracts")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (contractError || !contractData) {
        return NextResponse.json(
          {
            success: false,
            error: "Contract not found. Please contact support.",
            data: contractData,
          },
          { status: 404 }
        );
      }

      contractIdToUse = contractData.contract_id;
      selectPropertyId = contractData.property_id;
    }

    if (!contractIdToUse) {
      return NextResponse.json(
        {
          success: false,
          error: "Contract ID is required",
          data: contractIdToUse,
        },
        { status: 400 }
      );
    }

    // Insert complaint
    const { data, error } = await supabaseAdmin
      .from("complaint_tbl")
      .insert([
        {
          subject,
          description,
          complaint_type,
          severity: severity || "medium",
          contract_id: contractIdToUse,
          property_id: selectPropertyId || null,
          status: "pending",
          created_date: new Date().toISOString(),
        },
      ])
      .select(`
        *,
        property_contracts!contract_id(contract_id, client_name),
        property_info_tbl!property_id(property_id, property_title)
      `)
      .single();

    if (error) {
      console.error("Error creating complaint:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    console.log(" Complaint created:", data.id);

    // Send notification to admins
    try {
      const adminIds = await getUserIdsByRole(supabaseAdmin, "admin");
      const customerServiceIds = await getUserIdsByRole(supabaseAdmin, "customer service");
      const allRecipients = [...adminIds, ...customerServiceIds];

      if (allRecipients.length > 0) {
        const notificationData = NotificationTemplates.COMPLAINT_FILED({
          clientName: contractData?.client_name || "Unknown",
          subject: subject,
          complaintType: complaint_type,
        });

        await createNotification(supabaseAdmin, {
          ...notificationData,
          recipientIds: allRecipients,
        });
      }
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Complaint filed successfully",
    });
  } catch (error) {
    console.error(" Complaint creation error:", error);
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
 * PATCH /api/complaints
 * Update complaint status and send notifications
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, user_id } = body;

    if (!id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Complaint ID and status are required",
        },
        { status: 400 }
      );
    }

    // Update the complaint
    const { data, error } = await supabaseAdmin
      .from("complaint_tbl")
      .update({ status, updated_date: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        property_contracts!contract_id(contract_id, client_name, user_id)
      `)
      .single();

    if (error) throw error;

    console.log("Complaint updated:", data.id);

    // Send notification to homeowner based on status change
    try {
      const userId = data.property_contracts?.user_id || user_id;

      if (userId) {
        // Check if homeowner is certified before sending notification
        const isCertified = await isCertifiedHomeowner(supabaseAdmin, userId);

        if (isCertified) {
          let notificationTemplate = null;

          if (status === "investigating") {
            notificationTemplate = NotificationTemplates.COMPLAINT_APPROVED({
              subject: data.subject,
            });
          } else if (status === "resolved") {
            notificationTemplate = NotificationTemplates.COMPLAINT_RESOLVED({
              subject: data.subject,
            });
          } else if (status === "closed") {
            notificationTemplate = NotificationTemplates.COMPLAINT_REJECTED({
              subject: data.subject,
            });
          } else if (status === "escalated") {
            notificationTemplate = NotificationTemplates.COMPLAINT_ESCALATED({
              subject: data.subject,
            });
          } else if (status === "pending") {
            notificationTemplate = NotificationTemplates.COMPLAINT_REVERTED({
              subject: data.subject,
            });
          }

          if (notificationTemplate) {
            await createNotification(supabaseAdmin, {
              ...notificationTemplate,
              recipientId: userId,
            });

            console.log(" Complaint notification sent to homeowner");
          }
        } else {
          console.log("Homeowner is not certified - skipping notification");
        }
      }
    } catch (notifError) {
      console.error(" Failed to send notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Complaint updated successfully",
    });
  } catch (error) {
    console.error(" Complaint update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
