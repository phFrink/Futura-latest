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

/**
 * GET /api/contracts/payment/history?contract_id=xxx
 * Get payment transaction history for a contract
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contract_id");
    const scheduleId = searchParams.get("schedule_id");

    console.log("🔍 Fetching payment history:", { contractId, scheduleId });

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error"
        },
        { status: 500 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from("contract_payment_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    // Apply filters
    if (contractId) {
      query = query.eq("contract_id", contractId);
    }

    if (scheduleId) {
      query = query.eq("schedule_id", scheduleId);
    }

    if (!contractId && !scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Contract ID or Schedule ID is required",
        },
        { status: 400 }
      );
    }

    // Execute query
    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      console.error("❌ Payment history error:", transactionsError);
      return NextResponse.json(
        {
          success: false,
          error: transactionsError.message,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Found ${transactions.length} payment transactions`);

    // Calculate summary statistics
    const summary = {
      total_transactions: transactions.length,
      total_amount_paid: transactions.reduce(
        (sum, t) => sum + parseFloat(t.total_amount || 0),
        0
      ),
      total_penalties_paid: transactions.reduce(
        (sum, t) => sum + parseFloat(t.penalty_paid || 0),
        0
      ),
      payment_methods: [...new Set(transactions.map((t) => t.payment_method))],
      completed_count: transactions.filter((t) => t.payment_status === "completed")
        .length,
      pending_count: transactions.filter((t) => t.payment_status === "pending")
        .length,
    };

    return NextResponse.json({
      success: true,
      data: transactions,
      summary,
      message: "Payment history fetched successfully",
    });
  } catch (error) {
    console.error("❌ Payment history API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
