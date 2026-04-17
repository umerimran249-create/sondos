import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from("layouts")
    .select("*")
    .eq("quote_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ layout: data ?? null });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  // Upsert layout for this quote
  const { data: existing } = await supabaseAdmin
    .from("layouts").select("id").eq("quote_id", params.id).single();

  let result;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("layouts")
      .update({ canvas_json: body.canvas_json, layout_data: body.layout_data })
      .eq("id", existing.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("layouts")
      .insert({ quote_id: params.id, canvas_json: body.canvas_json, layout_data: body.layout_data })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  // Update quote total_amount and create/replace quote_items from shapes
  if (body.shapes && Array.isArray(body.shapes)) {
    await supabaseAdmin.from("quote_items").delete().eq("quote_id", params.id);
    const items = body.shapes
      .filter((s: any) => s.kind !== "cutout" || s.cutouts > 0)
      .map((s: any) => {
        // Build a human-readable description that includes product, dimensions and add-ons
        const kindLabel = (s.kind as string).charAt(0).toUpperCase() + (s.kind as string).slice(1);
        const productPart = s.productName
          ? ` — ${s.productName}${s.productColor ? ` (${s.productColor})` : ""}`
          : "";
        const wIn = Number(s.widthFt  * 12).toFixed(1);
        const hIn = Number(s.heightFt * 12).toFixed(1);
        const pIn = Number(s.perimLf  * 12).toFixed(1);
        const dimPart = `${wIn}" × ${hIn}" · ${Number(s.sqft).toFixed(2)} sqft · ${pIn}" perimeter`;
        const addons: string[] = [];
        if (s.corners  > 0) addons.push(`${s.corners} corner${s.corners  !== 1 ? "s" : ""}`);
        if (s.cutouts  > 0) addons.push(`${s.cutouts} sink cutout${s.cutouts  !== 1 ? "s" : ""}`);
        if (s.hasBack && s.backLf > 0) addons.push(`${Number(s.backLf).toFixed(2)} lf backsplash`);
        const addonPart = addons.length ? ` | ${addons.join(", ")}` : "";

        return {
          quote_id: params.id,
          description: `${s.label} (${kindLabel})${productPart} · ${dimPart}${addonPart}`,
          quantity: 1,
          unit_price: s.shapeCost ?? 0,
          line_total: s.shapeCost ?? 0,
        };
      });
    if (items.length) await supabaseAdmin.from("quote_items").insert(items);
    await supabaseAdmin.from("quotes")
      .update({ total_amount: body.totalCost ?? 0 })
      .eq("id", params.id);
  }

  return NextResponse.json({ layout: result }, { status: 201 });
}
