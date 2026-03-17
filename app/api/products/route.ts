import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, product_id, product_name, sku, color, country_of_origin, product_group, unit_type, base_cost, price_levels")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  const payload = {
    product_id: body.product_id,
    product_name: body.product_name,
    sku: body.sku ?? null,
    alternate_names: body.alternate_names ?? null,
    color: body.color ?? null,
    country_of_origin: body.country_of_origin ?? null,
    product_group: body.product_group ?? null,
    unit_type: body.unit_type ?? "SQFT",
    base_cost: body.base_cost ?? 0,
    price_levels: body.price_levels ?? null
  };

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}

