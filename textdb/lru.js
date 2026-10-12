class LruCache {
  constructor(opts) {
    opts = opts || {};
    this.maxBytes = opts.maxBytes || 96 * 1024 * 1024;
    this.defaultTtl = opts.defaultTtl || 24 * 60 * 60 * 1000;
    this.map = new Map();
    this.totalBytes = 0;
    this.hits = 0;
    this.misses =  0;
  }

  _sizeOf(value) {
    try { return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value)) || 64; }
    catch { return 256; }
  }

  get(key) {
    const e = this.map.get(key);
    if (!e) { this.misses++; return undefined; }
    if (Date.now() > e.expires) {
      this.totalBytes -= e.bytes;
      this.map.delete(key);
      this.misses++;
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, e);
    this.hits++;
    return e.value;
  }

  set(key, value, ttl) {
    const bytes = this._sizeOf(value);
    if (bytes > this.maxBytes / 4) return;
    if (this.map.has(key)) {
      const old = this.map.get(key);
      this.totalBytes -= old.bytes;
      this.map.delete(key);
    }
    while (this.totalBytes + bytes > this.maxBytes && this.map.size > 0) {
      const oldest = this.map.keys().next().value;
      this.totalBytes -= this.map.get(oldest).bytes;
      this.map.delete(oldest);
    }
    this.map.set(key, { value, bytes, expires: Date.now() + (ttl || this.defaultTtl) });
    this.totalBytes += bytes;
  }

  invalidatePrefix(prefix) {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) {
        this.totalBytes -= this.map.get(key).bytes;
        this.map.delete(key);
      }
    }
  }

  clear() {
    this.map.clear();
    this.totalBytes = 0;
  }

  stats() {
    return { entries: this.map.size, bytes: this.totalBytes, hits: this.hits, misses: this.misses };
  }
}

module.exports = LruCache;
