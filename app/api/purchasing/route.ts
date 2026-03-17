import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("purchase_orders")
    .select("id, po_number, supplier_name, status, order_type, expected_date, notes, created_at")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pos: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("purchase_orders")
    .insert({ po_number: body.po_number, supplier_name: body.supplier_name,
      order_type: body.order_type ?? "sqft", expected_date: body.expected_date || null,
      notes: body.notes || null, status: "draft" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ po: data }, { status: 201 });
}
