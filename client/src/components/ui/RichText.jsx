import { useState, useEffect } from 'react';
import { profileCache, fetchProfile } from '../../utils/useProfileCache';

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

      // Replace @mentions with links
      let result = text.replace(mentionRx, (match, username) => {
        let lower = username.toLowerCase();
        if (validSet.has(lower)) {
          return `<a data-lexum href="/@${encodeURIComponent(lower)}" class="text-blue-600 font-bold hover:underline">@${username}</a>`;
        }
        return match;
      });

      // Replace URLs
      result = result.replace(
        /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)]/g,
        url => `<a href="${url}" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">${url}</a>`
      );

      // Replace #hashtags
      result = result.replace(
        /#([a-zA-Z0-9_-]+)/g,
        (match, tag) => `<a data-lexum href="/topsearch?q=${encodeURIComponent(tag)}" class="text-blue-500 font-semibold hover:underline">${match}</a>`
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
