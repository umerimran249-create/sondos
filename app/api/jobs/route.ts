import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("id, job_number, status, deposit_amount, waste_factor, created_at, customers(name), quotes(quote_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({ job_number: body.job_number, customer_id: body.customer_id || null,
      deposit_amount: body.deposit_amount ?? 0, waste_factor: body.waste_factor ?? 10, status: "pending" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}
