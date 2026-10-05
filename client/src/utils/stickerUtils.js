const GIPHY_API_KEY = '1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

const STICKER_REGEX = /\[sticker url="([^"]+)"\]/;

const STICKERS_DB = [
  { id: 'yes', tags: ['yes', 'agree', 'nod'], url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  { id: 'no', tags: ['no', 'deny', 'shake'], url: 'https://media.giphy.com/media/15aGGXfSlat2dP6ohs/giphy.gif' },
  { id: 'laugh', tags: ['laugh', 'lol', 'funny'], url: 'https://media.giphy.com/media/l0HlO3BJ8LALPW4sE/giphy.gif' },
  { id: 'cry', tags: ['cry', 'sad', 'tears'], url: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif' },
  { id: 'angry', tags: ['angry', 'mad', 'rage'], url: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif' },
  { id: 'wow', tags: ['wow', 'omg', 'surprise'], url: 'https://media.giphy.com/media/5wWf7GMbT1ZUGTDdTqM/giphy.gif' },
  { id: 'love', tags: ['love', 'heart', 'romance'], url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
];

export function isStickerText(text) {
  if (!text) return false;
  return STICKER_REGEX.test(text);
}

export function parseStickerText(text) {
  if (!text) return { isSticker: false, text: text || '' };
  const match = text.match(STICKER_REGEX);
  if (match) {
    return { isSticker: true, url: match[1], before: text.slice(0, match.index), after: text.slice(match.index + match[0].length) };
  }
  return { isSticker: false, text };
}

export function makeStickerText(url) {
  return `[sticker url="${url}"]`;
}

// Sticker markup goes in the payload only; the input shows typed text and the
// sticker renders as a preview chip.
export function withSticker(text, stickerUrl) {
  const base = (text || '').trim();
  if (!stickerUrl) return base;
  const markup = makeStickerText(stickerUrl);
  return base ? `${base} ${markup}` : markup;
}

export async function searchGiphStickers(query, signal) {
  const q = (query || '').trim();
  const endpoint = q
    ? `${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=18&rating=g`
    : `${GIPHY_API_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=18&rating=g`;

  try {
    const res = await fetch(endpoint, { signal });
    const data = await res.json();
    return (data?.data || []).map(g => ({
      id: g.id,
      url: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url,
    }));
  } catch (err) {
    if (err.name === 'AbortError') return null;
    return STICKERS_DB.filter(s =>
      q ? s.tags.some(t => t.includes(q.toLowerCase())) : true
    ).map(s => ({ id: s.id, url: s.url }));
  }
}
