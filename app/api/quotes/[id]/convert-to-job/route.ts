import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  // Get full quote details
  const { data: quote, error: qErr } = await supabaseAdmin
    .from("quotes")
    .select("*, customers(name)")
    .eq("id", params.id)
    .single();
  if (qErr || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Check not already converted
  if (quote.status === "converted") {
    return NextResponse.json({ error: "Quote is already converted to a job" }, { status: 400 });
  }

  // Auto-generate job number: JOB-YYYY-NNNN
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin.from("jobs").select("*", { count: "exact", head: true });
  const jNum = String((count ?? 0) + 1).padStart(4, "0");
  const job_number = `JOB-${year}-${jNum}`;

  // Create job from quote
  const { data: job, error: jErr } = await supabaseAdmin
    .from("jobs")
    .insert({
      job_number,
      quote_id: params.id,
      customer_id: quote.customer_id,
      status: "pending",
      deposit_amount: Math.round((quote.total_amount ?? 0) * 0.5 * 100) / 100,
      waste_factor: 10,
    })
    .select().single();
  if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });

  // Mark quote as converted
  await supabaseAdmin.from("quotes").update({ status: "converted" }).eq("id", params.id);

  return NextResponse.json({ job }, { status: 201 });
}
