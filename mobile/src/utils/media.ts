// Multipart uploads need a real extension on the filename: the backends infer
// the Cloudinary resource type from it, and React Native's pickers leave
// `fileName` null on iOS (and often on Android), which produced names like
// `upload_1699999999999` with no `.jpg` for the server to key off.

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
  'video/webm': '.webm',
  'video/3gpp': '.3gp',
  'video/x-msvideo': '.avi',
  'video/m4v': '.m4v',
  'audio/mp4': '.m4a',
  'audio/m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/mpeg': '.mp3',
  'audio/x-wav': '.wav',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/x-m4a': '.m4a',
  'application/pdf': '.pdf',
  'application/json': '.json',
  'text/plain': '.txt',
  'text/html': '.html',
  'text/csv': '.csv',
  'application/zip': '.zip',
};

function baseMime(mimeType?: string | null): string {
  return (mimeType || '').split(';')[0].trim().toLowerCase();
}

function extensionFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const lastSegment = uri.split('/').pop() || '';
  const dot = lastSegment.lastIndexOf('.');
  if (dot <= 0) return null;
  const ext = lastSegment.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]{1,5}$/.test(ext)) return null;
  return `.${ext}`;
}

/** Extension (including the dot) for a mime type / source uri, or null. */
export function extFor(mimeType?: string | null, uri?: string | null): string | null {
  const mime = baseMime(mimeType);
  const mapped = MIME_EXTENSIONS[mime];
  if (mapped) return mapped;

  if (mime.startsWith('image/')) return '.jpg';
  if (mime.startsWith('video/')) return '.mp4';
  if (mime.startsWith('audio/')) return '.m4a';
  if (mime === 'application/octet-stream') return extensionFromUri(uri);

  return extensionFromUri(uri);
}

/**
 * Returns `name` guaranteed to end in a file extension. Falls back to the
 * mime type, then the source uri, then a conservative per-category default.
 */
export function withExtension(
  name: string | null | undefined,
  mimeType?: string | null,
  uri?: string | null,
): string {
  const base = (name || '').trim() || `upload_${Date.now()}`;
  if (/\.[a-z0-9]{1,5}$/i.test(base)) return base;
  const ext = extFor(mimeType, uri) || extFor(undefined, uri) || '.bin';
  return `${base}${ext}`;
}
