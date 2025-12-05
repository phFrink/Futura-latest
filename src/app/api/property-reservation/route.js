import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { uploadFileToStorage, validateFile } from "@/lib/storage";
import { createNotification, getUserIdsByRole, NotificationTemplates } from "@/lib/notification-helper";

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

// POST endpoint to create property reservation
export async function POST(request) {
  try {
    // Parse FormData to handle file uploads
    const formData = await request.formData();

    // Extract file if present
    const idFile = formData.get('id_file');
    const idType = formData.get('id_type');

    // Extract other form fields and parse the reservation data JSON
    const reservationDataStr = formData.get('reservation_data');
    const reservationData = reservationDataStr ? JSON.parse(reservationDataStr) : {};

    console.log("API: Creating property reservation:", reservationData);
    console.log("ID File:", idFile ? `${idFile.name} (${idFile.size} bytes)` : 'No file uploaded');
    console.log("ID Type:", idType);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (
      !reservationData.property_id ||
      !reservationData.user_id ||
      !reservationData.client_phone ||
      !reservationData.client_address ||
      !reservationData.occupation ||
      !reservationData.employer ||
      !reservationData.employment_status ||
      !reservationData.years_employed ||
      !reservationData.monthly_income
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Please fill in all required fields to submit your reservation",
        },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (reservationData.monthly_income <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid income",
          message: "Monthly income must be greater than zero",
        },
        { status: 400 }
      );
    }

    if (reservationData.years_employed < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid years employed",
          message: "Years employed cannot be negative",
        },
        { status: 400 }
      );
    }

    // Handle file upload if provided
    let idUploadPath = null;
    if (idFile && idFile.size > 0) {
      console.log("Uploading ID file...");

      // Validate file (allow images and PDFs for ID documents)
      const validation = validateFile(idFile, {
        allowedTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'application/pdf'
        ],
        maxSize: 10 * 1024 * 1024 // 10MB for ID documents
      });

      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error,
            message: validation.error,
          },
          { status: 400 }
        );
      }

      // Upload to Supabase storage
      const uploadResult = await uploadFileToStorage(
        idFile,
        'futura', // bucket name
        'reservation-ids', // folder
        null // auto-generate filename
      );

      if (!uploadResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: uploadResult.error,
            message: "Failed to upload ID file: " + uploadResult.error,
          },
          { status: 500 }
        );
      }

      idUploadPath = uploadResult.data.publicUrl;
      console.log("ID file uploaded successfully:", idUploadPath);
    }

    // Generate unique tracking number
    const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const trackingNumber = `TRK-${randomId}`;
    console.log("Generated tracking number:", trackingNumber);

    // Insert reservation into database
    const { data: reservation, error: insertError } = await supabaseAdmin
      .from("property_reservations")
      .insert({
        // Tracking Number
        tracking_number: trackingNumber,

        // Property Information
        property_id: reservationData.property_id,
        property_title: reservationData.property_title || null,
        reservation_fee: reservationData.reservation_fee || 0,

        // User Information
        user_id: reservationData.user_id,
        client_name: reservationData.client_name,
        client_email: reservationData.client_email,

        // Contact Details
        client_phone: reservationData.client_phone.trim(),
        client_address: reservationData.client_address.trim(),

        // Employment Information
        occupation: reservationData.occupation.trim(),
        employer: reservationData.employer.trim(),
        employment_status: reservationData.employment_status,
        years_employed: reservationData.years_employed,

        // Income Information
        monthly_income: reservationData.monthly_income,
        other_income_source: reservationData.other_income_source,
        other_income_amount: reservationData.other_income_amount,
        total_monthly_income: reservationData.total_monthly_income,

        // Additional Information
        message: reservationData.message,

        // ID Upload Information
        id_type: idType || null,
        id_upload_path: idUploadPath || null,

        // Status
        status: "pending", // pending, approved, rejected
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          message: "Failed to create reservation: " + insertError.message,
        },
        { status: 400 }
      );
    }

    console.log("Reservation created successfully:", reservation.reservation_id);

    // Create notification for new reservation (role-based: sales reps + admins)
    try {
      await createNotification(supabaseAdmin, {
        ...NotificationTemplates.RESERVATION_SUBMITTED({
          reservationId: reservation.reservation_id,
          trackingNumber: trackingNumber,
          propertyId: reservationData.property_id,
          propertyTitle: reservationData.property_title,
          clientName: reservationData.client_name,
          clientEmail: reservationData.client_email,
          clientPhone: reservationData.client_phone,
          monthlyIncome: reservationData.monthly_income,
          employmentStatus: reservationData.employment_status,
        }),
        // Sales reps will see it (role matches)
        // Admins will see it (admins see all)
        // Customer service will NOT see it (role doesn't match)
      });

      console.log(` Notification created for sales representatives and admins`);
    } catch (notificationError) {
      console.error(" Exception creating notification:", notificationError);
      // Don't fail the reservation if notification fails
    }

    return NextResponse.json({
      success: true,
      data: reservation,
      message: "Reservation submitted successfully! Our team will review your application and contact you soon.",
    });
  } catch (error) {
    console.error("Property reservation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to submit reservation: " + error.message,
      },
      { status: 500 }
    );
  }
}

// PUT endpoint to update reservation status (approve/reject)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { reservationId, status, notes } = body;

    console.log(" API: Updating reservation status:", { reservationId, status });

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!reservationId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Reservation ID and status are required",
        },
        { status: 400 }
      );
    }

    // Validate status value
    if (!["approved", "rejected", "pending", "cancelled"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
          message: "Status must be one of: approved, rejected, pending, cancelled",
        },
        { status: 400 }
      );
    }

    // Get the existing reservation first
    const { data: existingReservation, error: fetchError } = await supabaseAdmin
      .from("property_reservations")
      .select("*")
      .eq("reservation_id", reservationId)
      .single();

    if (fetchError || !existingReservation) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation not found",
          message: "Could not find the specified reservation",
        },
        { status: 404 }
      );
    }

    // Update the reservation status
    const updateData = {
      status: status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.admin_notes = notes;
    }

    const { data: updatedReservation, error: updateError } = await supabaseAdmin
      .from("property_reservations")
      .update(updateData)
      .eq("reservation_id", reservationId)
      .select()
      .single();

    if (updateError) {
      console.error(" Update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          message: "Failed to update reservation: " + updateError.message,
        },
        { status: 400 }
      );
    }

    console.log(` Reservation ${reservationId} status updated to: ${status}`);

    // Create notification for the client who made the reservation
    try {
      const notificationData = {
        reservationId: existingReservation.reservation_id,
        trackingNumber: existingReservation.tracking_number,
        propertyId: existingReservation.property_id,
        propertyTitle: existingReservation.property_title,
        clientName: existingReservation.client_name,
        clientEmail: existingReservation.client_email,
        reservationFee: existingReservation.reservation_fee,
        status: status,
        notes: notes || null,
      };

      if (status === "approved") {
        // Send approval notification to the client
        await createNotification(supabaseAdmin, {
          ...NotificationTemplates.RESERVATION_APPROVED(notificationData),
          recipientId: existingReservation.user_id, // Send to specific client
          recipientRole: null, // Override role-based targeting
        });
        console.log(` Approval notification sent to user: ${existingReservation.user_id}`);
      } else if (status === "rejected") {
        // Send rejection notification to the client
        await createNotification(supabaseAdmin, {
          ...NotificationTemplates.RESERVATION_REJECTED(notificationData),
          recipientId: existingReservation.user_id, // Send to specific client
          recipientRole: null, // Override role-based targeting
        });
        console.log(` Rejection notification sent to user: ${existingReservation.user_id}`);
      }
    } catch (notificationError) {
      console.error("Exception creating notification:", notificationError);
      // Don't fail the update if notification fails
    }

    return NextResponse.json({
      success: true,
      data: updatedReservation,
      message: `Reservation ${status} successfully`,
    });
  } catch (error) {
    console.error("Update reservation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to update reservation: " + error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch reservations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    console.log("API: Fetching property reservations for user:", userId);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from("property_reservations")
      .select(`
        *,
        property_info:property_info_tbl!property_id(
          property_price,
          property_downprice
        )
      `)
      .order("created_at", { ascending: false });

    // Filter by user_id if provided
    if (userId) {
      query = query.eq("user_id", userId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data: reservations, error } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to fetch reservations: " + error.message,
        },
        { status: 400 }
      );
    }

    // For each reservation, fetch associated contract if it exists
    const reservationsWithContracts = await Promise.all(
      reservations.map(async (reservation) => {
        // Check if there's a contract for this reservation
        const { data: contract } = await supabaseAdmin
          .from("property_contracts")
          .select("contract_number, payment_plan_months, monthly_installment, contract_status, contract_id")
          .eq("reservation_id", reservation.reservation_id)
          .single();

        // If contract exists, fetch payment schedules and transfer history
        let paymentSchedules = null;
        let transferHistory = null;
        if (contract) {
          const { data: schedules } = await supabaseAdmin
            .from("contract_payment_schedules")
            .select("*")
            .eq("contract_id", contract.contract_id)
            .order("installment_number", { ascending: true });

          // Fetch transfer history (most recent transfer)
          const { data: transfers } = await supabaseAdmin
            .from("contract_transfer_history")
            .select("*")
            .eq("contract_id", contract.contract_id)
            .order("transferred_at", { ascending: false })
            .limit(1);

          paymentSchedules = schedules || [];
          transferHistory = transfers && transfers.length > 0 ? transfers[0] : null;
        }

        return {
          ...reservation,
          contract: contract || null,
          transfer_history: transferHistory,
          payment_schedules: paymentSchedules,
        };
      })
    );

    console.log(`Found ${reservationsWithContracts.length} reservations`);

    return NextResponse.json({
      success: true,
      data: reservationsWithContracts,
      total: reservationsWithContracts.length,
      message: `Found ${reservationsWithContracts.length} reservations`,
    });
  } catch (error) {
    console.error(" Fetch reservations error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch reservations: " + error.message,
      },
      { status: 500 }
    );
  }
}
