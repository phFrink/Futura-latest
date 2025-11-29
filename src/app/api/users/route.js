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
    console.log("🔍 API: Fetching users with admin client...");

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get role filter from query params
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    // Use admin.listUsers() to get all registered users
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("❌ Supabase admin error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Found ${users.length} total users`);

    // Try to get profiles data and veterinary_staff data for additional info
    let profiles = [];
    let veterinaryStaff = [];
    let branches = [];

    try {
      const { data: profilesData } = await supabaseAdmin
        .from("profiles")
        .select("*");
      profiles = profilesData || [];
      console.log(`✅ Found ${profiles.length} profiles`);
    } catch (profilesErr) {
      console.log("⚠️ Profiles not available, using auth data only");
    }

    try {
      // Get veterinary staff data with branch information
      const { data: staffData } = await supabaseAdmin.from("veterinary_staff")
        .select(`
          staff_id,
          staff_email,
          staff_type,
          assigned_id,
          designated_branch_id,
          invitation_accepted,
          vet_owner_branches!designated_branch_id (
            branch_id,
            branch_name,
            branch_type
          )
        `);
      veterinaryStaff = staffData || [];
      console.log(`✅ Found ${veterinaryStaff.length} veterinary staff`);
    } catch (staffErr) {
      console.log("⚠️ Veterinary staff not available:", staffErr.message);
    }

    try {
      // Get branches data
      const { data: branchesData } = await supabaseAdmin
        .from("vet_owner_branches")
        .select("*");
      branches = branchesData || [];
      console.log(`✅ Found ${branches.length} branches`);
    } catch (branchErr) {
      console.log("⚠️ Branches not available:", branchErr.message);
    }

    // Format users with profile data and staff information
    const formattedUsers = users.map((user) => {
      const profile = profiles.find((p) => p.id === user.id);

      // Find staff record by email or assigned_id
      const staffRecord = veterinaryStaff.find(
        (staff) =>
          staff.staff_email === user.email || staff.assigned_id === user.id
      );

      // Determine role priority: staff_type > profile.role > user_metadata.role
      let userRole = profile?.role || user.user_metadata?.role || "home owner";
      let staffType = null;
      let branchInfo = null;
      let isStaff = false;

      if (staffRecord) {
        isStaff = true;
        staffType = staffRecord.staff_type; // 'resident' or 'assistant'
        userRole = staffType; // Use staff_type as role for veterinary staff
        branchInfo = {
          branch_id: staffRecord.designated_branch_id,
          branch_name: staffRecord.vet_owner_branches?.branch_name,
          branch_type: staffRecord.vet_owner_branches?.branch_type,
          invitation_accepted: staffRecord.invitation_accepted,
        };
      }

      // Determine user status from multiple sources (priority order):
      // 1. user_metadata.status (explicitly set)
      // 2. profile.status (from profiles table)
      // 3. banned_until (Supabase Auth ban status)
      // 4. default to "active"
      let userStatus = "active";
      if (user.user_metadata?.status) {
        userStatus = user.user_metadata.status;
      } else if (profile?.status) {
        userStatus = profile.status;
      } else if (user.banned_until) {
        // Check if ban is still active (in the future)
        const banDate = new Date(user.banned_until);
        const now = new Date();
        userStatus = banDate > now ? "inactive" : "active";
      }

      return {
        id: user.id,
        email: user.email,
        first_name: profile?.first_name || user.user_metadata?.first_name || "",
        middle_name: profile?.middle_name || user.user_metadata?.middle_name || "",
        last_name: profile?.last_name || user.user_metadata?.last_name || "",
        full_name:
          user.user_metadata?.full_name ||
          `${profile?.first_name || user.user_metadata?.first_name || ""} ${
            profile?.middle_name || user.user_metadata?.middle_name ? (profile?.middle_name || user.user_metadata?.middle_name) + ' ' : ''
          }${profile?.last_name || user.user_metadata?.last_name || ""}`.trim(),
        role: userRole,
        role_id: user.user_metadata?.role_id || null,
        user_metadata_role: user.user_metadata?.role || null, // Store original user_metadata.role
        staff_type: staffType, // 'resident', 'assistant', or null
        is_staff: isStaff, // Flag to identify staff members
        status: userStatus,
        avatar_url: profile?.avatar_url || user.user_metadata?.profilePhoto,
        profile_photo:
          user.user_metadata?.profile_photo ||
          profile?.avatar_url ||
          user.user_metadata?.profilePhoto ||
          null,
        phone: profile?.phone || user.user_metadata?.phone,
        address: profile?.address || user.user_metadata?.address || "",
        branch_info: branchInfo, // Branch information for staff
        created_at: user.created_at,
        updated_at: profile?.updated_at || user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
        email_verified: user.email_confirmed_at ? true : false,
        email_confirmed_at: user.email_confirmed_at,
        profile_complete: profile?.profile_complete || false,
        // Additional staff fields
        staff_id: staffRecord?.staff_id || null,
        invitation_accepted: staffRecord?.invitation_accepted || null,
      };
    });

    // Filter by role if specified (only check user_metadata.role)
    let filteredUsers = formattedUsers;
    if (roleFilter) {
      filteredUsers = formattedUsers.filter((user) => {
        // Only check user_metadata_role for filtering
        return (
          user.user_metadata_role &&
          user.user_metadata_role.toLowerCase() === roleFilter.toLowerCase()
        );
      });
      console.log(
        `✅ Filtered to ${filteredUsers.length} users with user_metadata.role: ${roleFilter}`
      );
    }

    console.log(`✅ Returning ${filteredUsers.length} formatted users`);

    return NextResponse.json({
      success: true,
      data: filteredUsers,
      total: filteredUsers.length,
      message: `Loaded ${filteredUsers.length} users successfully`,
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users: " + error.message },
      { status: 500 }
    );
  }
}

// POST endpoint to create new user
export async function POST(request) {
  try {
    const userData = await request.json();
    console.log("➕ API: Creating user:", userData.email);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (
      !userData.email ||
      !userData.password ||
      !userData.first_name ||
      !userData.last_name ||
      !userData.role
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message:
            "Email, password, first name, last name, and role are required",
        },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        email_confirm: true, // Auto-verify email
        user_metadata: {
          first_name: userData.first_name.trim(),
          middle_name: userData.middle_name?.trim() || null,
          last_name: userData.last_name.trim(),
          full_name: `${userData.first_name.trim()} ${userData.middle_name?.trim() ? userData.middle_name.trim() + ' ' : ''}${userData.last_name.trim()}`,
          display_name: `${userData.first_name.trim()} ${userData.middle_name?.trim() ? userData.middle_name.trim() + ' ' : ''}${userData.last_name.trim()}`,
          phone: userData.phone?.trim() || null,
          role: userData.role,
          role_id: userData.role_id || null,
          address: userData.address?.trim() || null,
          profile_photo: userData.profile_photo || null,
          status: userData.status || "active",
          email_verified: true,
          phone_verified: false,
        },
      });

    if (authError) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
          message: "Failed to create user: " + authError.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ User created successfully:", authData.user.id);

    // Create profile in profiles table if it exists
    try {
      const profileData = {
        id: authData.user.id,
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        phone: userData.phone?.trim() || null,
        address: userData.address?.trim() || null,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert(profileData);

      if (profileError) {
        console.log("⚠️ Profile creation warning:", profileError.message);
      } else {
        console.log("✅ Profile created successfully");
      }
    } catch (profileErr) {
      console.log("⚠️ Profile table not available or error:", profileErr.message);
    }

    // Return formatted user data
    const formattedUser = {
      id: authData.user.id,
      email: authData.user.email,
      first_name: userData.first_name.trim(),
      middle_name: userData.middle_name?.trim() || null,
      last_name: userData.last_name.trim(),
      role: userData.role,
      role_id: userData.role_id || null,
      status: "active",
      phone: userData.phone?.trim() || null,
      address: userData.address?.trim() || null,
      profile_photo: userData.profile_photo || null,
      created_at: authData.user.created_at,
      updated_at: authData.user.updated_at,
      last_sign_in_at: null,
      email_verified: true,
    };

    return NextResponse.json({
      success: true,
      data: formattedUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to create user: " + error.message,
      },
      { status: 500 }
    );
  }
}

// PUT endpoint to update user
export async function PUT(request) {
  try {
    const { userId, ...userData } = await request.json();
    console.log("✏️ [API] Updating user:", userId);
    console.log("📋 [API] Received user data:", userData);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      console.error("❌ [API] Supabase admin client not available");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!userId) {
      console.error("❌ [API] No userId provided");
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
          message: "User ID is required for update",
        },
        { status: 400 }
      );
    }

    // Prepare update data with user_metadata
    const updateData = {
      user_metadata: {
        first_name: userData.first_name?.trim(),
        middle_name: userData.middle_name?.trim() || null,
        last_name: userData.last_name?.trim(),
        full_name:
          userData.first_name && userData.last_name
            ? `${userData.first_name.trim()} ${userData.middle_name?.trim() ? userData.middle_name.trim() + ' ' : ''}${userData.last_name.trim()}`
            : undefined,
        display_name:
          userData.first_name && userData.last_name
            ? `${userData.first_name.trim()} ${userData.middle_name?.trim() ? userData.middle_name.trim() + ' ' : ''}${userData.last_name.trim()}`
            : undefined,
        role: userData.role,
        role_id: userData.role_id || null,
        phone: userData.phone?.trim() || null,
        address: userData.address?.trim() || null,
        profile_photo: userData.profile_photo || null,
        status: userData.status,
      },
    };

    console.log("📝 [API] Prepared user_metadata update:", updateData.user_metadata);

    // Add banned_until to the same update call if status is being changed
    if (userData.status !== undefined) {
      if (userData.status === "inactive") {
        console.log(`🔒 Setting banned_until for user: ${userId}`);
        const bannedUntil = new Date();
        bannedUntil.setFullYear(bannedUntil.getFullYear() + 100);
        updateData.banned_until = bannedUntil.toISOString();
      } else if (userData.status === "active") {
        console.log(`🔓 Removing ban for user: ${userId}`);
        updateData.banned_until = "none";
      }
    }

    // Update user in Supabase Auth (single call with all updates)
    console.log("📝 [API] Calling Supabase updateUserById for:", userId);
    console.log("📝 [API] Update data:", {
      status: userData.status,
      banned_until: updateData.banned_until,
      user_metadata: updateData.user_metadata,
    });

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

    if (authError) {
      console.error("❌ [API] Auth update error:", authError);
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
          message: "Failed to update user: " + authError.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ [API] User updated successfully in Auth:", userId);
    console.log("✅ [API] Updated user_metadata:", authData.user.user_metadata);
    console.log("✅ [API] User metadata status:", authData.user.user_metadata?.status);
    console.log("✅ [API] Banned until:", authData.user.banned_until || "not banned");

    // Update profile in profiles table if it exists
    try {
      const profileUpdate = {
        first_name: userData.first_name?.trim(),
        last_name: userData.last_name?.trim(),
        phone: userData.phone?.trim() || null,
        address: userData.address?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Only add status if it's provided
      if (userData.status !== undefined) {
        profileUpdate.status = userData.status;
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, ...profileUpdate });

      if (profileError) {
        console.log("⚠️ Profile update warning:", profileError.message);
      } else {
        console.log("✅ Profile updated successfully");
      }
    } catch (profileErr) {
      console.log("⚠️ Profile table not available or error:", profileErr.message);
    }

    // Return formatted user data
    const formattedUser = {
      id: authData.user.id,
      email: authData.user.email,
      first_name: authData.user.user_metadata?.first_name || "",
      middle_name: authData.user.user_metadata?.middle_name || "",
      last_name: authData.user.user_metadata?.last_name || "",
      role: authData.user.user_metadata?.role || "",
      role_id: authData.user.user_metadata?.role_id || null,
      status: authData.user.user_metadata?.status || userData.status || "active",
      phone: authData.user.user_metadata?.phone || null,
      address: authData.user.user_metadata?.address || null,
      profile_photo: authData.user.user_metadata?.profile_photo || null,
      created_at: authData.user.created_at,
      updated_at: authData.user.updated_at,
      last_sign_in_at: authData.user.last_sign_in_at,
      email_verified: authData.user.email_confirmed_at ? true : false,
      email_confirmed_at: authData.user.email_confirmed_at,
    };

    return NextResponse.json({
      success: true,
      data: formattedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("❌ Update user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to update user: " + error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete user
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("🗑️ API: Deleting user:", userId);

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
          message: "User ID is required for deletion",
        },
        { status: 400 }
      );
    }

    // Delete user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (authError) {
      console.error("❌ Auth delete error:", authError);
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
          message: "Failed to delete user: " + authError.message,
        },
        { status: 400 }
      );
    }

    console.log("✅ User deleted successfully:", userId);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to delete user: " + error.message,
      },
      { status: 500 }
    );
  }
}
