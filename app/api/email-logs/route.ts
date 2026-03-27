import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(200);

  if (error) {
    // If table doesn't exist, return empty
    if (error.message.includes("email_logs") || error.code === "42P01") {
      return NextResponse.json({ logs: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
