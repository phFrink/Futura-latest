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

    // Handle Supabase Storage URLs
    if (document.file_path.includes('supabase.co/storage')) {
      // For Supabase Storage URLs, redirect to the URL directly
      try {
        const response = await fetch(document.file_path);
        if (!response.ok) {
          console.log(`Supabase file not accessible: ${document.file_path}`);
          return NextResponse.json(
            {
              success: false,
              error: "File not accessible",
              message: `Document file is not accessible from Supabase Storage. Status: ${response.status}`,
              debug: {
                documentId: documentId,
                fileName: document.file_name,
                filePath: document.file_path,
                storageResponse: response.status
              }
            },
            { status: 404 }
          );
        }

        const fileBuffer = await response.arrayBuffer();
        
        const headers = new Headers();
        headers.set('Content-Type', document.file_type || response.headers.get('content-type') || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${document.file_name}"`);
        headers.set('Content-Length', fileBuffer.byteLength.toString());

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: headers,
        });

      } catch (fetchError) {
        console.error(`Failed to fetch from Supabase Storage: ${document.file_path}`, fetchError);
        return NextResponse.json(
          {
            success: false,
            error: "Storage fetch error",
            message: `Unable to fetch document from storage: ${fetchError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // Legacy handling for local file paths (if any exist)
    const fs = await import('fs/promises');
    const { existsSync } = await import('fs');
    
    if (!existsSync(document.file_path)) {
      console.log(`Local file not found at: ${document.file_path}`);
      console.log(`Document ID: ${documentId}, File name: ${document.file_name}`);
      
      return NextResponse.json(
        {
          success: false,
          error: "File not found",
          message: `Document file has been removed or moved. Path: ${document.file_path}`,
          debug: {
            documentId: documentId,
            fileName: document.file_name,
            filePath: document.file_path,
            fileExists: false
          }
        },
        { status: 404 }
      );
    }

    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(document.file_path);
    } catch (readError) {
      console.error(`Failed to read local file: ${document.file_path}`, readError);
      return NextResponse.json(
        {
          success: false,
          error: "File read error",
          message: `Unable to read document file: ${readError.message}`,
        },
        { status: 500 }
      );
    }
    
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