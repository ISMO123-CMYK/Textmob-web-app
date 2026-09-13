const CL_API_BASE = 'res.cloudinary.com';
const LOW_QUALITY_PARAMS = 'f_auto,q_auto:low';

export function getLowQualityUrl(url) {
  return url;
}

export function isLowQuality(url) {
  return false;
}

export function getMediaUrl(url, _useLowQuality) {
  return url;
}