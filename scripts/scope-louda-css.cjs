// One-shot: scope Textmob/client/src/louda/louda.css under .louda-scope
// + prefix @keyframes with louda- (avoid collisions with Textmob globals).
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'louda', 'louda.css');
let src = fs.readFileSync(file, 'utf8');

// Safety: bail if comments contain braces (would break the parser)
for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) {
  if (/[{}]/.test(m[0])) {
    console.error('ABORT: comment contains brace:', m[0].slice(0, 120));
    process.exit(1);
  }
}

const KEYFRAMES = [
  'msg-slide-in-right', 'msg-slide-in-left', 'bounce-gentle', 'recording-pulse',
  'online-glow', 'jumping-dots', 'dot-bounce', 'nav-slide-up', 'modal-pop',
  'slide-left', 'slide-down', 'slide-up', 'page-enter', 'page-exit',
  'flash-bg', 'flash', 'slideUp', 'ripple', 'fade-in',
].sort((a, b) => b.length - a.length);

// 1. rename @keyframes definitions
src = src.replace(/@keyframes\s+([A-Za-z0-9_-]+)/g, (m, name) =>
  KEYFRAMES.includes(name) ? `@keyframes louda-${name}` : m
);

const SCOPE = '.louda-scope';

function splitSelectorList(sel) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim() !== '') parts.push(cur);
  return parts;
}

function scopePart(part) {
  const p = part.trim();
  if (!p) return p;
  if (p.startsWith(SCOPE)) return p;
  if (p === ':root' || p === 'html' || p === 'body') return SCOPE;
  if (p === '*') return `${SCOPE} *`;
  if (p.startsWith('::')) return `${SCOPE} ${p}`;
  return `${SCOPE} ${p}`;
}

// 2. walk lines, track block stack; transform rule headers only
const lines = src.split('\n');
const stack = []; // 'keyframes' | 'at' | 'rule'
let headerBuf = []; // accumulated selector lines
let headerStartIdx = -1;
let keyframeCount = 0, scopedCount = 0;

function blockTypeOf(header) {
  const h = header.trim();
  if (/^@keyframes\b/.test(h)) return 'keyframes';
  if (/^@/.test(h)) return 'at'; // @media, @supports, ...
  return 'rule';
}

function inKeyframes() {
  return stack.includes('keyframes');
}

function flushHeaderBefore(idx) {
  // headerBuf holds lines [headerStartIdx, idx); current line idx has '{'
  if (headerBuf.length === 0) return null;
  return headerBuf.join('\n');
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // animation: / animation-name: property lines -> rename keyframe refs
  if (/^animation(-name)?\s*:/.test(trimmed)) {
    let out = line;
    for (const name of KEYFRAMES) {
      const re = new RegExp(`(?<![A-Za-z0-9_-])${name}(?![A-Za-z0-9_-])`, 'g');
      out = out.replace(re, `louda-${name}`);
    }
    if (out !== line) { lines[i] = out; keyframeCount++; }
    continue;
  }

  const openIdx = line.indexOf('{');
  const closeOnly = openIdx === -1 && trimmed.includes('}');

  if (openIdx !== -1) {
    const before = line.slice(0, openIdx);
    const after = line.slice(openIdx); // includes '{' + maybe content + '}'
    const fullHeader = [...headerBuf, before].join('\n');
    const type = blockTypeOf(fullHeader);

    if (type === 'rule' && !inKeyframes()) {
      const newHeader = splitSelectorList(fullHeader).map(scopePart).join(', ');
      // preserve indentation of first header line
      const indent = (lines[headerStartIdx >= 0 ? headerStartIdx : i].match(/^\s*/) || [''])[0];
      const headerLines = headerBuf.length > 0 ? headerBuf.length : 0;
      const newLines = (indent + newHeader + ' ' + after.trimStart()).split('\n');
      // replace consumed lines
      if (headerLines > 0) {
        lines.splice(headerStartIdx, headerLines + 1, ...newLines.map((l, k) => (k === 0 ? l : l)));
        i = headerStartIdx + newLines.length - 1;
      } else {
        lines[i] = indent + newHeader + ' ' + after.trimStart();
      }
      scopedCount++;
    } else if (type === 'rule' && inKeyframes()) {
      // from/to/% selectors — leave untouched
    }
    // brace bookkeeping: single-line balanced blocks (e.g. `from {...}`)
    // must NOT leave anything on the stack
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    const net = opens - closes;
    if (net > 0) stack.push(type);
    else if (net < 0) for (let k = 0; k < -net && stack.length; k++) stack.pop();
    headerBuf = [];
    headerStartIdx = -1;
  } else if (closeOnly) {
    const closes = (line.match(/}/g) || []).length;
    for (let k = 0; k < closes && stack.length; k++) stack.pop();
    headerBuf = [];
    headerStartIdx = -1;
  } else if (trimmed === '' || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '*/' || trimmed.endsWith('*/')) {
    // blank / comment lines: keep, but do NOT reset an in-progress header
    // (a comment between selector list and '{' is rare; reset to be safe only if buffer empty)
    if (headerBuf.length === 0) { /* nothing */ }
  } else if (trimmed.endsWith(';')) {
    // property line or at-rule without block (@apply, @charset...) — not a header
    headerBuf = [];
    headerStartIdx = -1;
  } else {
    // possible selector continuation line
    if (headerStartIdx === -1) headerStartIdx = i;
    headerBuf.push(line);
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log(`scoped ${scopedCount} rule headers, renamed refs in ${keyframeCount} animation lines`);
