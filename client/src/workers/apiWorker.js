const API_BASE_URL = (typeof self !== 'undefined' && self.location && (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'))
  ? 'http://localhost:5000'
  : 'https://textmob-provider-api-99ii.onrender.com';

const inflight = new Map();

self.onmessage = async (e) => {
  const { id, endpoint, options } = e.data;
  const method = (options?.method || 'GET').toUpperCase();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const dedupKey = method === 'GET' ? endpoint : '';

  if (dedupKey && inflight.has(dedupKey)) {
    try {
      const result = await inflight.get(dedupKey);
      self.postMessage({ id, ...result });
    } catch {
      self.postMessage({ id, ok: false, error: 'Dedup failed', status: 0 });
    }
    return;
  }

  const promise = (async () => {
    try {
      const fetchOptions = { ...options };
      if (fetchOptions.body && typeof fetchOptions.body === 'string') {
        // already stringified
      }
      if (!fetchOptions.headers) fetchOptions.headers = {};
      if (!(fetchOptions.body instanceof FormData) && !fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, fetchOptions);
      const contentType = res.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = text; }
      }

      return { ok: res.ok, data, status: res.status };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error', status: 0 };
    }
  })();

  if (dedupKey) {
    inflight.set(dedupKey, promise);
    promise.finally(() => inflight.delete(dedupKey));
  }

  const result = await promise;
  self.postMessage({ id, ...result });
};
