// List every Louda/louda mention with context for rename triage.
const fs = require('fs');
for (const f of ['client/src/louda/LoudaApp.jsx', 'client/src/louda/StatusComponents.jsx', 'client/src/louda/firebase.js', 'client/src/bridge/connector.js']) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  console.log(`\n===== ${f} =====`);
  lines.forEach((l, i) => {
    if (/louda/i.test(l)) console.log(`${i + 1}: ${l.trim().slice(0, 170)}`);
  });
}
