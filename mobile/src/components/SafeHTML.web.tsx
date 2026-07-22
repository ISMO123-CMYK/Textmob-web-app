import React from 'react';
import sanitizeHtml from 'sanitize-html';
import { useTheme } from '../context/ThemeContext';

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

export default function SafeHTML({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const { colors } = useTheme();

  if (!text) return null;

  const isHTML = /<\/?[a-z][\s\S]*>/i.test(text);

  let processed = text;

  if (!isHTML) {
    processed = convertMarkdown(processed);
    processed = processed
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/(?:\r\n|\r|\n)/g, '<br />')
      .replace(
        /(^|\s)(@[\w.-]+)/g,
        '$1<a href="mention://$2" style="color:#2563eb;font-weight:700;text-decoration:none;">$2</a>'
      )
      .replace(
        /(^|\s)(#[\w-]+)/g,
        '$1<a href="hashtag://$2" style="color:#3b82f6;font-weight:600;text-decoration:none;">$2</a>'
      )
      .replace(
        /(https?:\/\/[^\s<>"']+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>'
      );
  }

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

  return (
    <div
      style={flattenedStyle}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}