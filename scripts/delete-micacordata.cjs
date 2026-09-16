// Delete test user micacordata from Textmob + Louda Supabase.
const { createClient } = require('@supabase/supabase-js');
const tm = createClient(
  'https://apnnyqmsyxuyapamnrqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y'
);
const louda = createClient(
  'https://ldepewastfyohswgtgbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZXBld2FzdGZ5b2hzd2d0Z2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkwOTUsImV4cCI6MjA5MDU2NTA5NX0.57USwUSsJL1ik-RwxZgcV1cJLzr3TDxcRX7xbum0Bms'
);
const TM_ID = '48f545e7-be59-439b-8b7a-435be6e2223a';
const LOUDA_ID = 'cf0d90c8-ff3a-4a4d-90ba-986d1d9759f7';
const UN = 'micacordata';

(async () => {
  // --- Textmob: content first, then user ---
  for (const [table, col, val] of [
    ['posts', 'username', UN],
    ['snaps', 'username', UN],
    ['comments', 'username', UN],
    ['notifications', 'username', UN],
  ]) {
    try {
      const r = await tm.from(table).delete().eq(col, val).select('id');
      console.log(`textmob.${table}: deleted ${(r.data || []).length}`, r.error?.message || '');
    } catch (e) { console.log(`textmob.${table}: skipped (${e.message})`); }
  }
  const tu = await tm.from('users').delete().eq('id', TM_ID).select('id');
  console.log('textmob.users deleted:', (tu.data || []).length, tu.error?.message || '');

  // --- Louda: chats involving the user, then user ---
  try {
    const chats = await louda.from('chats').select('id, participant_ids');
    if (!chats.error && chats.data) {
      const mine = chats.data.filter((c) => (c.participant_ids || []).includes(LOUDA_ID));
      for (const c of mine) {
        const r = await louda.from('chats').delete().eq('id', c.id);
        console.log(`louda.chats ${c.id}: ${r.error ? 'FAIL ' + r.error.message : 'deleted'}`);
      }
      console.log(`louda.chats scanned: ${chats.data.length}, deleted: ${mine.length}`);
    } else console.log('louda.chats scan failed:', chats.error?.message);
  } catch (e) { console.log('louda.chats skipped:', e.message); }
  const lu = await louda.from('users').delete().eq('id', LOUDA_ID).select('id');
  console.log('louda.users deleted:', (lu.data || []).length, lu.error?.message || '');
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
