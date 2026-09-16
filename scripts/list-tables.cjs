// List distinct Supabase table names referenced in server.js
const fs = require('fs');
const s = fs.readFileSync('server.js', 'utf8');
const names = new Set();
for (const m of s.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)/g)) names.add(m[1]);
console.log([...names].sort().join('\n'));
