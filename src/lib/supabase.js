import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
}) : null;

// Test connection disabled during build to prevent issues
// Re-enable in development if needed
/*
if (typeof window !== 'undefined' && supabase && supabaseUrl && supabaseAnonKey) {
  fetch(supabaseUrl + '/rest/v1/', {
    method: 'HEAD',
    headers: {
      'apikey': supabaseAnonKey
    }
  }).then(response => {
    if (response.ok) {
      console.log("Supabase URL is accessible");
    } else {
      console.error("Supabase URL returned error:", response.status, response.statusText);
    }
  }).catch(err => {
    console.error("Cannot reach Supabase URL:", err);
    console.error("URL being tested:", supabaseUrl + '/rest/v1/');
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Supabase auth test failed:", error);
    } else {
      console.log("Supabase auth client initialized successfully");
    }
  }).catch(err => {
    console.error("Supabase auth connection error:", err);
  });
}
*/