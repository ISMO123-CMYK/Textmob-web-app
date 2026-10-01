// Port of parseRichText (LoudaApp.jsx:1402-1532).
// Returns a sanitized HTML string (web returned { __html }).

export function parseRichText(text?: string | null): string {
  if (!text) return '';

  // 1. Escape raw HTML so user-typed <div...>, <script>, etc. are treated as
  // plain text and NEVER executed!
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const placeholders: Record<string, string> = {};
  let pCount = 0;
  const save = (content: string) => {
    const tag = `@@@PL${pCount++}@@@`;
    placeholders[tag] = content;
    return tag;
  };

  // 2. Fenced Code Blocks ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langBadge = lang
      ? `<div class="lang-badge">${lang}</div>`
      : '';
    return save(
      `<div class="code-block">${langBadge}<pre><code>${code}</code></pre></div>`,
    );
  });

  // 3. Inline Code `code`
  html = html.replace(/`([^`]+)`/g, (_, code) => save(`<code>${code}</code>`));

  // 4. Images ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g,
    (_, alt, url) => save(`<img src="${url}" alt="${alt}" />`),
  );

  // 5. Reference Links [label][ref] and [ref]: url
  const refMap: Record<string, string> = {};
  html = html.replace(/^\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)/gm, (_, ref, url) => {
    refMap[ref.toLowerCase()] = url;
    return '';
  });
  html = html.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (match, label, ref) => {
    const url = refMap[ref.toLowerCase()];
    if (url) return save(`<a href="${url}">${label}</a>`);
    return match;
  });

  // 6. Explicit Links [label](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    (_, label, url) => save(`<a href="${url}">${label}</a>`),
  );

  // 7. Raw URLs https://...
  html = html.replace(/(https?:\/\/[^\s<]+)/g, (_, url) =>
    save(`<a href="${url}">${url}</a>`),
  );

  // 8. Phone Numbers (web dispatches 'open-add-contact')
  html = html.replace(
    /(?:\b0[0-9]{10}\b)|(?:\+[0-9]{11,14}\b)/g,
    (match) => {
      const phoneArg = match.startsWith('0') ? match.slice(1) : match;
      return save(`<a href="addcontact:${phoneArg}">${match}</a>`);
    },
  );

  // 9. Tables
  if (html.includes('|')) {
    const tableRegex = /((?:\|[^\n]+\|\n?)+)/g;
    html = html.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;
      let tableHtml = `<table>`;
      rows.forEach((row, rIdx) => {
        if (row.includes('---')) return;
        const cols = row.split('|').filter(Boolean).map((c) => c.trim());
        if (rIdx === 0) {
          tableHtml += `<thead><tr>`;
          cols.forEach((col) => {
            tableHtml += `<th>${col}</th>`;
          });
          tableHtml += `</tr></thead><tbody>`;
        } else {
          tableHtml += `<tr>`;
          cols.forEach((col) => {
            tableHtml += `<td>${col}</td>`;
          });
          tableHtml += `</tr>`;
        }
      });
      tableHtml += `</tbody></table>`;
      return save(tableHtml);
    });
  }

  // 10. Headings
  html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // 11. Task Lists & Lists
  html = html.replace(/^\s*\*\s+\[x\]\s+(.*)$/gm, '<div class="task"><span class="checked">✓</span> $1</div>');
  html = html.replace(/^\s*\*\s+\[\s\]\s+(.*)$/gm, '<div class="task"><span>□</span> $1</div>');
  html = html.replace(/^\s*(?:\*|-)\s+(.*)$/gm, '<li class="my-0.5 ml-4 list-disc list-inside">$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="my-0.5 ml-4 list-decimal list-inside">$1</li>');

  // 12. Blockquotes
  html = html.replace(/^\s*>\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  // 13. Horizontal Rules
  html = html.replace(/^\s*---\s*$/gm, '<hr />');

  // 14. Footnotes
  html = html.replace(/\[\^(\d+)\]:\s*(.*)$/gm, '<div class="footnote"><sup>$1</sup> $2</div>');
  html = html.replace(/\[\^(\d+)\]/g, '<sup>$1</sup>');

  // 15. Bold, Italic, Strikethrough
  html = html.replace(/\*\*\*([^\*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 16. Newlines
  html = html.replace(/\n/g, '<br />');

  // 17. Restore Placeholders
  Object.keys(placeholders).forEach((tag) => {
    html = html.replace(tag, placeholders[tag]);
  });

  return html;
}
