import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("deliveries")
    .select("id, delivery_number, status, scheduled_date, driver_name, created_at, sales_orders(order_number, customers(name))")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deliveries: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("deliveries")
    .insert({ delivery_number: body.delivery_number, driver_name: body.driver_name || null,
      scheduled_date: body.scheduled_date || null, status: "not_ready" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ delivery: data }, { status: 201 });
}
