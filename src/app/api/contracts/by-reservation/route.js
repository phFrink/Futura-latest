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

// GET endpoint to fetch contract by reservation_id
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservation_id");

    console.log("🔍 API: Fetching contract for reservation:", reservationId);

    // Check if Supabase admin client is available
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
          error: "Missing reservation_id",
          message: "Please provide reservation_id",
        },
        { status: 400 }
      );
    }

    // Fetch contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("reservation_id", reservationId)
      .single();

    if (contractError) {
      if (contractError.code === 'PGRST116') {
        // No contract found
        return NextResponse.json({
          success: true,
          data: null,
          message: "No contract found for this reservation",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: contractError.message,
          message: "Failed to fetch contract: " + contractError.message,
        },
        { status: 400 }
      );
    }

    // Fetch payment schedules
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*")
      .eq("contract_id", contract.contract_id)
      .order("installment_number", { ascending: true });

    if (schedulesError) {
      console.error("❌ Payment schedules error:", schedulesError);
    }

    const result = {
      contract: contract,
      payment_schedules: schedules || [],
    };

    console.log(`✅ Found contract with ${schedules?.length || 0} payment schedules`);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Contract fetched successfully",
    });

  } catch (error) {
    console.error("❌ Fetch contract error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch contract: " + error.message,
      },
      { status: 500 }
    );
  }
}
