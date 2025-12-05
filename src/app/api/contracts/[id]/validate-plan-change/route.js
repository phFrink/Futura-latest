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

// POST endpoint to validate if a plan change is allowed
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { new_payment_plan_months } = body;

    console.log("API: Validating plan change for contract:", id);
    console.log("New payment plan months:", new_payment_plan_months);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!new_payment_plan_months) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing new_payment_plan_months",
          message: "Please provide new_payment_plan_months",
        },
        { status: 400 }
      );
    }

    // Validate payment plan months range (1-60)
    if (new_payment_plan_months < 1 || new_payment_plan_months > 60) {
      return NextResponse.json(
        {
          success: false,
          allowed: false,
          error: "Invalid payment plan",
          message: "Payment plan must be between 1 and 60 months",
          validation_errors: ["Payment plan months must be between 1 and 60"],
        },
        { status: 400 }
      );
    }

    // Fetch contract details
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
      console.error("Payment schedules error:", schedulesError);
      return NextResponse.json(
        {
          success: false,
          error: schedulesError.message,
          message: "Failed to fetch payment schedules",
        },
        { status: 400 }
      );
    }

    // Business rules validation
    const validationErrors = [];
    const warnings = [];

    // Rule 1: Contract status must be 'active'
    if (contract.contract_status !== 'active') {
      validationErrors.push(
        `Contract status is '${contract.contract_status}'. Only active contracts can be modified.`
      );
    }

    // Rule 2: Downpayment status validation
    if (contract.downpayment_status === 'completed') {
      validationErrors.push(
        "Downpayment is already completed. Plan change is not allowed."
      );
    }

    if (contract.downpayment_status === 'defaulted') {
      validationErrors.push(
        "Contract is in defaulted status. Plan change is not allowed."
      );
    }

    // Rule 3: Check if all installments are already paid
    const paidCount = schedules?.filter(s => s.payment_status === 'paid').length || 0;
    const totalCount = schedules?.length || 0;

    if (paidCount === totalCount && totalCount > 0) {
      validationErrors.push(
        "All installments are already paid. Plan change is not allowed."
      );
    }

    // Rule 4: Check for same plan
    if (contract.payment_plan_months === new_payment_plan_months) {
      validationErrors.push(
        `Contract already has a ${new_payment_plan_months}-month payment plan.`
      );
    }

    // Rule 5: Warning for overdue payments
    const overdueCount = schedules?.filter(s => s.is_overdue).length || 0;
    if (overdueCount > 0) {
      warnings.push(
        `There are ${overdueCount} overdue payment(s). Please settle overdue amounts before changing plan.`
      );
    }

    // Calculate impact of plan change
    const pendingSchedules = schedules?.filter(s => s.payment_status === 'pending') || [];
    const remainingAmount = Math.max(0, contract.remaining_balance);

    // Calculate new monthly installment
    const newMonthlyInstallment = remainingAmount / new_payment_plan_months;
    const oldMonthlyInstallment = contract.monthly_installment;

    // Calculate new final installment date
    const firstUnpaidSchedule = schedules?.find(s => s.payment_status === 'pending');
    let newFinalInstallmentDate = null;

    if (firstUnpaidSchedule) {
      const baseDate = new Date(firstUnpaidSchedule.due_date);
      newFinalInstallmentDate = new Date(baseDate);
      newFinalInstallmentDate.setMonth(
        newFinalInstallmentDate.getMonth() + new_payment_plan_months - 1
      );
    }

    // Determine if change is allowed
    const isAllowed = validationErrors.length === 0;

    // Prepare response
    const response = {
      success: true,
      allowed: isAllowed,
      validation_errors: validationErrors,
      warnings: warnings,
      current_plan: {
        payment_plan_months: contract.payment_plan_months,
        monthly_installment: oldMonthlyInstallment,
        remaining_balance: remainingAmount,
        paid_installments: paidCount,
        pending_installments: pendingSchedules.length,
        overdue_installments: overdueCount,
        final_installment_date: contract.final_installment_date,
      },
      proposed_plan: {
        payment_plan_months: new_payment_plan_months,
        monthly_installment: newMonthlyInstallment,
        remaining_balance: remainingAmount,
        new_final_installment_date: newFinalInstallmentDate?.toISOString(),
      },
      impact: {
        monthly_payment_difference: newMonthlyInstallment - oldMonthlyInstallment,
        monthly_payment_change_percent:
          ((newMonthlyInstallment - oldMonthlyInstallment) / oldMonthlyInstallment * 100).toFixed(2),
        schedules_to_recalculate: pendingSchedules.length,
      },
      message: isAllowed
        ? "Plan change is allowed"
        : "Plan change is not allowed due to validation errors",
    };

    console.log(`Validation complete. Allowed: ${isAllowed}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error(" Validate plan change error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to validate plan change: " + error.message,
      },
      { status: 500 }
    );
  }
}
