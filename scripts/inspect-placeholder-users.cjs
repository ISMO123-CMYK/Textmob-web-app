// Inspect Textmob Supabase users still on placeholder profile pics.
// Run: node scripts/inspect-placeholder-users.cjs [--apply]
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://apnnyqmsyxuyapamnrqg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y';
const supabase = createClient(supabaseUrl, supabaseKey);

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#e5e7eb"/><circle cx="32" cy="24" r="10" fill="#9ca3af"/><path d="M14 52c3-10 10-14 18-14s15 4 18 14" fill="#9ca3af"/></svg>';
const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`;

const DICEBEAR_DEFAULT = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';

const isPlaceholder = (pic) => {
  if (!pic || !String(pic).trim()) return 'empty';
  const p = String(pic);
  if (p === DICEBEAR_DEFAULT) return 'dicebear-default';
  if (p.includes('dicebear.com')) return 'dicebear-custom';
  if (p.includes('via.placeholder.com') || p.includes('placehold.co')) return 'placehold';
  if (p.includes('ui-avatars.com')) return 'ui-avatars';
  return null;
};

(async () => {
  const apply = process.argv.includes('--apply');
  const pageSize = 1000;
  let from = 0;
  const matched = [];
  for (;;) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, profile_pic')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('SELECT failed:', error.message);
      process.exit(1);
    }
    if (!data || !data.length) break;
    for (const u of data) {
      const kind = isPlaceholder(u.profile_pic);
      if (kind && kind !== 'dicebear-custom') matched.push({ ...u, kind });
    }
    console.log(`scanned ${from + data.length}...`);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  const byKind = {};
  matched.forEach((m) => { byKind[m.kind] = (byKind[m.kind] || 0) + 1; });
  console.log(`\nTOTAL users on placeholder pics: ${matched.length}`, byKind);
  console.log('sample:', matched.slice(0, 15).map((m) => `${m.username} [${m.kind}]`).join(', '));

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to update.');
    return;
  }
  let ok = 0, fail = 0;
  for (const m of matched) {
    const { error } = await supabase.from('users').update({ profile_pic: DEFAULT_AVATAR }).eq('id', m.id);
    if (error) { fail++; console.error(`FAIL ${m.username}: ${error.message}`); }
    else ok++;
  }
  console.log(`\nUpdated: ${ok}, failed: ${fail}`);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
