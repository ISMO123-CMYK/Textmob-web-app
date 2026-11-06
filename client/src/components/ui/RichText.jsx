import { useState, useEffect } from 'react';
import { profileCache, fetchProfile } from '../../utils/useProfileCache';
import { apiFetch } from '../../config/api';
import MobUIRenderer from './MobUIRenderer';
import { hasMobUIBlocks, isLegacyHtmlContent, renderMobMarkdown, sanitizeMobHtml } from '../../utils/mobui';

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
  let codeDepth = 0;

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('<')) {
      if (/^<a[\s>]/i.test(part)) anchorDepth++;
      else if (/^<\/a\s*>/i.test(part)) anchorDepth = Math.max(0, anchorDepth - 1);
      if (/^<(?:pre|code)[\s>]/i.test(part)) codeDepth++;
      else if (/^<\/(?:pre|code)\s*>/i.test(part)) codeDepth = Math.max(0, codeDepth - 1);
      segments.push({ type:'tag', value:part });
    } else {
      segments.push({ type:'text', value:part, linkable:anchorDepth===0 && codeDepth===0 });
    }
  }
  return segments;
}
function urlAnchor(url) {
  // Same-site links become relative hrefs so LexumRouter opens them in-app
  const m = url.match(/^(?:https?:\/\/)?(?:www\.)?textmob\.web\.app(\/\S*)?/i);
  if (m) {
    const path = m[1] && m[1].length > 1 ? m[1] : '/';
    return `<a data-lexum href="${path.replace(/"/g, '&quot;')}" class="text-brand-600 underline">${url}</a>`;
  }
  return `<a href="${url}" class="text-brand-600 underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
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
      `${pre}<a data-lexum href="/tag/${encodeURIComponent(tag)}" class="text-brand-500 font-semibold hover:underline">#${tag}</a>`
  );

  s = s.replace(buildMentionRegex(legacyNames), (match, genericMatch) => {
    if (genericMatch !== undefined) {
      // normal ([\w.-]+) mention - only link if the profile exists
      const lower = genericMatch.toLowerCase();
      if (!validSet.has(lower)) return match;
      return `<a data-lexum href="/@${encodeURIComponent(lower)}" class="text-brand-600 font-bold hover:underline">@${genericMatch}</a>`;
    }
    // legacy exact-match mention - always a real user (exact stored casing)
    const uname = match.slice(1);
    return `<a data-lexum href="/@${encodeURIComponent(uname)}" class="text-brand-600 font-bold hover:underline">${match}</a>`;
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

// RichText uses Markdown as the canonical web post format.
// Old HTML posts remain supported through the legacy branch.
export default function RichText({ html, className, contentFormat, postId }) {
  const [parsed, setParsed] = useState('');
  const text = String(html || '');
  const isMarkdown = contentFormat === 'markdown' || (!contentFormat && !isLegacyHtmlContent(text));
  const sourceText = isMarkdown ? text.replace(STICKER_REGEX, '![]($1)') : text;
  const hasInteractive = isMarkdown && hasMobUIBlocks(sourceText);
  const stickerParts = !isMarkdown ? renderStickers(text) : null;

  useEffect(() => {
    let active = true;

    async function process() {
      if (!sourceText) {
        if (active) setParsed('');
        return;
      }

      // Markdown is parsed before we decorate mentions and hashtags.
      const rendered = isMarkdown ? renderMobMarkdown(sourceText) : sourceText;
      const segments = splitOutsideAnchors(rendered);
      const linkable = segments.filter(segment => segment.type === 'text' && segment.linkable);
      const mentionRx = /@([\w.-]+)/g;
      const usernames = [];

      linkable.forEach(segment => {
        for (const match of segment.value.matchAll(mentionRx)) usernames.push(match[1].toLowerCase());
      });

      const unique = Array.from(new Set(usernames));
      const validSet = new Set();
      const toFetch = unique.filter(name => !profileCache.has(name));

      if (toFetch.length) {
        await Promise.allSettled(toFetch.map(async name => {
          try {
            const profile = await fetchProfile(name);
            if (profile && !profile.error) validSet.add(name);
          } catch (_) {}
        }));
      }

      unique.forEach(name => {
        const profile = profileCache.get(name);
        if (profile && !profile.error) validSet.add(name);
      });

      if (!active) return;
      const legacyNames = await getLegacyUsernames();
      if (!active) return;

      const linked = segments.map(segment => (
        segment.type === 'text' && segment.linkable
          ? linkifySegment(segment.value, legacyNames, validSet)
          : segment.value
      )).join('');

      const safeResult = sanitizeMobHtml(linked);

      if (active) setParsed(safeResult);
    }

    process();
    return () => { active = false; };
  }, [sourceText, isMarkdown]);

  if (hasInteractive) {
    return <MobUIRenderer content={sourceText} className={className} postId={postId} />;
  }

  if (stickerParts) {
    return (
      <div className={"flex flex-wrap items-end gap-1 " + (className || "")}>
        {stickerParts.map((part, index) => part.type === 'sticker'
          ? <img key={index} src={part.url} alt="sticker" className="max-h-32 rounded-lg object-contain" loading="lazy" />
          : <span key={index}>{part.value}</span>)}
      </div>
    );
  }

  return <div className={"prose markdown max-w-none " + (className || "")} dangerouslySetInnerHTML={{__html:parsed}} />;
}

