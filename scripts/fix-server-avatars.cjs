// Point server-side avatar defaults at DEFAULT_AVATAR.
const fs = require('fs');
const f = 'server.js';
let src = fs.readFileSync(f, 'utf8');
let n = 0;
const DICE = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';
for (const chunk of src.split(DICE)) n += 0;
const parts = src.split(DICE);
n = parts.length - 1;
src = parts.join('DEFAULT_AVATAR_PLACEHOLDER');
fs.writeFileSync(f, src);
// Now fix each occurrence in context: quoted usages -> DEFAULT_AVATAR identifier.
let s2 = fs.readFileSync(f, 'utf8');
s2 = s2.replace(/["']DEFAULT_AVATAR_PLACEHOLDER["']/g, 'DEFAULT_AVATAR');
s2 = s2.replace(/DEFAULT_AVATAR_PLACEHOLDER/g, 'DEFAULT_AVATAR');
s2 = s2.replace(/'https:\/\/via\.placeholder\.com\/40'/g, 'DEFAULT_AVATAR');
fs.writeFileSync(f, s2);
console.log(`dicebear spots: ${n}`);
