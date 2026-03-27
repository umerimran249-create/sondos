import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  // Only select columns that exist in the original jobs table
  // (no joins, no new columns — safe before any SQL migration)
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("id, job_number, status, deposit_amount, waste_factor, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return with null placeholders for new fields — UI handles gracefully
  const jobs = (data ?? []).map(j => ({
    ...j,
    scheduled_date: null,
    notes: null,
    customers: null,
    quotes: null,
  }));

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const body = await req.json();

  // Only insert base columns — safe before SQL migration
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      job_number: body.job_number,
      deposit_amount: body.deposit_amount ?? 0,
      waste_factor: body.waste_factor ?? 10,
      status: "pending",
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}
