// Audit Louda dark-mode surface (read-only).
const fs = require('fs');
const app = fs.readFileSync('client/src/louda/LoudaApp.jsx', 'utf8');
const status = fs.readFileSync('client/src/louda/StatusComponents.jsx', 'utf8');
const css = fs.readFileSync('client/src/louda/louda.css', 'utf8');

for (const [name, src] of [['LoudaApp', app], ['Status', status]]) {
  const tokens = src.match(/[^\s"'`{}]*dark:[^\s"'`{}]+/g) || [];
  console.log(`--- ${name}: ${tokens.length} dark: tokens, ${new Set(tokens).size} distinct`);
  console.log([...new Set(tokens)].slice(0, 40).join(' | '));
  const odd = src.match(/classList|isDark|useDark|darkMode|['"`]dark['"`]|['"`]light['"`]/g) || [];
  console.log(`--- ${name} non-class dark/light refs: ${odd.length}`, [...new Set(odd)].join(','));
  const vars = src.match(/var\(--(?:bg-main|bg-side|text-main|border-color)\)/g) || [];
  console.log(`--- ${name} theme-var refs: ${vars.length}`);
}
// CSS rules mentioning .dark / .light
const darkRules = [...css.matchAll(/^([^\n{]*\.(?:dark|light)\b[^\n{]*)\{/gm)].map(m => m[1].trim());
console.log(`--- css .dark/.light rule headers: ${darkRules.length}`);
console.log(darkRules.slice(0, 50).join('\n'));
