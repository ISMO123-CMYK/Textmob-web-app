// delta-sync.js — pull only NEW rows from both Supabase projects into TextDB.
// Id-diff based: fetches all ids remotely, compares with local, imports missing.
// Usage: node textdb/scripts/delta-sync.js
require('dotenv').config();
const { openTextDbSync } = require('../index');

const PROJECTS = [
  {
    name: 'project1',
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    tables: ['users', 'Messages', 'verification_requests', 'redemption_queue', 'app_versions', 'negative_signals'],
  },
  {
    name: 'project2',
    url: process.env.SUPABASE_2_URL,
    key: process.env.SUPABASE_2_KEY,
    tables: ['Posts', 'groups', 'live_rooms', 'live_room_messages'],
  },
];

const PAGE = 1000;

async function fetchIds(url, key, table) {
  const ids = new Set();
  let offset = 0;
  for (;;) {
    const r = await fetch(url + '/rest/v1/' + table + '?select=id&limit=' + PAGE + '&offset=' + offset, {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(table + ' id fetch failed: ' + r.status);
    const rows = await r.json();
    for (const row of rows) ids.add(String(row.id));
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return ids;
}

async function fetchByIds(url, key, table, ids) {
  const out = [];
  const arr = [...ids];
  for (let i = 0; i < arr.length; i += 50) {
    const chunk = arr.slice(i, i + 50);
    const inList = chunk.map(id => '"' + String(id).replace(/"/g, '\\"') + '"').join(',');
    const r = await fetch(url + '/rest/v1/' + table + '?select=*&id=in.(' + inList + ')', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    if (!r.ok) throw new Error(table + ' row fetch failed: ' + r.status + ' ' + (await r.text()).slice(0, 200));
    out.push(...(await r.json()));
  }
  return out;
}

(async () => {
  console.log('[delta] opening TextDB...');
  const db = openTextDbSync();
  await db.ready;
  const engine = db.engines[0].engine;

  let imported = 0;
  for (const p of PROJECTS) {
    for (const table of p.tables) {
      const remoteIds = await fetchIds(p.url, p.key, table);
      if (remoteIds === null) continue;
      engine.ensureTable(table);
      const localRows = engine.rawAll('SELECT id FROM "' + table.replace(/"/g, '""') + '"', []);
      const localIds = new Set(localRows.map(r => String(r.id)));
      const missing = [...remoteIds].filter(id => !localIds.has(id));
      const stale = [...localIds].filter(id => !remoteIds.has(id));
      if (!missing.length && !stale.length) {
        console.log('  ' + table + ': in sync (' + remoteIds.size + ' rows)');
        continue;
      }
      if (missing.length) {
        const rows = await fetchByIds(p.url, p.key, table, missing);
        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          engine.upsertRows(table, batch, 'id');
          for (const row of batch) engine.enqueueOutbox('main', 'upsert', table, row.id, engine.encodeRow(table, row));
        }
        imported += rows.length;
      }
      console.log('  ' + table + ': +' + missing.length + ' new' + (stale.length ? ', ' + stale.length + ' deleted-on-supabase (kept locally)' : '') + ' (remote total ' + remoteIds.size + ')');
    }
  }

  if (imported) {
    console.log('[delta] imported ' + imported + ' rows, snapshotting...');
    // clear per-row events — snapshot carries full state (same as migrate-all)
    engine.rawRun('DELETE FROM __outbox', []);
    await db.replicator.snapshotAll();
    console.log('[delta] snapshot:', JSON.stringify(db.replicator.lastSnapshot));
  } else {
    console.log('[delta] nothing to import');
  }
  console.log('[delta] tables:', JSON.stringify(db.stats().tables));
  await db.stop();
  process.exit(0);
})().catch(e => { console.error('[delta] FATAL:', e); process.exit(1); });
