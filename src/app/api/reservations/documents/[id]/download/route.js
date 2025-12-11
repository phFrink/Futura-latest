import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

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
        { error: "Server configuration error" },
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

    if (!existsSync(document.file_path)) {
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
          message: "Document file has been removed or moved",
        },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(document.file_path);
    
    const headers = new Headers();
    headers.set('Content-Type', document.file_type);
    headers.set('Content-Disposition', `attachment; filename="${document.file_name}"`);
    headers.set('Content-Length', document.file_size.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error("Download document error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to download document: " + error.message,
      },
      { status: 500 }
    );
  }
}