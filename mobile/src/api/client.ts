import { getSecure, KEYS } from '../utils/storage';

const API_BASE_URL = 'https://textmob-provider-api-99ii.onrender.com';

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
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
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `HTTP ${res.status}`,
        status: res.status,
        data,
      };
    }

    return { ok: true, data, status: res.status };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Network error',
      status: 0,
    };
  }
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

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true, data, status: xhr.status });
        } else {
          resolve({ ok: false, error: data?.error || 'Upload failed', status: xhr.status });
        }
      } catch {
        resolve({ ok: true, data: xhr.responseText as unknown as T, status: xhr.status });
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, error: 'Network error during upload', status: 0 });
    };

    xhr.send(formData);
  });
}

export { API_BASE_URL, getAuthUsername };
