// Rename Louda display identity -> Messaging/Textmob inside the Textmob port.
// Only touches user-visible strings; identifiers, keys, URLs, ids untouched.
const fs = require('fs');
const f = 'client/src/louda/LoudaApp.jsx';
let src = fs.readFileSync(f, 'utf8');
let n = 0;
const rep = (oldS, newS, count = true) => {
  const c = src.split(oldS).length - 1;
  src = src.split(oldS).join(newS);
  if (count) n += c;
  return c;
};

// --- special cases first ---
rep('>LOUDA</span>', '>TEXTMOB</span>');
rep('louda_media_', 'textmob_media_');
rep('Install Louda App', 'Install Textmob App');
rep('Install Louda for a faster', 'Install Textmob for a faster');
rep('Louda Secure', 'Messaging');
rep("label: 'About Louda'", "label: 'About'");
rep('to add them to Louda', 'to add them to Messaging');
// --- general display occurrences: Louda bounded by non-identifier chars ---
const re = /(?<=^|[\s>"'`({])Louda(?=$|[\s<"'`.,!?:;}])/gm;
const found = src.match(re) || [];
src = src.replace(re, 'Textmob');
n += found.length;
fs.writeFileSync(f, src);
console.log(`replacements: ${n}`);
// report anything left
const left = [];
src.split('\n').forEach((l, i) => {
  if (/louda/i.test(l) && !/alreadyInLouda|loudaUserId|LOUDA_EMBEDDED|louda:|louda-ai|Textmob port|bridge\/connector|standalone Louda|Louda backend|Louda API|Louda UI|memoryDb|supabase|onrender|white|comment|NOTE|\/\/|--/.test(l)) left.push(`${i + 1}: ${l.trim().slice(0, 130)}`);
});
console.log(`\n--- remaining Louda mentions (${left.length}) ---`);
console.log(left.slice(0, 60).join('\n'));
