import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }

const s = createClient(url, key);

const migrations = [
  // ── Quotes ──
  `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'prepaid'`,

  // ── Inventory slab dimensions ──
  `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS slab_width    NUMERIC`,
  `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS slab_height   NUMERIC`,
  `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS slab_thickness NUMERIC`,

  // ── Jobs: ensure quote_id FK exists ──
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL`,

  // ── Deliveries: ensure notes column ──
  `ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS notes TEXT`,

  // ── Refresh schema cache ──
  `NOTIFY pgrst, 'reload schema'`,
];

console.log('Running migrations…\n');
for (const sql of migrations) {
  const { error } = await s.rpc('exec_sql', { query: sql }).catch(() => ({ error: null }));
  // rpc may not exist — fall back to direct REST call
  if (error) {
    // Use the Postgres REST endpoint directly
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: sql }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`  ⚠ Could not auto-run: ${sql.slice(0, 60)}…`);
      console.warn(`    → ${txt.slice(0, 120)}`);
    } else {
      console.log(`  ✓ ${sql.slice(0, 70)}…`);
    }
  } else {
    console.log(`  ✓ ${sql.slice(0, 70)}`);
  }
}

console.log('\nDone. If any failed, paste the SQL below into the Supabase SQL editor:');
console.log('─'.repeat(60));
migrations.forEach(m => console.log(m + ';'));
