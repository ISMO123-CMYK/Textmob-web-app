const fs = require('fs');
const path = require('path');
const os = require('os');
const { initTextDb } = require('../index');

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.error('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); }
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'textdb-test-'));
  const remoteDir = path.join(dir, 'remote');
  const db = await initTextDb({
    dir,
    env: {
      TEXTDB_DIR: dir,
      TEXTDB_REMOTE_DIR: remoteDir,
      TEXTDB_SNAPSHOT_INTERVAL_MS: '999999999',
      TEXTDB_OUTBOX_INTERVAL_MS: '999999999',
    },
  });
  const supabase = db.supabase;
  const supabase2 = db.supabase2;

  console.log('--- select/insert basics ---');
  const ins = await supabase.from('users').insert([{
    username: 'ismailg', email: 'a@b.c', fullname: 'Ismail',
    followers: 3, following: ['x'], friends: ['y'],
    verified: true, disabled: false, notifications: [{ msg: 'hi', read: false }],
    profile_pic: 'url', mobcoins: 100, profile_type: 'public',
  }]).select('*').single();
  check('insert + select single returns row', ins.error === null && ins.data.username === 'ismailg', ins.error);
  check('boolean revived', ins.data.verified === true && ins.data.disabled === false, ins.data);
  check('array revived', Array.isArray(ins.data.following) && ins.data.following[0] === 'x');
  check('json revived', ins.data.notifications[0].msg === 'hi');
  check('generated id present', !!ins.data.id);

  await supabase.from('users').insert([
    { username: 'alice', email: 'alice@c.c', fullname: 'Alice', followers: 1, following: [], friends: ['ismailg'], verified: false, notifications: [] },
    { username: 'bob', email: 'bob@c.c', fullname: 'Bob', followers: 2, following: [], friends: [], verified: false, notifications: [] },
  ]);

  const sel = await supabase.from('users').select('username, email, fullname');
  check('select column list', sel.data.length === 3 && sel.data[0].username !== undefined && sel.data[0].email !== undefined, sel.data);

  const eq = await supabase.from('users').select('*').eq('username', 'ismailg').single();
  check('eq + single', eq.data && eq.data.fullname === 'Ismail', eq.error);

  const maybe = await supabase.from('users').select('*').eq('username', 'nope').maybeSingle();
  check('maybeSingle empty -> null, no error', maybe.data === null && maybe.error === null, maybe);

  const singleMiss = await supabase.from('users').select('*').eq('username', 'nope').single();
  check('single empty -> PGRST116', singleMiss.error && singleMiss.error.code === 'PGRST116', singleMiss.error);

  const inq = await supabase.from('users').select('username').in('username', ['alice', 'bob']);
  check('in filter', inq.data.length === 2);

  const orq = await supabase.from('users').select('username').or('username.eq.alice,username.eq.bob');
  check('or filter', orq.error === null && orq.data.length === 2, orq);

  const countHead = await supabase.from('users').select('username', { count: 'exact', head: true });
  check('count head:true', countHead.data === null && countHead.count === 3, countHead);

  const ordered = await supabase.from('users').select('*').order('followers', { ascending: false });
  check('order desc', ordered.data[0].followers === 3, ordered.data.map(r => r.followers));

  const paged = await supabase.from('users').select('*').order('followers', { ascending: false }).range(1, 2);
  check('range inclusive', paged.data.length === 2 && paged.data[0].followers === 2, paged.data.map(r => r.followers));

  const lim = await supabase.from('users').select('*').limit(1);
  check('limit', lim.data.length === 1);

  console.log('--- update/upsert/delete ---');
  const upd = await supabase.from('users').update({ fullname: 'Ismail G', followers: 4 }).eq('username', 'ismailg').select('username, fullname, followers').single();
  check('update + select + single', upd.data && upd.data.fullname === 'Ismail G' && upd.data.followers === 4, upd);

  const updPlain = await supabase.from('users').update({ mobcoins: 999 }).eq('username', 'ismailg');
  check('update without select', updPlain.error === null, updPlain.error);
  const mob = await supabase.from('users').select('mobcoins').eq('username', 'ismailg').single();
  check('update applied', mob.data.mobcoins === 999);

  const updNoFilter = await supabase.from('users').update({ mobcoins: 0 });
  check('update without filter refused', !!updNoFilter.error);

  await supabase2.from('Posts').insert([{ id: 'p1', username: 'ismailg', text: 'hello #tag world', likes: [], comments: [], hashtags: ['tag'], type: 'text', created_at: '2026-01-01T00:00:00Z' }]).select('*').single();
  const up = await supabase2.from('Posts').upsert({ id: 'p1', text: 'edited #tag', likes: ['alice'] }, { onConflict: 'id' });
  check('upsert onConflict', up.error === null, up.error);
  const p1 = await supabase2.from('Posts').select('*').eq('id', 'p1').single();
  check('upsert applied', p1.data.text === 'edited #tag' && p1.data.likes[0] === 'alice', p1.data);

  const il = await supabase2.from('Posts').select('*').ilike('text', '%#tag%');
  check('ilike', il.data.length === 1 && il.data[0].id === 'p1', il.data);

  const notq = await supabase2.from('Posts').select('*').not('type', 'ilike', 'group-post-%');
  check('not ilike', notq.data.length === 1, notq.data);

  const gtq = await supabase2.from('Posts').select('*').eq('username', 'ismailg').gte('created_at', '2025-12-31');
  check('gte date', gtq.data.length === 1, gtq.data);

  await supabase2.from('groups').insert([{ id: 'g1', name: 'Gang', created_by: 'ismailg', type: 'chat', payload: { users: [{ user_id: 'alice' }], messages: [] } }]).select('*').single();
  const orJson = await supabase2.from('groups').select('id').or('created_by.eq.ismailg,payload.users.user_id.eq.alice');
  check('or with json path', orJson.data.length === 1, orJson.data);

  const del = await supabase2.from('Posts').delete().eq('id', 'p1');
  check('delete', del.error === null, del.error);
  const gone = await supabase2.from('Posts').select('*').eq('id', 'p1').maybeSingle();
  check('deleted row gone', gone.data === null);

  const delNoFilter = await supabase.from('users').delete();
  check('delete without filter refused', !!delNoFilter.error);

  console.log('--- embeds ---');
  await supabase.from('redemption_queue').insert([{ id: 'r1', username: 'ismailg', coin_amount: 50, status: 'PENDING' }]).select('*').single();
  const emb = await supabase.from('redemption_queue').select('*, users(username, fullname, profile_pic)').order('created_at', { ascending: false });
  check('embed users(username...) via username FK', emb.data[0].users && emb.data[0].users.username === 'ismailg', emb.data);

  await supabase.from('verification_requests').insert([{ id: 'v1', user_id: ins.data.id, status: 'PENDING' }]).select('*').single();
  const emb2 = await supabase.from('verification_requests').select('id, created_at, users(username)').eq('status', 'PENDING');
  check('embed users via user_id FK', emb2.data[0].users && emb2.data[0].users.username === 'ismailg', emb2.data);

  console.log('--- messages pattern ---');
  await supabase.from('Messages').insert([{ id: 'm1', sender: 'ismailg', receiver: 'alice', chat_id: 'a__b', message: 'yo', type: 'text', timestamp: '2026-01-02T00:00:00Z', read: false, status: 'pending' }]).select('id, sender, receiver, type, message, status, read, timestamp').single();
  await supabase.from('Messages').update({ status: 'delivered' }).eq('id', 'm1');
  const msg = await supabase.from('Messages').select('*').eq('sender', 'ismailg').or('sender.eq.ismailg,receiver.eq.ismailg').order('timestamp', { ascending: false });
  const mrow = msg.data.find(m => m.id === 'm1');
  check('message update applied', mrow && mrow.status === 'delivered', mrow);

  console.log('--- LRU cache ---');
  const q = () => supabase.from('users').select('username').eq('username', 'alice').maybeSingle();
  const r1 = await q();
  const r2 = await q();
  check('cached read stable', r1.data.username === 'alice' && r2.data.username === 'alice');
  check('lru has entries', db.lru.stats().entries > 0, db.lru.stats());

  console.log('--- outbox + snapshot + restore (kill/wipe simulation) ---');
  await supabase.from('users').update({ fullname: 'FRESH WRITE' }).eq('username', 'alice');
  db.outbox.stop();
  await db.outbox.flush();
  check('outbox drained', db.outbox.stats().pending === 0, db.outbox.stats());
  await db.replicator.snapshotAll();
  check('snapshot manifest exists', !!db.replicator.lastSnapshot.main, db.replicator.lastSnapshot);
  await db.stop();

  const db2 = await initTextDb({
    dir,
    env: {
      TEXTDB_DIR: dir,
      TEXTDB_REMOTE_DIR: remoteDir,
      TEXTDB_SNAPSHOT_INTERVAL_MS: '999999999',
      TEXTDB_OUTBOX_INTERVAL_MS: '999999999',
    },
  });
  const back = await db2.supabase.from('users').select('fullname').eq('username', 'alice').single();
  check('reopen: data present', back.data.fullname === 'FRESH WRITE', back.data);
  await db2.stop();

  fs.rmSync(path.join(dir, 'main.db'), { force: true });
  fs.rmSync(path.join(dir, 'main.db-wal'), { force: true });
  fs.rmSync(path.join(dir, 'main.db-shm'), { force: true });
  fs.rmSync(path.join(dir, 'posts.db'), { force: true });
  fs.rmSync(path.join(dir, 'posts.db-wal'), { force: true });
  fs.rmSync(path.join(dir, 'posts.db-shm'), { force: true });

  const db3 = await initTextDb({
    dir,
    env: {
      TEXTDB_DIR: dir,
      TEXTDB_REMOTE_DIR: remoteDir,
      TEXTDB_SNAPSHOT_INTERVAL_MS: '999999999',
      TEXTDB_OUTBOX_INTERVAL_MS: '999999999',
    },
  });
  const restored = await db3.supabase.from('users').select('fullname, followers').eq('username', 'alice').single();
  check('wipe + restore from snapshot', restored.data && restored.data.fullname === 'FRESH WRITE', restored);
  const restoredPost = await db3.supabase2.from('groups').select('*').eq('id', 'g1').maybeSingle();
  check('restore second namespace', restoredPost.data && restoredPost.data.name === 'Gang', restoredPost);
  const ismail = await db3.supabase.from('users').select('*').eq('username', 'ismailg').maybeSingle();
  check('restored user intact (json arrays)', ismail.data && Array.isArray(ismail.data.following), ismail.data);
  await db3.stop();

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
