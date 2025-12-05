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

// GET endpoint to fetch homeowners who have contracts
export async function GET(request) {
  try {
    console.log("API: Fetching homeowners with contracts");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get all contracts with property information
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from("property_contracts")
      .select(`
        client_name,
        client_email,
        client_phone,
        client_address,
        property_id,
        property_title,
        contract_id
      `)
      .in("contract_status", ["active", "pending", "completed"]) // Only active/valid contracts
      .order("client_name", { ascending: true });

    if (contractsError) {
      console.error("Contracts fetch error:", contractsError);
      return NextResponse.json(
        {
          success: false,
          error: contractsError.message,
          message: "Failed to fetch contracts: " + contractsError.message,
        },
        { status: 400 }
      );
    }

    // Group contracts by email to get homeowners with their properties
    const homeownerMap = new Map();

    for (const contract of contracts) {
      if (!homeownerMap.has(contract.client_email)) {
        // Try to find the corresponding auth user ID
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authData?.users?.find(
          (user) => user.email === contract.client_email
        );

        homeownerMap.set(contract.client_email, {
          id: authUser?.id || contract.client_email, // Use auth ID if available, otherwise email
          full_name: contract.client_name,
          email: contract.client_email,
          phone: contract.client_phone || "",
          address: contract.client_address || "",
          has_contract: true,
          properties: [],
        });
      }

      // Add property to homeowner's properties list
      const homeowner = homeownerMap.get(contract.client_email);
      if (contract.property_id && contract.property_title) {
        // Check if property not already added (avoid duplicates)
        if (!homeowner.properties.find(p => p.property_id === contract.property_id)) {
          homeowner.properties.push({
            property_id: contract.property_id,
            property_title: contract.property_title,
          });
        }
      }
    }

    const uniqueHomeowners = Array.from(homeownerMap.values());

    console.log(`Found ${uniqueHomeowners.length} homeowners with contracts`);

    return NextResponse.json({
      success: true,
      data: uniqueHomeowners,
      total: uniqueHomeowners.length,
    });
  } catch (error) {
    console.error("Fetch homeowners with contracts error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to fetch homeowners with contracts: " + error.message,
      },
      { status: 500 }
    );
  }
}
