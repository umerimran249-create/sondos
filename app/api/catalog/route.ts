import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Public endpoint — no auth required
export async function GET() {
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, product_id, product_name, sku, color, country_of_origin, product_group, unit_type, base_cost, price_levels")
    .order("product_group", { ascending: true })
    .order("product_name", { ascending: true });

  const { data: inventory } = await supabaseAdmin
    .from("inventory")
    .select("product_id, status, sqft, slab_width, slab_height")
    .eq("status", "available");

  // Add availability count per product
  const availMap: Record<string, number> = {};
  (inventory ?? []).forEach((i: any) => {
    availMap[i.product_id] = (availMap[i.product_id] ?? 0) + (i.sqft ?? 0);
  });

  const enriched = (products ?? []).map((p: any) => ({
    ...p,
    available_sqft: Math.round(availMap[p.id] ?? 0),
  }));

  return NextResponse.json({ products: enriched });
}

// Submit a catalog inquiry / lead
export async function POST(req: Request) {
  const body = await req.json();
  const { name, phone, email, message, product_interest } = body;
  if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });

  // Create as prospective customer
  const { error } = await supabaseAdmin.from("customers").insert({
    customer_id: `LEAD-${Date.now()}`,
    name,
    phone: phone || null,
    email,
    customer_type: "homeowner",
    status: "active",
    notes: `Website inquiry${product_interest ? ` — interested in: ${product_interest}` : ""}${message ? `\nMessage: ${message}` : ""}`,
    credit_limit: 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
