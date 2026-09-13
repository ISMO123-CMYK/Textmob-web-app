const CL_API_BASE = 'res.cloudinary.com';
const LOW_QUALITY_PARAMS = 'f_auto,q_auto:low';

export function getLowQualityUrl(url: string): string {
  return url;
}

export function isLowQuality(url: string): boolean {
  return false;
}

export function getMediaUrl(url: string, _useLowQuality: boolean): string {
  return url;
}
