const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'server', 'data', 'textdb', 'main.db'), { readOnly: true });
const now = Date.now();

// Collect every view event: {username, t}
const events = [];
for (const r of db.prepare(`SELECT id, username AS author, views FROM Posts WHERE views IS NOT NULL`).all()) {
  let arr; try { arr = JSON.parse(r.views); } catch { continue; }
  if (!Array.isArray(arr)) continue;
  for (const v of arr) {
    if (!v || !v.username) continue;
    const t = Date.parse(v.time || '');
    if (!isNaN(t)) events.push({ user: v.username, t, post: r.id, author: r.author });
  }
}
events.sort((a, b) => a.t - b.t);

const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

// ---- Daily active viewers: distinct viewers per day ----
const dayMap = new Map(); // day -> Set(users)
for (const e of events) {
  const k = dayKey(e.t);
  if (!dayMap.has(k)) dayMap.set(k, new Set());
  dayMap.get(k).add(e.user);
}
const days = [...dayMap.keys()].sort();
const dauPerDay = days.map(d => ({ day: d, dau: dayMap.get(d).size, views: events.filter(e => dayKey(e.t) === d).length }));

// window averages
function windowStats(cutoffMs, label) {
  const slice = events.filter(e => e.t >= cutoffMs);
  if (!slice.length) return { label, avgDAU: 0, days: 0, unique: 0 };
  const daySet = new Map();
  for (const e of slice) {
    const k = dayKey(e.t);
    if (!daySet.has(k)) daySet.set(k, new Set());
    daySet.get(k).add(e.user);
  }
  let sum = 0; for (const s of daySet.values()) sum += s.size;
  const unique = new Set(slice.map(e => e.user)).size;
  const spanDays = Math.max(1, Math.ceil((now - cutoffMs) / 86400000));
  return { label, avgDAU: (sum / daySet.size).toFixed(2), activeDays: daySet.size, spanDays, unique };
}

// weekly: distinct users per ISO week bucket over last 8 weeks
const weekMap = new Map();
for (const e of events) {
  if (e.t < now - 56 * 86400000) continue;
  const d = new Date(e.t); const w = d.toISOString().slice(0, 10);
  const wkStart = new Date(d); wkStart.setUTCDate(d.getUTCDate() - d.getUTCDay());
  const k = wkStart.toISOString().slice(0, 10);
  if (!weekMap.has(k)) weekMap.set(k, new Set());
  weekMap.get(k).add(e.user);
}
const weeks = [...weekMap.keys()].sort().map(w => ({ week: w, wau: weekMap.get(w).size }));

// monthly distinct viewers, last 6 months
const monthMap = new Map();
for (const e of events) {
  const k = dayKey(e.t).slice(0, 7);
  if (!monthMap.has(k)) monthMap.set(k, new Set());
  monthMap.get(k).add(e.user);
}
const months = [...monthMap.keys()].sort().map(m => ({ month: m, mau: monthMap.get(m).size }));
const last3MAvg = months.slice(-3).reduce((a, m) => a + m.mau, 0) / Math.min(3, months.length || 1);

console.log('=== ACTIVE USERS (from post_view events in DB) ===\n');
console.log('Last 30d:', JSON.stringify(windowStats(now - 30 * 86400000, '30d')));
console.log('Last 7d :', JSON.stringify(windowStats(now - 7 * 86400000, '7d')));
console.log('Last 90d:', JSON.stringify(windowStats(now - 90 * 86400000, '90d')));
console.log('\nActive days total (ever):', days.length);
const allDAU = dauPerDay.map(d => d.dau);
console.log('AVG DAU over all active days:', (allDAU.reduce((a, b) => a + b, 0) / allDAU.length).toFixed(2), '| peak DAU:', Math.max(...allDAU));
console.log('\nDaily distinct viewers (last 21 days with activity):');
console.table(dauPerDay.slice(-21));
console.log('Weekly distinct viewers (last 8 weeks):');
console.table(weeks.slice(-8));
console.log('Monthly distinct viewers:');
console.table(months);
console.log(`AVG MAU (last 3 months): ${last3MAvg.toFixed(1)}`);
const avgWAU = weeks.slice(-4).reduce((a, w) => a + w.wau, 0) / Math.min(4, weeks.length || 1);
console.log(`AVG WAU (last 4 weeks): ${avgWAU.toFixed(1)}`);

// ---- Exact viewers ----
const perUser = new Map();
for (const e of events) {
  const u = perUser.get(e.user) || { user: e.user, views: 0, first: e.t, last: e.t, posts: new Set() };
  u.views++; u.last = Math.max(u.last, e.t); u.first = Math.min(u.first, e.t); u.posts.add(e.post);
  perUser.set(e.user, u);
}
const now7 = now - 7 * 86400000, now30 = now - 30 * 86400000;
const users = [...perUser.values()].sort((a, b) => b.last - a.last);
const c = (t) => new Date(t).toISOString().slice(0, 16).replace('T', ' ');

console.log(`\n=== EXACT VIEWERS (${users.length} total) ===`);
console.log('Active in last 7d:');
console.table(users.filter(u => u.last >= now7).map(u => ({ username: u.user, views: u.views, posts_viewed: u.posts.size, first_view: c(u.first), last_view: c(u.last) })));
console.log('Active in last 8-30d:');
console.table(users.filter(u => u.last < now7 && u.last >= now30).map(u => ({ username: u.user, views: u.views, posts_viewed: u.posts.size, last_view: c(u.last) })));
console.log('All other viewers (last active >30d ago):');
console.table(users.filter(u => u.last < now30).map(u => ({ username: u.user, views: u.views, last_view: c(u.last) })));

db.close();
