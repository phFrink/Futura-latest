import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification, NotificationTemplates } from "@/lib/notification-helper";

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

// POST endpoint to create appointment/book tour
export async function POST(request) {
  try {
    const bookingData = await request.json();
    console.log("API: Creating appointment:", bookingData);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (
      !bookingData.property_id ||
      !bookingData.client_name ||
      !bookingData.client_email ||
      !bookingData.appointment_date ||
      !bookingData.appointment_time
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Property, client details, date and time are required",
        },
        { status: 400 }
      );
    }

    // Insert appointment into database
    const { data: appointment, error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert({
        property_id: bookingData.property_id,
        property_title: bookingData.property_title || null,
        user_id: bookingData.user_id || null,
        client_name: bookingData.client_name.trim(),
        client_email: bookingData.client_email.trim().toLowerCase(),
        client_phone: bookingData.client_phone?.trim() || null,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        message: bookingData.message?.trim() || null,
        status: "pending", // Default status
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          message: "Failed to create appointment: " + insertError.message,
        },
        { status: 400 }
      );
    }

    console.log(
      "Appointment created successfully:",
      appointment.appointment_id
    );

    // Create notification for new tour booking
    await createNotification(
      supabaseAdmin,
      NotificationTemplates.TOUR_BOOKED({
        appointmentId: appointment.appointment_id,
        clientName: bookingData.client_name,
        clientEmail: bookingData.client_email,
        clientPhone: bookingData.client_phone,
        propertyTitle: bookingData.property_title,
        propertyId: bookingData.property_id,
        tourDate: bookingData.appointment_date,
        tourTime: bookingData.appointment_time,
      })
    );

    return NextResponse.json({
      success: true,
      data: appointment,
      message:
        "Tour booking created successfully! Awaiting approval from our team.",
    });
  } catch (error) {
    console.error("Book tour error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to book tour: " + error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch user's appointments
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const clientEmail = searchParams.get("clientEmail");

    console.log(
      "API: Fetching appointments for user:",
      userId || clientEmail
    );

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by user_id or client_email
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (clientEmail) {
      query = query.eq("client_email", clientEmail);
    } else {
      query = query;
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to fetch appointments: " + error.message,
        },
        { status: 400 }
      );
    }

    console.log(`Found ${appointments.length} appointments`);

    return NextResponse.json({
      success: true,
      data: appointments,
      total: appointments.length,
      message: `Found ${appointments.length} appointments`,
    });
  } catch (error) {
    console.error("Fetch appointments error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch appointments: " + error.message,
      },
      { status: 500 }
    );
  }
}
