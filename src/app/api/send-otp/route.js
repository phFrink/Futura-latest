import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendOTPEmail } from "@/lib/email";

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
    const { email, purpose = "inquiry verification" } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Server configuration error" },
        { status: 500 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Delete any existing OTPs for this email
    await supabaseAdmin
      .from("otp_verifications")
      .delete()
      .eq("email", email.toLowerCase());

    // Save OTP to database
    const { data: otpRecord, error: dbError } = await supabaseAdmin
      .from("otp_verifications")
      .insert({
        email: email.toLowerCase().trim(),
        otp_code: otp,
        purpose: purpose,
        expires_at: expiresAt.toISOString(),
        verified: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error(" Database error:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create OTP: " + dbError.message,
        },
        { status: 400 }
      );
    }

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, purpose);
      console.log(`OTP sent to ${email}: ${otp}`);
    } catch (emailError) {
      console.error(" Email sending error:", emailError);
      // Delete the OTP record if email fails
      await supabaseAdmin
        .from("otp_verifications")
        .delete()
        .eq("otp_id", otpRecord.otp_id);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send OTP email. Please check your email configuration.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to your email",
      otp_id: otpRecord.otp_id,
      // In development, you can send the OTP in response (remove in production!)
      // otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send OTP: " + error.message,
      },
      { status: 500 }
    );
  }
}
