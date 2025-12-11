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

export async function GET(request, { params }) {
  try {
    const { id: reservationId } = params;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing reservation ID",
          message: "Reservation ID is required",
        },
        { status: 400 }
      );
    }

    const { data: documents, error } = await supabaseAdmin
      .from("reservation_documents")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to fetch documents: " + error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      message: `Found ${(documents || []).length} document(s)`,
    });

  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch documents: " + error.message,
      },
      { status: 500 }
    );
  }
}