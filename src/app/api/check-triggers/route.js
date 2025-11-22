import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Check for triggers on notifications_tbl
    const { data: triggers, error: triggerError } = await supabaseAdmin.rpc(
      "get_triggers"
    ).catch(() => ({ data: null, error: null }));

    // Check the column type of recipient_id
    const { data: columns, error: columnError } = await supabaseAdmin
      .from("information_schema.columns")
      .select("*")
      .eq("table_name", "notifications_tbl")
      .eq("column_name", "recipient_id");

    return NextResponse.json({
      success: true,
      triggers: triggers || "Unable to fetch triggers",
      columns: columns || "Unable to fetch column info",
      recommendation:
        "The recipient_id column is INTEGER type but Supabase auth uses UUID. You need to either: 1) Change column to TEXT/UUID type, or 2) Create a separate user_reference column",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
