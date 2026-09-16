// List distinct external avatar URLs in server.js
const fs = require('fs');
const s = fs.readFileSync('server.js', 'utf8');
for (const re of [/https:\/\/api\.dicebear\.com[^\s"']*/g, /https:\/\/via\.placeholder\.com[^\s"']*/g, /https:\/\/placehold\.co[^\s"']*/g, /https:\/\/ui-avatars\.com[^\s"']*/g]) {
  const m = s.match(re) || [];
  console.log(re.source, '=>', m.length, 'hits');
  console.log([...new Set(m)].join('\n'));
}
