import { useState, useEffect } from 'react';
import { profileCache, fetchProfile } from '../../utils/useProfileCache';
import { apiFetch } from '../../config/api';

// Legacy usernames contain chars (spaces, emojis, accents...) that the standard
// /@[\w.-]+/ mention regex cannot match. We fetch the exact list from the server
// and build a precise alternation so those @mentions still link to their profile.
let legacyCache = null;
let legacyExpiry = 0;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getLegacyUsernames() {
  if (legacyCache && Date.now() < legacyExpiry) return legacyCache;
  try {
    const res = await apiFetch('/legacy-usernames');
    if (!res.ok) return [];
    const data = await res.json();
    legacyCache = Array.isArray(data.usernames) ? data.usernames : [];
    legacyExpiry = Date.now() + 60 * 1000;
    return legacyCache;
  } catch {
    return [];
  }
}

// Single regex that links BOTH normal (@[\w.-]+) and legacy special-character
// mentions. Legacy names are listed first in the alternation so a name like
// "Peace 🕊️" is matched whole instead of being clobbered by the generic pass.
function buildMentionRegex(legacyNames) {
  if (!legacyNames.length) return /@([\w.-]+)/g;
  return new RegExp(`@(?:${legacyNames.map(escapeRegExp).join('|')}|([\\w.-]+))`, 'g');
}

const STICKER_REGEX = /\[sticker url="([^"]+)"\]/g;

const URL_RX = /(?:https?:\/\/[^\s<>"']*[^\s<>"',.!?;:])|(?:textmob\.web\.app\/[^\s<>"']*[^\s<>"',.!?;:])/g;

// Split HTML into tag / text segments so linkification never touches markup
// or the inside of an existing <a>.
function splitOutsideAnchors(html) {
  const parts = html.split(/(<[^>]*>)/g);
  const segments = [];
  let anchorDepth = 0;
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('<')) {
      if (/^<a[\s>]/i.test(part)) anchorDepth++;
      else if (/^<\/a\s*>/i.test(part)) anchorDepth = Math.max(0, anchorDepth - 1);
      segments.push({ type: 'tag', value: part });
    } else {
      segments.push({ type: 'text', value: part, linkable: anchorDepth === 0 });
    }
  }
  return segments;
}

function urlAnchor(url) {
  // Same-site links become relative hrefs so LexumRouter opens them in-app
  const m = url.match(/^(?:https?:\/\/)?(?:www\.)?textmob\.web\.app(\/\S*)?/i);
  if (m) {
    const path = m[1] && m[1].length > 1 ? m[1] : '/';
    return `<a data-lexum href="${path.replace(/"/g, '&quot;')}" class="text-blue-600 underline">${url}</a>`;
  }
  return `<a href="${url}" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
}

function linkifySegment(segment, legacyNames, validSet) {
  if (!segment) return segment;
  // URLs out first so hashtags/mentions inside an href stay untouched
  const urls = [];
  let s = segment.replace(URL_RX, (m) => {
    urls.push(m);
    return `\u0000${urls.length - 1}\u0000`;
  });

  s = s.replace(
    /(^|[^\w#])(#[a-zA-Z0-9_-]+)/g,
    (_m, pre, tag) =>
      `${pre}<a data-lexum href="/tag/${encodeURIComponent(tag)}" class="text-blue-500 font-semibold hover:underline">#${tag}</a>`
  );

  s = s.replace(buildMentionRegex(legacyNames), (match, genericMatch) => {
    if (genericMatch !== undefined) {
      // normal ([\w.-]+) mention — only link if the profile exists
      const lower = genericMatch.toLowerCase();
      if (!validSet.has(lower)) return match;
      return `<a data-lexum href="/@${encodeURIComponent(lower)}" class="text-blue-600 font-bold hover:underline">@${genericMatch}</a>`;
    }
    // legacy exact-match mention — always a real user (exact stored casing)
    const uname = match.slice(1);
    return `<a data-lexum href="/@${encodeURIComponent(uname)}" class="text-blue-600 font-bold hover:underline">${match}</a>`;
  });

  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => urlAnchor(urls[Number(i)]));
}

function renderStickers(text) {
  if (!text || !STICKER_REGEX.test(text)) return null;
  STICKER_REGEX.lastIndex = 0;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = STICKER_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'sticker', url: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}

// Rn – RichText component: parses @mentions, #hashtags, URLs and stickers
export default function RichText({ html }) {
  const [parsed, setParsed] = useState('');

  const stickerParts = renderStickers(html);

  useEffect(() => {
    let active = true;

    async function process(text) {
      if (!text) return;

      const isHTML = /<\/?[a-z][\s\S]*>/i.test(text);
      const segments = splitOutsideAnchors(text);
      const linkable = segments.filter(s => s.type === 'text' && s.linkable);

      const mentionRx = /@([\w.-]+)/g;
      const usernames = [];
      linkable.forEach(s => {
        for (const m of s.value.matchAll(mentionRx)) usernames.push(m[1].toLowerCase());
      });
      const unique = Array.from(new Set(usernames));
      const validSet = new Set();

      // Fetch profiles for unknown mentions
      const toFetch = unique.filter(u => !profileCache.has(u));
      if (toFetch.length > 0) {
        await Promise.allSettled(
          toFetch.map(async u => {
            try {
              let p = await fetchProfile(u);
              if (p && !p.error) validSet.add(u);
            } catch {}
          })
        );
      }

      // Check all against cache
      unique.forEach(u => {
        let p = profileCache.get(u);
        if (p && !p.error) validSet.add(u);
      });

      if (!active) return;

      const legacyNames = await getLegacyUsernames();
      if (!active) return;

      // Linkify each text node — including posts the composer saved as HTML,
      // which previously rendered as inert text with no links.
      let result = segments
        .map(seg => (seg.type === 'text' && seg.linkable ? linkifySegment(seg.value, legacyNames, validSet) : seg.value))
        .join('');

      // Convert markdown (bold, italic, code, lists, headings, etc.)
      // — only for plain posts; HTML posts already carry their own markup.
      if (!isHTML && typeof window.marked !== 'undefined') {
        result = window.marked.parse(result, { gfm: true, breaks: true, mangle: false, headerIds: false });
      }

      // Sanitize if DOMPurify is available
      if (typeof window.DOMPurify !== 'undefined') {
        result = window.DOMPurify.sanitize(result, { ADD_ATTR: ['data-lexum'] });
      }

      setParsed(result);
    }

    process(html);
    return () => { active = false; };
  }, [html]);

  if (stickerParts) {
    return (
      <div className="flex flex-wrap items-end gap-1">
        {stickerParts.map((part, i) =>
          part.type === 'sticker'
            ? <img key={i} src={part.url} alt="sticker" className="max-h-32 rounded-lg object-contain" loading="lazy" />
            : <span key={i}>{part.value}</span>
        )}
      </div>
    );
  }

  return <div className="prose markdown max-w-none" dangerouslySetInnerHTML={{ __html: parsed }} />;
}
