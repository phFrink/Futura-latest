import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Function to create Supabase client safely
function createSupabaseClient() {
  // Only log and validate in runtime, not during build
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
    console.log("🔧 Supabase Configuration:");
    console.log("URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.log("Anon Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");
  }

  // Don't create client if environment variables are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
      console.error("❌ Missing Supabase environment variables!");
      console.error("Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'futura-home-admin'
      }
    }
  });
}

// Export the client or null
export const supabase = createSupabaseClient();

// Test connection and URL accessibility
if (typeof window !== 'undefined') {
  // Test URL accessibility
  fetch(supabaseUrl + '/rest/v1/', {
    method: 'HEAD',
    headers: {
      'apikey': supabaseAnonKey
    }
  }).then(response => {
    if (response.ok) {
      console.log("✅ Supabase URL is accessible");
    } else {
      console.error("❌ Supabase URL returned error:", response.status, response.statusText);
    }
  }).catch(err => {
    console.error("❌ Cannot reach Supabase URL:", err);
    console.error("URL being tested:", supabaseUrl + '/rest/v1/');
  });

  // Test auth session
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("❌ Supabase auth test failed:", error);
    } else {
      console.log("✅ Supabase auth client initialized successfully");
    }
  }).catch(err => {
    console.error("❌ Supabase auth connection error:", err);
  });
}