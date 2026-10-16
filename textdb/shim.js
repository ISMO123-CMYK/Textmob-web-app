const crypto = require('crypto');
const { encodeValue } = require('./engine');

const COMPARISON_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in'];

function errObj(message, code) {
  return { message, details: '', hint: '', code: code || '' };
}

function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseSelectColumns(selectArg) {
  const raw = (selectArg === undefined || selectArg === null || selectArg === '') ? '*' : String(selectArg);
  const parts = splitTopLevel(raw, ',');
  const cols = [];
  const embeds = [];
  for (const p of parts) {
    const m = p.match(/^([A-Za-z0-9_]+)\s*\((.+)\)$/);
    if (m) embeds.push({ table: m[1], select: m[2] });
    else if (p === '*') cols.push('*');
    else cols.push(p.trim());
  }
  return { cols, embeds, star: cols.includes('*') };
}

function parseOrClause(clause) {
  for (const op of COMPARISON_OPS) {
    const marker = '.' + op + '.';
    const idx = clause.indexOf(marker);
    if (idx > 0) {
      const col = clause.slice(0, idx);
      let val = clause.slice(idx + marker.length);
      if (op === 'is' && val === 'null') val = null;
      return { col, op, val };
    }
  }
  return null;
}

function colExpr(col, kind) {
  const dq = '"' + col.replace(/"/g, '""') + '"';
  if (col.includes('.')) {
    const [head, ...rest] = col.split('.');
    const path = '$."' + rest.join('"."') + '"';
    return { sql: `json_extract("${head.replace(/"/g, '""')}", '${path}')`, json: true };
  }
  return { sql: dq, json: false, kind };
}

function likeEscapeAware(val, ci) {
  void ci;
  return val;
}

function bindFilterValue(engine, table, col, val, isJsonPath) {
  if (val === null || val === undefined) return null;
  if (isJsonPath) return val;
  const schema = engine.getSchema(table);
  const kind = (schema && schema.cols[col]) || (typeof val === 'object' ? 'json' : inferLoose(val));
  return encodeValue(kind, val);
}

function inferLoose(v) {
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return 'num';
  if (typeof v === 'object') return 'json';
  return 'text';
}

function colMissing(engine, table, col) {
  const head = String(col).split('.')[0];
  const schema = engine.getSchema(table);
  return !schema || !schema.cols || !(head in schema.cols);
}

function buildWhere(engine, table, filters) {
  if (!filters.length) return { sql: '', params: [] };
  const parts = [];
  const params = [];
  for (const f of filters) {
    if (f.type === 'or') {
      const inner = [];
      for (const c of f.clauses) {
        if (colMissing(engine, table, c.col)) continue;
        const ex = colExpr(c.col, null);
        if (c.op === 'is') {
          inner.push(ex.sql + (c.val === null ? ' IS NULL' : ' = ?'));
          if (c.val !== null) params.push(bindFilterValue(engine, table, c.col, c.val, ex.json));
        } else if (c.op === 'in') {
          const vals = String(c.val).split(',').map(v => v.trim());
          inner.push(ex.sql + ' IN (' + vals.map(() => '?').join(', ') + ')');
          for (const v of vals) params.push(bindFilterValue(engine, table, c.col, v, ex.json));
        } else if (c.op === 'neq') {
          inner.push('(' + ex.sql + ' IS NULL OR ' + ex.sql + ' != ?)');
          params.push(bindFilterValue(engine, table, c.col, c.val, ex.json));
        } else if (c.op === 'ilike' || c.op === 'like') {
          inner.push('lower(' + ex.sql + ') LIKE lower(?)');
          params.push(likeEscapeAware(c.val, true));
        } else {
          const sqlOp = { eq: '=', gt: '>', gte: '>=', lt: '<', lte: '<=' }[c.op];
          inner.push(ex.sql + ' ' + sqlOp + ' ?');
          params.push(bindFilterValue(engine, table, c.col, c.val, ex.json));
        }
      }
      if (!inner.length) { parts.push('0=1'); continue; }
      parts.push('(' + inner.join(' OR ') + ')');
    } else if (f.type === 'not') {
      if (colMissing(engine, table, f.col)) { parts.push('0=1'); continue; }
      const ex = colExpr(f.col, null);
      if (f.op === 'ilike' || f.op === 'like') {
        parts.push('(NOT (' + ex.sql + ' IS NOT NULL AND lower(' + ex.sql + ') LIKE lower(?)))');
        params.push(f.val);
      } else {
        parts.push('(NOT (' + ex.sql + ' = ?) OR ' + ex.sql + ' IS NULL)');
        params.push(bindFilterValue(engine, table, f.col, f.val, ex.json));
      }
    } else if (f.type === 'is') {
      if (colMissing(engine, table, f.col)) {
        if (f.val === null) continue;
        parts.push('0=1');
        continue;
      }
      const ex = colExpr(f.col, null);
      parts.push(f.val === null ? ex.sql + ' IS NULL' : ex.sql + ' = ?');
      if (f.val !== null) params.push(bindFilterValue(engine, table, f.col, f.val, ex.json));
    } else if (f.type === 'in') {
      if (colMissing(engine, table, f.col)) { parts.push('0=1'); continue; }
      const ex = colExpr(f.col, null);
      const vals = (f.val || []).map(v => typeof v === 'object' && v !== null ? v : v);
      if (!vals.length) { parts.push('0=1'); continue; }
      parts.push(ex.sql + ' IN (' + vals.map(() => '?').join(', ') + ')');
      for (const v of vals) params.push(bindFilterValue(engine, table, f.col, v, ex.json));
    } else if (f.type === 'contains') {
      // PostgREST `@>` semantics: JSON array column contains ALL given values.
      if (colMissing(engine, table, f.col)) { parts.push('0=1'); continue; }
      const ex = colExpr(f.col, null);
      let arr = f.val;
      if (typeof arr === 'string') {
        try { const p = JSON.parse(arr); arr = Array.isArray(p) ? p : [arr]; } catch { arr = [arr]; }
      }
      if (!Array.isArray(arr)) arr = [arr];
      if (!arr.length) { parts.push('0=1'); continue; }
      for (const v of arr) {
        parts.push('EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(' + ex.sql + ') THEN ' + ex.sql + ' ELSE NULL END) WHERE json_each.value = ?)');
        params.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      }
    } else {
      const op = f.type;
      if (colMissing(engine, table, f.col)) {
        if (!(op === 'is' && f.val === null)) parts.push('0=1');
        continue;
      }
      const ex = colExpr(f.col, null);
      if (op === 'ilike' || op === 'like') {
        parts.push('lower(' + ex.sql + ') LIKE lower(?)');
        params.push(f.val);
      } else {
        const sqlOp = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op] || '=';
        if (op === 'neq') {
          parts.push('(' + ex.sql + ' IS NULL OR ' + ex.sql + ' != ?)');
        } else {
          parts.push(ex.sql + ' ' + sqlOp + ' ?');
        }
        params.push(bindFilterValue(engine, table, f.col, f.val, ex.json));
      }
    }
  }
  return { sql: parts.length ? ' WHERE ' + parts.join(' AND ') : '', params };
}

function buildOrderBy(engine, table, orders) {
  if (!orders.length) return '';
  const parts = orders
    .filter(o => !colMissing(engine, table, o.col))
    .map(o => {
      const ex = colExpr(o.col, null);
      return ex.sql + (o.ascending === false ? ' DESC' : ' ASC');
    });
  return parts.length ? ' ORDER BY ' + parts.join(', ') : '';
}

class QueryBuilder {
  constructor(dbx, table) {
    this.dbx = dbx;
    this.table = table;
    this.action = 'select';
    this.selectArg = '*';
    this.countMode = null;
    this.headOnly = false;
    this.insertValues = null;
    this.updateValues = null;
    this.upsertOptions = null;
    this.filters = [];
    this.orders = [];
    this._limit = null;
    this._range = null;
    this._single = false;
    this._maybeSingle = false;
  }

  select(cols, opts) {
    if (cols !== undefined) this.selectArg = cols;
    if (opts && opts.count) this.countMode = opts.count;
    if (opts && opts.head) this.headOnly = true;
    return this;
  }

  insert(rows) {
    this.action = 'insert';
    this.insertValues = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values) {
    this.action = 'update';
    this.updateValues = values;
    return this;
  }

  upsert(values, options) {
    this.action = 'upsert';
    this.insertValues = Array.isArray(values) ? values : [values];
    this.upsertOptions = options || {};
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(col, val) { this.filters.push({ type: 'eq', col, val }); return this; }
  neq(col, val) { this.filters.push({ type: 'neq', col, val }); return this; }
  gt(col, val) { this.filters.push({ type: 'gt', col, val }); return this; }
  gte(col, val) { this.filters.push({ type: 'gte', col, val }); return this; }
  lt(col, val) { this.filters.push({ type: 'lt', col, val }); return this; }
  lte(col, val) { this.filters.push({ type: 'lte', col, val }); return this; }
  in(col, vals) { this.filters.push({ type: 'in', col, val: vals }); return this; }
  is(col, val) { this.filters.push({ type: 'is', col, val }); return this; }
  ilike(col, val) { this.filters.push({ type: 'ilike', col, val }); return this; }
  like(col, val) { this.filters.push({ type: 'like', col, val }); return this; }
  contains(col, val) { this.filters.push({ type: 'contains', col, val }); return this; }
  not(col, op, val) { this.filters.push({ type: 'not', col, op, val }); return this; }

  or(expr) {
    const clauses = splitTopLevel(expr, ',')
      .map(parseOrClause)
      .filter(Boolean);
    this.filters.push({ type: 'or', clauses });
    return this;
  }

  order(col, opts) {
    this.orders.push({ col, ascending: opts ? opts.ascending !== false : true });
    return this;
  }

  limit(n) { this._limit = parseInt(n, 10); return this; }
  range(from, to) { this._range = [parseInt(from, 10), parseInt(to, 10)]; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._maybeSingle = true; return this; }

  then(resolve, reject) {
    const run = () => {
      try {
        const result = this._exec();
        return Promise.resolve(result).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    };
    if (this.dbx.ready) {
      return this.dbx.ready.then(run, e => {
        const r = { data: null, error: errObj('textdb not ready: ' + (e && e.message)) };
        return Promise.resolve(r).then(resolve, reject);
      });
    }
    return run();
  }

  catch(fn) { return this.then(r => r, fn); }
  finally(fn) { return this.then(r => { fn(); return r; }, e => { fn(); throw e; }); }

  _cacheKey() {
    return this.dbx.ns + '|' + this.table + '|' + JSON.stringify({
      a: this.action, s: this.selectArg, c: this.countMode, h: this.headOnly,
      f: this.filters, o: this.orders, l: this._limit, r: this._range,
    });
  }

  _exec() {
    const { engine, lru } = this.dbx;
    try {
      engine.ensureTable(this.table);
      if (this.action === 'insert') return this._execInsert();
      if (this.action === 'upsert') return this._execUpsert();
      if (this.action === 'update') return this._execUpdate();
      if (this.action === 'delete') return this._execDelete();
      const ck = this._cacheKey();
      const cached = lru && lru.get(ck);
      if (cached) return cached;
      const result = this._execSelect();
      if (lru && !result.error && !this._single && !this._maybeSingle) {
        lru.set(ck, result, this.dbx.queryTtl);
      }
      return result;
    } catch (e) {
      return { data: null, error: errObj(e.message, e.code) };
    }
  }

  _execSelect() {
    const { engine, lru } = this.dbx;
    const where = buildWhere(engine, this.table, this.filters);
    const schema = engine.getSchema(this.table);
    const { cols, embeds, star } = parseSelectColumns(this.selectArg);

    if (this.countMode === 'exact') {
      const countSql = 'SELECT COUNT(*) AS c FROM ' + identT(this.table) + where.sql;
      const row = engine.rawGet(countSql, where.params);
      const count = row ? Number(row.c) : 0;
      if (this.headOnly) return { data: null, count, error: null };
      const rows = this._fetchRows(where, schema);
      const shaped = this._shape(rows, cols, embeds, star, schema);
      return { data: shaped, count, error: null };
    }

    if (this.headOnly) {
      const countSql = 'SELECT COUNT(*) AS c FROM ' + identT(this.table) + where.sql;
      const row = engine.rawGet(countSql, where.params);
      return { data: null, count: row ? Number(row.c) : 0, error: null };
    }

    const rows = this._fetchRows(where, schema);

    if (this._maybeSingle) {
      if (rows.length === 0) return { data: null, error: null };
      const shaped = this._shape(rows.slice(0, 1), cols, embeds, star, schema);
      return { data: shaped[0], error: null };
    }

    if (this._single) {
      if (rows.length === 0) {
        return { data: null, error: errObj('JSON object requested, multiple (or no) rows received', 'PGRST116') };
      }
      if (rows.length > 1) {
        return { data: null, error: errObj('JSON object requested, multiple (or no) rows received', 'PGRST116') };
      }
      const shaped = this._shape(rows, cols, embeds, star, schema);
      return { data: shaped[0], error: null };
    }

    void lru;
    return { data: this._shape(rows, cols, embeds, star, schema), error: null };
  }

  _fetchRows(where, schema) {
    const { engine } = this.dbx;
    const cols = Object.keys(schema.cols);
    const sel = cols.length ? cols.map(identT).join(', ') : '*';
    let sql = 'SELECT ' + sel + ' FROM ' + identT(this.table) + where.sql + buildOrderBy(engine, this.table, this.orders);
    const params = where.params.slice();
    if (this._range) {
      const [from, to] = this._range;
      sql += ' LIMIT ? OFFSET ?';
      params.push(to - from + 1, from);
    } else if (this._limit !== null) {
      sql += ' LIMIT ?';
      params.push(this._limit);
    } else if (this._single || this._maybeSingle) {
      sql += ' LIMIT 2';
    }
    const raw = engine.rawAll(sql, params);
    return raw.map(r => engine.reviveRow(this.table, r));
  }

  _shape(rows, cols, embeds, star, schema) {
    if (embeds.length) {
      for (const emb of embeds) this._attachEmbed(rows, emb, schema);
    }
    const projected = rows.map(row => {
      const out = {};
      if (star) {
        Object.assign(out, row);
      } else {
        for (const c of cols) if (c in row) out[c] = row[c];
        if (!('id' in out) && 'id' in row) out.id = row.id;
        for (const emb of embeds) if (emb.table in row) out[emb.table] = row[emb.table];
      }
      return out;
    });
    return projected;
  }

  _attachEmbed(rows, emb, schema) {
    const { engine } = this.dbx;
    const embTable = emb.table;
    const candidates = [
      embTable + '_id',
      embTable + '_username',
      'user_id',
      'username',
      'created_by',
      'sender_id',
      'receiver_id',
    ];
    let keyCol = null;
    for (const c of candidates) {
      if (schema.cols[c] && rows.some(r => r[c] !== undefined && r[c] !== null)) { keyCol = c; break; }
    }
    if (!keyCol && schema.cols.id && embTable === 'users') keyCol = 'id';

    const lookupBy = keyCol === 'user_id' || keyCol === embTable + '_id' || keyCol === 'id' ? 'id' : 'username';
    const values = [...new Set(rows.map(r => r[keyCol]).filter(v => v !== undefined && v !== null))];
    const embSchema = engine.ensureTable(embTable);
    const embColNames = Object.keys(embSchema.cols);
    const embMap = new Map();
    if (values.length) {
      const placeholders = values.map(() => '?').join(', ');
      const raw = engine.rawAll(
        'SELECT ' + embColNames.map(identT).join(', ') + ' FROM ' + identT(embTable) + ' WHERE ' + identT(lookupBy) + ' IN (' + placeholders + ')',
        values.map(v => encodeValue(embSchema.cols[lookupBy] || 'text', v))
      );
      for (const r of raw) {
        const revived = engine.reviveRow(embTable, r);
        embMap.set(String(revived[lookupBy]), revived);
      }
    }
    const { cols, embeds: nestedEmbeds, star } = parseSelectColumns(emb.select);
    for (const row of rows) {
      let match = null;
      if (keyCol && row[keyCol] !== undefined && row[keyCol] !== null) {
        match = embMap.get(String(row[keyCol])) || null;
      }
      if (!match && this.table === 'Posts' && embTable === 'groups' && row.type && String(row.type).startsWith('group-post-')) {
        const gid = String(row.type).slice('group-post-'.length);
        const raw = engine.rawAll('SELECT ' + embColNames.map(identT).join(', ') + ' FROM ' + identT(embTable) + ' WHERE id = ?', [gid]);
        if (raw[0]) match = engine.reviveRow(embTable, raw[0]);
      }
      if (!match) { row[embTable] = null; continue; }
      const proj = {};
      if (star) Object.assign(proj, match);
      else for (const c of cols) if (c in match) proj[c] = match[c];
      void nestedEmbeds;
      row[embTable] = proj;
    }
  }

  _execInsert() {
    const { engine, lru } = this.dbx;
    const rows = this.insertValues;
    const inserted = engine.transaction(() => {
      const res = engine.insertRows(this.table, rows);
      for (const r of res) {
        engine.rawRun(
          'INSERT INTO __outbox (ts, op, ns, tbl, key, payload, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [new Date().toISOString(), 'upsert', this.dbx.ns, this.table, String(r.id), JSON.stringify(engine.encodeRow(this.table, r)), Date.now()]
        );
      }
      return res;
    });
    if (lru) lru.invalidatePrefix(this.dbx.ns + '|' + this.table + '|');
    const schema = engine.getSchema(this.table);
    const { cols, embeds, star } = parseSelectColumns(this.selectArg);
    const shaped = this._shape(inserted, cols, embeds, star, schema);
    if (this._single) {
      if (!shaped.length) return { data: null, error: errObj('no rows inserted', 'PGRST116') };
      return { data: shaped[0], error: null };
    }
    return { data: shaped, error: null };
  }

  _execUpsert() {
    const { engine, lru } = this.dbx;
    const rows = this.insertValues;
    const onConflict = this.upsertOptions.onConflict || 'id';
    const inserted = engine.transaction(() => {
      const res = engine.upsertRows(this.table, rows, onConflict);
      for (const r of res) {
        engine.rawRun(
          'INSERT INTO __outbox (ts, op, ns, tbl, key, payload, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [new Date().toISOString(), 'upsert', this.dbx.ns, this.table, String(r.id), JSON.stringify(engine.encodeRow(this.table, r)), Date.now()]
        );
      }
      return res;
    });
    if (lru) lru.invalidatePrefix(this.dbx.ns + '|' + this.table + '|');
    const schema = engine.getSchema(this.table);
    const { cols, embeds, star } = parseSelectColumns(this.selectArg);
    const shaped = this._shape(inserted, cols, embeds, star, schema);
    return { data: this._single ? (shaped[0] || null) : shaped, error: null };
  }

  _execUpdate() {
    const { engine, lru } = this.dbx;
    if (!this.filters.length) {
      return { data: null, error: errObj('update without filter refused (textdb safety guard)') };
    }
    const where = buildWhere(engine, this.table, this.filters);
    engine.ensureColumns(this.table, this.updateValues);
    const schema = engine.getSchema(this.table);
    const setCols = Object.keys(this.updateValues);
    const result = engine.transaction(() => {
      const existing = engine.rawAll('SELECT id FROM ' + identT(this.table) + where.sql, where.params);
      const keys = existing.map(r => String(engine.reviveRow(this.table, r).id));
      const setSql = setCols.map(c => identT(c) + ' = ?').join(', ');
      const params = setCols.map(c => encodeValue(schema.cols[c] || inferLoose(this.updateValues[c]), this.updateValues[c]));
      const sql = 'UPDATE ' + identT(this.table) + ' SET ' + setSql + where.sql;
      engine.rawRun(sql, [...params, ...where.params]);
      // Store the FULL post-update row (already storage-encoded) so B2 replay
      // restores complete rows with bindable values — not partial raw values.
      const full = engine.rawAll('SELECT * FROM ' + identT(this.table) + where.sql, where.params);
      for (const fr of full) {
        engine.rawRun(
          'INSERT INTO __outbox (ts, op, ns, tbl, key, payload, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [new Date().toISOString(), 'upsert', this.dbx.ns, this.table, String(fr.id), JSON.stringify(fr), Date.now()]
        );
      }
      return keys;
    });
    if (lru) lru.invalidatePrefix(this.dbx.ns + '|' + this.table + '|');
    const rows = this._fetchRows(where, schema);
    const { cols, embeds, star } = parseSelectColumns(this.selectArg);
    const shaped = this._shape(rows, cols, embeds, star, schema);
    if (this._single) {
      if (!shaped.length) return { data: null, error: errObj('no rows updated', 'PGRST116') };
      return { data: shaped[0], error: null };
    }
    if (this._maybeSingle) return { data: shaped[0] || null, error: null };
    void result;
    return { data: shaped, error: null };
  }

  _execDelete() {
    const { engine, lru } = this.dbx;
    if (!this.filters.length) {
      return { data: null, error: errObj('delete without filter refused (textdb safety guard)') };
    }
    const where = buildWhere(engine, this.table, this.filters);
    const schema = engine.getSchema(this.table);
    engine.transaction(() => {
      const existing = engine.rawAll('SELECT id FROM ' + identT(this.table) + where.sql, where.params);
      const keys = existing.map(r => String(engine.reviveRow(this.table, r).id));
      engine.rawRun('DELETE FROM ' + identT(this.table) + where.sql, where.params);
      for (const k of keys) {
        engine.rawRun(
          'INSERT INTO __outbox (ts, op, ns, tbl, key, payload, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [new Date().toISOString(), 'delete', this.dbx.ns, this.table, k, null, Date.now()]
        );
      }
    });
    if (lru) lru.invalidatePrefix(this.dbx.ns + '|' + this.table + '|');
    void schema;
    return { data: null, error: null };
  }
}

function identT(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

class TextDbClient {
  constructor(dbx) {
    this.dbx = dbx;
    this.rest = { rpc: async () => ({ data: null, error: errObj('rpc not supported by textdb') }) };
    this.auth = {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: errObj('auth not supported by textdb') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    };
    this.storage = {
      from: () => ({ upload: async () => ({ data: null, error: errObj('use cloudinary') }), remove: async () => ({ data: null, error: errObj('use cloudinary') }) }),
    };
    this.realtime = { channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }) };
    this.functions = { invoke: async () => ({ data: null, error: errObj('not supported') }) };
  }

  schema() { return this.rpc; }

  from(table) {
    return new QueryBuilder(this.dbx, table);
  }
}

module.exports = { TextDbClient, QueryBuilder, parseSelectColumns, buildWhere, parseOrClause };
