import React, { useEffect, useState } from 'react';
import sanitizeHtml from 'sanitize-html';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api/client';

let legacyListCache: string[] | null = null;
let legacyListPromise: Promise<string[]> | null = null;

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadLegacyUsernames(): Promise<string[]> {
  if (legacyListCache) return Promise.resolve(legacyListCache);
  if (!legacyListPromise) {
    legacyListPromise = apiGet<{ usernames: string[] }>('/legacy-usernames')
      .then(r => {
        legacyListCache = Array.isArray(r.data?.usernames) ? r.data.usernames : [];
        return legacyListCache;
      })
      .catch(() => (legacyListCache = []));
  }
  return legacyListPromise;
}

function convertMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      flushLists();
      result.push(`<blockquote>${bqMatch[1]}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushLists();
      result.push('<hr />');
      continue;
    }

    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (hMatch) {
      flushLists();
      result.push(`<h${hMatch[1].length + 1}>${hMatch[2]}</h${hMatch[1].length + 1}>`);
      continue;
    }

    const ulMatch = line.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      if (!inUl) { flushLists(); inUl = true; result.push('<ul>'); }
      result.push(`<li>${ulMatch[1]}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inOl) { flushLists(); inOl = true; result.push('<ol>'); }
      result.push(`<li>${olMatch[1]}</li>`);
      continue;
    }

    flushLists();
    result.push(line);
  }

  flushLists();

  function flushLists() {
    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }
  }

  let s = result.join('\n');

  s = s
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return s;
}

const URL_RX = /(?:https?:\/\/[^\s<>"']*[^\s<>"',.!?;:])|(?:textmob\.web\.app\/[^\s<>"']*[^\s<>"',.!?;:])/g;

function anchorForUrlWeb(raw: string): string {
  const m = raw.match(/^(?:https?:\/\/)?(?:www\.)?textmob\.web\.app(\/\S*)?/i);
  if (m) {
    // Same-site links stay in the SPA (handled by the wrapper's onClick)
    const path = m[1] && m[1].length > 1 ? m[1] : '/';
    return `<a href="${path.replace(/"/g, '&quot;')}">${raw}</a>`;
  }
  return `<a href="${raw}" target="_blank" rel="noopener noreferrer">${raw}</a>`;
}

function linkifyTextWeb(t: string, legacyList: string[]): string {
  if (!t) return t;
  const urls: string[] = [];
  let s = t.replace(URL_RX, (m: string) => {
    urls.push(m);
    return `\u0000${urls.length - 1}\u0000`;
  });
  s = s.replace(
    /(^|[^\w#])(#[\w-]+)/g,
    (_m, pre: string, tag: string) => `${pre}<a href="hashtag://${tag}">${tag}</a>`
  );
  const mentionRx = legacyList.length
    ? new RegExp(`(^|\\s)@(?:${legacyList.map(escapeRegExp).join('|')}|([\\w.-]+))`, 'gm')
    : /(^|\s)(@[\w.-]+)/gm;
  s = s.replace(
    mentionRx,
    (match: string, boundary: string, legacyOrGeneric?: string) =>
      legacyOrGeneric !== undefined
        ? `${boundary}<a href="mention://@${legacyOrGeneric}">@${legacyOrGeneric}</a>`
        : `${boundary}<a href="mention://${match.trim()}">${match.trim()}</a>`
  );
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => anchorForUrlWeb(urls[Number(i)]));
}

function linkifyOutsideAnchorsWeb(html: string, legacyList: string[]): string {
  const parts = html.split(/(<[^>]*>)/g);
  let anchorDepth = 0;
  return parts
    .map(part => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) anchorDepth++;
        else if (/^<\/a\s*>/i.test(part)) anchorDepth = Math.max(0, anchorDepth - 1);
        return part;
      }
      return anchorDepth > 0 ? part : linkifyTextWeb(part, legacyList);
    })
    .join('');
}

export default function SafeHTML({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [legacyList, setLegacyList] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadLegacyUsernames().then(list => { if (active) setLegacyList(list); });
    return () => { active = false; };
  }, []);

  if (!text) return null;

  const isHTML = /<\/?[a-z][\s\S]*>/i.test(text);

  let processed = text;

  if (!isHTML) {
    processed = convertMarkdown(processed);
    processed = processed
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/(?:\r\n|\r|\n)/g, '<br />');
  }

  // Linkify every text node — including HTML saved by the composer, which
  // previously rendered as inert text with no mention/hashtag/URL links.
  processed = linkifyOutsideAnchorsWeb(processed, legacyList);

  processed = sanitizeHtml(processed, {
    allowedTags: [
      'a',
      'p',
      'div',
      'span',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h2', 'h3', 'h4',
      'hr',
      's',
      'code',
      'pre',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'style'],
      p: ['style'],
      div: ['style'],
      span: ['style'],
    },
    allowedSchemes: ['http', 'https', 'mention', 'hashtag'],
    allowedSchemesByTag: {},
    allowProtocolRelative: false,
  });

  // Apply consistent styles to all links
  processed = processed.replace(
    /<a\b([^>]*)>/gi,
    '<a$1 style="color:#2563eb;text-decoration:underline;font-weight:600;">'
  );

  const flattenedStyle = Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style || {};

  const navigateTo = (path: string) => {
    if (path.startsWith('/post/')) navigation.navigate('PostDetail', { postId: path.replace('/post/', '') });
    else if (path.startsWith('/@')) navigation.navigate('Profile', { username: path.replace('/@', '') });
    else if (path.startsWith('/tag/')) {
      const tag = decodeURIComponent(path.replace('/tag/', ''));
      navigation.navigate('Hashtag', { tag: tag.replace(/^#/, '') });
    } else if (path.startsWith('/search')) navigation.navigate('Search');
    else if (path.startsWith('/snaps')) navigation.navigate('Snaps');
    else if (path.startsWith('/chats')) navigation.navigate('Chats');
    else if (path.startsWith('/halloffame')) navigation.navigate('HallOfFame');
    else if (path.startsWith('/wallet')) navigation.navigate('Wallet');
    else if (path.startsWith('/events')) navigation.navigate('Events');
    else if (path.startsWith('/live')) navigation.navigate('LiveView');
    else if (path.startsWith('/saved')) navigation.navigate('SavedPosts');
    else if (path.startsWith('/connections')) navigation.navigate('Connections');
    else if (path.startsWith('/discussions')) navigation.navigate('Discussions');
  };

  // Intercept link clicks: internal routes + mention/hashtag schemes navigate
  // in-app, external links open in a new tab.
  const onLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (!href) return;
    e.preventDefault();
    if (href.startsWith('mention://')) {
      const u = href.replace('mention://', '').replace(/^@/, '');
      if (u) navigation.navigate('Profile', { username: u });
    } else if (href.startsWith('hashtag://')) {
      const tag = href.replace('hashtag://', '').replace(/^#/, '');
      if (tag) navigation.navigate('Hashtag', { tag });
    } else if (href.startsWith('/')) {
      navigateTo(href);
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={flattenedStyle}
      onClick={onLinkClick}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}