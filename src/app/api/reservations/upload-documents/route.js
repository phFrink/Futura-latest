import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { uploadFileToStorage } from '@/lib/storage';

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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const reservationId = formData.get('reservationId');
    const files = formData.getAll('documents');

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!reservationId || !files.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing reservation ID or files",
          message: "Reservation ID and documents are required",
        },
        { status: 400 }
      );
    }

    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from("property_reservations")
      .select("*")
      .eq("reservation_id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation not found",
          message: "Invalid reservation ID",
        },
        { status: 404 }
      );
    }

    if (reservation.status !== 'pre-approved') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
          message: "Documents can only be uploaded for pre-approved reservations",
        },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];

    for (const file of files) {
      if (!file.name) continue;

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid file type",
            message: "Only PDF and Word documents are allowed",
          },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: "File too large",
            message: "File size must be less than 10MB",
          },
          { status: 400 }
        );
      }

      // Upload to Supabase Storage
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${file.name}`;
      const folderPath = `reservation-documents/${reservationId}`;
      
      const uploadResult = await uploadFileToStorage(file, 'futura', folderPath, fileName);
      
      if (!uploadResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Upload failed",
            message: `Failed to upload ${file.name}: ${uploadResult.error}`,
          },
          { status: 500 }
        );
      }

      const documentRecord = {
        reservation_id: reservationId,
        file_name: file.name,
        file_path: uploadResult.data.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_at: new Date().toISOString(),
      };

      const { data: document, error: documentError } = await supabaseAdmin
        .from("reservation_documents")
        .insert(documentRecord)
        .select()
        .single();

      if (documentError) {
        console.error("Document record creation error:", documentError);
        continue;
      }

      uploadedDocuments.push({
        id: document.id,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: document.uploaded_at,
        url: uploadResult.data.publicUrl,
      });
    }

    if (uploadedDocuments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No documents uploaded",
          message: "Failed to upload any documents",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
    });

  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to upload documents: " + error.message,
      },
      { status: 500 }
    );
  }
}