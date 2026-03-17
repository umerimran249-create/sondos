import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, customer_id, name, phone, email, status, credit_limit, overdue_balance")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customers: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  const payload = {
    customer_id: body.customer_id,
    name: body.name,
    phone: body.phone ?? null,
    email: body.email ?? null,
    billing_address: body.billing_address ?? null,
    customer_type: body.customer_type ?? null,
    credit_limit: body.credit_limit ?? 0,
    notes: body.notes ?? null,
    status: body.status ?? "active"
  };

  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data }, { status: 201 });
}

