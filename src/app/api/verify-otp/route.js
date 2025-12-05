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

const supabaseAdmin = createSupabaseAdmin();

export async function POST(request) {
  try {
    const { email, otp_code } = await request.json();

    if (!email || !otp_code) {
      return NextResponse.json(
        { success: false, message: "Email and OTP code are required" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Server configuration error" },
        { status: 500 }
      );
    }

    // Debug: Log what we're searching for
    const searchEmail = email.toLowerCase().trim();
    const searchCode = otp_code.trim();
    console.log("   Searching for OTP:");
    console.log("   Email:", searchEmail);
    console.log("   Code:", searchCode);

    // First, check if ANY OTP exists for this email
    const { data: allOtps, error: allError } = await supabaseAdmin
      .from("otp_verifications")
      .select("*")
      .eq("email", searchEmail);

    console.log("All OTPs for this email:", allOtps);

    // Find matching OTP that is not verified and not expired
    const { data: otpRecord, error } = await supabaseAdmin
      .from("otp_verifications")
      .select("*")
      .eq("email", searchEmail)
      .eq("otp_code", searchCode)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !otpRecord) {
      console.error("OTP verification failed:", error);

      // Provide more specific error messages
      if (allOtps && allOtps.length > 0) {
        const otpMatch = allOtps.find(otp => otp.otp_code === searchCode);
        if (otpMatch) {
          if (otpMatch.verified) {
            return NextResponse.json(
              {
                success: false,
                message: "This OTP has already been used",
              },
              { status: 400 }
            );
          }
          if (new Date(otpMatch.expires_at) < new Date()) {
            return NextResponse.json(
              {
                success: false,
                message: "This OTP has expired. Please request a new one.",
              },
              { status: 400 }
            );
          }
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP code. Please check and try again.",
        },
        { status: 400 }
      );
    }

    // Delete the OTP record after successful verification
    const { error: deleteError } = await supabaseAdmin
      .from("otp_verifications")
      .delete()
      .eq("otp_id", otpRecord.otp_id);

    if (deleteError) {
      console.error("Delete OTP error:", deleteError);
    }

    console.log(`OTP verified successfully for ${email}`);

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      email: otpRecord.email,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify OTP: " + error.message,
      },
      { status: 500 }
    );
  }
}
