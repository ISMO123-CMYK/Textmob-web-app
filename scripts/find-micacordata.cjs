// Find test user micacordata in Textmob + Louda Supabase.
const { createClient } = require('@supabase/supabase-js');
const tm = createClient(
  'https://apnnyqmsyxuyapamnrqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y'
);
const louda = createClient(
  'https://ldepewastfyohswgtgbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZXBld2FzdGZ5b2hzd2d0Z2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkwOTUsImV4cCI6MjA5MDU2NTA5NX0.57USwUSsJL1ik-RwxZgcV1cJLzr3TDxcRX7xbum0Bms'
);
(async () => {
  const t = await tm.from('users').select('id, username, profile_pic').ilike('username', 'micacordata');
  console.log('TEXTMOB users:', JSON.stringify(t.data, null, 1), t.error?.message || '');
  const l = await louda.from('users').select('id, username, phone').or('username.ilike.micacordata,username.ilike.%micacordata%');
  console.log('LOUDA users:', JSON.stringify(l.data, null, 1), l.error?.message || '');
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
