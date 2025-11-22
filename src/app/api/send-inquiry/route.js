import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateInquiryRecaptcha } from "@/lib/recaptcha";

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

// In-memory rate limiting (for basic protection)
const rateLimitMap = new Map();

// Check rate limit per email
function checkRateLimit(email) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 5; // Max 5 inquiries per hour per email

  const key = email.toLowerCase();
  const requests = rateLimitMap.get(key) || [];

  // Filter out old requests outside the time window
  const recentRequests = requests.filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (recentRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((recentRequests[0] + windowMs - now) / 1000 / 60), // minutes
    };
  }

  // Add current request timestamp
  recentRequests.push(now);
  rateLimitMap.set(key, recentRequests);

  return {
    allowed: true,
    remaining: maxRequests - recentRequests.length,
    resetTime: 0,
  };
}

// POST endpoint to create inquiry
export async function POST(request) {
  try {
    const inquiryData = await request.json();
    console.log("💬 API: Creating inquiry:", inquiryData);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (
      !inquiryData.property_id ||
      !inquiryData.client_firstname ||
      !inquiryData.client_lastname ||
      !inquiryData.client_email ||
      !inquiryData.message
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Property, client details, and message are required",
        },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA token (if provided)
    if (inquiryData.recaptcha_token) {
      const recaptchaResult = await validateInquiryRecaptcha(
        inquiryData.recaptcha_token,
        "inquiry_submit",
        0.5 // Minimum score threshold
      );

      if (!recaptchaResult.valid) {
        console.log("❌ reCAPTCHA verification failed:", {
          score: recaptchaResult.score,
          message: recaptchaResult.message,
        });

        return NextResponse.json(
          {
            success: false,
            error: "Security verification failed",
            message: recaptchaResult.message,
            score: recaptchaResult.score,
          },
          { status: 403 }
        );
      }

      console.log("✅ reCAPTCHA verified successfully:", {
        score: recaptchaResult.score,
      });
    } else {
      console.warn(
        "⚠️ No reCAPTCHA token provided - proceeding without verification"
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(inquiryData.client_email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: `Too many inquiries. Please try again in ${rateLimit.resetTime} minutes.`,
        },
        { status: 429 }
      );
    }

    console.log(`📊 Rate limit: ${rateLimit.remaining} requests remaining`);

    // Check for duplicate inquiry (same email + property in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingInquiries } = await supabaseAdmin
      .from("client_inquiries")
      .select("inquiry_id")
      .eq("client_email", inquiryData.client_email.trim().toLowerCase())
      .eq("property_id", inquiryData.property_id)
      .gte("created_at", oneDayAgo);

    if (existingInquiries && existingInquiries.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate inquiry",
          message:
            "You have already submitted an inquiry for this property recently. Our team will contact you soon.",
        },
        { status: 409 }
      );
    }

    // Insert inquiry into database
    const { data: inquiry, error: insertError } = await supabaseAdmin
      .from("client_inquiries")
      .insert({
        property_id: inquiryData.property_id,
        property_title: inquiryData.property_title || null,
        user_id: inquiryData.user_id || null,
        role_id: "49d60eb8-184b-48b3-9f4f-d002d3008ea7" || null,
        client_firstname: inquiryData.client_firstname.trim(),
        client_lastname: inquiryData.client_lastname.trim(),
        client_email: inquiryData.client_email.trim().toLowerCase(),
        client_phone: inquiryData.client_phone?.trim() || null,
        message: inquiryData.message.trim(),
        is_authenticated: inquiryData.is_authenticated || false,
        status: "pending", // Default status
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          message: "Failed to create inquiry: " + insertError.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ Inquiry created successfully:", inquiry.inquiry_id);

    // Create notification for new inquiry
    try {
      const fullName = `${inquiryData.client_firstname} ${inquiryData.client_lastname}`;
      const { data: notificationData, error: notificationError } =
        await supabaseAdmin
          .from("notifications_tbl")
          .insert({
            notification_type: "inquiry_received",
            source_table: "client_inquiries",
            source_table_display_name: "Client Inquiry",
            source_record_id: null,
            title: "New Property Inquiry",
            message: `${fullName} (${
              inquiryData.client_email
            }) sent an inquiry about ${
              inquiryData.property_title || "a property"
            }.`,
            icon: "❓",
            priority: "normal",
            status: "unread",
            recipient_role: "sales representative",
            data: {
              inquiry_id: inquiry.inquiry_id,
              property_id: inquiryData.property_id,
              property_title: inquiryData.property_title,
              client_name: fullName,
              client_email: inquiryData.client_email,
              client_phone: inquiryData.client_phone,
              message: inquiryData.message,
              created_at: new Date().toISOString(),
            },
            action_url: "/client-inquiries",
          })
          .select();

      if (notificationError) {
        console.error("❌ Notification insert error:", notificationError);
      } else {
        console.log("✅ Notification created for inquiry:", inquiry.inquiry_id);
      }
    } catch (notificationError) {
      console.error("❌ Exception creating notification:", notificationError);
      // Don't fail the inquiry if notification fails
    }

    return NextResponse.json({
      success: true,
      data: inquiry,
      message: "Inquiry sent successfully! Our team will contact you soon.",
    });
  } catch (error) {
    console.error("❌ Send inquiry error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to send inquiry: " + error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch inquiries
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const clientEmail = searchParams.get("clientEmail");

    console.log("🔍 API: Fetching inquiries for user:", userId || clientEmail);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from("client_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by user_id or client_email
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (clientEmail) {
      query = query.eq("client_email", clientEmail);
    } else {
      query = query;
    }

    const { data: inquiries, error } = await query;

    if (error) {
      console.error("❌ Fetch error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          message: "Failed to fetch inquiries: " + error.message,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Found ${inquiries.length} inquiries`);

    return NextResponse.json({
      success: true,
      data: inquiries,
      total: inquiries.length,
      message: `Found ${inquiries.length} inquiries`,
    });
  } catch (error) {
    console.error("❌ Fetch inquiries error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch inquiries: " + error.message,
      },
      { status: 500 }
    );
  }
}
