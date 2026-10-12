const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class LocalDirStorage {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.kind = 'local';
    fs.mkdirSync(rootDir, { recursive: true });
  }

  _resolve(p) {
    const safe = p.replace(/[^a-zA-Z0-9._\-/]/g, '_');
    return path.join(this.rootDir, safe);
  }

  async put(key, data) {
    const full = this._resolve(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, data);
    return { key, size: Buffer.byteLength(data) };
  }

  async get(key) {
    try {
      return await fsp.readFile(this._resolve(key));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  async list(prefix) {
    const out = [];
    const walk = async (dir, rel) => {
      let entries;
      try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) await walk(path.join(dir, e.name), r);
        else if (r.startsWith(prefix)) {
          const st = await fsp.stat(path.join(dir, e.name));
          out.push({ name: r, size: st.size, uploadTimestamp: Math.floor(st.mtimeMs) });
        }
      }
    };
    await walk(this.rootDir, '');
    return out;
  }

  async delete(key) {
    try { await fsp.unlink(this._resolve(key)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

class B2Storage {
  constructor(opts) {
    this.keyId = opts.keyId;
    this.appKey = opts.appKey;
    this.bucket = opts.bucket;
    this.bucketId = null;
    this.authToken = null;
    this.apiBase = 'https://api.backblazeb2.com';
    this.kind = 'b2';
    this._uploadUrl = null;
    this._uploadToken = null;
    // B2 allows only ONE in-flight upload per upload token (auth_token_limit
    // 400). Serialize every put() through this chain so concurrent callers
    // (outbox flush + snapshot + admin actions) queue instead of colliding.
    this._uploadChain = Promise.resolve();
  }

  async _authorize() {
    const res = await fetch(this.apiBase + '/b2api/v2/b2_authorize_account', {
      headers: {
        Authorization: 'Basic ' + Buffer.from(this.keyId + ':' + this.appKey).toString('base64'),
      },
    });
    if (!res.ok) throw new Error('B2 auth failed: ' + res.status + ' ' + (await res.text()));
    const data = await res.json();
    this.authToken = data.authorizationToken;
    this.apiBase = data.apiUrl;
    this.downloadUrl = data.downloadUrl;
    this.accountId = data.accountId || null;
    // b2_authorize_account returns `allowed` as an OBJECT: {capabilities, bucketId?, bucketName?}
    // Bucket-scoped keys carry bucketId directly; unscoped/master keys need b2_list_buckets.
    const allowed = data.allowed || {};
    if (allowed.bucketId && allowed.bucketName === this.bucket) {
      this.bucketId = allowed.bucketId;
    }
    if (!this.bucketId) {
      const u = new URL(this.apiBase + '/b2api/v2/b2_list_buckets');
      if (this.accountId) u.searchParams.set('accountId', this.accountId);
      const listRes = await fetch(u.toString(), {
        headers: { Authorization: this.authToken },
      });
      const list = await listRes.json();
      if (!listRes.ok) throw new Error('B2 list_buckets failed: ' + listRes.status + ' ' + JSON.stringify(list));
      const b = (list.buckets || []).find(x => x.bucketName === this.bucket);
      if (!b) throw new Error('B2 bucket not found: ' + this.bucket);
      this.bucketId = b.bucketId;
    }
    this._uploadUrl = null;
  }

  async _req(url, opts, retried) {
    if (!this.authToken) await this._authorize();
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: this.authToken }, opts.headers || {});
    const res = await fetch(url, opts);
    if (res.status === 401 && !retried) {
      this.authToken = null;
      return this._req(url, opts, true);
    }
    return res;
  }

  put(key, data) {
    // Serialize uploads: B2 rejects a second concurrent upload on the same
    // auth token with 400 auth_token_limit.
    const run = () => this._putOnce(key, data, false);
    const p = this._uploadChain.then(run, run);
    this._uploadChain = p.then(() => {}, () => {});
    return p;
  }

  async _putOnce(key, data, isRetry) {
    if (!this.authToken) await this._authorize();
    if (!this._uploadUrl) {
      const res = await this._req(this.apiBase + '/b2api/v2/b2_get_upload_url', {
        method: 'POST', body: JSON.stringify({ bucketId: this.bucketId }),
      });
      if (!res.ok) throw new Error('B2 get_upload_url failed: ' + res.status + ' ' + (await res.text()));
      const up = await res.json();
      this._uploadUrl = up.uploadUrl;
      this._uploadToken = up.authorizationToken;
    }
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const res = await fetch(this._uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: this._uploadToken,
        'X-Bz-File-Name': encodeURIComponent(key).replace(/%2F/g, '/'),
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buf.length),
        'X-Bz-Content-Sha1': crypto.createHash('sha1').update(buf).digest('hex'),
      },
      body: buf,
    });
    if (res.ok) {
      const meta = await res.json();
      return { key, size: meta.contentLength, uploadTimestamp: meta.uploadTimestamp };
    }
    const bodyText = await res.text().catch(() => '');
    this._uploadUrl = null;
    // One upload per upload token — refresh the upload URL and retry once
    if (res.status === 400 && !isRetry && bodyText.includes('auth_token_limit')) {
      return this._putOnce(key, data, true);
    }
    throw new Error('B2 upload failed: ' + res.status + ' ' + bodyText);
  }

  async get(key) {
    if (!this.authToken) await this._authorize();
    const res = await this._req(
      this.downloadUrl + '/file/' + this.bucket + '/' + key.split('/').map(encodeURIComponent).join('/'),
      {}
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('B2 download failed: ' + res.status + ' ' + (await res.text()));
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  async list(prefix) {
    const out = [];
    let startFileName = null;
    for (;;) {
      const u = new URL(this.apiBase + '/b2api/v2/b2_list_file_names');
      u.searchParams.set('bucketId', this.bucketId);
      if (prefix) u.searchParams.set('prefix', prefix);
      if (startFileName) u.searchParams.set('startFileName', startFileName);
      const res = await this._req(u.toString(), {});
      if (!res.ok) throw new Error('B2 list failed: ' + res.status + ' ' + (await res.text()));
      const data = await res.json();
      for (const f of data.files || []) {
        out.push({ name: f.fileName, size: f.contentLength, uploadTimestamp: f.uploadTimestamp });
      }
      // B2 no longer returns isNextTruncated — nextFileName non-null means more pages
      if (!data.nextFileName) break;
      startFileName = data.nextFileName;
    }
    return out;
  }

  async delete(key) {
    // B2 keeps version history — delete every version of this exact file name.
    for (let guard = 0; guard < 50; guard++) {
      const u = new URL(this.apiBase + '/b2api/v2/b2_list_file_versions');
      u.searchParams.set('bucketId', this.bucketId);
      u.searchParams.set('startFileName', key);
      u.searchParams.set('maxFileCount', '50');
      const lr = await this._req(u.toString(), {});
      if (!lr.ok) throw new Error('B2 list_versions failed: ' + lr.status);
      const versions = await lr.json();
      const v = (versions.files || []).find(f => f.fileName === key) || null;
      if (!v) return;
      const res = await this._req(this.apiBase + '/b2api/v2/b2_delete_file_version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: v.fileName, fileId: v.fileId }),
      });
      if (!res.ok && res.status !== 404) throw new Error('B2 delete failed: ' + res.status + ' ' + (await res.text()));
    }
  }
}

function createStorage(env) {
  env = env || process.env;
  const keyId = env.TEXTDB_B2_KEY_ID;
  const appKey = env.TEXTDB_B2_APP_KEY;
  const bucket = env.TEXTDB_B2_BUCKET || 'textdb';
  if (keyId && appKey) {
    console.log('[textdb] storage: Backblaze B2 (bucket: ' + bucket + ')');
    return new B2Storage({ keyId, appKey, bucket });
  }
  const dir = env.TEXTDB_REMOTE_DIR || path.join(env.TEXTDB_DIR || 'server/data/textdb', 'remote-emulation');
  console.log('[textdb] storage: LOCAL emulation at ' + dir + ' (set TEXTDB_B2_* to enable Backblaze B2)');
  return new LocalDirStorage(dir);
}

module.exports = { createStorage, LocalDirStorage, B2Storage };
