import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  // Try full join first (works once customer_id FK exists in Supabase)
  const result = await supabaseAdmin
    .from("jobs")
    .select("id, job_number, status, deposit_amount, waste_factor, scheduled_date, notes, created_at, customers(name, email, phone), quotes(quote_id)")
    .order("created_at", { ascending: false })
    .limit(200);

  // If FK join fails (columns not yet in schema), fall back to plain select
  if (result.error && (result.error.message.includes("customers") || result.error.message.includes("schema cache"))) {
    const fallback = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, status, deposit_amount, waste_factor, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    return NextResponse.json({ jobs: fallback.data ?? [] });
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ jobs: result.data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      job_number: body.job_number,
      customer_id: body.customer_id || null,
      deposit_amount: body.deposit_amount ?? 0,
      waste_factor: body.waste_factor ?? 10,
      status: "pending",
      scheduled_date: body.scheduled_date || null,
      notes: body.notes || null,
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}
