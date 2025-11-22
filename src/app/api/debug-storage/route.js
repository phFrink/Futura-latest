import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  console.log('🔍 Storage Debug API called');

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      NODE_ENV: process.env.NODE_ENV
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'Not set'
    }
  };

  // Test Supabase connection
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      diagnostics.connection = 'Cannot test - missing credentials';
    } else {
      console.log('Testing Supabase connection...');
      const adminClient = createClient(supabaseUrl, serviceKey);

      // Try to list buckets
      const { data: buckets, error } = await adminClient.storage.listBuckets();

      if (error) {
        diagnostics.connection = `Error: ${error.message}`;
        diagnostics.storage = 'Failed to connect';
      } else {
        diagnostics.connection = 'Success';
        diagnostics.storage = {
          bucketsFound: buckets.length,
          buckets: buckets.map(b => ({ name: b.name, public: b.public })),
          uploadsExists: buckets.some(b => b.name === 'uploads')
        };
      }
    }
  } catch (error) {
    diagnostics.connection = `Exception: ${error.message}`;
    diagnostics.storage = 'Connection failed';
  }

  console.log('📊 Diagnostics result:', diagnostics);

  return NextResponse.json(diagnostics, { status: 200 });
}