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

// POST endpoint to create contract and payment schedules
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      reservation_id,
      payment_plan_months,
      payment_frequency = 'monthly', // NEW: monthly, weekly, daily (default: monthly)
      allow_partial_payments = false // NEW: allow flexible payments (default: false)
    } = body;

    console.log("📝 API: Creating contract for reservation:", reservation_id);
    console.log("📅 Payment plan months:", payment_plan_months);
    console.log("🔄 Payment frequency:", payment_frequency);
    console.log("💰 Allow partial payments:", allow_partial_payments);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!reservation_id || !payment_plan_months) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Please provide reservation_id and payment_plan_months",
        },
        { status: 400 }
      );
    }

    // Validate payment plan months (1-60)
    if (payment_plan_months < 1 || payment_plan_months > 60) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment plan",
          message: "Payment plan must be between 1 and 60 months",
        },
        { status: 400 }
      );
    }

    // Validate payment frequency
    if (!['monthly', 'weekly', 'daily'].includes(payment_frequency)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment frequency",
          message: "Payment frequency must be monthly, weekly, or daily",
        },
        { status: 400 }
      );
    }

    // Fetch reservation with property details
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from("property_reservations")
      .select(`
        *,
        property_info:property_info_tbl!property_id(
          property_price,
          property_downprice
        )
      `)
      .eq("reservation_id", reservation_id)
      .eq("status", "approved")
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation not found",
          message: "Reservation not found or not approved",
        },
        { status: 404 }
      );
    }

    // Check if contract already exists for this reservation
    const { data: existingContract } = await supabaseAdmin
      .from("property_contracts")
      .select("contract_id, contract_number")
      .eq("reservation_id", reservation_id)
      .single();

    if (existingContract) {
      return NextResponse.json(
        {
          success: false,
          error: "Contract already exists",
          message: `Contract ${existingContract.contract_number} already exists for this reservation`,
          data: existingContract,
        },
        { status: 400 }
      );
    }

    // Calculate contract amounts
    const propertyPrice = reservation.property_info?.property_price || 0;
    const reservationFeePaid = reservation.reservation_fee || 0;
    const downpaymentTotal = propertyPrice * 0.10;
    const remainingDownpayment = downpaymentTotal - reservationFeePaid;
    const bankFinancingAmount = propertyPrice * 0.90;

    // Calculate installment amount and payment count based on frequency
    let installmentAmount;
    let paymentCount;

    switch(payment_frequency) {
      case 'weekly':
        paymentCount = Math.ceil(payment_plan_months * 4.33); // ~4.33 weeks per month
        installmentAmount = remainingDownpayment / paymentCount;
        break;
      case 'daily':
        paymentCount = Math.ceil(payment_plan_months * 30); // ~30 days per month
        installmentAmount = remainingDownpayment / paymentCount;
        break;
      case 'monthly':
      default:
        paymentCount = payment_plan_months;
        installmentAmount = remainingDownpayment / payment_plan_months;
        break;
    }

    const monthlyInstallment = remainingDownpayment / payment_plan_months; // Keep for backward compatibility

    console.log("💰 Calculations:", {
      propertyPrice,
      downpaymentTotal,
      reservationFeePaid,
      remainingDownpayment,
      payment_frequency,
      payment_plan_months,
      paymentCount,
      installmentAmount,
      monthlyInstallment,
      bankFinancingAmount,
    });

    // Generate contract number from tracking number
    const trackingPart = reservation.tracking_number
      ? reservation.tracking_number.replace('TRK-', '')
      : reservation.reservation_id.substring(0, 8).toUpperCase();
    const contractNumber = `CTS-${new Date().getFullYear()}-${trackingPart}`;

    // Calculate payment dates
    const contractSignedDate = new Date();
    const firstInstallmentDate = new Date();
    firstInstallmentDate.setMonth(firstInstallmentDate.getMonth() + 1);

    const finalInstallmentDate = new Date(firstInstallmentDate);
    finalInstallmentDate.setMonth(finalInstallmentDate.getMonth() + payment_plan_months - 1);

    // Create contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("property_contracts")
      .insert({
        contract_number: contractNumber,
        reservation_id: reservation_id,
        property_id: reservation.property_id,
        property_title: reservation.property_title,
        property_price: propertyPrice,
        user_id: reservation.user_id,
        client_name: reservation.client_name,
        client_email: reservation.client_email,
        client_phone: reservation.client_phone,
        client_address: reservation.client_address,
        total_contract_price: propertyPrice,
        downpayment_percentage: 10.00,
        downpayment_total: downpaymentTotal,
        reservation_fee_paid: reservationFeePaid,
        remaining_downpayment: remainingDownpayment,
        payment_plan_months: payment_plan_months,
        monthly_installment: monthlyInstallment,
        bank_financing_percentage: 90.00,
        bank_financing_amount: bankFinancingAmount,
        downpayment_status: remainingDownpayment > 0 ? 'in_progress' : 'completed',
        total_paid_amount: 0,
        remaining_balance: remainingDownpayment,
        contract_status: 'active',
        contract_signed_date: contractSignedDate.toISOString(),
        first_installment_date: firstInstallmentDate.toISOString(),
        final_installment_date: finalInstallmentDate.toISOString(),
      })
      .select()
      .single();

    if (contractError) {
      console.error("❌ Contract creation error:", contractError);
      return NextResponse.json(
        {
          success: false,
          error: contractError.message,
          message: "Failed to create contract: " + contractError.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ Contract created:", contract.contract_id);

    // Generate payment schedules
    const paymentSchedules = [];

    // Adjust grace period based on frequency
    const gracePeriodDays = payment_frequency === 'daily' ? 0 :
                           payment_frequency === 'weekly' ? 1 : 3;

    for (let i = 1; i <= paymentCount; i++) {
      const dueDate = new Date(firstInstallmentDate);

      // Calculate due date based on frequency
      switch(payment_frequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + ((i - 1) * 7)); // Add weeks
          break;
        case 'daily':
          dueDate.setDate(dueDate.getDate() + (i - 1)); // Add days
          break;
        case 'monthly':
        default:
          dueDate.setMonth(dueDate.getMonth() + (i - 1)); // Add months
          break;
      }

      const gracePeriodEndDate = new Date(dueDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);

      // Determine period type and description
      const periodType = payment_frequency === 'daily' ? 'day' :
                        payment_frequency === 'weekly' ? 'week' : 'month';
      const frequencyLabel = payment_frequency.charAt(0).toUpperCase() + payment_frequency.slice(1);

      paymentSchedules.push({
        contract_id: contract.contract_id,
        installment_number: i,
        installment_description: `${frequencyLabel} Payment ${i} of ${paymentCount}`,
        scheduled_amount: installmentAmount,
        paid_amount: 0,
        remaining_amount: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        payment_status: 'pending',
        is_overdue: false,
        days_overdue: 0,
        penalty_amount: 0,
      });
    }

    // Insert payment schedules
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from("contract_payment_schedules")
      .insert(paymentSchedules)
      .select();

    if (schedulesError) {
      console.error("❌ Payment schedules error:", schedulesError);

      // Rollback: Delete the contract
      await supabaseAdmin
        .from("property_contracts")
        .delete()
        .eq("contract_id", contract.contract_id);

      return NextResponse.json(
        {
          success: false,
          error: schedulesError.message,
          message: "Failed to create payment schedules: " + schedulesError.message,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Created ${schedules.length} payment schedules`);

    // Return contract with payment schedules
    return NextResponse.json({
      success: true,
      data: {
        contract: contract,
        payment_schedules: schedules,
      },
      message: "Contract created successfully with payment schedule!",
    });

  } catch (error) {
    console.error("❌ Create contract error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to create contract: " + error.message,
      },
      { status: 500 }
    );
  }
}
