const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'server', 'data', 'textdb', 'main.db'), { readOnly: true });

const now = Date.now();
const days = (n) => new Date(now - n * 86400000).toISOString();

function q(sql, ...params) { return db.prepare(sql).all(...params); }

console.log('=== TEXTMOB METRICS (read-only) ===\n');

// ---------- SIGNUPS ----------
const totalUsers = q(`SELECT COUNT(*) c FROM users`)[0].c;
const byPeriod = {};
for (const [label, d] of [['24h', 1], ['7d', 7], ['30d', 30], ['90d', 90]]) {
  byPeriod[label] = q(`SELECT COUNT(*) c FROM users WHERE created_at >= ?`, days(d))[0].c;
}
const signupsByDay = q(`
  SELECT substr(created_at,1,10) day, COUNT(*) c
  FROM users WHERE created_at >= ? GROUP BY day ORDER BY day DESC LIMIT 14`, days(14));
const signupsByWeek = q(`
  SELECT strftime('%Y-W%W', created_at) week, COUNT(*) c
  FROM users WHERE created_at >= ? GROUP BY week ORDER BY week DESC LIMIT 8`, days(56));

console.log(`--- SIGNUPS ---`);
console.log(`Total users: ${totalUsers}`);
console.log(`New: last 24h=${byPeriod['24h']}  7d=${byPeriod['7d']}  30d=${byPeriod['30d']}  90d=${byPeriod['90d']}`);
console.log('Last 14 days by day:');
console.table(signupsByDay);
console.log('Last 8 weeks:');
console.table(signupsByWeek);

// ---------- POSTS & VIEWS ----------
const totalPosts = q(`SELECT COUNT(*) c FROM Posts`)[0].c;
const postsByPeriod = {};
for (const [label, d] of [['7d', 7], ['30d', 30]]) {
  postsByPeriod[label] = q(`SELECT COUNT(*) c FROM Posts WHERE created_at >= ?`, days(d))[0].c;
}
// views = JSON array of {username,time}; length = view count
const viewAgg = q(`
  SELECT COUNT(*) posts_with_views,
         SUM(json_array_length(views)) total_views,
         ROUND(AVG(json_array_length(views)),2) avg_views,
         MAX(json_array_length(views)) max_views
  FROM Posts WHERE views IS NOT NULL AND json_array_length(views) > 0`)[0];

// distinct viewers in windows
function viewers(d) {
  const rows = q(`SELECT views FROM Posts WHERE views IS NOT NULL`);
  const usernames = new Set(); let events = 0;
  const cutoff = now - d * 86400000;
  for (const r of rows) {
    let arr; try { arr = JSON.parse(r.views); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      const t = typeof v === 'string' ? NaN : Date.parse(v.time || '');
      if (!isNaN(t) && t >= cutoff) { usernames.add(v.username); events++; }
    }
  }
  return { unique: usernames.size, events };
}
const v7 = viewers(7), v30 = viewers(30);

// recent posts by day
const postsByDay = q(`
  SELECT substr(created_at,1,10) day, COUNT(*) c FROM Posts
  WHERE created_at >= ? GROUP BY day ORDER BY day DESC LIMIT 14`, days(14));

console.log(`--- POSTS & VIEWS ---`);
console.log(`Total posts: ${totalPosts} (7d=${postsByPeriod['7d']}, 30d=${postsByPeriod['30d']})`);
console.log(`Posts with >=1 view: ${viewAgg.posts_with_views}`);
console.log(`Total views recorded: ${viewAgg.total_views} | avg/post: ${viewAgg.avg_views} | max: ${viewAgg.max_views}`);
console.log(`Unique viewers last 7d: ${v7.unique} (${v7.events} view events)`);
console.log(`Unique viewers last 30d: ${v30.unique} (${v30.events} view events)`);
console.log('Last 14 days posts:');
console.table(postsByDay);

// ---------- ACTIVE USERS (from view activity + posting/liking) ----------
const viewerActivity = new Map(); // username -> last seen + count
for (const r of q(`SELECT views FROM Posts WHERE views IS NOT NULL`)) {
  let arr; try { arr = JSON.parse(r.views); } catch { continue; }
  if (!Array.isArray(arr)) continue;
  for (const v of arr) {
    if (!v || !v.username) continue;
    const t = Date.parse(v.time || '') || 0;
    const cur = viewerActivity.get(v.username) || { last: 0, n: 0 };
    cur.last = Math.max(cur.last, t); cur.n++;
    viewerActivity.set(v.username, cur);
  }
}
const activeIn = (d) => { const c = now - d * 86400000; let n = 0; for (const [, v] of viewerActivity) if (v.last >= c) n++; return n; };

// recent engagers: users who commented or liked recently (from Posts JSON)
const engagers = new Map();
for (const r of q(`SELECT likes, comments FROM Posts WHERE created_at >= ?`, days(30))) {
  for (const [col, verb] of [[r.likes, 'like'], [r.comments, 'comment']]) {
    let arr; try { arr = JSON.parse(col); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const u = typeof item === 'string' ? item : (item && (item.username || item.user));
      if (!u) continue;
      engagers.set(u, (engagers.get(u) || 0) + 1);
    }
  }
}
const engagersSet = new Set(engagers.keys());
const viewers30 = (() => { const s = new Set(); for (const [u, v] of viewerActivity) if (v.last >= now - 30 * 86400000) s.add(u); return s; })();
const posters30 = new Set(q(`SELECT DISTINCT username FROM Posts WHERE created_at >= ?`, days(30)).map(r => r.username));

const union30 = new Set([...viewers30, ...engagersSet, ...posters30]);
const union7 = (() => {
  const c = now - 7 * 86400000; const s = new Set();
  for (const [u, v] of viewerActivity) if (v.last >= c) s.add(u);
  for (const u of posters30) if (q(`SELECT 1 FROM Posts WHERE username=? AND created_at>=?`, u, days(7)).length) s.add(u);
  return s;
})();

console.log(`--- ACTIVE USERS (derived from persisted data) ---`);
console.log(`Viewed any post  7d: ${activeIn(7)} | 30d: ${activeIn(30)}`);
console.log(`Posted last 30d: ${posters30.size}`);
console.log(`Liked/commented on posts from last 30d: ${engagersSet.size}`);
console.log(`ACTIVITY (union view+post+engage)  7d: ${union7.size} | 30d: ${union30.size}`);
console.log(`Total users ever: ${totalUsers}  -> 30d active ratio: ${totalUsers ? ((union30.size / totalUsers) * 100).toFixed(1) : 0}%`);

// engagement mix
const likeCount = q(`SELECT COUNT(*) c FROM Posts WHERE likes IS NOT NULL AND json_array_length(likes) > 0`)[0].c;
const commentCount = q(`SELECT COUNT(*) c FROM Posts WHERE comments IS NOT NULL AND json_array_length(comments) > 0`)[0].c;
console.log(`\n--- ENGAGEMENT ---`);
console.log(`Posts with likes: ${likeCount} | Posts with comments: ${commentCount}`);

db.close();
