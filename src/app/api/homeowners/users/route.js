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

// GET endpoint to fetch homeowner users
export async function GET(request) {
  try {
    console.log("API: Fetching homeowner users");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Try to fetch from auth users with homeowner role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    let homeowners = [];

    if (!authError && authData?.users) {
      // Filter users with role = "home owner"
      const homeownerUsers = authData.users.filter(
        (user) => user.user_metadata?.role?.toLowerCase() === "home owner"
      );

      homeowners = homeownerUsers.map((user) => ({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email.split("@")[0],
        email: user.email,
        phone: user.user_metadata?.phone || user.phone || "",
        address: user.user_metadata?.address || "",
        user_metadata: user.user_metadata,
      }));

      console.log(`Found ${homeowners.length} homeowner users from auth`);
    } else {
      console.log("Could not fetch from auth, trying buyer_home_owner_tbl");
    }

    // Fallback: Also fetch from buyer_home_owner_tbl and merge
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from("buyer_home_owner_tbl")
      .select("*")
      .eq("status", "active")
      .order("full_name", { ascending: true });

    if (!tableError && tableData && tableData.length > 0) {
      // Add homeowners from table that aren't already in auth list
      const existingEmails = new Set(homeowners.map((h) => h.email));

      const tableHomeowners = tableData
        .filter((h) => !existingEmails.has(h.email))
        .map((h) => ({
          id: h.id,
          full_name: h.full_name,
          email: h.email,
          phone: h.phone || "",
          address: "", // buyer_home_owner_tbl doesn't have address field
          source: "table",
        }));

      homeowners = [...homeowners, ...tableHomeowners];
      console.log(`Added ${tableHomeowners.length} homeowners from buyer_home_owner_tbl`);
    }

    console.log(`Total homeowners: ${homeowners.length}`);

    return NextResponse.json({
      success: true,
      data: homeowners,
      total: homeowners.length,
    });
  } catch (error) {
    console.error("Fetch homeowner users error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch homeowner users: " + error.message,
      },
      { status: 500 }
    );
  }
}
