import React, { useMemo, useState, useEffect } from 'react';
import { useWindowDimensions, Linking } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api/client';

// Legacy usernames contain chars (spaces, emojis, accents...) that the standard
// /@[\w.-]+/ mention regex cannot match. We fetch the exact list from the server
// and build a precise alternation so those @mentions still link to their profile.
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

function convertMarkdown(html: string): string {
  // Block-level conversions (applied line-by-line)
  const lines = html.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // --- blockquote
    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      flushLists();
      result.push(`<blockquote>${bqMatch[1]}</blockquote>`);
      continue;
    }

    // --- horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushLists();
      result.push('<hr />');
      continue;
    }

    // --- headings
    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (hMatch) {
      flushLists();
      const level = hMatch[1].length + 1;
      result.push(`<h${level}>${hMatch[2]}</h${level}>`);
      continue;
    }

    // --- unordered list
    const ulMatch = line.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      if (!inUl) { flushLists(); inUl = true; result.push('<ul>'); }
      result.push(`<li>${ulMatch[1]}</li>`);
      continue;
    }

    // --- ordered list
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

  // Inline conversions (must be inside block elements but before link conversion)
  // Order matters: handle *** before **, ** before *, etc.
  s = s
    // ***bold italic***
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // *italic*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // ~~strikethrough~~
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return s;
}

const URL_RX = /(?:https?:\/\/[^\s<>"']*[^\s<>"',.!?;:])|(?:textmob\.web\.app\/[^\s<>"']*[^\s<>"',.!?;:])/g;

function anchorForUrl(raw: string): string {
  // textmob.web.app links open inside the app instead of the browser
  const m = raw.match(/^(?:https?:\/\/)?(?:www\.)?textmob\.web\.app(\/\S*)?/i);
  if (m) {
    const path = m[1] && m[1].length > 1 ? m[1] : '/';
    return `<a href="${path.replace(/"/g, '&quot;')}">${raw}</a>`;
  }
  return `<a href="${raw}">${raw}</a>`;
}

function linkifyText(t: string, legacyList: string[]): string {
  if (!t) return t;
  // Pull URLs out first so mentions/hashtags inside an href stay untouched.
  const urls: string[] = [];
  let s = t.replace(URL_RX, (m: string) => {
    urls.push(m);
    return `\u0000${urls.length - 1}\u0000`;
  });
  s = s.replace(
    /(^|[^\w#])(#[\w-]+)/g,
    (_m, pre: string, tag: string) => `${pre}<a href="app://search/${tag}">${tag}</a>`
  );
  const mentionRx = legacyList.length
    ? new RegExp(`@(?:${legacyList.map(escapeRegExp).join('|')}|([\\w.-]+))`, 'g')
    : /@([\w.-]+)/g;
  s = s.replace(
    mentionRx,
    (match: string, genericMatch?: string) =>
      genericMatch !== undefined
        ? `<a href="app://profile/${genericMatch}">@${genericMatch}</a>`
        : `<a href="app://profile/${match.slice(1)}">${match}</a>`
  );
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => anchorForUrl(urls[Number(i)]));
}

function linkifyOutsideAnchors(html: string, legacyList: string[]): string {
  const parts = html.split(/(<[^>]*>)/g);
  let anchorDepth = 0;
  return parts
    .map(part => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) anchorDepth++;
        else if (/^<\/a\s*>/i.test(part)) anchorDepth = Math.max(0, anchorDepth - 1);
        return part;
      }
      return anchorDepth > 0 ? part : linkifyText(part, legacyList);
    })
    .join('');
}

export default React.memo(function SafeHTML({ text, style }: { text: string; style?: any }) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [legacyList, setLegacyList] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadLegacyUsernames().then(list => { if (active) setLegacyList(list); });
    return () => { active = false; };
  }, []);

  if (!text) return null;

  const processed = useMemo(() => {
    const hasMarkup = /<\/?[a-z][^>]*>/i.test(text);
    let p = text;

    // Plain (markdown) posts: decode entities + convert markup first.
    if (!hasMarkup) {
      p = p
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

      p = convertMarkdown(p);
      p = p
        .replace(/[ \t]+$/gm, '')
        .replace(/(?:\r\n|\r|\n)/g, '<br />');
    }

    // Linkify mentions/hashtags/URLs in every text node — including posts the
    // composer already saved as HTML (which previously stayed plain text).
    return linkifyOutsideAnchors(p, legacyList);
  }, [text, legacyList]);

  // Callers pass RN style arrays ([a, b]) — flatten before spreading so the
  // object never ends up with numeric keys (they surface as native "style
  // property 0/1" warnings and override nothing).
  const flatStyle: any = Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style || {};

  const tagsStyles = useMemo(() => ({
    body: {
      color: flatStyle.color || colors.textPrimary,
      fontSize: flatStyle.fontSize || 14,
      lineHeight: flatStyle.lineHeight || 20,
      margin: 0,
      padding: 0,
      ...flatStyle,
    },
    a: {
      color: '#2563eb',
      textDecorationLine: 'none',
      fontWeight: '700',
    },
    p: {
      margin: 0,
      padding: 0,
    },
    strong: { fontWeight: '900' },
    em: { fontStyle: 'italic' },
    s: { textDecorationLine: 'line-through' },
    code: {
      fontFamily: 'monospace',
      fontSize: 13,
      backgroundColor: isDark ? '#334155' : '#f3f4f6',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    h2: { fontSize: 18, fontWeight: '800', marginVertical: 8, lineHeight: 24 },
    h3: { fontSize: 16, fontWeight: '700', marginVertical: 6, lineHeight: 22 },
    h4: { fontSize: 14, fontWeight: '700', marginVertical: 4, lineHeight: 20 },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: isDark ? '#4b5563' : '#d1d5db',
      paddingLeft: 12,
      marginVertical: 8,
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
    hr: { marginVertical: 12, height: 1, backgroundColor: colors.border },
    ul: { marginVertical: 4, paddingLeft: 20 },
    ol: { marginVertical: 4, paddingLeft: 20 },
    li: { marginVertical: 2, lineHeight: 20 },
  }), [colors, isDark, style]);

  const navigateTo = (path: string) => {
    if (path.startsWith('/post/')) {
      navigation.navigate('PostDetail', { postId: path.replace('/post/', '') });
    } else if (path.startsWith('/@')) {
      navigation.navigate('Profile', { username: path.replace('/@', '') });
    } else if (path.startsWith('/snaps')) navigation.navigate('Snaps');
    else if (path.startsWith('/chats')) navigation.navigate('Chats');
    else if (path.startsWith('/halloffame')) navigation.navigate('HallOfFame');
    else if (path.startsWith('/wallet')) navigation.navigate('Wallet');
    else if (path.startsWith('/accountscenter')) navigation.navigate('AccountsCenter');
    else if (path.startsWith('/search')) navigation.navigate('Search');
    else if (path.startsWith('/tag/')) {
      const tag = decodeURIComponent(path.replace('/tag/', ''));
      navigation.navigate('Hashtag', { tag: tag.replace(/^#/, '') });
    }
    else if (path.startsWith('/events')) navigation.navigate('Events');
    else if (path.startsWith('/live')) navigation.navigate('LiveView');
    else if (path.startsWith('/saved')) navigation.navigate('SavedPosts');
    else if (path.startsWith('/connections')) navigation.navigate('Connections');
    else if (path.startsWith('/discussions')) navigation.navigate('Discussions');
    else if (path.startsWith('/make-post')) {
      const quoteId = path.split('=')[1];
      navigation.navigate('CreatePost', quoteId ? { quotePostId: quoteId } : undefined);
    }
  };

  const handleLinkPress = (_evt: any, href: string) => {
    if (href.startsWith('app://profile/')) {
      const username = href.replace('app://profile/', '');
      if (username) navigation.navigate('Profile', { username });
      return;
    }
    if (href.startsWith('app://search/')) {
      const tag = href.replace('app://search/', '').replace(/^#/, '');
      if (tag) navigation.navigate('Hashtag', { tag });
      else navigation.navigate('Search');
      return;
    }
    if (href.startsWith('/')) {
      navigateTo(href);
      return;
    }
    Linking.openURL(href).catch(() => {});
  };

  return (
    <RenderHTML
      contentWidth={width}
      source={{ html: `<body>${processed}</body>` }}
      tagsStyles={tagsStyles as any}
      renderersProps={{
        a: {
          onPress: handleLinkPress,
        },
      }}
    />
  );
});
