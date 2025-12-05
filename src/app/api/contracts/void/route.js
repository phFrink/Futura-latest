import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    const { contract_id, reason } = await request.json();

    console.log("API: Voiding contract:", contract_id);

    if (!contract_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Contract ID is required",
          message: "Contract ID is required to void a contract",
        },
        { status: 400 }
      );
    }

    // 1. Get contract details first
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("property_contracts")
      .select("*")
      .eq("contract_id", contract_id)
      .single();

    if (contractError || !contract) {
      console.error("Error fetching contract:", contractError);
      return NextResponse.json(
        {
          success: false,
          error: "Contract not found",
          message: "Failed to find contract",
        },
        { status: 404 }
      );
    }

    // 2. Update contract status to 'voided'
    const { error: updateError } = await supabaseAdmin
      .from("property_contracts")
      .update({
        contract_status: "voided",
        voided_at: new Date().toISOString(),
        void_reason: reason || "Non-payment for 3 consecutive months",
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", contract_id);

    if (updateError) {
      console.error("Error updating contract:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          message: "Failed to void contract: " + updateError.message,
        },
        { status: 400 }
      );
    }

    console.log("Contract status updated to 'voided'");

    // 3. Delete associated billing/payment schedules
    try {
      // Try to delete from payment_schedule table
      const { error: scheduleDeleteError } = await supabaseAdmin
        .from("payment_schedule")
        .delete()
        .eq("contract_id", contract_id);

      if (scheduleDeleteError) {
        console.warn(
          " Warning: Failed to delete payment schedules:",
          scheduleDeleteError.message
        );
      } else {
        console.log("Payment schedules deleted");
      }

      // Try to delete from billing table if it exists
      const { error: billingDeleteError } = await supabaseAdmin
        .from("billing")
        .delete()
        .eq("contract_id", contract_id);

      if (billingDeleteError) {
        console.warn(
          " Warning: Failed to delete billing records:",
          billingDeleteError.message
        );
      } else {
        console.log("Billing records deleted");
      }

      // Try to delete from installment_payments table if it exists
      const { error: installmentDeleteError } = await supabaseAdmin
        .from("installment_payments")
        .delete()
        .eq("contract_id", contract_id);

      if (installmentDeleteError) {
        console.warn(
          "Warning: Failed to delete installment payments:",
          installmentDeleteError.message
        );
      } else {
        console.log("Installment payments deleted");
      }
    } catch (deleteError) {
      console.warn(" Warning during deletion:", deleteError);
      // Don't fail the void operation if deletion fails
    }

    // 4. Update property status back to available if property_id exists
    if (contract.property_id) {
      try {
        const { error: propertyError } = await supabaseAdmin
          .from("property_info_tbl")
          .update({
            property_availability: "available",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.property_id);

        if (propertyError) {
          console.warn(
            "Warning: Failed to update property status:",
            propertyError.message
          );
        } else {
          console.log("Property status updated to 'available'");
        }
      } catch (propertyError) {
        console.warn("Warning updating property:", propertyError);
      }
    }

    console.log("Contract voided successfully");

    return NextResponse.json({
      success: true,
      message: "Contract voided successfully and billing records deleted",
      data: {
        contract_id,
        status: "voided",
        voided_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Void contract error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to void contract: " + error.message,
      },
      { status: 500 }
    );
  }
}
