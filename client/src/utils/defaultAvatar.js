/**
 * Single default avatar for the whole Textmob app (including Messages).
 * Inline SVG data URI — always available, zero network dependency.
 */
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="32" fill="#e5e7eb"/>' +
  '<circle cx="32" cy="24" r="10" fill="#9ca3af"/>' +
  '<path d="M14 52c3-10 10-14 18-14s15 4 18 14" fill="#9ca3af"/>' +
  '</svg>';

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`;

/** Return the given avatar URL, or the default when missing. */
export function avatarOrDefault(url) {
  return url || DEFAULT_AVATAR;
}

export default DEFAULT_AVATAR;
