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
 * GET /api/amenities
 * Get all amenities
 */
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("amenities")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching amenities:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in GET /api/amenities:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/amenities
 * Create a new amenity
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
      name,
      category,
      description,
      total_quantity,
      available_quantity,
      status,
    } = body;

    // Validate required fields
    if (!name || !category || total_quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, category, total_quantity" },
        { status: 400 }
      );
    }

    // Create amenity
    const { data, error } = await supabaseAdmin
      .from("amenities")
      .insert([
        {
          name,
          category,
          description: description || null,
          total_quantity: parseInt(total_quantity),
          available_quantity: available_quantity !== undefined ? parseInt(available_quantity) : parseInt(total_quantity),
          status: status || "available",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating amenity:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Amenity created successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/amenities:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/amenities
 * Update an existing amenity
 */
export async function PATCH(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amenity_id, ...updateData } = body;

    if (!amenity_id) {
      return NextResponse.json(
        { success: false, error: "amenity_id is required" },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Convert quantities to integers if provided
    if (updateData.total_quantity !== undefined) {
      updateData.total_quantity = parseInt(updateData.total_quantity);
    }
    if (updateData.available_quantity !== undefined) {
      updateData.available_quantity = parseInt(updateData.available_quantity);
    }

    const { data, error } = await supabaseAdmin
      .from("amenities")
      .update(updateData)
      .eq("amenity_id", amenity_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating amenity:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Amenity updated successfully",
    });
  } catch (error) {
    console.error("Error in PATCH /api/amenities:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/amenities
 * Delete an amenity
 */
export async function DELETE(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const amenity_id = searchParams.get("amenity_id");

    if (!amenity_id) {
      return NextResponse.json(
        { success: false, error: "amenity_id is required" },
        { status: 400 }
      );
    }

    // Check if amenity has any borrow requests
    const { data: borrowRequests, error: checkError } = await supabaseAdmin
      .from("amenity_borrow_requests")
      .select("id")
      .eq("amenity_id", amenity_id)
      .limit(1);

    if (checkError) {
      console.error("Error checking borrow requests:", checkError);
    }

    if (borrowRequests && borrowRequests.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete amenity with existing borrow requests. Please delete the requests first or set the amenity status to 'unavailable'.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("amenities")
      .delete()
      .eq("amenity_id", amenity_id);

    if (error) {
      console.error("Error deleting amenity:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Amenity deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/amenities:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
