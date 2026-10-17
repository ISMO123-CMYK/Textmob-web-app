const fs = require('fs');
const path = require('path');
const { Engine } = require('../engine');
const { TextDbClient } = require('../shim');

const SRC = path.join(process.env.TEMP || '/tmp', 'opencode', 'fresh-main.db');
const TMP = path.join(process.env.TEMP || '/tmp', 'opencode', 'bench-proj.db');
fs.copyFileSync(SRC, TMP);

const engine = new Engine(TMP);
engine.ensureIndexes([
  { table: 'Posts', cols: ['created_at'], name: 'idx_posts_created_at' },
  { table: 'users', cols: ['username'], name: 'idx_users_username' },
]);
const lru = { get: () => undefined, set: () => {}, invalidatePrefix: () => {} };
const client = new TextDbClient({ get engine() { return engine; }, ns: 'main', lru, queryTtl: 0 });

let fail = 0;
function check(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { console.log('  ok ', label); }
  else { fail++; console.log('  FAIL', label, '\n    got ', g.slice(0, 200), '\n    want', w.slice(0, 200)); }
}

(async () => {
  // Real server patterns
  const feed = await client.from('Posts').select('*').order('created_at', { ascending: false }).limit(20);
  check('feed select * limit 20', feed.data.length, 20);

  const narrow = await client.from('Posts').select('id, username, text, created_at').order('created_at', { ascending: false }).limit(5);
  check('narrow select 5 rows', narrow.data.length, 5);
  check('narrow row keys', Object.keys(narrow.data[0]).sort(), ['created_at', 'id', 'text', 'username'].sort());

  const single = await client.from('Posts').select('*').eq('id', feed.data[0].id).maybeSingle();
  check('single post by id', single.data && single.data.id, feed.data[0].id);

  const byUser = await client.from('Posts').select('*').eq('username', 'ismailg').order('created_at', { ascending: false }).limit(10);
  check('posts by username', byUser.data.length > 0, true);

  const user = await client.from('users').select('*').eq('username', 'ismailg').maybeSingle();
  check('user by username', user.data && user.data.username, 'ismailg');

  const userNarrow = await client.from('users').select('username, email, fullname').eq('username', 'ismailg').maybeSingle();
  // _shape always includes id (pre-existing behavior) — narrow select must not pull other cols
  check('user narrow keys', Object.keys(userNarrow.data).sort(), ['email', 'fullname', 'id', 'username'].sort());

  const groupPosts = await client.from('Posts').select('*').not('type', 'ilike', 'group-post-%').order('created_at', { ascending: false }).limit(50);
  check('not group-post filter', groupPosts.data.length > 0, true);

  const count = await client.from('Posts').select('id', { count: 'exact', head: true });
  check('count exact', typeof count.count, 'number');

  // embed (needs key cols present — projection must NOT apply)
  const withEmbed = await client.from('Posts').select('*, users(username, fullname)').order('created_at', { ascending: false }).limit(3);
  check('embed returns users key', 'users' in withEmbed.data[0], true);

  // update round-trip (projection path in _execUpdate)
  const target = byUser.data[0];
  const upd = await client.from('Posts').update({ boost_score: (target.boost_score || 0) }).eq('id', target.id).select('id, boost_score').single();
  check('update select narrow', upd.data && upd.data.id, target.id);
  check('update narrow keys', Object.keys(upd.data).sort(), ['boost_score', 'id'].sort());

  console.log(fail ? '\n' + fail + ' FAILURES' : '\nall projection checks passed');
  engine.close();
  fs.unlinkSync(TMP);
  process.exit(fail ? 1 : 0);
})();
