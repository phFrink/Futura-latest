import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createNotification, NotificationTemplates, isCertifiedHomeowner } from "@/lib/notification-helper";

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
 * Calculate penalty for overdue payment
 * Penalty starts 3 days after due date
 * Default penalty rate: 3% per month (or from schedule.penalty_rate for higher rates like 6% next month)
 * Formula: (base_amount * penalty_rate / 30 days) * days_overdue
 */
function calculatePenalty(schedule) {
  // Parse due date and normalize to start of day
  const dueDate = new Date(schedule.due_date);
  dueDate.setHours(0, 0, 0, 0);

  // Get current date normalized to start of day
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Add 3 days grace period
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
  gracePeriodEnd.setHours(23, 59, 59, 999); // End of grace period day

  console.log("Penalty calculation dates:", {
    due_date: dueDate.toISOString(),
    grace_period_end: gracePeriodEnd.toISOString(),
    current_date: currentDate.toISOString(),
    is_overdue: currentDate > gracePeriodEnd,
  });

  // Check if payment is overdue (beyond grace period)
  if (currentDate <= gracePeriodEnd) {
    console.log("Within grace period - no penalty");
    return 0; // No penalty within grace period
  }

  // Calculate days overdue (after grace period)
  const msPerDay = 1000 * 60 * 60 * 24;
  const gracePeriodEndDate = new Date(gracePeriodEnd);
  gracePeriodEndDate.setHours(0, 0, 0, 0);
  const daysOverdue = Math.floor((currentDate - gracePeriodEndDate) / msPerDay);

  console.log("Days overdue:", daysOverdue);

  if (daysOverdue <= 0) {
    return 0;
  }

  // Get penalty rate from schedule or use default (3% per month = 0.03)
  const penaltyRate = schedule.penalty_rate || 0.03;

  // Calculate penalty based on scheduled amount or remaining amount
  const baseAmount = parseFloat(schedule.remaining_amount || schedule.scheduled_amount || 0);

  // Apply monthly penalty rate, converted to daily
  const dailyPenaltyRate = penaltyRate / 30;
  const penaltyAmount = baseAmount * dailyPenaltyRate * daysOverdue;

  console.log("Penalty calculation:", {
    base_amount: baseAmount,
    penalty_rate: penaltyRate,
    daily_rate: dailyPenaltyRate,
    days_overdue: daysOverdue,
    penalty_amount: penaltyAmount,
  });

  return Math.round(penaltyAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * POST /api/contracts/payment/walk-in
 * Process a walk-in payment for a contract installment
 */
export async function POST(request) {
  try {
    console.log("Walk-in payment API called");

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

    // Parse request body
    const body = await request.json();
    const {
      schedule_id,
      contract_id,
      payment_type = "full", // NEW: payment type
      amount_paid: received_amount_paid,
      penalty_paid: received_penalty_paid = 0,
      payment_method = "cash",
      reference_number = null,
      check_number = null,
      bank_name = null,
      processed_by = null,
      processed_by_name = "System",
      notes = null,
    } = body;

    console.log("Received payment details:", {
      schedule_id,
      contract_id,
      payment_type,
      received_amount_paid,
      received_penalty_paid,
      payment_method,
    });

    // Validate required fields
    if (!schedule_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule ID is required",
        },
        { status: 400 }
      );
    }

    // Get schedule details first to validate
    const { data: scheduleData, error: scheduleError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*, contract:property_contracts(*)")
      .eq("schedule_id", schedule_id)
      .single();

    if (scheduleError || !scheduleData) {
      console.error("Schedule not found:", scheduleError);
      return NextResponse.json(
        {
          success: false,
          error: "Payment schedule not found",
        },
        { status: 404 }
      );
    }

    // Calculate payment amount based on payment type
    const remainingAmount = parseFloat(scheduleData.remaining_amount || scheduleData.scheduled_amount);
    const monthlyInstallment = parseFloat(scheduleData.contract?.monthly_installment || 0);

    let amount_paid;

    if (payment_type === 'full') {
      // Full payment - pay entire remaining amount
      amount_paid = remainingAmount;
    } else {
      // Partial/Monthly/Weekly/Daily - use received amount with validation
      amount_paid = parseFloat(received_amount_paid);

      // Validate minimum (10% of monthly installment)
      const minAmount = monthlyInstallment * 0.1;
      if (amount_paid < minAmount) {
        return NextResponse.json(
          {
            success: false,
            error: `Minimum payment is ₱${minAmount.toFixed(2)}`,
          },
          { status: 400 }
        );
      }

      // Validate doesn't exceed remaining
      if (amount_paid > remainingAmount) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment exceeds remaining balance",
          },
          { status: 400 }
        );
      }
    }

    // Auto-calculate penalty (3 days after due date)
    const calculatedPenalty = calculatePenalty(scheduleData);
    const penalty_paid = calculatedPenalty; // Always use calculated penalty

    console.log("Payment calculation:", {
      payment_type,
      received_amount_paid,
      actual_amount_paid: amount_paid,
      penalty_paid,
      remaining_amount: remainingAmount,
      monthly_installment: monthlyInstallment,
    });

    // Validation: Ensure there's a remaining amount to pay
    if (remainingAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No remaining amount to pay for this installment",
        },
        { status: 400 }
      );
    }

    // Validation: Ensure payment amount is valid
    if (amount_paid <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment amount must be greater than zero",
        },
        { status: 400 }
      );
    }

    // Update penalty_amount in schedule if there's a calculated penalty
    if (calculatedPenalty > 0 && calculatedPenalty !== scheduleData.penalty_amount) {
      await supabaseAdmin
        .from("contract_payment_schedules")
        .update({ penalty_amount: calculatedPenalty })
        .eq("schedule_id", schedule_id);

      console.log("Updated penalty_amount in schedule:", calculatedPenalty);
    }

    // Call the database function to record payment with the correct amounts
    console.log("Proceeding to record payment with SERVER-CALCULATED amounts");

    const { data: paymentResult, error: paymentError } = await supabaseAdmin.rpc(
      "record_walk_in_payment",
      {
        p_schedule_id: schedule_id,
        p_amount_paid: parseFloat(amount_paid),
        p_penalty_paid: parseFloat(penalty_paid),
        p_payment_type: payment_type, // NEW: payment type parameter
        p_payment_method: payment_method,
        p_reference_number: reference_number,
        p_processed_by: processed_by,
        p_processed_by_name: processed_by_name,
        p_notes: notes,
      }
    );

    if (paymentError) {
      console.error("Payment recording error:", paymentError);
      return NextResponse.json(
        {
          success: false,
          error: paymentError.message || "Failed to record payment",
          details: process.env.NODE_ENV === "development" ? paymentError : undefined,
        },
        { status: 400 }
      );
    }

    console.log("Payment recorded:", paymentResult);

    // If we have check/bank details, update the transaction
    if (paymentResult && paymentResult.length > 0) {
      const transactionId = paymentResult[0].transaction_id;

      if (check_number || bank_name) {
        await supabaseAdmin
          .from("contract_payment_transactions")
          .update({
            check_number,
            bank_name,
          })
          .eq("transaction_id", transactionId);
      }
    }

    // Recalculate and update contract remaining balance after payment
    // Fetch all payment schedules to calculate total paid
    const { data: allSchedules } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("paid_amount, scheduled_amount, remaining_amount")
      .eq("contract_id", scheduleData.contract_id);

    if (allSchedules && allSchedules.length > 0) {
      const totalPaid = allSchedules.reduce(
        (sum, s) => sum + (parseFloat(s.paid_amount) || 0),
        0
      );
      const totalScheduled = allSchedules.reduce(
        (sum, s) => sum + (parseFloat(s.scheduled_amount) || 0),
        0
      );
      const totalRemaining = allSchedules.reduce(
        (sum, s) => sum + (parseFloat(s.remaining_amount) || 0),
        0
      );
      const downpaymentTotal = scheduleData.contract.downpayment_total || 0;

      // Calculate remaining balance: Total Downpayment - Total Paid
      // This equals the sum of all remaining_amount fields in schedules
      let newRemainingBalance = Math.max(0, totalRemaining);

      // Additional verification: If calculation shows all paid, set to 0
      if (totalPaid >= downpaymentTotal) {
        newRemainingBalance = 0;
      }

      // Update contract with new remaining balance
      const { error: updateError } = await supabaseAdmin
        .from("property_contracts")
        .update({
          remaining_balance: newRemainingBalance,
          remaining_downpayment: newRemainingBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("contract_id", scheduleData.contract_id);

      if (updateError) {
        console.error("Error updating remaining balance:", updateError);
      } else {
        console.log("Updated contract remaining_balance:", {
          total_paid: totalPaid,
          total_scheduled: totalScheduled,
          total_remaining: totalRemaining,
          downpayment_total: downpaymentTotal,
          new_remaining_balance: newRemainingBalance,
        });
      }
    }

    // Fetch updated schedule and contract data
    const { data: updatedSchedule } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select("*")
      .eq("schedule_id", schedule_id)
      .single();

    const { data: updatedContract } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("contract_id", scheduleData.contract_id)
      .single();

    // Send payment notification to homeowner if they are certified
    try {
      const isCertified = await isCertifiedHomeowner(supabaseAdmin, scheduleData.contract.user_id);

      if (isCertified && scheduleData.contract.user_id) {
        const paymentNotificationData = NotificationTemplates.PAYMENT_RECEIVED({
          amount: amount_paid,
          installmentNumber: updatedSchedule?.installment_number || 1,
          installmentDescription: `Installment #${updatedSchedule?.installment_number || 1}`,
          receiptNumber: paymentResult[0]?.transaction_id?.substring(0, 8).toUpperCase() || "Pending",
          currencySymbol: "₱",
          propertyTitle: scheduleData.contract?.property_id ? "Your Property" : "Your Contract",
        });

        await createNotification(supabaseAdmin, {
          ...paymentNotificationData,
          recipientId: scheduleData.contract.user_id,
          sourceTable: "contract_payment_transactions",
          sourceTableDisplayName: "Payment Receipt",
        });

        console.log("Payment notification sent to homeowner");
      }
    } catch (notificationError) {
      console.error("Warning: Failed to send payment notification:", notificationError);
      // Don't fail the payment if notification fails
    }

    console.log("Walk-in payment processed successfully");

    return NextResponse.json({
      success: true,
      message: "Walk-in payment processed successfully",
      data: {
        transaction: paymentResult[0],
        updated_schedule: updatedSchedule,
        updated_contract: updatedContract,
      },
    });
  } catch (error) {
    console.error("Walk-in payment API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contracts/payment/walk-in?schedule_id=xxx
 * Get payment details for a schedule
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("schedule_id");

    if (!scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule ID is required",
        },
        { status: 400 }
      );
    }

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

    // Get schedule with contract details
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .select(`
        *,
        contract:property_contracts(
          contract_id,
          contract_number,
          client_name,
          client_email,
          property_title
        )
      `)
      .eq("schedule_id", scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment schedule not found",
        },
        { status: 404 }
      );
    }

    // Get existing transactions for this schedule
    const { data: transactions } = await supabaseAdmin
      .from("contract_payment_transactions")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("transaction_date", { ascending: false });

    // Calculate current penalty (3 days after due date)
    const calculatedPenalty = calculatePenalty(schedule);

    // Calculate days overdue for display
    const dueDate = new Date(schedule.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const gracePeriodEnd = new Date(dueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
    gracePeriodEnd.setHours(23, 59, 59, 999);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const gracePeriodEndForCalc = new Date(gracePeriodEnd);
    gracePeriodEndForCalc.setHours(0, 0, 0, 0);

    const daysOverdue = Math.max(0, Math.floor((currentDate - gracePeriodEndForCalc) / (1000 * 60 * 60 * 24)));

    console.log("GET endpoint penalty info:", {
      due_date: schedule.due_date,
      grace_period_end: gracePeriodEnd.toISOString(),
      current_date: currentDate.toISOString(),
      days_overdue: daysOverdue,
      calculated_penalty: calculatedPenalty,
    });

    // Update penalty_amount in database if calculated penalty is different
    if (calculatedPenalty > 0 && calculatedPenalty !== schedule.penalty_amount) {
      await supabaseAdmin
        .from("contract_payment_schedules")
        .update({ penalty_amount: calculatedPenalty })
        .eq("schedule_id", scheduleId);

      console.log("Updated penalty_amount in schedule:", calculatedPenalty);
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule: {
          ...schedule,
          penalty_amount: calculatedPenalty, // Use the updated penalty value
          calculated_penalty: calculatedPenalty,
          days_overdue_after_grace: daysOverdue,
          grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
        },
        transactions: transactions || [],
      },
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
