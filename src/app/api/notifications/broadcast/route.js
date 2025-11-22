import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Create Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    const { type, payload } = await request.json();

    if (!type || !payload) {
      return NextResponse.json(
        { error: "Missing type or payload" },
        { status: 400 }
      );
    }

    // Broadcast to the channel
    const channel = supabaseAdmin.channel("user-registrations");

    await channel.send({
      type: "broadcast",
      event: type,
      payload: payload,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to broadcast notification" },
      { status: 500 }
    );
  }
}
