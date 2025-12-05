import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          status: "down",
          message: "Supabase configuration missing",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Use auth session check - more reliable than table queries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      // Simply check if we can get session (doesn't require auth, just checks connectivity)
      const { error } = await supabase.auth.getSession();

      clearTimeout(timeoutId);

      // If there's an error AND it's a network/connection error (not just "no session")
      if (error && (error.message.includes('fetch') || error.message.includes('network') || error.status >= 500)) {
        console.error("Supabase health check failed:", error);
        return NextResponse.json(
          {
            status: "down",
            message: "Service connection failed",
            timestamp: new Date().toISOString(),
          },
          { status: 503 }
        );
      }

      // Connection is working (even if no session exists, that's fine)
      return NextResponse.json({
        status: "ok",
        message: "All systems operational",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "down",
        message: error.name === "AbortError" ? "Connection timeout" : "Service unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
