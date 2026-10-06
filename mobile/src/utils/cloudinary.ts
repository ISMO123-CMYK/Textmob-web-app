const CL_HOST = 'res.cloudinary.com';

// The upload pipeline (server/media.js) stores every image as a family of JPEG
// variants whose width is encoded in the Cloudinary public_id as `__<width>`,
// and always returns the URL of the largest variant. Swapping that suffix gives
// us a smaller file for the same asset with no schema change and no Cloudinary
// URL transformation (q_auto / f_auto / w_ are deliberately not used).
//
// Keyed by the largest width in each family: given the suffix on a stored URL we
// can work out exactly which smaller variants exist for it.
const FAMILIES: Record<number, number[]> = {
  1600: [360, 1080, 1600],
  1080: [360, 1080],
  1400: [640, 1400],
  512: [128, 512],
  640: [640],
  360: [360],
  128: [128],
};

const SUFFIX_RE = /__(\d+)(\.[A-Za-z0-9]+)?(\?[^#]*)?(#.*)?$/;

/**
 * Returns the URL of the smallest stored variant that still covers `targetPx`
 * physical pixels, or the original URL when there is nothing smaller to pick
 * (legacy rows written before the pipeline, non-Cloudinary URLs, thumbnails
 * that were never upscaled past their natural size).
 */
export function imageUrl(
  url: string | null | undefined,
  targetPx: number,
): string {
  if (!url) return '';
  if (!url.includes(CL_HOST)) return url;
  const m = SUFFIX_RE.exec(url);
  if (!m) return url;
  const largest = Number(m[1]);
  const family = FAMILIES[largest];
  if (!family || family.length < 2) return url;

  let chosen = largest;
  for (const w of family) {
    if (w >= targetPx) {
      chosen = w;
      break;
    }
  }
  if (chosen === largest) return url;
  return url.replace(SUFFIX_RE, `__${chosen}$2$3$4`);
}

/**
 * Video cover frame. server/media.js uploads one next to every video as
 * `<public_id>__poster` in the same folder, so the poster can be derived from
 * the video URL instead of travelling in the post payload. Videos uploaded
 * before this existed have no poster — the derived URL 404s and the caller's
 * onError fallback kicks in, so no migration is needed.
 */
export function posterUrlFor(url: string | null | undefined): string | null | undefined {
  if (!url || !url.includes(CL_HOST)) return null;
  // The version segment is deliberately dropped: the poster is uploaded after
  // the video and carries its own version, so reusing the video's would 404.
  const m = /^([^?#]+\/)video\/upload\/(?:v\d+\/)?([^?#]+?)(\.[A-Za-z0-9]+)(\?[^#]*)?(#.*)?$/.exec(url);
  if (!m) return null;
  const query = m[4] || '';
  const hash = m[5] || '';
  return `${m[1]}image/upload/${m[2]}__poster.jpg${query}${hash}`;
}

export function getLowQualityUrl(url: string): string {
  return url;
}

export function isLowQuality(url: string): boolean {
  return false;
}

export function getMediaUrl(url: string, _useLowQuality: boolean): string {
  return url;
}
