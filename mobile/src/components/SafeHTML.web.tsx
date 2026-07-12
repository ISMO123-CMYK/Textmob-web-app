import React from 'react';
import sanitizeHtml from 'sanitize-html';
import { useTheme } from '../context/ThemeContext';

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
    processed = text
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n') // cap runs of blank lines so they don't blow up spacing
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
    <div>
      <span>{text}</span>
    </div>
  );
}