import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("shape_templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { templates: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

function buildPayload(body: Record<string, unknown>) {
  return {
    name:              String(body.name ?? "").trim(),
    kind:              body.kind              ?? "countertop",
    stroke_color:      body.stroke_color      ?? "#D4AF37",
    image_data:        body.image_data        ?? null,
    default_width_ft:  body.default_width_ft  ?? 2.5,
    default_height_ft: body.default_height_ft ?? 1.0,
    default_corners:   body.default_corners   ?? 4,
    normalized_points: body.normalized_points ?? null,
    sort_order:        body.sort_order        ?? 0,
  };
}

export async function POST(req: Request) {
  const body = await req.json();

  // Bulk insert: body = { items: [...] }
  if (Array.isArray(body.items)) {
    const payloads = (body.items as Record<string, unknown>[])
      .filter(i => String(i.name ?? "").trim())
      .map(buildPayload);

    if (!payloads.length) {
      return NextResponse.json({ error: "No valid items provided" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("shape_templates")
      .insert(payloads)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ templates: data, inserted: data?.length ?? 0 }, { status: 201 });
  }

  // Single insert
  const payload = buildPayload(body as Record<string, unknown>);
  const { data, error } = await supabaseAdmin
    .from("shape_templates")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
