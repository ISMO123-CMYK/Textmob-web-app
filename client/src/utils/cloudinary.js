const CL_API_BASE = 'res.cloudinary.com';
const LOW_QUALITY_PARAMS = 'f_auto,q_auto:low';

export function getLowQualityUrl(url) {
  if (!url || !url.includes(CL_API_BASE)) return url;
  const parts = url.split('/image/upload/');
  if (parts.length === 2) {
    const after = parts[1];
    const slashIdx = after.indexOf('/');
    if (slashIdx > 0) {
      const versionPart = after.slice(0, slashIdx);
      const rest = after.slice(slashIdx + 1);
      if (versionPart.startsWith('v')) {
        return `${parts[0]}/image/upload/${LOW_QUALITY_PARAMS}/${versionPart}/${rest}`;
      }
    }
    return `${parts[0]}/image/upload/${LOW_QUALITY_PARAMS}/${after}`;
  }
  return url;
}

export function isLowQuality(url) {
  return url && url.includes(LOW_QUALITY_PARAMS);
}

export function getMediaUrl(url, useLowQuality) {
  if (!url) return url;
  if (useLowQuality && !isLowQuality(url)) return getLowQualityUrl(url);
  return url;
}