// migrate-all.js — pull EVERYTHING from both legacy Supabase projects into
// the single TextDB engine, then flush outbox + snapshot to B2.
// Usage: node textdb/scripts/migrate-all.js
require('dotenv').config();
const { openTextDbSync } = require('../index');

const PROJECTS = [
  {
    name: 'project1 (old supabase → main)',
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    tables: ['users', 'Messages', 'verification_requests', 'redemption_queue', 'app_versions', 'negative_signals'],
  },
  {
    name: 'project2 (old supabase2 → main)',
    url: process.env.SUPABASE_2_URL,
    key: process.env.SUPABASE_2_KEY,
    tables: ['Posts', 'groups', 'live_rooms', 'live_room_messages'],
  },
];

const PAGE = 1000;

async function fetchAll(url, key, table) {
  const out = [];
  let offset = 0;
  for (;;) {
    const u = url + '/rest/v1/' + table + '?select=*&limit=' + PAGE + '&offset=' + offset;
    const r = await fetch(u, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    if (r.status === 404) return null; // table doesn't exist in this project
    if (!r.ok) throw new Error(table + ' fetch failed: ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
    process.stdout.write('  ' + table + ': ' + out.length + '...\r');
  }
  return out;
}

(async () => {
  console.log('[migrate] opening fresh TextDB (no B2 restore)...');
  const db = openTextDbSync({ fresh: true });
  await db.ready;
  const engine = db.engines[0].engine;

  let total = 0;
  for (const p of PROJECTS) {
    if (!p.url) { console.error('[migrate] MISSING ENV for ' + p.name); process.exit(1); }
    console.log('[migrate] ' + p.name);
    for (const table of p.tables) {
      const rows = await fetchAll(p.url, p.key, table);
      if (rows === null) { console.log('  ' + table + ': does not exist in project, skipped'); continue; }
      if (!rows.length) {
        engine.ensureTable(table);
        console.log('  ' + table + ': 0 rows (table created empty)');
        continue;
      }
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        engine.upsertRows(table, batch, 'id');
        for (const row of batch) engine.enqueueOutbox('main', 'upsert', table, row.id, engine.encodeRow(table, row));
      }
      total += rows.length;
      console.log('  ' + table + ': ' + rows.length + ' rows imported');
    }
  }

  console.log('[migrate] flushing outbox to B2...');
  await db.outbox.flush();
  const outbox = db.outbox.stats();
  console.log('[migrate] outbox:', JSON.stringify(outbox));

  console.log('[migrate] snapshotting to B2...');
  await db.replicator.snapshotAll();
  console.log('[migrate] lastSnapshot:', JSON.stringify(db.replicator.lastSnapshot));

  const stats = db.stats();
  console.log('[migrate] DONE. engine tables:', JSON.stringify(stats.tables));
  console.log('[migrate] total rows migrated: ' + total);
  await db.stop();
  process.exit(0);
})().catch(e => { console.error('[migrate] FATAL:', e); process.exit(1); });
