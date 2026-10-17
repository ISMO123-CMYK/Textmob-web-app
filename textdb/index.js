const fs = require('fs');
const path = require('path');
const { Engine, ident } = require('./engine');
const LruCache = require('./lru');
const { TextDbClient } = require('./shim');
const { OutboxWorker } = require('./outbox');
const { Replicator, downloadGunzip, replayObjectsAfter } = require('./replicator');
const { createStorage } = require('./b2');

async function ensureRestored(storage, ns, dbPath) {
  if (fs.existsSync(dbPath)) return false;
  const mbuf = await storage.get('manifest-' + ns + '.json');
  if (!mbuf) return false;
  let manifest;
  try { manifest = JSON.parse(mbuf.toString('utf8')); } catch { return false; }
  if (!manifest || !manifest.latest) return false;
  const tmp = dbPath + '.restoring';
  await downloadGunzip(storage, manifest.latest, tmp, manifest.sha256);
  fs.renameSync(tmp, dbPath);
  const engine = new Engine(dbPath);
  let replayed = 0;
  try {
    replayed = await replayObjectsAfter(storage, engine, ns, manifest.ts);
  } finally {
    engine.close();
  }
  console.log('[textdb] restored ' + ns + ' from ' + manifest.latest + ' (' + manifest.ts + '), replayed ' + replayed + ' newer objects');
  return true;
}

// One-shot repair of double-encoded json columns (values stored as '"[\"a\"]"'
// instead of '["a"]'). Reads self-heal via decodeValue; this persists the fix.
function repairDoubleEncoded(engine) {
  let fixed = 0;
  const tables = engine.rawAll("SELECT name, schema_json FROM __tables WHERE name NOT LIKE '\\_\\_%' ESCAPE '\\'", []);
  for (const t of tables) {
    let cols;
    try { cols = JSON.parse(t.schema_json).cols; } catch { continue; }
    for (const [col, kind] of Object.entries(cols || {})) {
      if (kind !== 'json') continue;
      let rows;
      try {
        rows = engine.rawAll(
          'SELECT id, ' + ident(col) + ' AS v FROM ' + ident(t.name) +
          " WHERE typeof(" + ident(col) + ")='text' AND " + ident(col) + " LIKE '\"%'",
          []
        );
      } catch { continue; }
      for (const r of rows) {
        if (typeof r.v !== 'string') continue;
        let parsed;
        try { parsed = JSON.parse(r.v); } catch { continue; }
        if (typeof parsed !== 'string') continue;
        let reparsed;
        try { reparsed = JSON.parse(parsed); } catch { continue; }
        if (typeof reparsed !== 'object' || reparsed === null) continue;
        engine.rawRun('UPDATE ' + ident(t.name) + ' SET ' + ident(col) + ' = ? WHERE id = ?', [JSON.stringify(reparsed), r.id]);
        fixed++;
      }
    }
  }
  if (fixed) console.log('[textdb] repaired ' + fixed + ' double-encoded json values');
  return fixed;
}

function openTextDbSync(opts) {
  opts = opts || {};
  const env = opts.env || process.env;
  const dir = opts.dir || env.TEXTDB_DIR || path.join(process.cwd(), 'server', 'data', 'textdb');
  fs.mkdirSync(dir, { recursive: true });
  const storage = opts.storage || createStorage(env);
  const queryTtl = Number(env.TEXTDB_QUERY_TTL_MS || 30000);
  const lru = new LruCache({
    maxBytes: Number(env.TEXTDB_LRU_MAX_MB || 96) * 1024 * 1024,
    defaultTtl: Number(env.TEXTDB_TTL_MS || 24 * 60 * 60 * 1000),
  });

  // Single database: both legacy clients (supabase = old project 1, supabase2 = old
  // project 2) share ONE engine. Old project table sets never overlapped, so no merge
  // conflicts. Louda stays on its own real Supabase project (see server.js).
  const namespaces = ['main'];
  const engines = [];
  const skipRestore = !!opts.fresh; // migration builds from Supabase, not from B2
  const ready = (async () => {
    for (const ns of namespaces) {
      const dbPath = path.join(dir, ns + '.db');
      const restored = skipRestore ? false : await ensureRestored(storage, ns, dbPath);
      const engine = new Engine(dbPath);
      try { repairDoubleEncoded(engine); } catch (e) { console.error('[textdb] repair error:', e.message); }
      // Hot-path secondary indexes. Without these every feed read
      // (Posts ORDER BY created_at DESC LIMIT n) and every username lookup
      // (users WHERE username = ?) is a full table scan + sort. Idempotent,
      // one-time at boot (CREATE INDEX IF NOT EXISTS).
      try {
        engine.ensureIndexes([
          { table: 'Posts', cols: ['created_at'], name: 'idx_posts_created_at' },
          { table: 'Posts', cols: ['username', 'created_at'], name: 'idx_posts_username_created_at' },
          { table: 'Posts', cols: ['type', 'created_at'], name: 'idx_posts_type_created_at' },
          { table: 'users', cols: ['username'], name: 'idx_users_username' },
          { table: 'users', cols: ['email'], name: 'idx_users_email' },
          { table: 'Messages', cols: ['sender'], name: 'idx_messages_sender' },
          { table: 'Messages', cols: ['receiver'], name: 'idx_messages_receiver' },
          { table: 'Messages', cols: ['timestamp'], name: 'idx_messages_timestamp' },
        ]);
      } catch (e) { console.error('[textdb] ensureIndexes error:', e.message); }
      engines.push({ engine, ns, dbPath, restored });
      // Seed the snapshot clock from the stored manifest so a clean boot
      // (no local writes yet) skips its first snapshot upload.
      if (!restored && !skipRestore) {
        try {
          const mbuf = await storage.get('manifest-' + ns + '.json');
          if (mbuf) {
            const m = JSON.parse(mbuf.toString('utf8'));
            if (m && m.latest && m.ts) replicator.lastSnapshot[ns] = m;
          }
        } catch {}
      }
    }
  })();

  const dbxFor = (ns) => ({
    get engine() {
      const e = engines.find(x => x.ns === ns);
      if (!e) throw new Error('textdb engine not ready for ' + ns);
      return e.engine;
    },
    ns,
    lru,
    queryTtl,
    ready,
  });

  const outbox = new OutboxWorker(engines, storage, {
    intervalMs: Number(env.TEXTDB_OUTBOX_INTERVAL_MS || 500),
    batchSize: Number(env.TEXTDB_OUTBOX_BATCH || 50),
  });
  const replicator = new Replicator(engines, storage, {
    intervalMs: Number(env.TEXTDB_SNAPSHOT_INTERVAL_MS || 5 * 60 * 1000),
    keep: Number(env.TEXTDB_SNAPSHOT_KEEP || 10),
    tmpDir: path.join(dir, 'tmp'),
  });

  let shutdownAttached = false;
  let started = false;
  const api = {
    supabase: new TextDbClient(dbxFor('main')),
    supabase2: null, // set below — same engine as supabase (single database)
    ready,
    engines,
    lru,
    outbox,
    replicator,
    storage,
    dir,
    start() {
      if (started) return;
      started = true;
      ready.then(() => {
        outbox.start();
        replicator.start();
      }).catch(e => console.error('[textdb] start error:', e.message));
      if (!shutdownAttached) {
        shutdownAttached = true;
        const handler = async () => {
          console.log('[textdb] shutdown: flushing outbox + final snapshot...');
          try {
            outbox.stop();
            await ready;
            await outbox.flush();
            replicator.stop();
            await replicator.snapshotAll();
            for (const e of engines) e.engine.close();
          } catch (e) {
            console.error('[textdb] shutdown error:', e.message);
          }
          process.exit(0);
        };
        process.once('SIGTERM', handler);
        process.once('SIGINT', handler);
      }
    },
    async stop() {
      outbox.stop();
      await ready;
      await outbox.flush();
      replicator.stop();
      await replicator.snapshotAll();
      for (const e of engines) e.engine.close();
    },
    stats() {
      const perNs = {};
      for (const { engine, ns } of engines) {
        const tables = engine.rawAll('SELECT name FROM __tables ORDER BY name', []);
        const counts = {};
        for (const t of tables) {
          try { counts[t.name] = Number(engine.rawGet('SELECT COUNT(*) AS c FROM "' + t.name.replace(/"/g, '""') + '"', []).c); } catch {}
        }
        perNs[ns] = counts;
      }
      return {
        storage: storage.kind,
        lru: lru.stats(),
        outbox: outbox.stats(),
        lastSnapshot: replicator.lastSnapshot,
        tables: perNs,
      };
    },
  };
  api.supabase2 = api.supabase;
  return api;
}

async function initTextDb(opts) {
  const api = openTextDbSync(opts);
  await api.ready;
  return api;
}

module.exports = { initTextDb, openTextDbSync, Engine, TextDbClient, LruCache, createStorage, OutboxWorker, Replicator };
