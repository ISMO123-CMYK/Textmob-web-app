// Find non-class dark/light JS refs in LoudaApp.
const fs = require('fs');
const s = fs.readFileSync('client/src/louda/LoudaApp.jsx', 'utf8');
s.split('\n').forEach((l, i) => {
  const stripped = l.replace(/dark:[^\s"'`{}]+/g, '');
  if (/classList|isDark|useDark|darkMode|['"]dark['"]|['"]light['"]/.test(stripped)) {
    console.log(`${i + 1}: ${l.trim().slice(0, 160)}`);
  }
});
