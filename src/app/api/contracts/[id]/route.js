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

// GET endpoint to fetch contract details with payment schedules
export async function GET(request, { params }) {
  try {
    const { id } = params;

    console.log("🔍 API: Fetching contract:", id);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Fetch contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("contract_id", id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        {
          success: false,
          error: "Contract not found",
          message: "Contract not found",
        },
        { status: 404 }
      );
    }

    // Fetch payment schedules
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*")
      .eq("contract_id", id)
      .order("installment_number", { ascending: true });

    if (schedulesError) {
      console.error("❌ Payment schedules error:", schedulesError);
    }

    // Calculate statistics
    const paidCount = schedules?.filter(s => s.payment_status === 'paid').length || 0;
    const pendingCount = schedules?.filter(s => s.payment_status === 'pending').length || 0;
    const overdueCount = schedules?.filter(s => s.is_overdue).length || 0;
    const nextPayment = schedules?.find(s => s.payment_status === 'pending');
    const totalInstallments = schedules?.length || 0;

    // Calculate payment progress based on count of paid vs total installments
    const paymentProgress =
      totalInstallments > 0
        ? Math.min(
            100,
            Math.round((paidCount / totalInstallments) * 100)
          )
        : 100;

    const result = {
      contract: contract,
      payment_schedules: schedules || [],
      statistics: {
        total_installments: totalInstallments,
        paid_installments: paidCount,
        pending_installments: pendingCount,
        overdue_installments: overdueCount,
        payment_progress_percent: paymentProgress,
      },
      next_payment: nextPayment || null,
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
