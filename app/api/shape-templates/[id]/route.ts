import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function buildUpdatePayload(body: Record<string, unknown>) {
  return {
    name:              String(body.name ?? "").trim(),
    kind:              body.kind ?? "countertop",
    stroke_color:      body.stroke_color ?? "#D4AF37",
    image_data:        body.image_data ?? null,
    default_width_ft:  body.default_width_ft ?? 2.5,
    default_height_ft: body.default_height_ft ?? 1.0,
    default_corners:   body.default_corners ?? 4,
    normalized_points: body.normalized_points ?? null,
  };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const payload = buildUpdatePayload(body as Record<string, unknown>);

  if (!params?.id) {
    return NextResponse.json({ error: "Missing shape ID" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("shape_templates")
    .update(payload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from("shape_templates")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
