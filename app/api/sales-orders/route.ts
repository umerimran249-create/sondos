import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("sales_orders")
    .select("id, order_number, status, deposit_amount, created_at, customers(name), quotes(quote_id)")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("sales_orders")
    .insert({ order_number: body.order_number, customer_id: body.customer_id || null,
      deposit_amount: body.deposit_amount ?? 0, status: "pending" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data }, { status: 201 });
}
