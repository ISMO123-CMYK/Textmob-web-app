require('dotenv').config();
const { initTextDb } = require('../index');

const USER = process.env.SEED_USERNAME || 'ismailg';

const MAIN_URL = process.env.SUPABASE_URL;
const MAIN_KEY = process.env.SUPABASE_KEY;
const POSTS_URL = process.env.SUPABASE_2_URL;
const POSTS_KEY = process.env.SUPABASE_2_KEY;

async function rest(baseUrl, key, path) {
  const res = await fetch(baseUrl + '/rest/v1/' + path, {
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('PostgREST ' + path + ' -> ' + res.status + ' ' + body.slice(0, 200));
  }
  return res.json();
}

async function fetchAll(baseUrl, key, path) {
  const out = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const rows = await rest(baseUrl, key, path + '&limit=' + pageSize + '&offset=' + offset);
    out.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function main() {
  if (!MAIN_URL || !POSTS_URL) throw new Error('Missing SUPABASE_URL / SUPABASE_2_URL in env');
  console.log('[seed] exporting @' + USER + ' from Supabase (read-only)...');

  const plan = [
    { ns: 'main', table: 'users', base: MAIN_URL, key: MAIN_KEY, path: 'users?username=eq.' + USER + '&' },
    { ns: 'main', table: 'Messages', base: MAIN_URL, key: MAIN_KEY, path: 'Messages?or=(sender.eq.' + USER + ',receiver.eq.' + USER + ')&' },
    { ns: 'main', table: 'Sparks', base: MAIN_URL, key: MAIN_KEY, path: 'Sparks?username=eq.' + USER + '&' },
    { ns: 'main', table: 'user_activity', base: MAIN_URL, key: MAIN_KEY, path: 'user_activity?username=eq.' + USER + '&' },
    { ns: 'main', table: 'verification_requests', base: MAIN_URL, key: MAIN_KEY, path: 'verification_requests?user_id=eq.' + USER + '&' },
    { ns: 'main', table: 'redemption_queue', base: MAIN_URL, key: MAIN_KEY, path: 'redemption_queue?username=eq.' + USER + '&' },
    { ns: 'posts', table: 'Posts', base: POSTS_URL, key: POSTS_KEY, path: 'Posts?username=eq.' + USER + '&' },
    { ns: 'posts', table: 'groups', base: POSTS_URL, key: POSTS_KEY, path: 'groups?created_by=eq.' + USER + '&' },
  ];

  const exported = {};
  for (const p of plan) {
    try {
      const rows = await fetchAll(p.base, p.key, p.path);
      exported[p.ns + '.' + p.table] = rows;
      console.log('[seed]   ' + p.ns + '.' + p.table + ': ' + rows.length + ' rows');
    } catch (e) {
      console.warn('[seed]   SKIP ' + p.ns + '.' + p.table + ' (' + e.message + ')');
      exported[p.ns + '.' + p.table] = [];
    }
  }

  const db = await initTextDb({});
  let total = 0;
  for (const p of plan) {
    const rows = exported[p.ns + '.' + p.table];
    if (!rows || !rows.length) continue;
    const client = p.ns === 'main' ? db.supabase : db.supabase2;
    for (const row of rows) {
      const { error } = await client.from(p.table).insert([row]);
      if (error) {
        console.error('[seed] INSERT error on ' + p.table + ' id=' + row.id + ':', error.message);
      } else {
        total++;
      }
    }
  }

  const userRow = (exported['main.users'] || [])[0];
  if (userRow && userRow.user_id) {
    const fixed = await fetchAll(MAIN_URL, MAIN_KEY, 'verification_requests?user_id=eq.' + userRow.user_id + '&');
    for (const row of fixed) {
      const exists = (exported['main.verification_requests'] || []).some(r => r.id === row.id);
      if (!exists) {
        const { error } = await db.supabase.from('verification_requests').insert([row]);
        if (!error) total++;
      }
    }
  }

  console.log('[seed] imported ' + total + ' rows, flushing to storage...');
  db.outbox.stop();
  await db.outbox.flush();
  await db.replicator.snapshotAll();
  const stats = db.stats();
  console.log('[seed] done. stats:', JSON.stringify(stats.tables), 'outbox:', JSON.stringify(stats.outbox));
  await db.stop();
}

main().catch(e => { console.error('[seed] FAILED:', e); process.exit(1); });
