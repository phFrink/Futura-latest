import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET - Fetch all homeowner announcements
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    let query = supabase
      .from("homeowner_announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_date", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching announcements:", error);
      return NextResponse.json(
        { error: "Failed to fetch announcements" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create new homeowner announcement
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.content || !body.image_url) {
      return NextResponse.json(
        { error: "Title, content, and image are required" },
        { status: 400 }
      );
    }

    const announcementData = {
      title: body.title,
      content: body.content,
      image_url: body.image_url,
      category: body.category || "general",
      priority: body.priority || "normal",
      target_audience: body.target_audience || "all_homeowners",
      property_id: body.property_id || null,
      author: body.author || "Admin",
      author_role: body.author_role || "admin",
      status: body.status || "draft",
      is_pinned: body.is_pinned || false,
      publish_date: body.status === "published" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("homeowner_announcements")
      .insert([announcementData])
      .select();

    if (error) {
      console.error("Error creating announcement:", error);
      return NextResponse.json(
        { error: "Failed to create announcement" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Announcement created successfully", data: data[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT - Update homeowner announcement
export async function PUT(request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    const updateData = {
      title: body.title,
      content: body.content,
      image_url: body.image_url,
      category: body.category,
      priority: body.priority,
      target_audience: body.target_audience,
      property_id: body.property_id || null,
      author: body.author,
      status: body.status,
      is_pinned: body.is_pinned,
    };

    // If status is being changed to published, update publish_date
    if (body.status === "published") {
      updateData.publish_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("homeowner_announcements")
      .update(updateData)
      .eq("id", body.id)
      .select();

    if (error) {
      console.error("Error updating announcement:", error);
      return NextResponse.json(
        { error: "Failed to update announcement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Announcement updated successfully",
      data: data[0],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Delete homeowner announcement
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("homeowner_announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting announcement:", error);
      return NextResponse.json(
        { error: "Failed to delete announcement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
