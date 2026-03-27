import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  // Fetch jobs without any joins — works even before SQL migration is run
  const { data: jobs, error } = await supabaseAdmin
    .from("jobs")
    .select("id, job_number, status, deposit_amount, waste_factor, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Try to also get new columns (scheduled_date, notes, customer_id, quote_id)
  // These exist only after the SQL migration — safe to ignore if missing
  const enriched = await Promise.all((jobs ?? []).map(async (job) => {
    try {
      const { data: full } = await supabaseAdmin
        .from("jobs")
        .select("scheduled_date, notes, customer_id, quote_id")
        .eq("id", job.id)
        .single();

      if (!full) return { ...job, customers: null, quotes: null };

      // Fetch customer name if customer_id exists
      let customer = null;
      if (full.customer_id) {
        const { data: c } = await supabaseAdmin
          .from("customers")
          .select("name, email, phone")
          .eq("id", full.customer_id)
          .single();
        customer = c ?? null;
      }

      // Fetch quote ref if quote_id exists
      let quote = null;
      if (full.quote_id) {
        const { data: q } = await supabaseAdmin
          .from("quotes")
          .select("quote_id")
          .eq("id", full.quote_id)
          .single();
        quote = q ?? null;
      }

      return {
        ...job,
        scheduled_date: full.scheduled_date ?? null,
        notes: full.notes ?? null,
        customers: customer,
        quotes: quote,
      };
    } catch {
      return { ...job, customers: null, quotes: null };
    }
  }));

  return NextResponse.json({ jobs: enriched });
}

export async function POST(req: Request) {
  const body = await req.json();

  const insertData: Record<string, unknown> = {
    job_number: body.job_number,
    deposit_amount: body.deposit_amount ?? 0,
    waste_factor: body.waste_factor ?? 10,
    status: "pending",
  };

  // Add new columns only if they exist (safe insert)
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      ...insertData,
      customer_id: body.customer_id || null,
      scheduled_date: body.scheduled_date || null,
      notes: body.notes || null,
    })
    .select().single();

  // If new columns don't exist yet, retry with base columns only
  if (error && (error.message.includes("customer_id") || error.message.includes("scheduled_date") || error.message.includes("notes"))) {
    const { data: d2, error: e2 } = await supabaseAdmin
      .from("jobs")
      .insert(insertData)
      .select().single();
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    return NextResponse.json({ job: d2 }, { status: 201 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}
