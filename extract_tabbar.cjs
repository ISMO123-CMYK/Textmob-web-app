const fs = require('fs');
const c = fs.readFileSync('client/src/pages/home/HomeFeed.jsx', 'utf8');
const lines = c.split(/\r?\n/);
const l = lines[76];

// Find TabBar function
const start = l.indexOf('function TabBar');
if (start === -1) { console.log('TabBar not found'); process.exit(1); }

// Find the end of TabBar by counting braces
let depth = 0, foundBrace = false, end = start;
let inStr = false, strCh = '', esc = false, inTpl = false, inLC = false, inBC = false, prev = '';
for (let i = start; i < l.length; i++) {
  const ch = l[i];
  const nx = i < l.length - 1 ? l[i + 1] : '';
  if (inLC) { if (ch === '\n') inLC = false; continue; }
  if (inBC) { if (ch === '*' && nx === '/') inBC = false; continue; }
  if (esc) { esc = false; continue; }
  if (ch === '\\') { esc = true; continue; }
  if (inStr) { if (ch === strCh && prev !== '\\') inStr = false; continue; }
  if (inTpl) { if (ch === '`' && prev !== '\\') inTpl = false; continue; }
  if (ch === '/' && nx === '/') { inLC = true; continue; }
  if (ch === '/' && nx === '*') { inBC = true; continue; }
  if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
  if (ch === '`') { inTpl = true; continue; }
  if (ch === '{') { depth++; foundBrace = true; }
  if (ch === '}') depth--;
  if (foundBrace && depth === 0) { end = i + 1; break; }
  prev = ch;
}

const tabBarCode = l.substring(start, end);
console.log('TabBar: chars', start, '-', end, '(' + tabBarCode.length + ' chars)');
console.log('---CODE---');
console.log(tabBarCode);
