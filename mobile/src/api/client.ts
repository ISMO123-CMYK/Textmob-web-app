import { getSecure, KEYS } from '../utils/storage';

const API_BASE_URL = 'https://textmob-provider-api-99ii.onrender.com';
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 2;

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

interface CacheEntry {
  data: any;
  expiry: number;
}

const responseCache = new Map<string, CacheEntry>();
const inflightDedup = new Map<string, Promise<ApiResponse>>();

function getCacheKey(endpoint: string, options: RequestInit = {}): string {
  if (options.method && options.method !== 'GET') return '';
  return endpoint;
}

function getFromCache(key: string): any {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttl = 30000) {
  responseCache.set(key, { data, expiry: Date.now() + ttl });
}

export function clearApiCache() {
  responseCache.clear();
}

async function getAuthUsername(): Promise<string | null> {
  try {
    const user = await getSecure(KEYS.CURRENT_USER);
    return user || null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<ApiResponse<T>> {
  // Multipart uploads must never ride the short fetch timeout below: a 5-20MB
  // image over cellular routinely blows past 15s, and retrying a POST either
  // duplicates the resource or re-sends a body that has already streamed. Send
  // them through the XHR helper instead (120s + progress, never retried).
  if (options.body instanceof FormData) {
    return uploadFile<T>(endpoint, options.body);
  }

  const cacheKey = getCacheKey(endpoint, options);
  if (cacheKey) {
    const cached = getFromCache(cacheKey);
    if (cached) return { ok: true, data: cached, status: 200 };
    const inflight = inflightDedup.get(cacheKey);
    if (inflight) return inflight as Promise<ApiResponse<T>>;
  }

  const doFetch = async (attempt: number): Promise<ApiResponse<T>> => {
    // Fresh controller per attempt. A reused one stays aborted forever, so a
    // timeout retry could never actually re-send anything.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const finalOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (!(finalOptions.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        ...finalOptions,
        headers,
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      let parsed = false;

      if (contentType.includes('application/json')) {
        data = await res.json();
        parsed = true;
      } else {
        const text = await res.text().catch(() => '');
        try {
          data = JSON.parse(text);
          parsed = true;
        } catch {
          parsed = false;
        }
      }

      if (!res.ok) {
        return {
          ok: false,
          error: (parsed && data?.error) || `HTTP ${res.status}`,
          status: res.status,
          ...(parsed ? { data } : {}),
        };
      }

      // 200 with a non-JSON body (the backend used to answer unknown API routes
      // with a full HTML page). Handing that to callers as success meant it got
      // cached and rendered as if it were real data.
      if (!parsed) {
        return {
          ok: false,
          error: `Non-JSON response (HTTP ${res.status}, ${contentType || 'no content-type'})`,
          status: res.status,
        };
      }

      if (cacheKey) {
        setCache(cacheKey, data);
      }

      return { ok: true, data, status: res.status };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const isNetwork =
        (err instanceof TypeError || err?.name === 'TypeError') &&
        /network request failed|failed to fetch|fetch failed/i.test(err?.message || '');
      // Only transport failures are worth another attempt. An HTTP error or a
      // malformed payload is deterministic — retrying just spends the same
      // bytes twice for the same answer.
      if ((isTimeout || isNetwork) && attempt < retries) {
        return doFetch(attempt + 1);
      }
      return {
        ok: false,
        error: isTimeout ? 'Request timed out' : err?.message || 'Network error',
        status: 0,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const promise = doFetch(0);
  if (cacheKey) {
    inflightDedup.set(cacheKey, promise);
    promise.finally(() => inflightDedup.delete(cacheKey!));
  }

  return promise;
}

export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
): Promise<ApiResponse<T>> {
  if (body instanceof FormData) {
    return apiFetch<T>(endpoint, { method: 'POST', body });
  }
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiGet<T = any>(
  endpoint: string,
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'GET' });
}

export async function apiDelete<T = any>(
  endpoint: string,
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}

export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function uploadFile<T = any>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    xhr.open('POST', url);
    xhr.timeout = 120000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const status = xhr.status;
      const ok = status >= 200 && status < 300;
      const raw = (xhr.responseText || '').trim();

      if (!raw) {
        resolve(
          ok
            ? { ok: true, data: {} as T, status }
            : { ok: false, error: `HTTP ${status}`, status },
        );
        return;
      }

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        // The API answers ANY unmatched route with 200 + HTML, so a non-JSON
        // body means we hit the catch-all (or a proxy error page) — never a
        // real success. Reporting it as ok:true made failed uploads look fine.
        resolve({
          ok: false,
          error: ok ? 'Unexpected response from server' : `HTTP ${status}`,
          status,
          data: raw as unknown as T,
        });
        return;
      }

      if (ok) {
        resolve({ ok: true, data, status });
      } else {
        resolve({ ok: false, error: data?.error || 'Upload failed', status });
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, error: 'Network error during upload', status: 0 });
    };

    xhr.ontimeout = () => {
      resolve({ ok: false, error: 'Upload timed out', status: 0 });
    };

    xhr.send(formData);
  });
}

export { API_BASE_URL, getAuthUsername };
