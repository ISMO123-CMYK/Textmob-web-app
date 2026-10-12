const path = require('path');
const os = require('os');
const fs = require('fs');
const { Engine } = require('../engine');
const { TextDbClient } = require('../shim');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcontain-'));
const dbx = {
  engine: new Engine(path.join(dir, 't.db')),
  ns: 'main',
  lru: { get: () => null, set: () => {}, invalidate: () => {}, stats: () => ({}) },
  queryTtl: 0,
  ready: Promise.resolve(),
};

(async () => {
  const c = new TextDbClient(dbx);
  const e = dbx.engine;
  e.createTable('groups', { members_ids: 'json', messages: 'json' });
  e.insertRows('groups', [
    { id: 'g1', members_ids: ['ismailg', 'bob'], messages: [] },
    { id: 'g2', members_ids: ['alice'], messages: [] },
  ]);

  let pass = 0, fail = 0;
  const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name, extra !== undefined ? JSON.stringify(extra) : ''); };

  const r1 = await c.from('groups').select('*').contains('members_ids', ['ismailg']);
  check('contains array', r1.data.length === 1 && r1.data[0].id === 'g1', r1.data.map(x => x.id));

  const r2 = await c.from('groups').select('*').contains('members_ids', '["bob"]');
  check('contains json-string', r2.data.length === 1 && r2.data[0].id === 'g1', r2.data.map(x => x.id));

  const r3 = await c.from('groups').select('*').contains('members_ids', ['nobody']);
  check('contains miss', r3.data.length === 0, r3.data.length);

  const r4 = await c.from('groups').select('*').contains('members_ids', ['ismailg', 'bob']);
  check('contains all present', r4.data.length === 1, r4.data.length);

  const r5 = await c.from('groups').select('*').contains('members_ids', ['ismailg', 'nobody']);
  check('contains all-fail', r5.data.length === 0, r5.data.length);

  // hashtag-style: like server.js:9120
  const e2 = dbx.engine;
  e2.createTable('Posts2', { hashtags: 'json' });
  e2.insertRows('Posts2', [{ id: 'p1', hashtags: ['#tag', '#other'] }, { id: 'p2', hashtags: ['#nope'] }]);
  const r6 = await c.from('Posts2').select('*').contains('hashtags', JSON.stringify(['#tag']));
  check('contains stringify-array (hashtags)', r6.data.length === 1 && r6.data[0].id === 'p1', r6.data.map(x => x.id));

  const r7 = await c.from('groups').select('*').eq('id', 'g1');
  check('eq still works', r7.data.length === 1);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
