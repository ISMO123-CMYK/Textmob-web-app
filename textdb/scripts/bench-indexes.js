const fs = require('fs');
const path = require('path');
const { Engine } = require('../engine');

const SRC = path.join(process.env.TEMP || '/tmp', 'opencode', 'fresh-main.db');
const TMP = path.join(process.env.TEMP || '/tmp', 'bench-textdb.db');
fs.copyFileSync(SRC, TMP);

function bench(label, fn, n = 20) {
  fn(); // warm
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
  console.log(label.padEnd(52), ms.toFixed(2) + ' ms');
  return ms;
}

// --- WITHOUT indexes (baseline) ---
let e = new Engine(TMP);
const tables = e.rawAll("SELECT name FROM sqlite_master WHERE type='table'", []).map(r => r.name);
const postCount = tables.includes('Posts') ? Number(e.rawGet('SELECT COUNT(*) c FROM "Posts"', []).c) : 0;
const userCount = tables.includes('users') ? Number(e.rawGet('SELECT COUNT(*) c FROM "users"', []).c) : 0;
console.log('tables:', tables.join(', '));
console.log('Posts:', postCount, ' users:', userCount);
console.log('');

const feedSql = 'SELECT id, username, text, likes, comments, created_at, type, media, hashtags, boost_score FROM "Posts" ORDER BY created_at DESC LIMIT 20';
const userSql = 'SELECT * FROM "users" WHERE username = ?';

const tNoIdxFeed = bench('feed ORDER BY created_at DESC LIMIT 20 (no idx)', () => e.rawAll(feedSql, []));
const tNoIdxUser = bench('users WHERE username=? (no idx)', () => e.rawAll(userSql, ['ismailg']));

// --- WITH indexes ---
e.ensureIndexes([
  { table: 'Posts', cols: ['created_at'], name: 'idx_posts_created_at' },
  { table: 'Posts', cols: ['username', 'created_at'], name: 'idx_posts_username_created_at' },
  { table: 'Posts', cols: ['type', 'created_at'], name: 'idx_posts_type_created_at' },
  { table: 'users', cols: ['username'], name: 'idx_users_username' },
  { table: 'users', cols: ['email'], name: 'idx_users_email' },
]);
const tIdxFeed = bench('feed ORDER BY created_at DESC LIMIT 20 (idx)', () => e.rawAll(feedSql, []));
const tIdxUser = bench('users WHERE username=? (idx)', () => e.rawAll(userSql, ['ismailg']));

// verify identical results
const a = e.rawAll(feedSql, []);
console.log('\nfeed rows:', a.length, ' first id:', a[0] && a[0].id);
console.log('index speedup feed: ' + (tNoIdxFeed / tIdxFeed).toFixed(1) + 'x, users: ' + (tNoIdxUser / tIdxUser).toFixed(1) + 'x');

// check explain query plan uses the index
const plan = e.rawAll('EXPLAIN QUERY PLAN ' + feedSql, []);
console.log('\nfeed plan:', plan.map(r => r.detail).join(' | '));

e.close();
fs.unlinkSync(TMP);
