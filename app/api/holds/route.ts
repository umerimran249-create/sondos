import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("holds")
    .select("id, hold_id, hold_date, expiry_date, notes, is_active, customers(name), products(product_name, color)")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holds: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("holds")
    .insert({ hold_id: body.hold_id, customer_id: body.customer_id || null,
      product_id: body.product_id || null, expiry_date: body.expiry_date || null,
      notes: body.notes || null, is_active: true })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hold: data }, { status: 201 });
}
