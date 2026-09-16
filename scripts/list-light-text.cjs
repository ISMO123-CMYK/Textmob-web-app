// List every light-text class occurrence with surrounding context for triage.
const fs = require('fs');
for (const f of ['client/src/louda/LoudaApp.jsx', 'client/src/louda/StatusComponents.jsx']) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  console.log(`\n===== ${f} =====`);
  lines.forEach((l, i) => {
    const m = l.match(/text-(white|gray-100|gray-200)/g);
    if (m) console.log(`${i + 1} [${m.join(',')}] :: ${l.trim().slice(0, 200)}`);
  });
}
