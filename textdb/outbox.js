const MAX_ATTEMPTS = 3;

class OutboxWorker {
  constructor(engines, storage, opts) {
    this.engines = engines;
    this.storage = storage;
    this.intervalMs = (opts && opts.intervalMs) || 500;
    this.batchSize = (opts && opts.batchSize) || 50;
    this.timer = null;
    this.running = false;
    this.synced = 0;
    this.failed = 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.drainOnce().catch(e => console.error('[textdb:outbox] drain error:', e.message)), this.intervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async drainOnce() {
    if (this.running) return;
    this.running = true;
    try {
      for (const { engine, ns } of this.engines) {
        const now = Date.now();
        const batch = engine.rawAll(
          'SELECT id, ts, op, ns, tbl, key, payload, attempts FROM __outbox WHERE next_retry_at <= ? ORDER BY id LIMIT ?',
          [now, this.batchSize]
        );
        for (const row of batch) {
          try {
            const objectKey = 'data/' + (row.ns || ns) + '/' + row.tbl + '/' + encodeURIComponent(String(row.key)) + '.json';
            if (row.op === 'delete') {
              await this.storage.put(objectKey, JSON.stringify({ op: 'delete', table: row.tbl, key: row.key, ts: row.ts }));
            } else {
              await this.storage.put(objectKey, JSON.stringify({ op: 'upsert', table: row.tbl, key: row.key, row: row.payload ? JSON.parse(row.payload) : null, ts: row.ts }));
            }
            engine.rawRun('DELETE FROM __outbox WHERE id = ?', [row.id]);
            this.synced++;
          } catch (e) {
            const attempts = (row.attempts || 0) + 1;
            if (attempts >= MAX_ATTEMPTS) {
              engine.rawRun(
                'INSERT INTO __outbox_failed (ts, op, ns, tbl, key, payload, error, failed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [row.ts, row.op, row.ns, row.tbl, row.key, row.payload, String(e.message || e), new Date().toISOString()]
              );
              engine.rawRun('DELETE FROM __outbox WHERE id = ?', [row.id]);
              this.failed++;
              console.error('[textdb:outbox] FAILED permanently:', row.tbl, row.key, e.message);
            } else {
              const backoff = Math.pow(4, attempts) * 1000;
              engine.rawRun('UPDATE __outbox SET attempts = ?, next_retry_at = ? WHERE id = ?', [attempts, Date.now() + backoff, row.id]);
            }
          }
        }
      }
    } finally {
      this.running = false;
    }
  }

  async flush() {
    for (let i = 0; i < 20; i++) {
      let pending = 0;
      for (const { engine } of this.engines) {
        const r = engine.rawGet('SELECT COUNT(*) AS c FROM __outbox', []);
        pending += Number(r.c);
      }
      if (!pending) return;
      await this.drainOnce();
      await new Promise(r => setTimeout(r, 50));
    }
  }

  stats() {
    let pending = 0, failedRows = 0;
    for (const { engine } of this.engines) {
      pending += Number(engine.rawGet('SELECT COUNT(*) AS c FROM __outbox', []).c);
      failedRows += Number(engine.rawGet('SELECT COUNT(*) AS c FROM __outbox_failed', []).c);
    }
    return { pending, synced: this.synced, failed: this.failed, failedRows };
  }
}

module.exports = { OutboxWorker };
