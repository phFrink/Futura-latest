import {
  deleteFileFromStorage,
  uploadFileToStorage,
  validateFile,
} from "@/lib/storage";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("profile");

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
    const filename = `profile-${timestamp}-${randomSuffix}.${extension}`;

    // Upload to Supabase Storage
    console.log("Attempting upload to Supabase Storage...");
    const uploadResult = await uploadFileToStorage(
      file,
      "futura",
      "profiles",
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
        message: "File uploaded successfully",
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
    { message: "Upload API endpoint. Use POST to upload images." },
    { status: 200 }
  );
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const filePath = searchParams.get("path"); // Full storage path

    if (!filename && !filePath) {
      return NextResponse.json(
        { error: "Filename or path is required" },
        { status: 400 }
      );
    }

    // Security check - only allow deletion of profile images
    if (
      filename &&
      (!filename.startsWith("profile-") ||
        filename.includes("..") ||
        filename.includes("/"))
    ) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Construct storage path
    const storageFilePath = filePath || `profiles/${filename}`;

    // Delete from Supabase Storage
    const deleteResult = await deleteFileFromStorage("futura", storageFilePath);

    if (!deleteResult.success) {
      console.error("Delete from storage failed:", deleteResult.error);
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 }
      );
    }

    console.log(`Deleted profile image: ${storageFilePath}`);

    return NextResponse.json(
      {
        message: "File deleted successfully",
        filename: filename || storageFilePath,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}s
