const fs = require('fs');
const path = require('path');
const { Engine } = require('./engine');
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
      engines.push({ engine: new Engine(dbPath), ns, dbPath, restored });
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
