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

// POST endpoint to change contract payment plan
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { new_payment_plan_months, reason, changed_by } = body;

    console.log("API: Changing payment plan for contract:", id);
    console.log("New payment plan months:", new_payment_plan_months);
    console.log("Reason:", reason);

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
          error: "Missing required fields",
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
          error: "Invalid payment plan",
          message: "Payment plan must be between 1 and 60 months",
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

    // Rule 1: Contract status must be 'active'
    if (contract.contract_status !== 'active') {
      validationErrors.push(
        `Contract status is '${contract.contract_status}'. Only active contracts can be modified.`
      );
    }

    // Rule 2: Downpayment status validation
    if (contract.downpayment_status === 'completed' || contract.downpayment_status === 'defaulted') {
      validationErrors.push(
        `Downpayment status is '${contract.downpayment_status}'. Plan change is not allowed.`
      );
    }

    // Rule 3: Check if all installments are already paid
    const paidSchedules = schedules?.filter(s => s.payment_status === 'paid') || [];
    const pendingSchedules = schedules?.filter(s => s.payment_status === 'pending') || [];

    if (paidSchedules.length === schedules.length && schedules.length > 0) {
      validationErrors.push("All installments are already paid. Plan change is not allowed.");
    }

    // Rule 4: Check for same plan
    if (contract.payment_plan_months === new_payment_plan_months) {
      validationErrors.push(
        `Contract already has a ${new_payment_plan_months}-month payment plan.`
      );
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: "Plan change is not allowed",
          validation_errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Calculate new payment details
    const remainingBalance = Math.max(0, contract.remaining_balance);
    const newMonthlyInstallment = remainingBalance / new_payment_plan_months;

    // Get the first unpaid schedule to determine new start date
    const firstUnpaidSchedule = pendingSchedules[0];
    let newFirstInstallmentDate = new Date();

    if (firstUnpaidSchedule) {
      newFirstInstallmentDate = new Date(firstUnpaidSchedule.due_date);
    } else {
      // If no unpaid schedules, start from next month
      newFirstInstallmentDate.setMonth(newFirstInstallmentDate.getMonth() + 1);
    }

    // Calculate new final installment date
    const newFinalInstallmentDate = new Date(newFirstInstallmentDate);
    newFinalInstallmentDate.setMonth(
      newFinalInstallmentDate.getMonth() + new_payment_plan_months - 1
    );

    // Store old values for audit
    const oldPaymentPlanMonths = contract.payment_plan_months;
    const oldMonthlyInstallment = contract.monthly_installment;
    const oldFinalInstallmentDate = contract.final_installment_date;

    console.log(" Plan change calculations:", {
      old_payment_plan_months: oldPaymentPlanMonths,
      new_payment_plan_months: new_payment_plan_months,
      old_monthly_installment: oldMonthlyInstallment,
      new_monthly_installment: newMonthlyInstallment,
      remaining_balance: remainingBalance,
      pending_schedules_count: pendingSchedules.length,
    });

    // Start transaction: Update contract
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from("property_contracts")
      .update({
        payment_plan_months: new_payment_plan_months,
        monthly_installment: newMonthlyInstallment,
        final_installment_date: newFinalInstallmentDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", id)
      .select()
      .single();

    if (updateError) {
      console.error(" Contract update error:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          message: "Failed to update contract: " + updateError.message,
        },
        { status: 400 }
      );
    }

    console.log(" Contract updated successfully");

    // Delete all pending payment schedules
    if (pendingSchedules.length > 0) {
      const pendingScheduleIds = pendingSchedules.map(s => s.schedule_id);

      const { error: deleteError } = await supabaseAdmin
        .from("contract_payment_schedules")
        .delete()
        .in("schedule_id", pendingScheduleIds);

      if (deleteError) {
        console.error("Delete schedules error:", deleteError);

        // Rollback contract update
        await supabaseAdmin
          .from("property_contracts")
          .update({
            payment_plan_months: oldPaymentPlanMonths,
            monthly_installment: oldMonthlyInstallment,
            final_installment_date: oldFinalInstallmentDate,
          })
          .eq("contract_id", id);

        return NextResponse.json(
          {
            success: false,
            error: deleteError.message,
            message: "Failed to delete old payment schedules: " + deleteError.message,
          },
          { status: 400 }
        );
      }

      console.log(`Deleted ${pendingSchedules.length} pending payment schedules`);
    }

    // Generate new payment schedules
    const newPaymentSchedules = [];
    const gracePeriodDays = 7;
    const startInstallmentNumber = paidSchedules.length + 1;

    for (let i = 0; i < new_payment_plan_months; i++) {
      const dueDate = new Date(newFirstInstallmentDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const gracePeriodEndDate = new Date(dueDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);

      newPaymentSchedules.push({
        contract_id: id,
        installment_number: startInstallmentNumber + i,
        installment_description: `Monthly Payment ${startInstallmentNumber + i} of ${startInstallmentNumber + new_payment_plan_months - 1}`,
        scheduled_amount: newMonthlyInstallment,
        paid_amount: 0,
        remaining_amount: newMonthlyInstallment,
        due_date: dueDate.toISOString().split('T')[0],
        grace_period_end_date: gracePeriodEndDate.toISOString().split('T')[0],
        payment_status: 'pending',
        is_overdue: false,
        days_overdue: 0,
        penalty_amount: 0,
      });
    }

    // Insert new payment schedules
    const { data: newSchedules, error: insertError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .insert(newPaymentSchedules)
      .select();

    if (insertError) {
      console.error(" Insert schedules error:", insertError);

      // Rollback: Restore old schedules and contract
      await supabaseAdmin
        .from("property_contracts")
        .update({
          payment_plan_months: oldPaymentPlanMonths,
          monthly_installment: oldMonthlyInstallment,
          final_installment_date: oldFinalInstallmentDate,
        })
        .eq("contract_id", id);

      // Try to restore old pending schedules
      if (pendingSchedules.length > 0) {
        await supabaseAdmin
          .from("contract_payment_schedules")
          .insert(pendingSchedules);
      }

      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          message: "Failed to create new payment schedules: " + insertError.message,
        },
        { status: 400 }
      );
    }

    console.log(` Created ${newSchedules.length} new payment schedules`);

    // Create audit record for plan change
    try {
      const auditRecord = {
        contract_id: id,
        old_payment_plan_months: oldPaymentPlanMonths,
        new_payment_plan_months: new_payment_plan_months,
        old_monthly_installment: oldMonthlyInstallment,
        new_monthly_installment: newMonthlyInstallment,
        old_final_installment_date: oldFinalInstallmentDate,
        new_final_installment_date: newFinalInstallmentDate.toISOString(),
        reason: reason || 'No reason provided',
        changed_by: changed_by || null,
        created_at: new Date().toISOString(),
      };

      const { error: auditError } = await supabaseAdmin
        .from("contract_plan_changes")
        .insert(auditRecord);

      if (auditError) {
        console.warn("Audit record creation failed (non-critical):", auditError.message);
        // Don't fail the entire operation if audit fails
      } else {
        console.log("Audit record created");
      }
    } catch (auditErr) {
      console.warn("Audit record creation error (non-critical):", auditErr);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        contract: updatedContract,
        old_payment_schedules: paidSchedules,
        new_payment_schedules: newSchedules,
        summary: {
          old_plan: {
            payment_plan_months: oldPaymentPlanMonths,
            monthly_installment: oldMonthlyInstallment,
            final_installment_date: oldFinalInstallmentDate,
          },
          new_plan: {
            payment_plan_months: new_payment_plan_months,
            monthly_installment: newMonthlyInstallment,
            final_installment_date: newFinalInstallmentDate.toISOString(),
          },
          changes: {
            monthly_payment_difference: newMonthlyInstallment - oldMonthlyInstallment,
            schedules_deleted: pendingSchedules.length,
            schedules_created: newSchedules.length,
            paid_schedules_kept: paidSchedules.length,
          },
        },
      },
      message: "Payment plan changed successfully!",
    });

  } catch (error) {
    console.error(" Change plan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to change payment plan: " + error.message,
      },
      { status: 500 }
    );
  }
}
