import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Create admin client for uploads (bypasses RLS)
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Upload file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} folder - Folder path within bucket
 * @param {string} filename - Custom filename (optional)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function uploadFileToStorage(file, bucket, folder = '', filename = null) {
  try {
    console.log('Starting file upload to Supabase Storage...');
    console.log('File info:', { name: file.name, size: file.size, type: file.type });
    console.log('Upload params:', { bucket, folder, filename });

    // Use admin client for uploads to bypass RLS
    const adminClient = createAdminClient();
    if (!adminClient) {
      const error = 'Admin client not initialized - check SUPABASE_SERVICE_ROLE_KEY';
      console.error('❌', error);
      return { success: false, error };
    }

    console.log('🔑 Using service role key for upload (bypasses RLS)');

    // Check if regular client is available for public URL generation
    if (!supabase) {
      const error = 'Supabase client not initialized - check environment variables';
      console.error('❌', error);
      return { success: false, error };
    }

    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const extension = file.name.split('.').pop();
      filename = `${timestamp}-${randomSuffix}.${extension}`;
    }

    // Construct file path
    const filePath = folder ? `${folder}/${filename}` : filename;
    console.log(' Full file path:', filePath);

    // Convert file to proper format for Supabase
    const fileBuffer = await file.arrayBuffer();
    console.log('File converted to buffer, size:', fileBuffer.byteLength);

    // Upload file to Supabase Storage using admin client
    console.log(' Uploading to Supabase Storage with admin privileges...');
    const { data, error } = await adminClient.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      });
      return { success: false, error: `Storage error: ${error.message}` };
    }

    console.log(' Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log(' Public URL generated:', publicUrl);

    return {
      success: true,
      data: {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: publicUrl,
        filename: filename
      }
    };

  } catch (error) {
    console.error(' Storage upload error:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: `Upload failed: ${error.message}` };
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Full file path in storage
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFileFromStorage(bucket, filePath) {
  try {
    // Use admin client for deletions to bypass RLS
    const adminClient = createAdminClient();
    if (!adminClient) {
      throw new Error('Admin client not initialized - check SUPABASE_SERVICE_ROLE_KEY');
    }

    console.log('Using service role key for deletion (bypasses RLS)');

    const { error } = await adminClient.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Storage delete error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in storage
 * @returns {string} Public URL
 */
export function getFilePublicUrl(bucket, filePath) {
  if (!supabase) {
    return null;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file, options = {}) {
  const {
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize = 5 * 1024 * 1024, // 5MB default
    minSize = 0
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`
    };
  }

  if (file.size < minSize) {
    return {
      valid: false,
      error: `File too small. Minimum size: ${minSize} bytes`
    };
  }

  return { valid: true };
}