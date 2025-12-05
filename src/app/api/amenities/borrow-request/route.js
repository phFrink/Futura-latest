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

/**
 * POST /api/amenities/borrow-request
 * Create a new amenity borrow request with validation
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      amenity_id,
      contract_id,
      user_id,
      borrow_date,
      return_date,
      quantity,
      purpose,
      notes,
    } = body;

    // Validate required fields
    if (!amenity_id || !contract_id || !user_id || !borrow_date || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse quantity to ensure it's an integer
    const requestedQuantity = parseInt(quantity);

    // Validate quantity is positive
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    // Fetch the amenity details to check available quantity
    const { data: amenity, error: amenityError } = await supabaseAdmin
      .from("amenities")
      .select("amenity_id, name, available_quantity, total_quantity")
      .eq("amenity_id", amenity_id)
      .single();

    if (amenityError || !amenity) {
      return NextResponse.json(
        { success: false, error: "Amenity not found" },
        { status: 404 }
      );
    }

    // CRITICAL VALIDATION: Check if requested quantity is available
    console.log(`Borrow Request Validation:`, {
      amenity_name: amenity.name,
      requested_quantity: requestedQuantity,
      available_quantity: amenity.available_quantity,
      total_quantity: amenity.total_quantity,
    });

    if (requestedQuantity > amenity.available_quantity) {
      console.error(` Borrow request DENIED: Requested ${requestedQuantity} but only ${amenity.available_quantity} available`);
      return NextResponse.json(
        {
          success: false,
          error: `Only ${amenity.available_quantity} units available for ${amenity.name}`,
          available: amenity.available_quantity,
          requested: requestedQuantity,
        },
        { status: 400 }
      );
    }

    // Create the borrow request
    const { data, error } = await supabaseAdmin
      .from("amenity_borrow_requests")
      .insert([
        {
          amenity_id,
          contract_id,
          user_id,
          borrow_date,
          return_date: return_date || null,
          quantity: requestedQuantity,
          purpose: purpose || null,
          notes: notes || null,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating borrow request:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.log(`Borrow request created successfully:`, {
      request_id: data.id,
      amenity_id,
      quantity: requestedQuantity,
    });

    return NextResponse.json({
      success: true,
      data,
      message: "Borrow request submitted successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/amenities/borrow-request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
