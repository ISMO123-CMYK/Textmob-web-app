const zlib = require('zlib');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { pipeline } = require('stream/promises');

function tsSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

class Replicator {
  constructor(engines, storage, opts) {
    this.engines = engines;
    this.storage = storage;
    this.intervalMs = (opts && opts.intervalMs) || 5 * 60 * 1000;
    this.keep = (opts && opts.keep) || 10;
    this.tmpDir = (opts && opts.tmpDir) || path.join(require('os').tmpdir(), 'textdb-snapshots');
    try { fs.mkdirSync(this.tmpDir, { recursive: true }); } catch {}
    this.timer = null;
    this.taking = false;
    this.lastSnapshot = {};
  }

  start() {
    if (this.timer) return;
    fs.mkdirSync(this.tmpDir, { recursive: true });
    this.timer = setInterval(() => this.snapshotAll().catch(e => console.error('[textdb:replicator] snapshot error:', e.message)), this.intervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async snapshotAll() {
    if (this.taking) return;
    this.taking = true;
    try {
      for (const { engine, ns } of this.engines) {
        await this.snapshotOne(engine, ns);
      }
    } finally {
      this.taking = false;
    }
  }

  async snapshotOne(engine, ns) {
    const ts = new Date().toISOString();
    const tmpFile = path.join(this.tmpDir, ns + '-' + tsSlug() + '.db');
    try {
      engine.vacuumInto(tmpFile);
      const gz = tmpFile + '.gz';
      await pipeline(fs.createReadStream(tmpFile), zlib.createGzip({ level: 6 }), fs.createWriteStream(gz));
      const buf = await fsp.readFile(gz);
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      const name = 'snapshots/' + ns + '/snap-' + tsSlug() + '.db.gz';
      await this.storage.put(name, buf);
      const manifest = { ns, latest: name, sha256, ts, size: buf.length };
      await this.storage.put('manifest-' + ns + '.json', JSON.stringify(manifest));
      this.lastSnapshot[ns] = manifest;
      await this._prune(ns);
      console.log('[textdb:replicator] snapshot ' + ns + ' (' + (buf.length / 1024 / 1024).toFixed(1) + 'MB gz) -> ' + name);
    } catch (e) {
      console.error('[textdb:replicator] snapshot failed for ' + ns + ':', e.message);
    } finally {
      await fsp.rm(tmpFile, { force: true }).catch(() => {});
      await fsp.rm(tmpFile + '.gz', { force: true }).catch(() => {});
    }
  }

  async _prune(ns) {
    try {
      const files = await this.storage.list('snapshots/' + ns + '/');
      files.sort((a, b) => b.name.localeCompare(a.name));
      for (const f of files.slice(this.keep)) {
        await this.storage.delete(f.name);
      }
    } catch (e) {
      console.error('[textdb:replicator] prune error:', e.message);
    }
  }
}

async function downloadGunzip(storage, key, destPath, expectedSha) {
  const buf = await storage.get(key);
  if (!buf) throw new Error('snapshot not found in storage: ' + key);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  if (expectedSha && sha256 !== expectedSha) throw new Error('snapshot sha256 mismatch for ' + key);
  const gzBuf = zlib.gunzipSync(buf);
  await fsp.writeFile(destPath, gzBuf);
  return { sha256, size: gzBuf.length };
}

async function replayObjectsAfter(storage, engine, ns, sinceTs) {
  const files = await storage.list('data/' + ns + '/');
  let replayed = 0;
  const since = typeof sinceTs === 'number' ? sinceTs : Date.parse(sinceTs || '') || 0;
  for (const f of files) {
    const tsNum = Number(f.uploadTimestamp) || 0;
    if (tsNum && tsNum <= since) continue;
    const buf = await storage.get(f.name);
    if (!buf) continue;
    let obj;
    try { obj = JSON.parse(buf.toString('utf8')); } catch { continue; }
    if (!obj || !obj.table) continue;
    try {
      if (obj.op === 'delete') {
        engine.ensureTable(obj.table);
        engine.rawRun('DELETE FROM "' + String(obj.table).replace(/"/g, '""') + '" WHERE id = ?', [String(obj.key)]);
        } else if (obj.op === 'upsert' && obj.row) {
          // obj.row values are already in storage format (encodeRow output stored in
          // the outbox payload) — write them raw, never re-encode (double-encode bug).
          engine.upsertStoredRows(obj.table, [obj.row], 'id');
        }
      replayed++;
    } catch (e) {
      console.error('[textdb:restore] replay error on', f.name, e.message);
    }
  }
  return replayed;
}

module.exports = { Replicator, downloadGunzip, replayObjectsAfter };
