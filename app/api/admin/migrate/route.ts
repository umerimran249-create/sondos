import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// One-time migration endpoint — run once then it's safe to leave
// GET /api/admin/migrate
export async function GET() {
  const results: { sql: string; ok: boolean; error?: string }[] = [];

  const migrations = [
    `ALTER TABLE quotes     ADD COLUMN IF NOT EXISTS payment_type     TEXT    NOT NULL DEFAULT 'prepaid'`,
    `ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_width       NUMERIC`,
    `ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_height      NUMERIC`,
    `ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_thickness   NUMERIC`,
    `ALTER TABLE jobs        ADD COLUMN IF NOT EXISTS quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL`,
    `ALTER TABLE deliveries  ADD COLUMN IF NOT EXISTS notes            TEXT`,
  ];

  for (const sql of migrations) {
    // Use a raw SQL query via supabaseAdmin's postgres client
    const { error } = await (supabaseAdmin as any).rpc("exec_raw_sql", { sql }).catch(() => ({ error: { message: "rpc not available" } }));

    if (error?.message?.includes("rpc not available") || error?.message?.includes("does not exist")) {
      // Try using supabaseAdmin directly through the Postgres endpoint
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql }),
        }
      );
      results.push({ sql: sql.slice(0, 70), ok: res.ok, error: res.ok ? undefined : await res.text() });
    } else if (error) {
      results.push({ sql: sql.slice(0, 70), ok: false, error: error.message });
    } else {
      results.push({ sql: sql.slice(0, 70), ok: true });
    }
  }

  const allOk = results.every(r => r.ok);

  return NextResponse.json({
    status: allOk ? "all migrations applied" : "some migrations need manual run",
    results,
    manualSQL: allOk ? null : migrations.map(s => s + ";").join("\n"),
  });
}
