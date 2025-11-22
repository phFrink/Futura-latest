import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/transactions/receipt
 * Generate receipt data for a single transaction or date range
 * Query params:
 * - transaction_id: Single transaction ID (optional)
 * - start_date: Start date for range (optional)
 * - end_date: End date for range (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Single transaction receipt
    if (transactionId) {
      const { data: transaction, error } = await supabase
        .from("contract_payment_transactions")
        .select(
          `
          *,
          property_contracts (
            contract_number,
            client_name,
            client_phone,
            client_email,
            client_address
          )
        `
        )
        .eq("transaction_id", transactionId)
        .single();

      if (error) {
        console.error("Error fetching transaction:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Transaction not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transaction,
        type: "single",
      });
    }

    // Date range receipt
    if (startDate || endDate) {
      let query = supabase
        .from("contract_payment_transactions")
        .select(
          `
          *,
          property_contracts (
            contract_number,
            client_name,
            client_phone,
            client_email,
            client_address
          )
        `
        )
        .order("transaction_date", { ascending: false });

      if (startDate) {
        query = query.gte("transaction_date", startDate);
      }

      if (endDate) {
        // Add one day to include the end date
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        query = query.lt(
          "transaction_date",
          endDatePlusOne.toISOString().split("T")[0]
        );
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch transactions",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: transactions,
        type: "range",
        startDate,
        endDate,
      });
    }

    // No parameters provided
    return NextResponse.json(
      {
        success: false,
        error:
          "Please provide either transaction_id or start_date/end_date parameters",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
