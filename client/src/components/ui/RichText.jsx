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

// Rn – RichText component: parses @mentions, #hashtags and URLs
export default function RichText({ html }) {
  const [parsed, setParsed] = useState('');

  useEffect(() => {
    let active = true;

    async function process(text) {
      if (!text) return;

      const mentionRx = /@([\w.-]+)/g;
      const usernames = [...text.matchAll(mentionRx)].map(m => m[1].toLowerCase());
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

      // Replace @mentions with links (normal + legacy special-character usernames)
      const legacyNames = await getLegacyUsernames();
      let result = text.replace(buildMentionRegex(legacyNames), (match, genericMatch) => {
        if (genericMatch !== undefined) {
          // normal ([\w.-]+) mention — only link if the profile exists
          let lower = genericMatch.toLowerCase();
          if (!validSet.has(lower)) return match;
          return `<a data-lexum href="/@${encodeURIComponent(lower)}" class="text-blue-600 font-bold hover:underline">@${genericMatch}</a>`;
        }
        // legacy exact-match mention — always a real user (exact stored casing)
        const uname = match.slice(1);
        return `<a data-lexum href="/@${encodeURIComponent(uname)}" class="text-blue-600 font-bold hover:underline">${match}</a>`;
      });

      // Replace URLs
      result = result.replace(
        /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)]/g,
        url => `<a href="${url}" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">${url}</a>`
      );

      // Replace #hashtags
      result = result.replace(
        /#([a-zA-Z0-9_-]+)/g,
        (match, tag) => `<a data-lexum href="/tag/${encodeURIComponent(tag)}" class="text-blue-500 font-semibold hover:underline">${match}</a>`
      );

      // Convert markdown (bold, italic, code, lists, headings, etc.)
      if (typeof window.marked !== 'undefined') {
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

  return <div className="prose markdown max-w-none" dangerouslySetInnerHTML={{ __html: parsed }} />;
}
