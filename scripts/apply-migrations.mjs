import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const migrations = [
  { name: "quotes.payment_type",        sql: "ALTER TABLE quotes     ADD COLUMN IF NOT EXISTS payment_type     TEXT    NOT NULL DEFAULT 'prepaid'" },
  { name: "inventory.slab_width",       sql: "ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_width       NUMERIC" },
  { name: "inventory.slab_height",      sql: "ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_height      NUMERIC" },
  { name: "inventory.slab_thickness",   sql: "ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_thickness   NUMERIC" },
  { name: "jobs.quote_id",              sql: "ALTER TABLE jobs        ADD COLUMN IF NOT EXISTS quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL" },
  { name: "deliveries.notes",           sql: "ALTER TABLE deliveries  ADD COLUMN IF NOT EXISTS notes            TEXT" },
  { name: "schema reload",              sql: "NOTIFY pgrst, 'reload schema'" },
];

console.log('Applying migrations to Supabase…\n');

for (const m of migrations) {
  // Use Supabase's pg query endpoint (available with service role)
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: m.sql }),
  });

  if (res.ok) {
    console.log(`  ✅ ${m.name}`);
  } else {
    // Try via REST sql endpoint
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
    console.log(`  ⚠️  ${m.name} — will need manual SQL (status ${res.status})`);
    const body = await res.text();
    if (body) console.log(`     ${body.slice(0,100)}`);
  }
}

console.log('\n─────────────────────────────────────────────');
console.log('If any failed, run this in Supabase SQL Editor:');
console.log('─────────────────────────────────────────────');
for (const m of migrations) {
  console.log(m.sql + ';');
}
