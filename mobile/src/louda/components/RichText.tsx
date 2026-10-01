import React, { useMemo } from 'react';
import {
  useWindowDimensions,
  Linking,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import sanitizeHtml from 'sanitize-html';
import { useLoudaTheme } from './primitives';

// Renders parseRichText() output for message bubbles (web used
// dangerouslySetInnerHTML inside .markdown-content). Links open externally,
// addcontact: links trigger the Add Contact flow like the web
// 'open-add-contact' CustomEvent.
//
// React-Native can't use the browser's default rendering for bare <li>
// (web relies on Tailwind list-disc/list-inside classes on the li itself),
// so list runs are wrapped in <ul>/<ol> and tables are rendered natively
// because react-native-render-html has no table renderer.

type HtmlPart = { kind: 'html'; html: string } | { kind: 'table'; html: string };

type LinkPressHandler = (evt: any, href: string) => void;

// Wrap runs of adjacent <li> items in <ul>/<ol> (ordered vs unordered is
// taken from the list-disc/list-decimal class that parseRichText emits).
const wrapLists = (s: string): string =>
  s.replace(/(?:<li[^>]*>[\s\S]*?<\/li>(?:<br\s*\/?>)?)+/g, (run) => {
    const items = run.match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? [];
    let out = '';
    let cur: 'ul' | 'ol' | null = null;
    let buf: string[] = [];
    const flush = () => {
      if (cur && buf.length) out += `<${cur}>${buf.join('')}</${cur}>`;
      buf = [];
    };
    for (const item of items) {
      const type: 'ul' | 'ol' = /list-decimal/.test(item) ? 'ol' : 'ul';
      if (type !== cur) {
        flush();
        cur = type;
      }
      buf.push(item.replace(/\s*class="[^"]*"/, ''));
    }
    flush();
    return out;
  });

// Split sanitized html into html chunks and <table> blocks.
const splitTables = (s: string): HtmlPart[] => {
  const parts: HtmlPart[] = [];
  const re = /<table[\s\S]*?<\/table>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ kind: 'html', html: s.slice(last, m.index) });
    parts.push({ kind: 'table', html: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ kind: 'html', html: s.slice(last) });
  return parts.length ? parts : [{ kind: 'html', html: s }];
};

function makeLinkHandler(onAddContact?: (phone: string) => void): LinkPressHandler {
  return (_evt: any, href: string) => {
    if (!href) return;
    if (href.startsWith('addcontact:')) {
      onAddContact?.(href.replace('addcontact:', ''));
      return;
    }
    Linking.openURL(href).catch(() => {});
  };
}

function TableBlock({
  html,
  onLinkPress,
}: {
  html: string;
  onLinkPress: LinkPressHandler;
}) {
  const { p, isDark } = useLoudaTheme();

  const rows = useMemo(() => {
    const all: { cells: string[]; header: boolean }[] = [];
    const pushRows = (seg: string, header: boolean) => {
      const re = /<tr>([\s\S]*?)<\/tr>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(seg))) {
        const cells =
          m[1]
            .match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/g)
            ?.map((c) =>
              c
                .replace(/^<t[hd][^>]*>/, '')
                .replace(/<\/t[hd]>$/, ''),
            ) ?? [];
        if (cells.length) all.push({ cells, header });
      }
    };
    const thead = /<thead>([\s\S]*?)<\/thead>/.exec(html);
    const tbody = /<tbody>([\s\S]*?)<\/tbody>/.exec(html);
    if (thead) pushRows(thead[1], true);
    if (tbody) pushRows(tbody[1], false);
    return all;
  }, [html]);

  const cellStyles = useMemo(
    () => ({
      body: { margin: 0, padding: 0, fontSize: 12, lineHeight: 16, color: p.text },
      p: { margin: 0, padding: 0 },
      strong: { fontWeight: '800' },
      em: { fontStyle: 'italic' },
      code: {
        fontFamily: 'monospace',
        fontSize: 11,
        backgroundColor: 'rgba(0,0,0,0.1)',
        color: '#ec4899',
      },
      a: { color: p.accent, textDecorationLine: 'none' },
      br: { lineHeight: 16 },
    }),
    [p],
  );

  if (!rows.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginVertical: 8 }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: p.border,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.cells.map((cell, c) => (
              <View
                key={c}
                style={{
                  minWidth: 72,
                  maxWidth: 180,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  backgroundColor: row.header
                    ? isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.05)'
                    : undefined,
                  borderRightWidth:
                    c < row.cells.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderRightColor: p.border,
                  borderBottomWidth:
                    r < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: p.border,
                  justifyContent: 'center',
                }}
              >
                <RenderHTML
                  contentWidth={180}
                  source={{ html: `<body>${cell}</body>` }}
                  tagsStyles={cellStyles as any}
                  renderersProps={{ a: { onPress: onLinkPress } }}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function RichText({
  html,
  style,
  onAddContact,
}: {
  html: string;
  style?: any;
  onAddContact?: (phone: string) => void;
}) {
  const { width } = useWindowDimensions();
  const { p } = useLoudaTheme();

  const parts = useMemo(() => {
    let clean: string;
    try {
      clean = sanitizeHtml(html, {
        allowedTags: [
          'a', 'strong', 'em', 'del', 'u', 'code', 'pre', 'blockquote', 'br',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'hr', 'sup',
          'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'b', 'i',
        ],
        allowedAttributes: {
          a: ['href'],
          img: ['src', 'alt'],
          div: ['class'],
          span: ['class'],
          li: ['class'],
        },
        // 'addcontact' lets the phone-number links parseRichText generates
        // (step 8) survive the sanitizer — without it Add Contact is dead
        allowedSchemes: ['http', 'https', 'addcontact'],
      });
    } catch {
      clean = html;
    }
    return splitTables(wrapLists(clean));
  }, [html]);

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: p.text,
        fontSize: 15,
        lineHeight: 21,
        margin: 0,
        padding: 0,
        ...style,
      },
      p: { margin: 0, padding: 0 },
      strong: { fontWeight: '800' },
      em: { fontStyle: 'italic' },
      del: { textDecorationLine: 'line-through', opacity: 0.7 },
      a: { color: '#2563eb', textDecorationLine: 'none' },
      code: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        color: '#ec4899',
      },
      pre: {
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 12,
        padding: 8,
        marginVertical: 6,
      },
      h1: { fontSize: 20, fontWeight: '900', marginVertical: 6 },
      h2: { fontSize: 18, fontWeight: '800', marginVertical: 6 },
      h3: { fontSize: 16, fontWeight: '700', marginVertical: 5 },
      h4: { fontSize: 15, fontWeight: '700', marginVertical: 4 },
      h5: { fontSize: 14, fontWeight: '700', marginVertical: 4 },
      h6: { fontSize: 12, fontWeight: '700', marginVertical: 4, textTransform: 'uppercase' },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: p.accent,
        paddingLeft: 12,
        marginVertical: 8,
        fontStyle: 'italic',
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingVertical: 6,
        borderRadius: 6,
      },
      hr: { marginVertical: 10, height: 1, backgroundColor: p.border },
      ul: { marginVertical: 4, paddingLeft: 18 },
      ol: { marginVertical: 4, paddingLeft: 18 },
      li: { marginVertical: 2, lineHeight: 20 },
      table: {
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: p.border,
        overflow: 'hidden',
      },
      th: {
        backgroundColor: 'rgba(0,0,0,0.08)',
        padding: 8,
        fontWeight: '800',
        fontSize: 11,
        textTransform: 'uppercase',
        color: p.text,
      },
      td: { padding: 8, fontSize: 12, color: p.text },
      img: { marginVertical: 6, borderRadius: 12 },
      div: { margin: 0 },
    }),
    [p, style],
  );

  const handleLinkPress = useMemo(() => makeLinkHandler(onAddContact), [onAddContact]);

  if (parts.length === 1 && parts[0].kind === 'html') {
    return (
      <RenderHTML
        contentWidth={width}
        source={{ html: `<body>${parts[0].html}</body>` }}
        tagsStyles={tagsStyles as any}
        renderersProps={{
          a: { onPress: handleLinkPress },
        }}
      />
    );
  }

  return (
    <View>
      {parts.map((part, i) =>
        part.kind === 'table' ? (
          <TableBlock key={i} html={part.html} onLinkPress={handleLinkPress} />
        ) : (
          <RenderHTML
            key={i}
            contentWidth={width}
            source={{ html: `<body>${part.html}</body>` }}
            tagsStyles={tagsStyles as any}
            renderersProps={{
              a: { onPress: handleLinkPress },
            }}
          />
        ),
      )}
    </View>
  );
}
