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

export async function GET(request) {
  try {
    console.log("🔍 API: Fetching roles...");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Fetch roles from the role table
    const { data: roles, error } = await supabaseAdmin
      .from("role")
      .select("role_id, rolename")
      .order("role_id", { ascending: true });

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Found ${roles?.length || 0} roles`);
    console.log("Role structure:", roles?.[0]);

    return NextResponse.json({
      success: true,
      data: roles || [],
      total: roles?.length || 0,
      message: `Loaded ${roles?.length || 0} roles successfully`,
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log("➕ API: Creating new role...");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { rolename } = body;

    if (!rolename) {
      return NextResponse.json(
        { success: false, message: "Role name is required" },
        { status: 400 }
      );
    }

    // Insert new role
    const { data, error } = await supabaseAdmin
      .from("role")
      .insert([{ rolename }])
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Role created successfully:", data);

    return NextResponse.json({
      success: true,
      data: data[0],
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create role: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    console.log("✏️ API: Updating role...");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { roleId, rolename } = body;

    if (!roleId) {
      return NextResponse.json(
        { success: false, message: "Role ID is required" },
        { status: 400 }
      );
    }

    if (!rolename) {
      return NextResponse.json(
        { success: false, message: "Role name is required" },
        { status: 400 }
      );
    }

    // Update role
    const { data, error } = await supabaseAdmin
      .from("role")
      .update({ rolename })
      .eq("role_id", roleId)
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Role updated successfully:", data);

    return NextResponse.json({
      success: true,
      data: data[0],
      message: "Role updated successfully",
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update role: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    console.log("🗑️ API: Deleting role...");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return NextResponse.json(
        { success: false, message: "Role ID is required" },
        { status: 400 }
      );
    }

    // Delete role
    const { error } = await supabaseAdmin
      .from("role")
      .delete()
      .eq("role_id", roleId);

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Role deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete role: " + error.message },
      { status: 500 }
    );
  }
}
