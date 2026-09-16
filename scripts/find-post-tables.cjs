// Tables referenced via supabase2 + any post-like storage in server.js
const fs = require('fs');
const s = fs.readFileSync('server.js', 'utf8');
const names = new Set();
for (const m of s.matchAll(/supabase2\s*\.from\(\s*["']([a-z_]+)["']\s*\)/g)) names.add(m[1]);
console.log('supabase2 tables:', [...names].sort().join(', ') || '(none)');
// where do posts persist? look for insert targets near post creation
for (const m of s.matchAll(/\.from\(\s*["']([a-z_]*(post|snap|feed|content)[a-z_]*)["']\s*\)/g)) names.add('HIT:' + m[1]);
console.log('post-like tables:', [...names].filter((x) => x.startsWith('HIT')).join(', ') || '(none)');
