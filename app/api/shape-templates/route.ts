import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("shape_templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  const payload = {
    name:              body.name,
    kind:              body.kind              ?? "countertop",
    stroke_color:      body.stroke_color      ?? "#D4AF37",
    image_data:        body.image_data        ?? null,
    default_width_ft:  body.default_width_ft  ?? 2.5,
    default_height_ft: body.default_height_ft ?? 1.0,
    default_corners:   body.default_corners   ?? 4,
    normalized_points: body.normalized_points ?? null,
    sort_order:        body.sort_order        ?? 0,
  };

  const { data, error } = await supabaseAdmin
    .from("shape_templates")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
