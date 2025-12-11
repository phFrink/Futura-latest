import { NextResponse } from "next/server";
import {
  uploadFileToStorage,
  validateFile,
} from "@/lib/storage";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("evidence_photo");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file, {
      allowedTypes: [
        "image/jpeg",
        "image/jpg", 
        "image/png",
        "image/gif",
        "image/webp",
      ],
      maxSize: 5 * 1024 * 1024, // 5MB
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const extension = file.name.split(".").pop();
    const filename = `complaint-${timestamp}-${randomSuffix}.${extension}`;

    // Upload to Supabase Storage
    console.log("Attempting upload to Supabase Storage...");
    const uploadResult = await uploadFileToStorage(
      file,
      "futura",
      "complaints", 
      filename
    );

    if (!uploadResult.success) {
      console.error("Upload to storage failed:", uploadResult.error);
      return NextResponse.json(
        {
          error: "Failed to upload file to storage",
          details: uploadResult.error,
        },
        { status: 500 }
      );
    }

    console.log("Upload successful!");

    // Return success response with file info
    return NextResponse.json(
      {
        message: "Evidence photo uploaded successfully",
        filename: uploadResult.data.filename,
        url: uploadResult.data.publicUrl,
        path: uploadResult.data.path,
        size: file.size,
        type: file.type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Complaint evidence upload API endpoint. Use POST to upload evidence images." },
    { status: 200 }
  );
}