import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("id, inventory_id, lot_number, bundle_number, barcode, quantity, sqft, slab_width, slab_height, slab_thickness, image_data, status, products(product_name, color, sku)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inventory: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .insert({
      inventory_id:   body.inventory_id,
      lot_number:     body.lot_number     || null,
      bundle_number:  body.bundle_number  || null,
      barcode:        body.barcode        || null,
      quantity:       body.quantity       ?? 0,
      sqft:           body.sqft           ?? 0,
      slab_width:     body.slab_width     || null,
      slab_height:    body.slab_height    || null,
      slab_thickness: body.slab_thickness || null,
      image_data:     body.image_data     || null,
      status: "available",
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
