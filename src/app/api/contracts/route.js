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

// GET endpoint to fetch all contracts with payment schedules
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const contractNumber = searchParams.get("contract_number");

    console.log("🔍 API: Fetching contracts with filters:", {
      userId,
      status,
      contractNumber,
    });

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from("property_contracts")
      .select(`
        *,
        property:property_info_tbl!property_id(
          property_title,
          property_photo
        ),
        reservation:property_reservations!reservation_id(
          tracking_number
        )
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (status) {
      query = query.eq("contract_status", status);
    }

    if (contractNumber) {
      query = query.ilike("contract_number", `%${contractNumber}%`);
    }

    // Execute query
    const { data: contracts, error: contractsError } = await query;

    if (contractsError) {
      console.error("❌ Contracts fetch error:", contractsError);
      return NextResponse.json(
        {
          success: false,
          error: contractsError.message,
          message: "Failed to fetch contracts: " + contractsError.message,
        },
        { status: 400 }
      );
    }

    // For each contract, fetch payment schedules, transfer history, and calculate statistics
    const contractsWithDetails = await Promise.all(
      contracts.map(async (contract) => {
        // Fetch payment schedules
        const { data: schedules, error: schedulesError } = await supabaseAdmin
          .from("contract_payment_schedules")
          .select("*")
          .eq("contract_id", contract.contract_id)
          .order("installment_number", { ascending: true });

        if (schedulesError) {
          console.error(
            `❌ Payment schedules error for contract ${contract.contract_id}:`,
            schedulesError
          );
        }

        // Fetch transactions for each schedule to get processed_by information
        if (schedules && schedules.length > 0) {
          const schedulesWithProcessedBy = await Promise.all(
            schedules.map(async (schedule) => {
              const { data: transaction } = await supabaseAdmin
                .from("contract_payment_transactions")
                .select("processed_by, processed_by_name")
                .eq("schedule_id", schedule.schedule_id)
                .order("transaction_date", { ascending: false })
                .limit(1)
                .single();

              return {
                ...schedule,
                processed_by: transaction?.processed_by || null,
                processed_by_name: transaction?.processed_by_name || null,
              };
            })
          );

          schedules.splice(0, schedules.length, ...schedulesWithProcessedBy);
        }

        // Fetch transfer history (most recent transfer)
        const { data: transfers } = await supabaseAdmin
          .from("contract_transfer_history")
          .select("*")
          .eq("contract_id", contract.contract_id)
          .order("transferred_at", { ascending: false })
          .limit(1);

        const transferHistory = transfers && transfers.length > 0 ? transfers[0] : null;

        // Calculate statistics
        const paidCount =
          schedules?.filter((s) => s.payment_status === "paid").length || 0;
        const pendingCount =
          schedules?.filter((s) => s.payment_status === "pending").length || 0;
        const overdueCount = schedules?.filter((s) => s.is_overdue).length || 0;
        const nextPayment = schedules?.find(
          (s) => s.payment_status === "pending"
        );

        // Calculate payment progress based on count of paid vs total installments
        const totalInstallments = schedules?.length || 0;
        const paidInstallments = paidCount;

        // Payment progress = (paid count / total count) * 100
        const paymentProgress =
          totalInstallments > 0
            ? Math.min(
                100,
                Math.round(
                  (paidInstallments / totalInstallments) * 100
                )
              )
            : 100;

        return {
          ...contract,
          payment_schedules: schedules || [],
          transfer_history: transferHistory,
          statistics: {
            total_installments: schedules?.length || 0,
            paid_installments: paidCount,
            pending_installments: pendingCount,
            overdue_installments: overdueCount,
            payment_progress_percent: paymentProgress,
          },
          next_payment: nextPayment || null,
        };
      })
    );

    console.log(`✅ Found ${contractsWithDetails.length} contracts`);

    return NextResponse.json({
      success: true,
      data: contractsWithDetails,
      message: "Contracts fetched successfully",
      total: contractsWithDetails.length,
    });
  } catch (error) {
    console.error("❌ Fetch contracts error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch contracts: " + error.message,
      },
      { status: 500 }
    );
  }
}
