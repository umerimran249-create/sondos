import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_id, quote_date, status, total_amount, notes, customers(name), users(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  // Auto-generate quote ID: Q-YYYY-NNNN
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin.from("quotes").select("*", { count: "exact", head: true });
  const qNum = String((count ?? 0) + 1).padStart(4, "0");
  const quote_id = `Q-${year}-${qNum}`;

  const insertPayload: Record<string, unknown> = {
    quote_id,
    customer_id: body.customer_id || null,
    notes: body.notes || null,
    status: "draft",
    total_amount: 0,
  };

  // payment_type column — added via migration; include only if it exists to avoid schema-cache error
  let { data, error } = await supabaseAdmin
    .from("quotes")
    .insert({ ...insertPayload, payment_type: body.payment_type || "prepaid" })
    .select().single();

  // If payment_type column doesn't exist yet, retry without it
  if (error && error.message.includes("payment_type")) {
    const retry = await supabaseAdmin.from("quotes").insert(insertPayload).select().single();
    data = retry.data;
    error = retry.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quote: data }, { status: 201 });
}
