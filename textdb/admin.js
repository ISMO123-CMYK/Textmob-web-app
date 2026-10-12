// TextDB Admin — Supabase-style dashboard served at /blackbaze-admin
// Password gate (TEXTDB_ADMIN_PASSWORD, default 1375) → HMAC stateless token.
// All mutations go through the engine + outbox so they reach B2 like app writes.
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const PASSWORD = process.env.TEXTDB_ADMIN_PASSWORD || '1375';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const SECRET = process.env.TEXTDB_ADMIN_SECRET || crypto.createHash('sha256').update('textdb-admin:' + PASSWORD).digest();
const NAMESPACES = ['main'];
const KINDS = ['text', 'num', 'bool', 'json'];
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

const loginAttempts = new Map();

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function sign(exp) {
  return crypto.createHmac('sha256', SECRET).update('blackbaze:' + exp).digest('hex');
}

function issueToken() {
  const exp = Date.now() + TOKEN_TTL_MS;
  return exp + '.' + sign(exp);
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  rec.count++;
  return rec.count > 5;
}

function validIdent(name) {
  return typeof name === 'string' && IDENT_RE.test(name) && !name.startsWith('__') && !name.startsWith('sqlite');
}

function createAdminRouter(textDb) {
  const router = express.Router();
  const htmlPath = path.join(__dirname, 'admin.html');

  router.use(express.json({ limit: '2mb' }));

  const engineFor = async (ns) => {
    if (!NAMESPACES.includes(ns)) throw Object.assign(new Error('unknown namespace: ' + ns), { status: 400 });
    await textDb.ready;
    const entry = textDb.engines.find(e => e.ns === ns);
    if (!entry) throw Object.assign(new Error('namespace not open: ' + ns), { status: 500 });
    return entry.engine;
  };

  const auth = (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!verifyToken(token)) return res.status(401).json({ error: 'unauthorized' });
    next();
  };

  const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch(e => {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  });

  // ── auth ──
  router.post('/api/login', wrap(async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return res.status(429).json({ error: 'too many attempts, wait a minute' });
    const password = String((req.body && req.body.password) || '');
    if (!safeEqual(password, PASSWORD)) {
      return res.status(401).json({ error: 'wrong password' });
    }
    loginAttempts.delete(ip);
    res.json({ token: issueToken(), expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString() });
  }));

  router.get('/api/me', auth, (req, res) => res.json({ ok: true }));

  // ── overview ──
  router.get('/api/overview', auth, wrap(async (req, res) => {
    await textDb.ready;
    const tables = {};
    for (const ns of NAMESPACES) {
      const e = await engineFor(ns);
      tables[ns] = e.listTables();
    }
    res.json({ stats: textDb.stats(), tables });
  }));

  // ── tables ──
  router.post('/api/tables', auth, wrap(async (req, res) => {
    const { ns, name, columns } = req.body || {};
    if (!validIdent(name)) throw Object.assign(new Error('invalid table name (letters/digits/underscore, must not start with __)'), { status: 400 });
    const e = await engineFor(ns);
    if (e.tableExists(name)) throw Object.assign(new Error('table already exists: ' + name), { status: 409 });
    const cols = {};
    for (const [col, kind] of Object.entries(columns || {})) {
      if (col === 'id') continue;
      if (!validIdent(col)) throw Object.assign(new Error('invalid column name: ' + col), { status: 400 });
      if (!KINDS.includes(kind)) throw Object.assign(new Error('invalid kind for ' + col + ': ' + kind + ' (use text|num|bool|json)'), { status: 400 });
      cols[col] = kind;
    }
    cols.id = 'text';
    if (!cols.created_at) cols.created_at = 'text';
    e.createTable(name, cols);
    res.json({ ok: true, table: name, columns: e.tableInfo(name) });
  }));

  router.delete('/api/tables/:ns/:name', auth, wrap(async (req, res) => {
    const { ns, name } = req.params;
    if (!validIdent(name)) throw Object.assign(new Error('invalid table name'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    e.dropTable(name);
    res.json({ ok: true });
  }));

  // ── columns ──
  router.post('/api/tables/:ns/:name/columns', auth, wrap(async (req, res) => {
    const { ns, name } = req.params;
    const { col, kind } = req.body || {};
    if (!validIdent(name) || !validIdent(col)) throw Object.assign(new Error('invalid identifiers'), { status: 400 });
    if (!KINDS.includes(kind)) throw Object.assign(new Error('invalid kind (text|num|bool|json)'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    const existing = e.tableInfo(name);
    if (existing.some(c => c.name === col)) throw Object.assign(new Error('column already exists: ' + col), { status: 409 });
    e.addColumn(name, col, kind);
    const schema = e.getSchema(name);
    e.saveSchema(name, Object.assign({}, schema.cols, { [col]: kind }));
    res.json({ ok: true, columns: e.tableInfo(name) });
  }));

  router.delete('/api/tables/:ns/:name/columns/:col', auth, wrap(async (req, res) => {
    const { ns, name, col } = req.params;
    if (!validIdent(name) || !validIdent(col)) throw Object.assign(new Error('invalid identifiers'), { status: 400 });
    if (col === 'id') throw Object.assign(new Error('cannot drop the id column'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    const existing = e.tableInfo(name);
    if (!existing.some(c => c.name === col)) throw Object.assign(new Error('no such column: ' + col), { status: 404 });
    e.dropColumn(name, col);
    res.json({ ok: true, columns: e.tableInfo(name) });
  }));

  // ── rows ──
  router.get('/api/tables/:ns/:name/rows', auth, wrap(async (req, res) => {
    const { ns, name } = req.params;
    if (!validIdent(name)) throw Object.assign(new Error('invalid table name'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const total = Number(e.rawGet('SELECT COUNT(*) AS c FROM "' + name.replace(/"/g, '""') + '"', []).c);
    const raw = e.rawAll('SELECT * FROM "' + name.replace(/"/g, '""') + '" ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?', [limit, offset]);
    const rows = raw.map(r => e.reviveRow(name, r));
    res.json({ total, rows, limit, offset });
  }));

  router.post('/api/tables/:ns/:name/rows', auth, wrap(async (req, res) => {
    const { ns, name } = req.params;
    if (!validIdent(name)) throw Object.assign(new Error('invalid table name'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    const info = e.tableInfo(name);
    const allowed = new Set(info.map(c => c.name));
    const row = req.body || {};
    for (const k of Object.keys(row)) {
      if (!allowed.has(k)) throw Object.assign(new Error('unknown column: ' + k), { status: 400 });
    }
    const [inserted] = e.insertRows(name, [row]);
    e.enqueueOutbox(ns, 'upsert', name, inserted.id, e.encodeRow(name, inserted));
    res.json({ ok: true, row: inserted });
  }));

  router.patch('/api/tables/:ns/:name/rows/:id', auth, wrap(async (req, res) => {
    const { ns, name, id } = req.params;
    if (!validIdent(name)) throw Object.assign(new Error('invalid table name'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    const info = e.tableInfo(name);
    const allowed = new Set(info.map(c => c.name));
    const patch = req.body || {};
    for (const k of Object.keys(patch)) {
      if (k === 'id') throw Object.assign(new Error('cannot update id'), { status: 400 });
      if (!allowed.has(k)) throw Object.assign(new Error('unknown column: ' + k), { status: 400 });
    }
    const existing = e.rawGet('SELECT * FROM "' + name.replace(/"/g, '""') + '" WHERE id = ?', [id]);
    if (!existing) throw Object.assign(new Error('no row with id ' + id), { status: 404 });
    const merged = Object.assign(e.reviveRow(name, existing), patch);
    const cols = Object.keys(patch);
    const sql = 'UPDATE "' + name.replace(/"/g, '""') + '" SET ' + cols.map(c => '"' + c.replace(/"/g, '""') + '" = ?').join(', ') + ' WHERE id = ?';
    const schema = e.getSchema(name);
    const { encodeValue } = require('./engine');
    e.rawRun(sql, cols.map(c => encodeValue(schema.cols[c] || 'json', patch[c])).concat([id]));
    e.enqueueOutbox(ns, 'upsert', name, id, e.encodeRow(name, merged));
    res.json({ ok: true, row: merged });
  }));

  router.delete('/api/tables/:ns/:name/rows/:id', auth, wrap(async (req, res) => {
    const { ns, name, id } = req.params;
    if (!validIdent(name)) throw Object.assign(new Error('invalid table name'), { status: 400 });
    const e = await engineFor(ns);
    if (!e.tableExists(name)) throw Object.assign(new Error('no such table: ' + name), { status: 404 });
    const existing = e.rawGet('SELECT id FROM "' + name.replace(/"/g, '""') + '" WHERE id = ?', [id]);
    if (!existing) throw Object.assign(new Error('no row with id ' + id), { status: 404 });
    e.rawRun('DELETE FROM "' + name.replace(/"/g, '""') + '" WHERE id = ?', [id]);
    e.enqueueOutbox(ns, 'delete', name, id, null);
    res.json({ ok: true });
  }));

  // ── maintenance ──
  router.post('/api/snapshot', auth, wrap(async (req, res) => {
    await textDb.ready;
    await textDb.replicator.snapshotAll();
    res.json({ ok: true, lastSnapshot: textDb.replicator.lastSnapshot });
  }));

  router.post('/api/flush', auth, wrap(async (req, res) => {
    await textDb.ready;
    await textDb.outbox.flush();
    res.json({ ok: true, outbox: textDb.outbox.stats() });
  }));

  router.get('/api/objects', auth, wrap(async (req, res) => {
    const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : '';
    const objects = await textDb.storage.list(prefix);
    res.json({ objects });
  }));

  // ── serve dashboard (login page is public; app data is behind /api/*) ──
  router.get('/', (req, res) => res.sendFile(htmlPath));

  return router;
}

module.exports = { createAdminRouter };
