const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function ident(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function inferKind(samples) {
  let sawBool = false, sawNum = false, sawText = false, sawComplex = false, sawOther = false;
  for (const v of samples) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') { sawBool = true; continue; }
    if (typeof v === 'number') { sawNum = true; continue; }
    if (typeof v === 'string') { sawText = true; continue; }
    if (typeof v === 'object') { sawComplex = true; continue; }
    sawOther = true;
  }
  if (sawComplex) return 'json';
  if (sawBool && !sawNum && !sawText) return 'bool';
  if (sawNum && !sawText) return 'num';
  if (sawText && !sawNum) return 'text';
  if (sawNum && sawText) return 'json';
  if (sawBool) return 'bool';
  return 'text';
}

function encodeValue(kind, v) {
  if (v === undefined || v === null) return null;
  switch (kind) {
    case 'bool': return (v === true || v === 'true' || v === 1) ? 1 : 0;
    case 'num': {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : String(v);
    }
    case 'text': return typeof v === 'string' ? v : String(v);
    case 'json': return JSON.stringify(v);
    default: return typeof v === 'object' ? JSON.stringify(v) : v;
  }
}

function decodeValue(kind, v) {
  if (v === null || v === undefined) return null;
  switch (kind) {
    case 'bool': return v === 1 || v === true || v === 'true';
    case 'num': return typeof v === 'number' ? v : Number(v) || (v === '0' || v === 0 ? 0 : Number(v));
    case 'text': return v;
    case 'json': {
      if (typeof v !== 'string') return v;
      // Self-heal double-encoded values (replay/re-store bugs): if a parse yields
      // another JSON string, keep parsing (bounded) until we get a real value.
      let out = v;
      for (let i = 0; i < 3; i++) {
        try { out = JSON.parse(out); } catch { break; }
        if (typeof out !== 'string') break;
      }
      return out;
    }
    default: return v;
  }
}

class Engine {
  constructor(filePath) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.db.exec('PRAGMA busy_timeout = 5000');
    this.db.exec('PRAGMA cache_size = -16000');
    this.db.exec('PRAGMA temp_store = MEMORY');
    this.schemaCache = new Map();
    this.stmtCache = new Map();
    this.db.exec(`CREATE TABLE IF NOT EXISTS "__tables" (name TEXT PRIMARY KEY, schema_json TEXT NOT NULL, created_at TEXT)`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS "__meta" (k TEXT PRIMARY KEY, v TEXT)`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS "__outbox" (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, op TEXT NOT NULL, ns TEXT, tbl TEXT NOT NULL, key TEXT NOT NULL, payload TEXT, attempts INTEGER DEFAULT 0, next_retry_at REAL DEFAULT 0)`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS "__outbox_failed" (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, op TEXT, ns TEXT, tbl TEXT, key TEXT, payload TEXT, error TEXT, failed_at TEXT)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_outbox_due ON __outbox(next_retry_at, id)`);
  }

  prepareCached(sql) {
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      if (this.stmtCache.size > 2000) {
        const first = this.stmtCache.keys().next().value;
        this.stmtCache.delete(first);
      }
      this.stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  exec(sql) { return this.db.exec(sql); }

  rawGet(sql, params) {
    return this.prepareCached(sql).get(...(params || []));
  }

  rawAll(sql, params) {
    return this.prepareCached(sql).all(...(params || []));
  }

  rawRun(sql, params) {
    // writes-only path (reads use rawGet/rawAll) → timestamp for snapshot-skipping
    this.lastWriteAt = Date.now();
    return this.prepareCached(sql).run(...(params || []));
  }

  tableExists(name) {
    const r = this.rawGet("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [name]);
    return !!r;
  }

  getSchema(name) {
    if (this.schemaCache.has(name)) return this.schemaCache.get(name);
    const r = this.rawGet('SELECT schema_json FROM __tables WHERE name = ?', [name]);
    const schema = r ? JSON.parse(r.schema_json) : null;
    this.schemaCache.set(name, schema);
    return schema;
  }

  saveSchema(name, cols) {
    const schema = { cols };
    this.rawRun(
      'INSERT INTO __tables(name, schema_json, created_at) VALUES(?, ?, ?) ON CONFLICT(name) DO UPDATE SET schema_json = excluded.schema_json',
      [name, JSON.stringify(schema), new Date().toISOString()]
    );
    this.schemaCache.set(name, schema);
    return schema;
  }

  inferSchema(name, rows) {
    const keys = new Set();
    for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
    const cols = {};
    for (const k of keys) {
      const samples = rows.slice(0, 100).map(r => r[k]);
      cols[k] = inferKind(samples);
    }
    return cols;
  }

  createTable(name, cols) {
    const parts = ['"id" TEXT PRIMARY KEY'];
    for (const [col, kind] of Object.entries(cols)) {
      if (col === 'id') continue;
      const t = kind === 'bool' ? 'INTEGER' : kind === 'num' ? 'NUMERIC' : 'TEXT';
      parts.push(ident(col) + ' ' + t);
    }
    const sql = 'CREATE TABLE IF NOT EXISTS ' + ident(name) + ' (' + parts.join(', ') + ')';
    this.db.exec(sql);
    this.saveSchema(name, cols.id ? cols : Object.assign({ id: 'text' }, cols));
  }

  ensureTable(name, sampleRows) {
    if (!this.tableExists(name)) {
      const rows = sampleRows || [];
      const cols = rows.length ? this.inferSchema(name, rows) : {};
      if (!cols.id) cols.id = 'text';
      if (!cols.created_at) cols.created_at = 'text';
      if (!cols.timestamp) cols.timestamp = 'text';
      this.createTable(name, cols);
    } else if (!this.getSchema(name)) {
      const cols = { id: 'text' };
      const info = this.rawAll('PRAGMA table_info(' + ident(name) + ')');
      for (const c of info) cols[c.name] = inferKind([]);
      this.saveSchema(name, cols);
    }
    return this.getSchema(name);
  }

  addColumn(table, col, kind) {
    const t = kind === 'bool' ? 'INTEGER' : kind === 'num' ? 'NUMERIC' : 'TEXT';
    this.db.exec('ALTER TABLE ' + ident(table) + ' ADD COLUMN ' + ident(col) + ' ' + t);
  }

  ensureColumns(table, row) {
    const schema = this.ensureTable(table);
    let cols = schema.cols;
    let changed = false;
    let existing = null;
    for (const [k, v] of Object.entries(row)) {
      if (!(k in cols)) {
        if (!existing) existing = new Set(this.rawAll('PRAGMA table_info(' + ident(table) + ')').map(c => c.name));
        const kind = inferKind([v]);
        if (!existing.has(k)) this.addColumn(table, k, kind);
        cols = Object.assign({}, cols, { [k]: kind });
        changed = true;
      }
    }
    if (changed) this.saveSchema(table, cols);
    return this.getSchema(table);
  }

  encodeRow(table, row) {
    const schema = this.getSchema(table);
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const kind = schema.cols[k] || 'json';
      out[k] = encodeValue(kind, v);
    }
    return out;
  }

  reviveRow(table, raw) {
    const schema = this.getSchema(table);
    if (!raw) return raw;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('__')) continue;
      const kind = schema.cols[k] || 'json';
      out[k] = decodeValue(kind, v);
    }
    return out;
  }

  insertRows(table, rows) {
    if (!rows.length) return [];
    const nowIso = new Date().toISOString();
    const schema = this.ensureTable(table);
    const prepared = [];
    for (const row of rows) {
      const withDefaults = Object.assign({}, row);
      if (withDefaults.id === undefined || withDefaults.id === null) withDefaults.id = crypto.randomUUID();
      if (withDefaults.created_at === undefined && schema.cols.created_at) withDefaults.created_at = nowIso;
      if (withDefaults.timestamp === undefined && schema.cols.timestamp) withDefaults.timestamp = nowIso;
      prepared.push(withDefaults);
    }
    for (const row of prepared) this.ensureColumns(table, row);
    const finalSchema = this.getSchema(table);
    const cols = Object.keys(finalSchema.cols).filter(c => prepared.some(r => r[c] !== undefined));
    const sql = 'INSERT INTO ' + ident(table) + ' (' + cols.map(ident).join(', ') + ') VALUES (' + cols.map(() => '?').join(', ') + ')';
    const stmt = this.prepareCached(sql);
    const inserted = [];
    for (const row of prepared) {
      const encoded = {};
      for (const c of cols) encoded[c] = encodeValue(finalSchema.cols[c], row[c]);
      stmt.run(...cols.map(c => encoded[c]));
      inserted.push(row);
    }
    return inserted;
  }

  upsertRows(table, rows, onConflict) {
    if (!rows.length) return [];
    const nowIso = new Date().toISOString();
    const schema = this.ensureTable(table);
    const conflictCol = onConflict || 'id';
    const prepared = [];
    for (const row of rows) {
      const withDefaults = Object.assign({}, row);
      if (withDefaults.id === undefined || withDefaults.id === null) withDefaults.id = crypto.randomUUID();
      if (withDefaults.created_at === undefined && schema.cols.created_at) withDefaults.created_at = nowIso;
      prepared.push(withDefaults);
    }
    for (const row of prepared) this.ensureColumns(table, row);
    const finalSchema = this.getSchema(table);
    const cols = Object.keys(finalSchema.cols).filter(c => prepared.some(r => r[c] !== undefined));
    const sql =
      'INSERT INTO ' + ident(table) + ' (' + cols.map(ident).join(', ') + ') VALUES (' + cols.map(() => '?').join(', ') + ')' +
      ' ON CONFLICT(' + ident(conflictCol) + ') DO UPDATE SET ' +
      cols.filter(c => c !== conflictCol).map(c => ident(c) + ' = excluded.' + ident(c)).join(', ');
    const stmt = this.prepareCached(sql);
    const inserted = [];
    for (const row of prepared) {
      const encoded = {};
      for (const c of cols) encoded[c] = encodeValue(finalSchema.cols[c], row[c]);
      stmt.run(...cols.map(c => encoded[c]));
      inserted.push(row);
    }
    return inserted;
  }

  // Insert rows whose values are ALREADY in storage format (e.g. replaying outbox
  // object payloads from B2). Values are bound raw — no encodeValue — so json
  // columns are NOT re-encoded (prevents double-encoding '["a"]' -> '"[\"a\"]"').
  upsertStoredRows(table, rows, onConflict) {
    if (!rows.length) return 0;
    const conflictCol = onConflict || 'id';
    this.ensureTable(table);
    const schema = this.getSchema(table);
    const cols = Object.assign({}, schema.cols);
    const existing = new Set(this.rawAll('PRAGMA table_info(' + ident(table) + ')').map(c => c.name));
    const colSet = new Set([conflictCol]);
    for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
    let schemaChanged = false;
    for (const k of colSet) {
      if (!(k in cols)) {
        const v = rows[0][k];
        let kind = inferKind([v]);
        if (kind === 'text' && typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
          try { JSON.parse(v); kind = 'json'; } catch {}
        }
        cols[k] = kind;
        if (!existing.has(k)) this.addColumn(table, k, kind);
        schemaChanged = true;
      }
    }
    if (schemaChanged) this.saveSchema(table, cols);
    const allCols = Array.from(colSet);
    const sql =
      'INSERT INTO ' + ident(table) + ' (' + allCols.map(ident).join(', ') + ') VALUES (' + allCols.map(() => '?').join(', ') + ')' +
      ' ON CONFLICT(' + ident(conflictCol) + ') DO UPDATE SET ' +
      allCols.filter(c => c !== conflictCol).map(c => ident(c) + ' = excluded.' + ident(c)).join(', ');
    const stmt = this.prepareCached(sql);
    for (const r of rows) {
      // Sanitize: old B2 objects may hold raw arrays/objects/booleans that
      // node:sqlite cannot bind ("Provided value cannot be bound"). Coerce to
      // storage format instead of crashing the whole restore replay.
      stmt.run(...allCols.map(c => {
        const v = r[c];
        if (v === undefined) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'object' && v !== null && !(v instanceof Uint8Array) && !Buffer.isBuffer(v)) {
          try { return JSON.stringify(v); } catch { return null; }
        }
        return v;
      }));
    }
    return rows.length;
  }

  ensureIndexes(specs) {
    for (const s of specs) {
      try {
        if (!this.tableExists(s.table)) continue;
        const cols = s.cols.map(ident).join(', ');
        this.db.exec(
          'CREATE INDEX IF NOT EXISTS ' + ident(s.name) + ' ON ' + ident(s.table) + ' (' + cols + ')'
        );
      } catch {}
    }
  }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      this.db.exec('COMMIT');
      return r;
    } catch (e) {
      try { this.db.exec('ROLLBACK'); } catch {}
      throw e;
    }
  }

  vacuumInto(destPath) {
    const escaped = destPath.replace(/'/g, "''");
    this.db.exec("VACUUM INTO '" + escaped + "'");
  }

  listTables() {
    const rows = this.rawAll(
      "SELECT t.name, t.schema_json, (SELECT COUNT(*) FROM sqlite_master m WHERE m.type='table' AND m.name = t.name) AS exists_ok FROM __tables t WHERE t.name NOT LIKE '\\_\\_%' ESCAPE '\\' ORDER BY t.name",
      []
    );
    const counts = this.rawAll(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      []
    );
    const out = [];
    for (const r of counts) {
      const meta = rows.find(x => x.name === r.name);
      let count = 0;
      try { count = Number(this.rawGet('SELECT COUNT(*) AS c FROM ' + ident(r.name), []).c); } catch {}
      out.push({ name: r.name, schema: meta ? JSON.parse(meta.schema_json).cols : null, count });
    }
    return out;
  }

  tableInfo(name) {
    if (!this.tableExists(name)) return null;
    const info = this.rawAll('PRAGMA table_info(' + ident(name) + ')');
    const schema = this.getSchema(name);
    return info.map(c => ({
      name: c.name,
      type: c.type,
      kind: (schema && schema.cols && schema.cols[c.name]) || (c.type === 'NUMERIC' ? 'num' : c.type === 'INTEGER' ? 'bool' : 'text'),
      notnull: !!c.notnull,
      pk: !!c.pk,
    }));
  }

  dropColumn(table, col) {
    this.db.exec('ALTER TABLE ' + ident(table) + ' DROP COLUMN ' + ident(col));
    const schema = this.getSchema(table);
    if (schema && schema.cols && schema.cols[col]) {
      const cols = Object.assign({}, schema.cols);
      delete cols[col];
      this.saveSchema(table, cols);
    }
  }

  dropTable(name) {
    this.db.exec('DROP TABLE IF EXISTS ' + ident(name));
    this.rawRun('DELETE FROM __tables WHERE name = ?', [name]);
    this.schemaCache.delete(name);
    for (const k of Array.from(this.stmtCache.keys())) {
      if (k.includes(ident(name))) this.stmtCache.delete(k);
    }
  }

  enqueueOutbox(ns, op, table, key, payload) {
    this.rawRun(
      'INSERT INTO __outbox (ts, op, ns, tbl, key, payload, attempts, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
      [new Date().toISOString(), op, ns, table, String(key), payload ? JSON.stringify(payload) : null]
    );
  }

  close() {
    try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch {}
    this.stmtCache.clear();
    this.db.close();
  }
}

module.exports = { Engine, ident, inferKind, encodeValue, decodeValue };
