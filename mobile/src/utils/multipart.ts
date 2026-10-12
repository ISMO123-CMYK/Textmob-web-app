// Expo SDK 57 swaps the global `fetch` for its winter-fetch implementation
// (`expo/src/winter/fetch`), which only accepts WHATWG FormData parts. React
// Native's `{ uri, name, type }` parts fall through `normalizeArgs` untouched
// and then blow up in `convertFormData` with:
//
//   [Error: Unsupported FormDataPart implementation]
//
// React Native's own XMLHttpRequest handles those parts natively, so every
// multipart POST has to ride XHR. `api/client.ts` already does this for the
// Textmob API; this module is the same helper for hosts that manage their own
// base URL (Louda) or that used raw `fetch`.

export interface MultipartResult {
  ok: boolean;
  status: number;
  data: any;
  text: string;
}

export interface MultipartOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  onProgress?: (percent: number) => void;
}

/**
 * POST a FormData body at `url` through XMLHttpRequest.
 *
 * Rejects only on transport failures (network, timeout, abort) so callers can
 * decide whether to retry or switch hosts. HTTP-level failures resolve with
 * `ok: false` and the parsed body, mirroring `apiFetch`.
 */
export function xhrMultipart(
  url: string,
  formData: FormData,
  options: MultipartOptions = {},
): Promise<MultipartResult> {
  const { timeoutMs = 120000, headers, onProgress } = options;

  return new Promise<MultipartResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Never set Content-Type ourselves: XHR has to append the boundary.
    xhr.open('POST', url);
    xhr.timeout = timeoutMs;
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    }

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      const status = xhr.status;
      const text = xhr.responseText || '';
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = null;
      }
      resolve({ ok: status >= 200 && status < 300, status, data, text });
    };

    const transportFailure = () => reject(new Error('Network request failed'));
    xhr.onerror = transportFailure;
    xhr.ontimeout = transportFailure;
    xhr.onabort = transportFailure;

    try {
      xhr.send(formData);
    } catch (e) {
      reject(e);
    }
  });
}
