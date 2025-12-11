import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

export async function GET(request, { params }) {
  try {
    const { id: documentId } = params;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          success: false,
          error: "Server configuration error" 
        },
        { status: 500 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing document ID",
          message: "Document ID is required",
        },
        { status: 400 }
      );
    }

    const { data: document, error } = await supabaseAdmin
      .from("reservation_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !document) {
      return NextResponse.json(
        {
          success: false,
          error: "Document not found",
          message: "Invalid document ID",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document: document
    });

  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to get document: " + error.message,
      },
      { status: 500 }
    );
  }
}