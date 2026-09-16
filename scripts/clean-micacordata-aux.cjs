// Clean residual test-user rows from Textmob auxiliary tables.
const { createClient } = require('@supabase/supabase-js');
const tm = createClient(
  'https://apnnyqmsyxuyapamnrqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y'
);
const UN = 'micacordata';
(async () => {
  for (const [table, col] of [
    ['user_activity', 'username'],
    ['verification_requests', 'username'],
    ['redemption_queue', 'username'],
    ['negative_signals', 'username'],
  ]) {
    try {
      const r = await tm.from(table).delete().eq(col, UN).select('id');
      console.log(`${table}: deleted ${(r.data || []).length}`, r.error?.message || '');
    } catch (e) { console.log(`${table}: skipped (${e.message})`); }
  }
  // confirm user gone
  const c = await tm.from('users').select('id').eq('username', UN);
  console.log('users remaining:', (c.data || []).length);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
