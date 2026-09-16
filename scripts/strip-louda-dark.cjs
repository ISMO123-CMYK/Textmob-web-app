// Strip Louda's class-based dark mode so TextMob's DarkReader owns theming.
// 1. JSX: remove `dark:<utility>` tokens (LoudaApp.jsx, StatusComponents.jsx).
// 2. louda.css: hoist .light vars to .louda-scope root, delete all
//    rules whose selector contains .dark / .light.
const fs = require('fs');

let totalTokens = 0;
for (const f of ['client/src/louda/LoudaApp.jsx', 'client/src/louda/StatusComponents.jsx']) {
  let src = fs.readFileSync(f, 'utf8');
  const before = src;
  src = src.replace(/(?<=[\s"'`{])dark:[^\s"'`{}]+/g, '');
  // collapse 3+ spaces left inside class strings (cosmetic, keeps diffs small)
  src = src.replace(/ {3,}/g, '  ');
  totalTokens += (before.match(/(?<=[\s"'`{])dark:[^\s"'`{}]+/g) || []).length;
  fs.writeFileSync(f, src);
  console.log(`${f}: stripped`);
}
console.log(`total dark: tokens removed: ${totalTokens}`);

// --- CSS ---
const cssFile = 'client/src/louda/louda.css';
const lines = fs.readFileSync(cssFile, 'utf8').split('\n');
const out = [];
let headerBuf = [];
let headerStart = -1;
let skipDepth = 0;
let removedRules = 0;

const isDarkLightHeader = (h) => /(^|[\s,>~+])\.(dark|light)(?![\w-])/.test(h);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (skipDepth > 0) {
    skipDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    if (skipDepth <= 0) { skipDepth = 0; removedRules++; }
    continue;
  }
  const openIdx = line.indexOf('{');
  if (openIdx !== -1) {
    const fullHeader = [...headerBuf, line.slice(0, openIdx)].join('\n');
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    if (!/^\s*@/.test(fullHeader.trim()) && isDarkLightHeader(fullHeader)) {
      // drop buffered header lines + this line, skip block
      out.length = out.length - headerBuf.length;
      skipDepth = opens - closes;
      if (skipDepth <= 0) { skipDepth = 0; removedRules++; }
      headerBuf = [];
      headerStart = -1;
      continue;
    }
    headerBuf = [];
    headerStart = -1;
    out.push(line);
  } else if (/^\s*[a-zA-Z#.:*\[][^{};]*$/.test(line) && line.trim() !== '' && !line.trim().startsWith('/*') && !line.trim().startsWith('*') && !line.trim().endsWith('*/')) {
    if (headerStart === -1) headerStart = i;
    headerBuf.push(line);
    out.push(line);
  } else {
    if (line.trim().endsWith(';') || line.trim() === '' || line.includes('*/') || line.includes('/*')) {
      if (line.trim().endsWith(';')) { headerBuf = []; headerStart = -1; }
    } else {
      headerBuf = []; headerStart = -1;
    }
    out.push(line);
  }
}
fs.writeFileSync(cssFile, out.join('\n'));
console.log(`css dark/light rules removed: ${removedRules}`);

// hoist light theme vars to .louda-scope root so var(--bg-main) etc. keep working
let css2 = fs.readFileSync(cssFile, 'utf8');
if (!css2.includes('--bg-main:')) {
  css2 = css2.replace(
    '    --iron: #111b21;',
    `    --iron: #111b21;
    --bg-main: var(--warm-bg);
    --bg-side: #fff;
    --text-main: var(--secondary);
    --border-color: rgba(31, 41, 55, 0.1);`
  );
  fs.writeFileSync(cssFile, css2);
  console.log('hoisted light theme vars to .louda-scope');
}
