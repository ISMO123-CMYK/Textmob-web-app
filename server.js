const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const http = require("http");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const socketIo = require("socket.io");
// const NodeMediaServer = require("node-media-server");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
// const { PassThrough } = require("stream");
const path = require("path");
const fs = require("fs").promises;
const cors = require("cors");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Initialize Supabase client
const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUr = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKe = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUr, supabaseKe);

// --- Louda Integration (Hardcoded) ---
const loudaSupabaseUrl = 'https://ldepewastfyohswgtgbb.supabase.co';
const loudaSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZXBld2FzdGZ5b2hzd2d0Z2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkwOTUsImV4cCI6MjA5MDU2NTA5NX0.57USwUSsJL1ik-RwxZgcV1cJLzr3TDxcRX7xbum0Bms';
const loudaSupabase = createClient(loudaSupabaseUrl, loudaSupabaseKey);

// Hourly worker to expire verification requests
async function runVerificationCleanup() {
  console.log('[WORKER] Checking for expired verifications...');
  try {
    const now = new Date().toISOString();
    const { data: expiredRequests, error: fetchError } = await supabase
      .from('verification_requests')
      .select('user_id')
      .lt('verified_until', now)
      .eq('status', 'ACCEPTED');

    if (fetchError) throw fetchError;
    if (!expiredRequests || expiredRequests.length === 0) return;

    const { error: updateReqError } = await supabase
      .from('verification_requests')
      .update({ status: 'EXPIRED', updated_at: now })
      .lt('verified_until', now)
      .eq('status', 'ACCEPTED');

    if (updateReqError) throw updateReqError;

    const userIds = expiredRequests.map(r => r.user_id);
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ verified: false })
      .in('id', userIds);

    if (updateUserError) throw updateUserError;

    console.log(`[WORKER] Expired ${userIds.length} verifications.`);
  } catch (err) {
    console.error('[WORKER] Error cleaning verifications:', err);
  }
}

// Run once on startup
runVerificationCleanup();
// Then run every hour
setInterval(runVerificationCleanup, 60 * 60 * 1000); // 1 hour

// ffmpeg-static exports the path string directly in recent versions
ffmpeg.setFfmpegPath(ffmpegPath);
const app = express();
app.use(cors()); // Allow all origins
const server = http.createServer(app); // attach raw HTTP server
const io = socketIo(server);           // attach Socket.IO to the HTTP server
const PORT = process.env.PORT || 5000;

// Initialize Global State
const MemoryDB = require('./server/cache/MemoryDB');
const memoryDb = new MemoryDB(supabase, supabase2);
const onlineUsers = {};
const liveSessions = new Map();
const liveChunkBuffers = new Map();
const liveRooms = globalThis.__liveRooms || (globalThis.__liveRooms = new Map());
const socketJoins = globalThis.__socketJoins || (globalThis.__socketJoins = new Map());
const TMP_DIR = path.join(process.cwd(), "tmp-live");

// ---- TATU: in-memory activity tracking store ----
const tatuSessions = new Map(); // key: `${username}|${sessionStart}` -> { username, date, firstSeen, lastSeen, totalSeconds }
const tatuEvents = []; // { username, event, metadata, timestamp }
const tatuCurrentSession = {}; // username -> session key (for heartbeats)
const tatuDeviceMap = new Map(); // username -> latest device info
const tatuLocationMap = new Map(); // username -> { country, region, timezone, ip }
const TATU_MAX_EVENTS = 50000;

const TZ_COUNTRY_MAP = {
  'Africa/Lagos': 'Nigeria', 'Africa/Accra': 'Ghana', 'Africa/Nairobi': 'Kenya',
  'Africa/Cairo': 'Egypt', 'Africa/Johannesburg': 'South Africa', 'Africa/Casablanca': 'Morocco',
  'Africa/Algiers': 'Algeria', 'Africa/Tunis': 'Tunisia', 'Africa/Khartoum': 'Sudan',
  'Africa/Addis_Ababa': 'Ethiopia', 'Africa/Dar_es_Salaam': 'Tanzania', 'Africa/Dakar': 'Senegal',
  'America/New_York': 'United States', 'America/Chicago': 'United States', 'America/Denver': 'United States',
  'America/Los_Angeles': 'United States', 'America/Phoenix': 'United States', 'America/Anchorage': 'United States',
  'America/Toronto': 'Canada', 'America/Vancouver': 'Canada', 'America/Montreal': 'Canada',
  'America/Mexico_City': 'Mexico', 'America/Sao_Paulo': 'Brazil', 'America/Buenos_Aires': 'Argentina',
  'America/Bogota': 'Colombia', 'America/Santiago': 'Chile', 'America/Lima': 'Peru',
  'Europe/London': 'United Kingdom', 'Europe/Paris': 'France', 'Europe/Berlin': 'Germany',
  'Europe/Madrid': 'Spain', 'Europe/Rome': 'Italy', 'Europe/Amsterdam': 'Netherlands',
  'Europe/Brussels': 'Belgium', 'Europe/Stockholm': 'Sweden', 'Europe/Oslo': 'Norway',
  'Europe/Copenhagen': 'Denmark', 'Europe/Zurich': 'Switzerland', 'Europe/Moscow': 'Russia',
  'Europe/Istanbul': 'Turkey', 'Europe/Athens': 'Greece', 'Europe/Lisbon': 'Portugal',
  'Europe/Dublin': 'Ireland', 'Europe/Warsaw': 'Poland', 'Europe/Prague': 'Czech Republic',
  'Europe/Kyiv': 'Ukraine', 'Europe/Bucharest': 'Romania', 'Europe/Vienna': 'Austria',
  'Europe/Budapest': 'Hungary', 'Europe/Helsinki': 'Finland',
  'Asia/Tokyo': 'Japan', 'Asia/Shanghai': 'China', 'Asia/Beijing': 'China',
  'Asia/Hong_Kong': 'Hong Kong', 'Asia/Seoul': 'South Korea', 'Asia/Kolkata': 'India',
  'Asia/Mumbai': 'India', 'Asia/Delhi': 'India', 'Asia/Bangkok': 'Thailand',
  'Asia/Singapore': 'Singapore', 'Asia/Kuala_Lumpur': 'Malaysia', 'Asia/Jakarta': 'Indonesia',
  'Asia/Manila': 'Philippines', 'Asia/Ho_Chi_Minh': 'Vietnam', 'Asia/Taipei': 'Taiwan',
  'Asia/Dubai': 'UAE', 'Asia/Riyadh': 'Saudi Arabia', 'Asia/Tehran': 'Iran',
  'Asia/Baghdad': 'Iraq', 'Asia/Tel_Aviv': 'Israel', 'Asia/Beirut': 'Lebanon',
  'Asia/Amman': 'Jordan', 'Asia/Kuwait': 'Kuwait', 'Asia/Doha': 'Qatar',
  'Asia/Muscat': 'Oman', 'Asia/Bahrain': 'Bahrain',
  'Australia/Sydney': 'Australia', 'Australia/Melbourne': 'Australia', 'Australia/Perth': 'Australia',
  'Australia/Brisbane': 'Australia', 'Australia/Adelaide': 'Australia',
  'Pacific/Auckland': 'New Zealand', 'Pacific/Honolulu': 'United States',
  'UTC': 'Unknown', 'GMT': 'United Kingdom'
};

function inferLocation(tz) {
  if (!tz) return { country: 'Unknown', timezone: tz || 'Unknown' };
  const country = TZ_COUNTRY_MAP[tz] || 'Other';
  const region = tz.split('/')[1]?.replace(/_/g, ' ') || '';
  return { country, region, timezone: tz };
}

let tatuSessionSeq = 0;
const tatuPageViewCounts = {}; // path -> count

function tatuPageView(path) {
  const clean = path.split('?')[0].split('#')[0] || '/';
  tatuPageViewCounts[clean] = (tatuPageViewCounts[clean] || 0) + 1;
}

app.post("/tatu", express.json(), (req, res) => {
  try {
    const { username, event, metadata } = req.body || {};
    if (!event) return res.status(400).json({ error: "event is required" });

    const now = new Date();
    const ts = now.toISOString();

    if (username) {
      if (event === "app_open") {
        const key = `${username}|${++tatuSessionSeq}|${now.getTime()}`;
        tatuSessions.set(key, { username, date: ts.slice(0, 10), firstSeen: ts, lastSeen: ts, totalSeconds: 0, sessionId: key });
        tatuCurrentSession[username] = key;
        if (metadata?.device) {
          tatuDeviceMap.set(username, metadata.device);
          tatuLocationMap.set(username, {
            ...inferLocation(metadata.device.timezone),
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unknown'
          });
        }
        if (metadata?.path) tatuPageView(metadata.path);
      } else if (event === "page_view" && metadata?.path) {
        tatuPageView(metadata.path);
      } else if (event === "heartbeat" && tatuCurrentSession[username]) {
        const s = tatuSessions.get(tatuCurrentSession[username]);
        if (s) s.lastSeen = ts;
      } else if (event === "app_close" && tatuCurrentSession[username]) {
        const s = tatuSessions.get(tatuCurrentSession[username]);
        if (s) {
          s.lastSeen = ts;
          if (metadata?.elapsedSeconds) s.totalSeconds += Math.floor(metadata.elapsedSeconds);
        }
        delete tatuCurrentSession[username];
      }
    }

    tatuEvents.push({ username: username || null, event, metadata: metadata || {}, timestamp: ts });
    if (tatuEvents.length > TATU_MAX_EVENTS) tatuEvents.splice(0, tatuEvents.length - Math.floor(TATU_MAX_EVENTS / 2));

    res.json({ ok: true });
  } catch (e) {
    console.error("/tatu error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /tatu — HTML dashboard or ?json=1 for raw data
app.get("/tatu", (req, res) => {
  const nowMs = Date.now();
  let dau = 0, wau = 0, mau = 0;
  const todaysUsers = new Set();

  // Aggregate per-user stats from sessions
  const userStats = {};
  const todaysSessions = [];
  let totalSessionsAll = 0;

  for (const s of tatuSessions.values()) {
    totalSessionsAll++;
    const lastMs = new Date(s.lastSeen).getTime();
    const dayDiff = (nowMs - lastMs) / 86400000;
    if (dayDiff < 1) { dau++; todaysUsers.add(s.username); }
    if (dayDiff < 7) wau++;
    if (dayDiff < 30) mau++;

    if (!userStats[s.username]) userStats[s.username] = { sessions: 0, totalSeconds: 0, firstSeen: s.firstSeen, lastSeen: s.lastSeen };
    userStats[s.username].sessions++;
    userStats[s.username].totalSeconds += s.totalSeconds || 0;
    if (s.firstSeen < userStats[s.username].firstSeen) userStats[s.username].firstSeen = s.firstSeen;
    if (s.lastSeen > userStats[s.username].lastSeen) userStats[s.username].lastSeen = s.lastSeen;

    // Add ongoing session's live time
    if (tatuCurrentSession[s.username] === s.sessionId) {
      const liveSec = Math.floor((nowMs - new Date(s.firstSeen).getTime()) / 1000);
      userStats[s.username].totalSeconds += liveSec - s.totalSeconds;
    }

    if (s.date === new Date().toISOString().slice(0, 10)) todaysSessions.push(s);
  }

  // Page view stats (from tracked count)
  const topPaths = Object.entries(tatuPageViewCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Device breakdown
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const browserCounts = {};
  const osCounts = {};
  tatuDeviceMap.forEach(d => {
    if (d.deviceType) deviceCounts[d.deviceType] = (deviceCounts[d.deviceType] || 0) + 1;
    if (d.browser) browserCounts[d.browser] = (browserCounts[d.browser] || 0) + 1;
    if (d.os) osCounts[d.os] = (osCounts[d.os] || 0) + 1;
  });

  // Location breakdown
  const locationCounts = {};
  tatuLocationMap.forEach(l => {
    const c = l.country || 'Unknown';
    locationCounts[c] = (locationCounts[c] || 0) + 1;
  });
  const topLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Engagement stats
  const engagementStats = { likes: 0, comments: 0, poll_votes: 0, post_views: 0, post_creates: 0, follows: 0 };
  tatuEvents.forEach(e => {
    if (e.event === 'post_like') engagementStats.likes++;
    else if (e.event === 'post_comment') engagementStats.comments++;
    else if (e.event === 'poll_vote') engagementStats.poll_votes++;
    else if (e.event === 'post_view') engagementStats.post_views++;
    else if (e.event === 'post_create') engagementStats.post_creates++;
    else if (e.event === 'follow') engagementStats.follows++;
  });

  if (req.query.json) {
    return res.json({
      dau, wau, mau, activeUsers: [...todaysUsers], totalEvents: tatuEvents.length,
      totalSessions: totalSessionsAll, userStats, recentEvents: tatuEvents.slice(-50).reverse(),
      topPaths, devices: deviceCounts, browsers: browserCounts, os: osCounts,
      locations: topLocations, engagement: engagementStats
    });
  }

  function fmtTime(iso) { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function fmtDuration(sec) {
    if (!sec || sec < 0) return '0s';
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = Math.floor(sec % 60);
    return (h ? h + 'h ' : '') + (m ? m + 'm ' : '') + s + 's';
  }

  // Build per-user sessions list (sessions nested under user)
  const usersSorted = Object.entries(userStats).sort((a, b) => b[1].totalSeconds - a[1].totalSeconds);

  let usersHtml = '';
  for (const [uname, stats] of usersSorted) {
    const dev = tatuDeviceMap.get(uname);
    const loc = tatuLocationMap.get(uname);
    const userSessions = [...tatuSessions.values()].filter(s => s.username === uname).sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen));
    const userEvents = tatuEvents.filter(e => e.username === uname);
    const userPageViews = userEvents.filter(e => e.event === 'page_view');
    const pageViewCount = userPageViews.length;

    let sessionsHtml = '';
    for (const s of userSessions) {
      const live = tatuCurrentSession[uname] === s.sessionId;
      const dur = live ? Math.floor((nowMs - new Date(s.firstSeen).getTime()) / 1000) : s.totalSeconds;
      const sessionEvents = userEvents.filter(e => {
        const et = new Date(e.timestamp).getTime();
        const st = new Date(s.firstSeen).getTime();
        const end = new Date(s.lastSeen).getTime();
        return et >= st && et <= end + 60000;
      });

      let evtsHtml = '';
      for (const e of sessionEvents) {
        const meta = e.metadata && Object.keys(e.metadata).length ? JSON.stringify(e.metadata).slice(0, 100) : '';
        evtsHtml += `<div class="evt-row">
          <span class="evt-time">${fmtTime(e.timestamp)}</span>
          <span class="tag tag-${e.event}">${e.event}</span>
          <span class="evt-meta">${meta}</span>
        </div>`;
      }

      sessionsHtml += `<details class="session-details">
        <summary class="session-summary">
          <span>${fmtTime(s.firstSeen)}</span>
          <span class="dur">${fmtDuration(dur)}</span>
          ${live ? '<span class="live-dot"></span>' : ''}
          <span class="evt-count">${sessionEvents.length} events</span>
        </summary>
        <div class="session-events">
          ${evtsHtml || '<div class="empty">No events in this session</div>'}
        </div>
      </details>`;
    }

    const isLive = !!tatuCurrentSession[uname];
    const totalDur = fmtDuration(stats.totalSeconds);
    const deviceStr = dev ? `${dev.deviceType || '—'} · ${dev.browser || '—'} · ${dev.os || '—'}` : '—';
    const modelStr = dev?.model || '—';
    const screenStr = dev?.screen || '—';
    const locStr = loc ? `${loc.country}${loc.region ? ', ' + loc.region : ''}` : '—';

    usersHtml += `<details class="user-card">
      <summary class="user-summary">
        <span class="user-name">@${uname} ${isLive ? '<span class="live-dot"></span>' : ''}</span>
        <span class="user-stat">${stats.sessions} sessions</span>
        <span class="user-stat">${totalDur}</span>
        <span class="user-stat">${pageViewCount} pages</span>
      </summary>
      <div class="user-details">
        <div class="info-grid">
          <div><span class="il">Device</span><span class="iv">${deviceStr}</span></div>
          <div><span class="il">Model</span><span class="iv">${modelStr}</span></div>
          <div><span class="il">Screen</span><span class="iv">${screenStr}</span></div>
          <div><span class="il">Location</span><span class="iv">${locStr}</span></div>
        </div>
        <div class="session-list">
          ${sessionsHtml}
        </div>
      </div>
    </details>`;
  }
  if (!usersHtml) usersHtml = '<div class="empty">No users yet</div>';

  const pathHtml = topPaths.map(([p, c]) => {
    const label = p === '/' ? 'Home' : p.replace('/snaps', 'Snaps').replace('/activity', 'Activity').replace('/connections', 'Connections').replace('/wallet', 'Wallet').replace('/menu', 'Menu').replace('/make-post', 'Post').replace('/@', 'Profile');
    return `<div class="path-row"><span>${label}</span><span class="num">${c}</span></div>`;
  }).join('') || '<div class="empty">No page views yet</div>';

  const devHtml = Object.entries(deviceCounts).filter(([, c]) => c > 0).map(([k, c]) =>
    `<span class="chip">${k}: ${c}</span>`
  ).join('') || '<span class="chip">—</span>';
  const browserHtml = Object.entries(browserCounts).filter(([, c]) => c > 0).map(([k, c]) =>
    `<span class="chip">${k}: ${c}</span>`
  ).join('') || '';
  const osHtml = Object.entries(osCounts).filter(([, c]) => c > 0).map(([k, c]) =>
    `<span class="chip">${k}: ${c}</span>`
  ).join('') || '';
  const locHtml = topLocations.map(([c, n]) =>
    `<span class="chip">${c}: ${n}</span>`
  ).join('') || '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tatu</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0f0f13; color:#e4e4e7; font-size:14px; }
  .wrap { max-width:640px; margin:0 auto; padding:12px; }
  .header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px; margin-bottom:16px; }
  .header h1 { font-size:22px; font-weight:700; }
  .header .sub { color:#52525b; font-size:11px; }
  .cards { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
  .card { background:#18181f; border-radius:10px; padding:10px 14px; flex:1; min-width:70px; border:1px solid #27272a; }
  .card .n { font-size:22px; font-weight:700; color:#60a5fa; line-height:1.2; }
  .card .l { font-size:10px; color:#71717a; text-transform:uppercase; letter-spacing:.3px; margin-top:2px; }
  .chips { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px; }
  .chip { background:#18181f; border:1px solid #27272a; border-radius:20px; padding:3px 10px; font-size:11px; color:#a1a1aa; }
  .eng-row { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
  .eng-item { background:#18181f; border-radius:8px; padding:8px 12px; flex:1; min-width:60px; border:1px solid #1f1f28; text-align:center; }
  .eng-item .n { font-size:18px; font-weight:700; color:#60a5fa; }
  .eng-item .l { font-size:10px; color:#71717a; }
  .path-row { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#18181f; border-radius:6px; margin-bottom:3px; font-size:13px; border:1px solid #1f1f28; }
  .path-row .num { color:#60a5fa; font-weight:600; }

  /* User card (collapsible) */
  .user-card { margin-bottom:8px; border-radius:10px; border:1px solid #27272a; background:#18181f; overflow:hidden; }
  .user-summary { display:flex; align-items:center; gap:10px; padding:10px 12px; cursor:pointer; list-style:none; font-size:13px; }
  .user-summary::-webkit-details-marker { display:none; }
  .user-summary::before { content:'▶'; color:#52525b; font-size:10px; transition:transform .15s; }
  details[open] > .user-summary::before { transform:rotate(90deg); }
  .user-name { font-weight:600; min-width:80px; display:flex; align-items:center; gap:4px; }
  .user-stat { color:#71717a; font-size:11px; }
  .user-details { border-top:1px solid #27272a; padding:10px 12px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px; }
  .info-grid > div { display:flex; gap:4px; }
  .il { color:#52525b; font-size:11px; min-width:48px; }
  .iv { color:#d4d4d8; font-size:11px; }

  /* Session (collapsible inside user) */
  .session-list { display:flex; flex-direction:column; gap:4px; }
  .session-details { border-radius:6px; border:1px solid #1f1f28; background:#14141c; overflow:hidden; }
  .session-summary { display:flex; align-items:center; gap:8px; padding:7px 10px; cursor:pointer; list-style:none; font-size:12px; }
  .session-summary::-webkit-details-marker { display:none; }
  .session-summary::before { content:'▸'; color:#52525b; font-size:10px; transition:transform .15s; }
  details[open] > .session-summary::before { transform:rotate(90deg); }
  .session-summary .dur { color:#a1a1aa; min-width:50px; }
  .session-summary .evt-count { color:#52525b; font-size:10px; margin-left:auto; }
  .session-events { border-top:1px solid #1f1f28; padding:4px 0; }
  .live-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#22c55e; animation:pulse 1.5s infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

  /* Event rows */
  .evt-row { display:flex; align-items:center; gap:6px; padding:4px 10px; font-size:11px; border-bottom:1px solid #15151e; }
  .evt-row:last-child { border-bottom:none; }
  .evt-time { color:#52525b; min-width:40px; font-size:10px; }
  .tag { padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; white-space:nowrap; }
  .tag-app_open { background:#064e3b; color:#6ee7b7; }
  .tag-app_close { background:#451a03; color:#fdba74; }
  .tag-heartbeat { background:#1e3a5f; color:#93c5fd; }
  .tag-page_view { background:#3b0764; color:#d8b4fe; }
  .tag-scroll_depth { background:#1c1917; color:#a8a29e; }
  .tag-post_view { background:#064e3b; color:#6ee7b7; }
  .tag-post_like { background:#4c0519; color:#fda4af; }
  .tag-post_comment { background:#14532d; color:#86efac; }
  .tag-post_react { background:#4a044e; color:#d8b4fe; }
  .tag-poll_vote { background:#1e3a5f; color:#93c5fd; }
  .tag-post_create { background:#451a03; color:#fdba74; }
  .tag-follow { background:#0f766e; color:#5eead4; }
  .tag-profile_view { background:#1c1917; color:#a8a29e; }
  .tag-snap_view { background:#3b0764; color:#e9d5ff; }
  .evt-meta { color:#3f3f46; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-align:right; max-width:140px; }
  .empty { text-align:center; color:#3f3f46; padding:12px; font-size:12px; }
  .footer { text-align:center; color:#27272a; font-size:10px; margin-top:20px; padding-bottom:16px; }
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Tatu</h1>
    <div class="sub">${tatuEvents.length} events · ${totalSessionsAll} sessions · ${tatuDeviceMap.size} users</div>
  </div>

  <div class="cards">
    <div class="card"><div class="n">${dau}</div><div class="l">Active today</div></div>
    <div class="card"><div class="n">${wau}</div><div class="l">This week</div></div>
    <div class="card"><div class="n">${mau}</div><div class="l">This month</div></div>
  </div>

  <div class="chips">
    <span class="chip">Devices: ${Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 0}</span>
    ${devHtml}${browserHtml}${osHtml}${locHtml}
  </div>

  <div class="eng-row">
    <div class="eng-item"><div class="n">${engagementStats.post_views}</div><div class="l">Post views</div></div>
    <div class="eng-item"><div class="n">${engagementStats.likes}</div><div class="l">Likes</div></div>
    <div class="eng-item"><div class="n">${engagementStats.comments + engagementStats.poll_votes}</div><div class="l">Comments</div></div>
    <div class="eng-item"><div class="n">${engagementStats.follows}</div><div class="l">Follows</div></div>
  </div>

  <div class="section-title" style="font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.4px;margin:14px 0 8px;">Top pages</div>
  <div style="margin-bottom:12px;">${pathHtml}</div>

  <div class="section-title" style="font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.4px;margin:14px 0 8px;">Users</div>
  ${usersHtml}

  <p class="footer">Tatu · data resets on restart · refreshes every 10s</p>
</div>
<script>setTimeout(function(){ location.reload(); }, 10000);</script>
</body></html>`;
  res.set('Content-Type', 'text/html');
  res.send(html);
});

app.get('/api/louda-unread', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });

    // 1. Find the Textmob user's profile to get their phone number
    const { data: tmUser } = await supabase
      .from('users')
      .select('phone')
      .eq('username', username)
      .single();

    const tmPhone = tmUser?.phone;

    // 2. Find the user on Louda
    // First, try by exact username
    let { data: loudaUser } = await loudaSupabase
      .from('users')
      .select('id, contacts, username, phone')
      .eq('username', username)
      .maybeSingle();

    // If not found by username, try by phone
    if (!loudaUser && tmPhone) {
      const raw = tmPhone.replace(/[\s\-\(\)\+]+/g, '');
      const formats = [tmPhone];
      if (raw.startsWith('234')) formats.push('0' + raw.slice(3));
      if (raw.startsWith('0')) formats.push('+234' + raw.slice(1));

      const { data: loudaByPhone } = await loudaSupabase
        .from('users')
        .select('id, contacts, username, phone')
        .or(`phone.in.(${formats.map(f => `"${f}"`).join(',')})`)
        .maybeSingle();

      if (loudaByPhone) {
        loudaUser = loudaByPhone;
        // Found on Louda by phone! Update their Louda username to match Textmob
        if (loudaUser.username !== username) {
          console.log(`[SYNC] Updating Louda user ${loudaUser.id} username from ${loudaUser.username} to ${username}`);
          await loudaSupabase
            .from('users')
            .update({ username: username })
            .eq('id', loudaUser.id);
          loudaUser.username = username;
        }
      }
    }

    if (!loudaUser) {
      return res.json({ unreadCount: 0 });
    }

    // If found by username but phone matches and username was different (edge case)
    if (loudaUser.username !== username && tmPhone && loudaUser.phone === tmPhone) {
      console.log(`[SYNC] Updating Louda user ${loudaUser.id} username from ${loudaUser.username} to ${username}`);
      await loudaSupabase
        .from('users')
        .update({ username: username })
        .eq('id', loudaUser.id);
    }

    return await calculateUnread(loudaUser, res);

  } catch (err) {
    console.error('Louda unread error:', err);
    res.status(500).json({ unreadCount: 0 });
  }
});

async function calculateUnread(loudaUser, res) {
  const loudaUserId = loudaUser.id;
  let totalUnread = 0;

  // 1. Sum unread counts from contacts (1-on-1 chats)
  if (loudaUser.contacts && Array.isArray(loudaUser.contacts)) {
    loudaUser.contacts.forEach(c => {
      totalUnread += (c.unread_count || 0);
    });
  }

  // 2. Count unread messages from groups
  const { data: groups, error: groupsErr } = await loudaSupabase
    .from('groups')
    .select('messages')
    .contains('members_ids', [loudaUserId]);

  if (!groupsErr && groups) {
    groups.forEach(g => {
      if (g.messages && Array.isArray(g.messages)) {
        const unreadInGroup = g.messages.filter(m => {
          const isFromMe = String(m.from) === String(loudaUserId);
          if (isFromMe) return false;
          const readBy = m.read_by || [];
          const hasRead = readBy.some(r => (typeof r === 'object' ? r.userId : r) === String(loudaUserId));
          return !hasRead;
        }).length;
        totalUnread += unreadInGroup;
      }
    });
  }

  return res.json({ unreadCount: totalUnread });
}
// --- Live buffer settings ---
const CHUNK_MS = 250;
const LIVE_WINDOW_SECS = 60; // larger window = more history for stable playback
const LIVE_WINDOW_MS = LIVE_WINDOW_SECS * 1000;

function createLiveSessionState() {
  return {
    initChunk: null,          // first WebM header/init chunk
    mediaChunks: [],          // { ts, data }
    activeStreams: new Set(),
    lastSeenAt: Date.now()
  };
}

function getLiveSessionState(postId) {
  if (!liveSessions.has(postId)) {
    liveSessions.set(postId, createLiveSessionState());
  }
  if (!liveChunkBuffers.has(postId)) {
    liveChunkBuffers.set(postId, createLiveSessionState());
  }

  const session = liveSessions.get(postId);
  const bufferState = liveChunkBuffers.get(postId);

  // keep both maps in sync if you still reference both elsewhere
  if (!session.initChunk && bufferState.initChunk) session.initChunk = bufferState.initChunk;
  if (session.mediaChunks.length === 0 && bufferState.mediaChunks.length > 0) {
    session.mediaChunks = bufferState.mediaChunks.slice();
  }

  return session;
}

function trimLiveMedia(state) {
  const cutoff = Date.now() - LIVE_WINDOW_MS;
  state.mediaChunks = state.mediaChunks.filter(c => c.ts >= cutoff);
}

function pushLiveChunk(postId, chunk) {
  if (!chunk || chunk.length === 0) return;

  const state = getLiveSessionState(postId);
  const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

  state.lastSeenAt = Date.now();

  // First chunk becomes the init/header chunk.
  // If the stream restarts, you can reset this explicitly from your encoder logic.
  if (!state.initChunk) {
    state.initChunk = buf;
    liveChunkBuffers.set(postId, state);
    return;
  }

  state.mediaChunks.push({
    ts: Date.now(),
    data: buf
  });

  trimLiveMedia(state);
  liveChunkBuffers.set(postId, state);
}

function cleanupDeadStream(state, res) {
  try {
    state.activeStreams.delete(res);
  } catch { }
  try {
    res.end();
  } catch { }
}

app.post(
  "/api/live-chunk-upload/:postId",
  express.raw({ type: "*/*", limit: "100mb" }),
  (req, res) => {
    try {
      const { postId } = req.params;
      const chunk = req.body;

      if (!chunk || chunk.length === 0) {
        return res.status(400).json({ error: "Empty chunk" });
      }

      pushLiveChunk(postId, chunk);

      const state = getLiveSessionState(postId);

      // Push the chunk to connected viewers
      for (const clientRes of [...state.activeStreams]) {
        try {
          clientRes.write(chunk);
        } catch (e) {
          cleanupDeadStream(state, clientRes);
        }
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("live-chunk-upload error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/api/live-stream/:postId", (req, res) => {
  try {
    const { postId } = req.params;
    const state = liveSessions.get(postId) || liveChunkBuffers.get(postId);

    if (!state || !state.initChunk) {
      return res.status(404).json({ error: "Live session not found" });
    }

    res.writeHead(200, {
      "Content-Type": "video/webm",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*"
    });

    // Send init/header first
    res.write(state.initChunk);

    // Keep only the near-latest tail
    trimLiveMedia(state);

    for (const item of state.mediaChunks) {
      try {
        res.write(item.data);
      } catch (e) {
        // ignore write failure on initial burst; cleanup happens below
      }
    }

    state.activeStreams.add(res);

    const cleanup = () => cleanupDeadStream(state, res);

    req.on("close", cleanup);
    req.on("aborted", cleanup);
    res.on("close", cleanup);
    res.on("error", cleanup);
  } catch (err) {
    console.error("live-stream error:", err);
    try {
      res.status(500).json({ error: err.message });
    } catch { }
  }
});
// Optional: endpoint to check stream health / metadata
app.get("/api/live-info/:postId", (req, res) => {
  try {
    const { postId } = req.params;
    const state = liveSessions.get(postId);
    if (!state) return res.status(404).json({ error: "Not found" });

    res.json({
      ok: true,
      hasInit: state.initChunks.length > 0,
      initCount: state.initChunks.length,
      mediaChunkCount: state.mediaChunks.length,
      viewerCount: state.activeStreams.size,
      lastSeenAt: state.lastSeenAt,
      windowSecs: LIVE_WINDOW_SECS
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const authorMobcoinsCache = new Map();

// Duplicated imports removed

// ── Disabled User Guard ──────────────────────────────────────────────────────
async function isUserDisabled(username) {
  if (!username) return true;
  const { data: user } = await supabase
    .from("users")
    .select("disabled")
    .eq("username", username)
    .maybeSingle();
  // disabled is TEXT in DB: "true" or "false"
  return user ? String(user.disabled) === "true" : true;
}

// ── Disabled Guard Middleware ────────────────────────────────────────────────
async function guardDisabled(req, res, next) {
  const username = req.body?.username || req.body?.currentUsername || req.query?.username;
  if (username && await isUserDisabled(username)) {
    return res.status(403).json({ error: "Account disabled. Cannot perform actions." });
  }
  next();
}

// --- HLS Proxy Middleware ---
// Redirects HLS requests from Express (port 5000) to NMS (port 8000)
app.get("/live/:postId/:file", async (req, res) => {
  try {
    const { postId, file } = req.params;
    const nmsUrl = `http://localhost:8000/live/${postId}/${file}`;

    const response = await axios({
      method: 'get',
      url: nmsUrl,
      responseType: 'stream'
    });

    res.set(response.headers);
    response.data.pipe(res);
  } catch (err) {
    res.status(404).send("HLS Segment not found");
  }
});

// Array of domains to ping
const domains = [
  'https://textmob-web-app.onrender.com',
  'https://louda-back-end.onrender.com',
  'https://astrasearch-r1re.onrender.com',
  'https://mylex.onrender.com',
  'https://textmob-provider-api-99ii.onrender.com'
];

// Function to ping domains
const pingDomains = async () => {
  console.log(`\n--- Pinging domains at ${new Date().toLocaleTimeString()} ---`);

  for (const domain of domains) {
    try {
      const response = await fetch(domain, {
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });

      console.log(`✅ ${domain} - Status: ${response.status} (${response.statusText})`);
    } catch (error) {
      console.error(`❌ ${domain} - Error: ${error.message}`);
    }
  }
};

// Run the pinger every minute
setInterval(pingDomains, 60000); // 60,000 milliseconds = 1 minute

// Initial run immediately
pingDomains();
const pingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
const url = 'https://textmob-provider-api.onrender.com'; // Replace with your app URL
// mailer.js
const nodemailer = require("nodemailer");

// Create transporter using environment variables (set these on Render)
// SMTP_USER: e.g. sharpbrainspublishers@gmail.com
// SMTP_PASS: e.g. Gmail App Password (recommended) or SMTP password
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "sharpbrainspublishers@gmail.com",
    pass: process.env.SMTP_PASS || "vgbp mkny nruf xtfs"
  }
});

// Optional: verify transporter at startup (won't crash app; only logs)
transporter.verify().then(() => {
  console.log("✔️ Mailer ready");
}).catch(err => {
  console.warn("⚠️ Mailer verify failed (will still attempt sends):", err && err.message ? err.message : err);
});

/**
 * Fire-and-forget email sender.
 * Does NOT await transporter.sendMail — caller will not be delayed.
 *
 * @param {string} to - recipient email address (or comma-separated list)
 * @param {string} subject - email subject
 * @param {string} message - main message HTML/text (we inject into template)
 */
// ── NOTIFICATION PREFERENCES ────────────────────────────────────────────────
const DEFAULT_NOTIFICATION_PREFS = {
  likes: { inApp: true, email: true },
  comments: { inApp: true, email: true },
  mentions: { inApp: true, email: true },
  followers: { inApp: true, email: true },
  newPost: { inApp: true, email: false }, // default email off to avoid spam
  messages: { inApp: true, email: true },
  mobcoins: { inApp: true, email: true },
  events: { inApp: true, email: true }
};

/**
 * Universal notification trigger that respects user preferences.
 * @param {string} recipient - target username
 * @param {string} type - 'likes', 'comments', 'newPost', etc.
 * @param {object} options - { msg, link, subject, html }
 */
async function triggerNotification(recipient, type, options = {}) {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("email, notification_prefs, fullname")
      .eq("username", recipient)
      .single();

    if (error || !user) return;

    const prefs = user.notification_prefs || DEFAULT_NOTIFICATION_PREFS;
    const typePrefs = prefs[type] || DEFAULT_NOTIFICATION_PREFS[type] || { inApp: true, email: true };

    // 1. In-App Notification
    if (typePrefs.inApp && options.msg) {
      await addNotification(recipient, {
        id: Date.now() + Math.random(),
        message: options.msg,
        read: false,
        link: options.link || "/",
        timestamp: new Date().toISOString(),
        type: type,
        sender: options.sender,
        senderPic: options.senderPic,
      });
    }

    // 2. Email Notification
    if (typePrefs.email && user.email && options.subject && options.html) {
      sendNotificationEmail(user.email, options.subject, options.html);
    }
  } catch (err) {
    console.error(`[triggerNotification] failed for ${recipient}/${type}:`, err);
  }
}

function sendNotificationEmail(to, subject, message) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Textmob</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td align="center" style="padding:32px 24px 8px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.3px;">textmob</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;font-size:15px;line-height:1.6;color:#0f172a;">
              ${message}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#2563eb;border-radius:8px;">
                    <a href="https://textmob.web.app" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Open Textmob</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 32px;font-size:12px;color:#9ca3af;line-height:1.5;">
              <a href="https://textmob.web.app/settings/notifications" style="color:#2563eb;text-decoration:none;font-weight:500;">Notification Settings</a>
              <span style="color:#d1d5db;margin:0 8px;">|</span>
              Textmob &middot; Lagos, Nigeria<br>
              &copy; 2026 Textmob. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: `"Textmob" <${process.env.SMTP_USER || "sharpbrainspublishers@gmail.com"}>`,
    to: to,
    subject: subject,
    html: html
  };

  // Fire-and-forget: we don't await this promise. We handle success/error in then/catch.
  transporter.sendMail(mailOptions)
    .then(info => {
      console.log("✅ Email queued/sent to", to, "messageId:", info && info.messageId ? info.messageId : "(no id)");
    })
    .catch(err => {
      // Log but do not throw — caller won't be affected
      console.error("⚠️ Failed to send email to", to, ":", err && err.message ? err.message : err);
    });
}

setInterval(async () => {
  try {
    await fetch(url);
    console.log('Pinged app to keep it awake.');
  } catch (error) {
    console.error('Error pinging app:', error);
  }
}, pingInterval);

cloudinary.config({
  cloud_name: 'dzvm9xe1i',
  api_key: '145943618557148',
  api_secret: '48g6aAx6fyU5JdRdhqkQgiBJ7zc',
});

app.use(express.json());
async function updateMobcoins(userId, amount, notify = true, reason = "Mobcoin update", link = "/wallet", extraMsg = "") {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("mobcoins, email, fullname, username")
    .eq("username", userId)
    .single();

  if (userErr || !user) throw new Error("User not found");

  const newBalance = (user.mobcoins || 0) + amount;

  const { error: updateErr } = await supabase
    .from("users")
    .update({ mobcoins: newBalance })
    .eq("username", userId);

  if (updateErr) throw new Error("Failed to update Mobcoins");

  if (notify) {
    const message =
      amount > 0
        ? `You received ${amount} Mobcoins.`
        : `You spent ${Math.abs(amount)} Mobcoins.`;

    triggerNotification(userId, 'mobcoins', {
      msg: extraMsg || `${message} (${reason})`,
      link: link,
      subject: "Mobcoin Activity",
      html: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi <strong>${user.fullname || user.username}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">There has been an update to your Mobcoin balance:</p>
          <p style="margin:0 0 16px;padding:12px 16px;background-color:#f8fafc;border-radius:8px;font-size:14px;line-height:1.6;color:#0f172a;">${extraMsg || message}</p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;"><em>Reason:</em> ${reason}</p>
          `
    });
  }

  return newBalance;
}
// Multer config: limit size and only accept images/videos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'newindex.html'))
})

// In-memory array to store reset codes
const resetCodes = [];

// Function to clean expired codes
const cleanExpiredCodes = () => {
  const now = Date.now();
  resetCodes.length = resetCodes.filter(code => code.expiresAt > now).length;
};

// --- TURN Server Credentials (Metered.live) ---
// Verify if user exists in database
app.get("/api/verify-user", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("[VERIFY-USER ERROR]", error);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ exists: !!user });
  } catch (err) {
    console.error("[VERIFY-USER CRITICAL ERROR]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/check-disabled", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("disabled")
      .eq("username", username)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "Database error" });
    if (!user) return res.json({ disabled: false });

    res.json({ disabled: String(user.disabled) === "true" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login Endpoint (Modified to include phone)
app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Identifier: "${identifier}"`);

    if (!identifier || !password) {
      console.warn("[LOGIN FAILED] Missing credentials");
      return res.status(400).json({ error: "Identifier and password are required" });
    }

    const cleanId = identifier.trim();

    // Use ilike for case-insensitive matching on username and email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .or(`username.ilike.${cleanId},fullname.ilike.${cleanId},email.ilike.${cleanId},phone.ilike.${cleanId}`)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("[LOGIN ERROR] Supabase error:", userError);
      return res.status(500).json({ error: "Database error" });
    }

    if (!user) {
      console.warn(`[LOGIN FAILED] User not found for identifier: "${cleanId}"`);
      return res.status(400).json({ error: "Invalid identifier or password" });
    }

    if (user.password !== password) {
      console.warn(`[LOGIN FAILED] Password mismatch for user: "${user.username}"`);
      return res.status(400).json({ error: "Invalid identifier or password" });
    }

    console.log(`[LOGIN SUCCESS] User: "${user.username}"`);

    Promise.resolve(
      sendNotificationEmail(
        user.email,
        "New Login Detected on Textmob",
        `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi <strong>${user.fullname || user.username}</strong>,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">We noticed a new login to your Textmob account.</p>
      <p style="margin:0;padding:16px;background-color:#f8fafc;border-radius:8px;font-size:14px;line-height:1.6;color:#64748b;">
        If this was <strong>you</strong>, no action is needed.<br>
        If this was <strong>not you</strong>, please secure your account immediately.
      </p>
    `
      )
    ).catch(e => console.error("Email notification failed:", e));

    res.json({ message: "Login successful", user });
  } catch (error) {
    console.error("[LOGIN CRITICAL ERROR]:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Forgot Password Endpoint
app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, fullname, email")
      .or(`username.eq.${identifier.trimEnd()},fullname.eq.${identifier.trimEnd()},email.eq.${identifier.trimEnd()},phone.eq.${identifier.trimEnd()}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User with this identifier not found" });
    }

    // Generate 4-digit code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Store reset code in array
    cleanExpiredCodes();
    resetCodes.push({
      userId: user.id,
      resetCode,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiry
      identifier: identifier.trimEnd()
    });

    // Send email with reset code
    const mailOptions = {
      from: `"Textmob" <${process.env.SMTP_USER || "sharpbrainspublishers@gmail.com"}>`,
      to: user.email,
      subject: "Password Reset Request — Textmob",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password Reset — Textmob</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <tr><td align="center" style="padding:32px 24px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.3px;">textmob</h1>
        </td></tr>
        <tr><td style="padding:0 24px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
        <tr><td style="padding:8px 24px 24px;font-size:15px;line-height:1.6;color:#0f172a;">
          <p style="margin:0 0 16px;">Hi ${user.fullname},</p>
          <p style="margin:0 0 16px;">We received a request to reset your Textmob password. Your verification code is:</p>
          <p style="margin:0 0 16px;font-size:32px;font-weight:700;color:#2563eb;letter-spacing:4px;text-align:center;">${resetCode}</p>
          <p style="margin:0 0 16px;padding:12px;background-color:#f8fafc;border-radius:8px;font-size:13px;color:#64748b;">This code is valid for 15 minutes. If you didn't request this, please ignore this email.</p>
          <p style="margin:0;color:#64748b;font-size:14px;">Best regards,<br>Textmob Team</p>
        </td></tr>
        <tr><td style="padding:0 24px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding:0 24px 32px;font-size:12px;color:#9ca3af;line-height:1.5;">
          <a href="https://textmob.web.app/settings/notifications" style="color:#2563eb;text-decoration:none;font-weight:500;">Notification Settings</a>
          <span style="color:#d1d5db;margin:0 8px;">|</span>
          Textmob &middot; Lagos, Nigeria<br>
          &copy; 2026 Textmob. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    };

    await transporter.sendMail(mailOptions);

    res.json({ email: user.email, message: "Password reset code sent to your email" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify Reset Code Endpoint
app.post("/verify-reset-code", async (req, res) => {
  try {
    const { identifier, code } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({ error: "Identifier and code are required" });
    }

    cleanExpiredCodes();
    const resetEntry = resetCodes.find(
      entry => entry.resetCode === code && entry.identifier === identifier.trimEnd() && entry.expiresAt > Date.now()
    );

    if (!resetEntry) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    res.json({ message: "Reset code verified successfully" });
  } catch (error) {
    console.error("Verify Reset Code Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset Password Endpoint
app.post("/reset-password", async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;

    if (!identifier || !code || !newPassword) {
      return res.status(400).json({ error: "Identifier, code, and new password are required" });
    }

    cleanExpiredCodes();
    const resetEntry = resetCodes.find(
      entry => entry.resetCode === code && entry.identifier === identifier.trimEnd() && entry.expiresAt > Date.now()
    );

    if (!resetEntry) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", resetEntry.userId);

    if (updateError) {
      console.error("Error updating password:", updateError);
      return res.status(500).json({ error: "Failed to reset password" });
    }

    // Remove used reset code
    resetCodes.splice(resetCodes.indexOf(resetEntry), 1);

    // Send confirmation email
    const { data: user } = await supabase
      .from("users")
      .select("fullname, email")
      .eq("id", resetEntry.userId)
      .single();

    await transporter.sendMail({
      from: `"Textmob" <${process.env.SMTP_USER || "sharpbrainspublishers@gmail.com"}>`,
      to: user.email,
      subject: "Password Reset Successful — Textmob",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password Reset — Textmob</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <tr><td align="center" style="padding:32px 24px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.3px;">textmob</h1>
        </td></tr>
        <tr><td style="padding:0 24px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
        <tr><td style="padding:8px 24px 24px;font-size:15px;line-height:1.6;color:#0f172a;">
          <p style="margin:0 0 16px;">Hi ${user.fullname},</p>
          <p style="margin:0 0 16px;">Your Textmob password has been successfully reset.</p>
          <p style="margin:0;padding:12px;background-color:#f8fafc;border-radius:8px;font-size:13px;color:#64748b;">If this wasn't you, please contact us immediately at gidadoismail24@gmail.com.</p>
        </td></tr>
        <tr><td style="padding:0 24px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding:0 24px 32px;font-size:12px;color:#9ca3af;line-height:1.5;">
          <a href="https://textmob.web.app/settings/notifications" style="color:#2563eb;text-decoration:none;font-weight:500;">Notification Settings</a>
          <span style="color:#d1d5db;margin:0 8px;">|</span>
          Textmob &middot; Lagos, Nigeria<br>
          &copy; 2026 Textmob. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get('/auth', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'))
})

app.get('/foryou', function (req, res) {
  res.redirect('/')
})
app.get('/messages', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'chat-ui.html'))
})
app.get('/accountscenter', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'accountscenter.html'))
})

/**
 * server.js
 * Full sitemap + bot-SEO routes for Textmob on Render
 *
 * Requirements / env:
 *   - NODE 18+ (global fetch available)
 *   - Set SITE_URL or SPA_HOST to "https://textmob-provider-api-99ii.onrender.com"
 *   - Optionally set SITEMAP_REFRESH_KEY for protecting the refresh endpoint
 *   - Replace supabase / supabase2 with your actual Supabase clients
 *
 * How to use:
 *   - Place in your Express app root (or replace your current server.js)
 *   - npm install express
 *   - Start with node server.js (Render will handle)
 */

// ---------- CONFIG ----------
const SPA_HOST = process.env.SITE_URL || process.env.SPA_HOST || "https://textmob-provider-api-99ii.onrender.com";
const SITE_URL = SPA_HOST;
const MAX_URLS_PER_SITEMAP = parseInt(process.env.MAX_URLS_PER_SITEMAP || "50000", 10);
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache TTL
const SITEMAP_REFRESH_KEY = process.env.SITEMAP_REFRESH_KEY || ""; // set in Render secrets for safety


// ---------- HELPERS ----------
const BOT_REGEXES = [
  /Googlebot/i,
  /Googlebot-Image/i,
  /Bingbot/i,
  /Baiduspider/i,
  /YandexBot/i,
  /Slurp/i,
  /DuckDuckBot/i,
  /facebookexternalhit/i,
  /Twitterbot/i
];
function isBotReq(req) {
  const ua = (req.headers["user-agent"] || "");
  const q = req.query || {};
  if (q.render === "1" || q._escaped_fragment_ === "1") return true;
  return BOT_REGEXES.some(r => r.test(ua));
}
const escapeHtml = s =>
  (s === undefined || s === null) ? "" : String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// simple in-memory cache
const cach = new Map();
function cacheGet(key) {
  const rec = cach.get(key);
  if (!rec) return null;
  if (Date.now() - rec.ts > CACHE_TTL_MS) {
    cach.delete(key);
    return null;
  }
  return rec.value;
}
function cacheSet(key, value) {
  cach.set(key, { ts: Date.now(), value });
}
function cacheClear(pattern) {
  if (!pattern) return cach.clear();
  for (const k of Array.from(cach.keys())) if (k.includes(pattern)) cache.delete(k);
}

// ---------- BOT-FACING PROFILE: /u/:username ----------
app.get("/u/:username", async (req, res) => {
  try {
    const raw = req.params.username || "";
    const username = raw.split("@").pop().trim();
    if (!username) return res.status(400).send("Invalid username");

    // humans -> redirect to SPA @username
    if (!isBotReq(req)) {
      return res.redirect(302, `${SPA_HOST}/@${encodeURIComponent(username)}`);
    }

    const cacheKey = `profile:${username}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(cached);
    }

    // fetch user row (adjust selected fields if necessary)
    const { data: user, error } = await supabase
      .from("users")
      .select("id,fullname,username,profile_pic,biography,profile_type,followers,following,created_at,created_at")
      .eq("username", username)
      .single();

    if (error || !user) {
      const nf = `<!doctype html><html><head><meta charset="utf-8"/><title>User not found</title><meta name="robots" content="noindex,nofollow"/></head><body><h1>User not found</h1></body></html>`;
      return res.status(404).send(nf);
    }

    const profileUrl = `${SPA_HOST}/@${encodeURIComponent(user.username)}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": user.fullname || user.username,
      "url": profileUrl,
      "image": user.profile_pic || "",
      "description": (user.biography || "").slice(0, 300)
    };

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(user.fullname || user.username)} • Textmob</title>
  <meta name="description" content="${escapeHtml((user.biography || "").slice(0, 160))}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${profileUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(user.fullname || user.username)} • Textmob">
  <meta property="og:description" content="${escapeHtml((user.biography || "").slice(0, 160))}">
  <meta property="og:image" content="${escapeHtml(user.profile_pic || '')}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#0f172a;background:#fff;margin:0;padding:24px;}
    .card{max-width:900px;margin:24px auto;padding:24px;border-radius:12px;border:1px solid #e6eef8;box-shadow:0 8px 24px rgba(15,23,42,0.04);}
    .meta{display:flex;gap:20px;align-items:center;}
    img.avatar{width:96px;height:96px;border-radius:12px;object-fit:cover;border:1px solid #edf2f7;}
    h1{margin:0 0 8px;font-size:22px;color:#0b1320;}
    p.bio{margin:6px 0 12px;color:#334155;}
    .stats{color:#475569;font-size:14px}
    a.cta{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:8px;text-decoration:none;background:#0ea5a4;color:#fff;font-weight:600;}
  </style>
</head>
<body>
  <div class="card">
    <div class="meta">
      <img class="avatar" src="${escapeHtml(user.profile_pic || '')}" alt="${escapeHtml(user.username)}"/>
      <div>
        <h1>${escapeHtml(user.fullname || user.username)}</h1>
        <div class="stats">Followers: ${Array.isArray(user.followers) ? user.followers.length : 0} • Following: ${Array.isArray(user.following) ? user.following.length : 0}</div>
      </div>
    </div>
    <p class="bio">${escapeHtml(user.biography || "This user hasn't written a bio yet.")}</p>
    <a class="cta" href="${profileUrl}">Open @${escapeHtml(user.username)} on Textmob</a>
  </div>
</body>
</html>`;

    cacheSet(cacheKey, html);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Profile SEO error", err);
    res.status(500).send("Server error");
  }
});

// ---------- BOT-FACING POST: /p/:id ----------
app.get("/p/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).send("Invalid id");

    if (!isBotReq(req)) {
      return res.redirect(302, `${SPA_HOST}/post/${encodeURIComponent(id)}`);
    }

    const cacheKey = `post:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(cached);
    }

    const { data: post, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !post) {
      return res.status(404).send(`<!doctype html><html><head><title>Post not found</title><meta name="robots" content="noindex,nofollow"/></head><body><h1>Post not found</h1></body></html>`);
    }

    const postUrl = `${SPA_HOST}/post/${post.id || id}`;
    let jsonLd;
    if (post.type === "event") {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": post.title || `Event by ${post.username}`,
        "description": (post.text || "").slice(0, 300),
        "startDate": post.startDate || undefined,
        "endDate": post.endDate || undefined,
        "url": postUrl
      };
    } else {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title || `Post by ${post.username}`,
        "author": { "@type": "Person", "name": post.username },
        "datePublished": post.created_at || undefined,
        "image": (post.media && post.media[0]) || undefined,
        "articleBody": (post.text || "").slice(0, 300),
        "url": postUrl
      };
    }

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml((post.title || "").slice(0, 60) || `Post by ${post.username}`)} • Textmob</title>
  <meta name="description" content="${escapeHtml((post.text || "").slice(0, 160))}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${postUrl}">
  <meta property="og:type" content="${post.type === 'event' ? 'article' : 'article'}">
  <meta property="og:title" content="${escapeHtml((post.title || "").slice(0, 60) || `Post by ${post.username}`)}">
  <meta property="og:description" content="${escapeHtml((post.text || "").slice(0, 160))}">
  <meta property="og:image" content="${escapeHtml((post.media && post.media[0]) || '')}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    body{font-family:Inter,system-ui,Roboto,-apple-system;line-height:1.45;color:#0b1220;background:#fff;margin:0;padding:20px;}
    .wrap{max-width:900px;margin:28px auto;padding:20px;border-radius:12px;border:1px solid #eef2ff;background:#ffffff;}
    h1{margin:0 0 10px;font-size:20px;color:#0b1320;}
    .by{color:#475569;margin-bottom:12px;}
    .content{color:#334155;font-size:15px;margin-bottom:14px;white-space:pre-wrap;}
    img.media{max-width:100%;height:auto;border-radius:8px;margin-top:8px;border:1px solid #edf2f7;}
    a.cta{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:8px;text-decoration:none;background:#0ea5a4;color:#fff;font-weight:600;}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(post.title || `Post by ${post.username}`)}</h1>
    <div class="by">By <strong>${escapeHtml(post.username)}</strong> • ${new Date(post.created_at || Date.now()).toLocaleString()}</div>
    <div class="content">${escapeHtml(post.text || "")}</div>
    ${Array.isArray(post.media) ? post.media.map(m => `<img class="media" src="${escapeHtml(m)}" alt="post media" />`).join("") : ""}
    <p><a class="cta" href="${postUrl}">Open post on Textmob</a></p>
  </div>
</body>
</html>`;

    cacheSet(cacheKey, html);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Post SEO error", err);
    res.status(500).send("Server error");
  }
});

// ---------- SITEMAP INDEX: /sitemap.xml ----------
function escapeXml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function urlEntry({ loc, lastmod, changefreq, priority }) {
  let xml = "<url>";
  xml += `<loc>${escapeXml(loc)}</loc>`;
  if (lastmod) xml += `<lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>`;
  if (changefreq) xml += `<changefreq>${escapeXml(changefreq)}</changefreq>`;
  if (typeof priority !== "undefined") xml += `<priority>${escapeXml(String(priority))}</priority>`;
  xml += "</url>\n";
  return xml;
}
// ── POST /profile/:username/change-password ───────────────────────────────────
// Validates current password, then updates to new one.
// Uses the same password hashing you use in /login and /signup.

app.post("/profile/:username/change-password", async (req, res) => {
  try {
    const { username } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 1. Fetch the user's current hashed password
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("password")
      .eq("username", username)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Verify current password
    if (currentPassword !== user.password) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // 3. Update to new password
    const { error: updateErr } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("username", username);

    if (updateErr) {
      return res.status(500).json({ error: "Failed to update password" });
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("/change-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/sitemap.xml", async (req, res) => {
  try {
    const cacheKey = "sitemap_index";
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set("Content-Type", "application/xml");
      return res.send(cached);
    }

    // counts (head queries)
    const [{ count: postsCountObj }, { count: usersCountObj }] = await Promise.all([
      supabase2.from("Posts").select("id", { count: "exact", head: true }),
      supabase.from("users").select("username", { count: "exact", head: true })
    ]);

    const postsCount = (postsCountObj && postsCountObj.count) || 0;
    const usersCount = (usersCountObj && usersCountObj.count) || 0;

    const postPages = Math.max(1, Math.ceil(postsCount / MAX_URLS_PER_SITEMAP));
    const userPages = Math.max(1, Math.ceil(usersCount / MAX_URLS_PER_SITEMAP));
    const nowIso = new Date().toISOString();

    let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (let i = 1; i <= postPages; i++) {
      indexXml += `<sitemap><loc>${escapeXml(`${SITE_URL}/sitemap-posts-${i}.xml`)}</loc><lastmod>${nowIso}</lastmod></sitemap>\n`;
    }
    for (let i = 1; i <= userPages; i++) {
      indexXml += `<sitemap><loc>${escapeXml(`${SITE_URL}/sitemap-users-${i}.xml`)}</loc><lastmod>${nowIso}</lastmod></sitemap>\n`;
    }

    indexXml += "</sitemapindex>";
    cacheSet(cacheKey, indexXml);
    res.set("Content-Type", "application/xml");
    res.send(indexXml);
  } catch (err) {
    console.error("sitemap index error", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Server error</error>");
  }
});

// ---------- SITEMAP CHUNK BUILDERS ----------
async function buildSitemapChunk(type, page) {
  const cacheKey = `sitemap_${type}_${page}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const limit = MAX_URLS_PER_SITEMAP;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let rows = [];

  if (type === "posts") {
    const { data, error } = await supabase2
      .from("Posts")
      .select("id,created_at,created_at,title")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    rows = data || [];
  } else {
    const { data, error } = await supabase
      .from("users")
      .select("username,created_at,created_at,fullname")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    rows = data || [];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  if (type === "posts") {
    for (const r of rows) {
      const loc = `${SITE_URL}/p/${encodeURIComponent(r.id)}`;
      const lastmod = r.created_at || r.created_at;
      xml += urlEntry({ loc, lastmod, changefreq: "weekly", priority: 0.7 });
    }
  } else {
    for (const r of rows) {
      const username = (r.username || "").split("@").pop().trim();
      const loc = `${SITE_URL}/u/${encodeURIComponent(username)}`;
      const lastmod = r.created_at || r.created_at;
      xml += urlEntry({ loc, lastmod, changefreq: "weekly", priority: 0.8 });
    }
  }

  xml += "</urlset>";
  cacheSet(cacheKey, xml);
  return xml;
}

app.get("/sitemap-posts-:page.xml", async (req, res) => {
  try {
    const page = parseInt(req.params.page || "1", 10);
    if (isNaN(page) || page < 1) return res.status(400).send("Invalid page");
    const xml = await buildSitemapChunk("posts", page);
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("sitemap posts error", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Server error</error>");
  }
});

app.get("/sitemap-users-:page.xml", async (req, res) => {
  try {
    const page = parseInt(req.params.page || "1", 10);
    if (isNaN(page) || page < 1) return res.status(400).send("Invalid page");
    const xml = await buildSitemapChunk("users", page);
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("sitemap users error", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Server error</error>");
  }
});

// ---------- SITEMAP REFRESH (cache clear) ----------
app.post("/sitemap-refresh", (req, res) => {
  const key = (req.query.key || req.headers["x-refresh-key"] || "");
  if (SITEMAP_REFRESH_KEY && key !== SITEMAP_REFRESH_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  cacheClear("");
  return res.json({ ok: true, message: "Sitemap cache cleared" });
});
// ── GET /follow-status ──────────────────────────────────────
app.get("/follow-status", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Missing from or to" });
    if (from === to) return res.status(400).json({ error: "Cannot check status with yourself" });

    const { data: target, error } = await supabase
      .from("users")
      .select("profile_type, friends, followers")
      .eq("username", to)
      .single();

    if (error || !target) return res.status(404).json({ error: "User not found" });

    const profileType = (target.profile_type || "individual").toLowerCase();
    const isOrg = profileType !== "individual";
    const isFriend = Array.isArray(target.friends) && target.friends.includes(from);
    const isFollowing = Array.isArray(target.followers) && target.followers.includes(from);

    const status = isOrg
      ? (isFollowing ? "following" : "not_following")
      : (isFriend ? "friended" : "not_friended");

    const label = {
      following: "Following",
      not_following: "Follow",
      friended: "Friends",
      not_friended: "Add Friend",
    }[status];

    res.json({ profileType, status, label });
  } catch (err) {
    console.error("/follow-status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ── POST /follow ────────────────────────────────────────────
// body: { username, currentUsername, action: "follow"|"unfollow" }
app.post("/follow", async (req, res) => {
  try {
    const { username, currentUsername, action } = req.body;
    if (await isUserDisabled(currentUsername || username)) return res.status(403).json({ error: "Account disabled" });

    // ── input checks ──────────────────────────────────────
    if (!username || !currentUsername || !action)
      return res.status(400).json({ error: "Missing required fields" });
    if (username === currentUsername)
      return res.status(400).json({ error: "Cannot follow yourself" });
    let normAction = action === "friend" ? "follow" : action === "unfriend" ? "unfollow" : action;
    if (!["follow", "unfollow"].includes(normAction))
      return res.status(400).json({ error: "Invalid action. Use follow or unfollow" });

    // ── fetch both users ──────────────────────────────────
    const [{ data: target }, { data: actor }] = await Promise.all([
      supabase.from("users").select("username, profile_type, followers, following").eq("username", username).single(),
      supabase.from("users").select("username, profile_type, followers, following").eq("username", currentUsername).single(),
    ]);

    if (!target) return res.status(404).json({ error: `User '${username}' not found` });
    if (!actor) return res.status(404).json({ error: `User '${currentUsername}' not found` });

    // ── make sure target is actually an org/non-individual ─
    const profileType = (target.profile_type || "individual").toLowerCase();
    if (profileType === "individual")
      return res.status(400).json({ error: "Use /friend for individual profiles" });

    // ── build updated arrays ──────────────────────────────
    let targetFollowers = Array.isArray(target.followers) ? [...target.followers] : [];
    let actorFollowing = Array.isArray(actor.following) ? [...actor.following] : [];

    if (normAction === "follow") {
      // idempotent — only add if not already present
      if (!targetFollowers.includes(currentUsername)) targetFollowers.push(currentUsername);
      if (!actorFollowing.includes(username)) actorFollowing.push(username);
    } else {
      // idempotent — filter is safe even if not present
      targetFollowers = targetFollowers.filter(u => u !== currentUsername);
      actorFollowing = actorFollowing.filter(u => u !== username);
    }

    // ── persist both atomically ───────────────────────────
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("users").update({ followers: targetFollowers }).eq("username", username),
      supabase.from("users").update({ following: actorFollowing }).eq("username", currentUsername),
    ]);

    if (e1 || e2) {
      console.error("/follow DB error:", e1 || e2);
      return res.status(500).json({ error: "Failed to update follow state" });
    }

    // Update memoryDB for both users
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { followers: targetFollowers });
      memoryDb.updateUser(currentUsername, { following: actorFollowing });
    }

    if (normAction === "follow") {
      triggerNotification(username, 'followers', {
        msg: `${currentUsername} started following you`,
        link: `/@${currentUsername}`,
        sender: currentUsername,
        subject: "New Follower on Textmob",
        html: `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${username},</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;"><strong>@${currentUsername}</strong> is now following you on Textmob.</p>
          `
      });
    }

    const status = normAction === "follow" ? "following" : "not_following";
    const label = normAction === "follow" ? "Following" : "Follow";

    try { if (normAction === "follow") { tatuEvents.push({ username: currentUsername, event: "follow", metadata: { target: username, type: "org" }, timestamp: new Date().toISOString() }); if (tatuEvents.length > TATU_MAX_EVENTS) tatuEvents.splice(0, tatuEvents.length - Math.floor(TATU_MAX_EVENTS / 2)); } } catch (_) {}
    res.json({ status, label, profileType });
  } catch (err) {
    console.error("/follow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ── POST /friend ────────────────────────────────────────────
// body: { username, currentUsername, action: "friend"|"unfriend" }
app.post("/friend", async (req, res) => {
  try {
    const { username, currentUsername, action } = req.body;

    // ── input checks ──────────────────────────────────────
    if (!username || !currentUsername || !action)
      return res.status(400).json({ error: "Missing required fields" });
    if (username === currentUsername)
      return res.status(400).json({ error: "Cannot friend yourself" });
    let normAction = action === "follow" ? "friend" : action === "unfollow" ? "unfriend" : action;
    if (!["friend", "unfriend"].includes(normAction))
      return res.status(400).json({ error: "Invalid action. Use friend or unfriend" });

    // ── fetch both users ──────────────────────────────────
    const [{ data: target }, { data: actor }] = await Promise.all([
      supabase.from("users").select("username, profile_type, friends").eq("username", username).single(),
      supabase.from("users").select("username, profile_type, friends").eq("username", currentUsername).single(),
    ]);

    if (!target) return res.status(404).json({ error: `User '${username}' not found` });
    if (!actor) return res.status(404).json({ error: `User '${currentUsername}' not found` });

    // ── make sure target is actually an individual ────────
    const profileType = (target.profile_type || "individual").toLowerCase();
    if (profileType !== "individual")
      return res.status(400).json({ error: "Use /follow for organisation profiles" });

    // ── build updated arrays ──────────────────────────────
    let targetFriends = Array.isArray(target.friends) ? [...target.friends] : [];
    let actorFriends = Array.isArray(actor.friends) ? [...actor.friends] : [];

    if (normAction === "friend") {
      // idempotent — only add if not already present
      if (!targetFriends.includes(currentUsername)) targetFriends.push(currentUsername);
      if (!actorFriends.includes(username)) actorFriends.push(username);
    } else {
      // idempotent — filter is safe even if not present
      targetFriends = targetFriends.filter(u => u !== currentUsername);
      actorFriends = actorFriends.filter(u => u !== username);
    }

    // ── persist both atomically ───────────────────────────
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("users").update({ friends: targetFriends }).eq("username", username),
      supabase.from("users").update({ friends: actorFriends }).eq("username", currentUsername),
    ]);

    if (e1 || e2) {
      console.error("/friend DB error:", e1 || e2);
      return res.status(500).json({ error: "Failed to update friend state" });
    }

    // Update memoryDB for both users
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { friends: targetFriends });
      memoryDb.updateUser(currentUsername, { friends: actorFriends });
    }

    if (normAction === "friend") {
      triggerNotification(username, 'followers', {
        msg: `${currentUsername} added you as a friend`,
        link: `/@${currentUsername}`,
        sender: currentUsername,
        subject: "New Friend on Textmob",
        html: `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${username},</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;"><strong>@${currentUsername}</strong> added you as a friend on Textmob.</p>
          `
      });
    }

    const status = normAction === "friend" ? "friended" : "not_friended";
    const label = normAction === "friend" ? "Friends" : "Add Friend";

    res.json({ status, label, profileType });
  } catch (err) {
    console.error("/friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Signup Endpoint (With Profile Picture)
app.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      phone,
      password,
      userType,
      biography,
      profile_type,
      disabled,
      categories,
    } = req.body;

    if (!fullName || !username || !password || !profile_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if username or email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already taken" });
    }

    let profilePicUrl = null;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "profile-pictures", resource_type: "auto" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
      profilePicUrl = uploadResult.secure_url;
    }

    const { error: insertError } = await supabase
      .from("users")
      .insert([
        {
          fullname: fullName ? fullName.trimEnd() : "Anonymous",
          username: username ? username.split("@").pop().trimEnd() : `user_${Date.now()}`,
          email: email ? email.trimEnd() : "noemail@gmail.com",
          phone: phone ? phone.trimEnd() : "nophone",
          password,
          profile_pic: profilePicUrl || "https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg",
          followers: [],
          following: ["textmobofficial", "textmobai"],
          friends: [],
          notifications: [],
          biography: biography || "Biography not set",
          profile_type: profile_type || "Individual",
          disabled: false,
          categories: Array.isArray(categories) ? categories.filter(c => POST_CATEGORIES.includes(c)) : [],
          feed_prefs: {
            contentTypeWeights: {},
            mutedCreators: [],
            exploreThreshold: 0.3
          },
          notification_prefs: {
            likes: { inApp: true, email: true },
            comments: { inApp: true, email: true },
            mentions: { inApp: true, email: true },
            followers: { inApp: true, email: true },
            messages: { inApp: true, email: true },
            mobcoins: { inApp: true, email: true }
          },
        },
      ]);
    await sendNotificationEmail(
      email,
      "Welcome to Textmob!",
      `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi <strong>${fullName}</strong>,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Welcome to Textmob — your space to connect, share, and grow with friends and communities around the world.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Your email will keep you updated on everything that matters to you on Textmob.</p>
      <p style="margin:0;padding:12px;background-color:#f8fafc;border-radius:8px;font-size:13px;color:#64748b;">If you did not sign up for Textmob, please contact us at <a href="mailto:gidadoismail24@gmail.com" style="color:#2563eb;text-decoration:underline;">gidadoismail24@gmail.com</a>.</p>
      `
    );

    if (insertError) {
      console.error("Error inserting user:", insertError);
      return res.status(500).json({ error: "Failed to create account" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      const cleanUsername = username.split('@').pop().trimEnd();
      const newUser = {
        fullname: fullName ? fullName.trimEnd() : "Anonymous",
        username: cleanUsername,
        email: email ? email.trimEnd() : "noemail@gmail.com",
        phone: phone ? phone.trimEnd() : "nophone",
        password,
        profile_pic: profilePicUrl || "https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg",
        followers: [],
        following: ["textmobofficial", "textmobai"],
        friends: [],
        notifications: [],
        biography: biography || "Biography not set",
        profile_type: profile_type || "Individual",
        disabled: false,
        categories: Array.isArray(categories) ? categories.filter(c => POST_CATEGORIES.includes(c)) : [],
        feed_prefs: { contentTypeWeights: {}, categoryWeights: {}, mutedCreators: [], exploreThreshold: 0.3 },
        notification_prefs: {
          likes: { inApp: true, email: true },
          comments: { inApp: true, email: true },
          mentions: { inApp: true, email: true },
          followers: { inApp: true, email: true },
          messages: { inApp: true, email: true },
          mobcoins: { inApp: true, email: true }
        },
      };
      memoryDb.users.push(newUser);
    }

    await updateMobcoins(username.split('@').pop().trimEnd(), +30, true, `You Just Received 30 Mobcoins As a new User on Textmob`);
    res.json({ message: "Signup successful! You can now log in." });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ─── SmartSearchEngine: token-by-token, key-by-key, AI-like search ───
class SmartSearchEngine {
  constructor() {
    this.docs = [];             // { id, text, metadata }
    this.tokenIndex = {};       // token -> Set<docId>
    this.prefixIndex = {};      // 1-4 char prefix -> Set<docId>
  }

  tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  indexDocument(docId, text, metadata = {}) {
    this.docs.push({ id: docId, text, metadata });
    const tokens = this.tokenize(text);
    tokens.forEach(token => {
      if (!this.tokenIndex[token]) this.tokenIndex[token] = new Set();
      this.tokenIndex[token].add(docId);
      for (let i = 1; i <= Math.min(4, token.length); i++) {
        const prefix = token.slice(0, i);
        if (!this.prefixIndex[prefix]) this.prefixIndex[prefix] = new Set();
        this.prefixIndex[prefix].add(docId);
      }
    });
  }

  // Score how well a document's text matches a single query token
  scoreToken(docText, queryToken) {
    const lowered = docText.toLowerCase();
    const words = this.tokenize(lowered);
    let best = 0;

    // Exact full text match
    if (lowered === queryToken) return 100;
    // Exact token match
    if (words.includes(queryToken)) return 90;
    // Starts with (on any word)
    for (const w of words) {
      if (w === queryToken) return 90;
      if (w.startsWith(queryToken)) best = Math.max(best, 60);
      if (w.includes(queryToken)) best = Math.max(best, 35);
    }
    // Contains in full text
    if (lowered.includes(queryToken)) best = Math.max(best, 25);
    // Character-by-character progressive match
    for (let i = 2; i <= queryToken.length; i++) {
      const partial = queryToken.slice(0, i);
      for (const w of words) {
        if (w.startsWith(partial)) {
          best = Math.max(best, 10 + i * 2);
        }
      }
    }
    return best;
  }

  search(query) {
    const queryTokens = this.tokenize(query);
    if (!queryTokens.length) return [];

    // Phase 1: Find candidate doc IDs using prefix/token index
    const firstToken = queryTokens[0];
    let candidates = new Set();

    // Try exact token match first, then prefix
    if (this.tokenIndex[firstToken]) {
      candidates = new Set(this.tokenIndex[firstToken]);
    } else {
      // Find via prefix index
      for (let len = Math.min(4, firstToken.length); len >= 1; len--) {
        const prefix = firstToken.slice(0, len);
        if (this.prefixIndex[prefix]) {
          candidates = new Set(this.prefixIndex[prefix]);
          break;
        }
      }
    }

    // If no candidates found via index, scan all docs
    if (!candidates.size) {
      this.docs.forEach(d => candidates.add(d.id));
    }

    // Phase 2: Score each candidate doc against all query tokens
    const results = [];

    for (const docId of candidates) {
      const doc = this.docs.find(d => d.id === docId);
      if (!doc) continue;

      let totalScore = 0;
      let matchedTokens = 0;
      const docText = doc.text;

      for (let ti = 0; ti < queryTokens.length; ti++) {
        const token = queryTokens[ti];
        const tokenWeight = 1.0 - (ti * 0.08); // earlier tokens weigh more
        const tokenScore = this.scoreToken(docText, token);
        if (tokenScore > 0) {
          matchedTokens++;
          totalScore += tokenScore * tokenWeight;
        }
      }

      // Bonus if ALL query tokens matched
      if (matchedTokens === queryTokens.length) {
        totalScore *= 1.5;
      }

      if (totalScore > 0) {
        results.push({ doc, score: Math.round(totalScore * 100) / 100 });
      }
    }

    // Phase 3: Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

// Search engine instances
const userSearchEngine = new SmartSearchEngine();
const postSearchEngine = new SmartSearchEngine();

// Pre-populate user search engine
async function indexUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, fullname, username, biography, profile_pic');

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  data.forEach(user => {
    const docText = `${user.username} ${user.fullname} ${user.biography || ''}`;
    userSearchEngine.indexDocument(user.username, docText, { id: user.id, username: user.username, fullname: user.fullname, profile_pic: user.profile_pic, biography: user.biography });
  });
}

// Pre-populate post search engine
async function indexPosts() {
  const { data, error } = await supabase2
    .from('Posts')
    .select('id, username, text, media, likes, comments, created_at, type, hashtags, categories');

  if (error) {
    console.error("Error fetching posts:", error);
    return;
  }

  data.forEach(post => {
    const docText = `${post.text || ''} ${post.username} ${Array.isArray(post.hashtags) ? post.hashtags.join(' ') : ''} ${Array.isArray(post.categories) ? post.categories.join(' ') : ''}`;
    postSearchEngine.indexDocument(String(post.id), docText, { id: post.id, username: post.username, text: post.text, created_at: post.created_at, type: post.type });
  });
}

// Initialize search engines on app start
indexUsers();
indexPosts();

// ─── /search – user-only search (SmartSearchEngine) ───
app.get("/search", async (req, res) => {
  try {
    const { query, currentUsername } = req.query;
    if (!query || !currentUsername) {
      return res.status(400).json({ error: "Both `query` and `currentUsername` are required" });
    }

    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", currentUsername)
      .single();

    if (youErr || !you) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const yourFriends = new Set(you.friends || []);
    const yourFollowing = new Set(you.following || []);

    // Fetch all users for relation enrichment
    const { data: users, error } = await supabase
      .from("users")
      .select("username, fullname, profile_pic, profile_type, friends, followers, verified");

    if (error) {
      return res.status(500).json({ error: "Error fetching users" });
    }

    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    // SmartSearchEngine results
    const rawResults = userSearchEngine.search(query);

    const results = [];
    const seen = new Set();

    rawResults.forEach(r => {
      const doc = r.doc;
      const username = doc.metadata.username;
      if (!username || seen.has(username)) return;
      seen.add(username);

      const u = userMap[username];
      if (!u) return;

      const isOrg = (u.profile_type || "").toLowerCase() === "organisation";

      // Apply relation/social boost to the engine score
      let finalScore = r.score;
      if (!isOrg && yourFriends.has(username)) finalScore *= 2;
      if (isOrg && yourFollowing.has(username)) finalScore *= 1.5;
      if (u.verified) finalScore *= 1.3;

      results.push({
        type: "user",
        username: u.username,
        fullname: u.fullname,
        profile_pic: u.profile_pic,
        profile_type: isOrg ? "organisation" : "individual",
        relation: isOrg
          ? (yourFollowing.has(u.username) ? "following" : "not_following")
          : (yourFriends.has(u.username) ? "friended" : "not_friended"),
        score: Math.round(finalScore)
      });
    });

    results.sort((a, b) => b.score - a.score);
    res.json(results);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── /general/search – combined user + post search (SmartSearchEngine, no limits) ───
app.get("/general/search", async (req, res) => {
  try {
    const { query, currentUsername } = req.query;
    if (!query || !currentUsername) {
      return res.status(400).json({ error: "Both `query` and `currentUsername` are required" });
    }

    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", currentUsername)
      .single();

    if (youErr || !you) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const yourFriends = new Set(you.friends || []);
    const yourFollowing = new Set(you.following || []);

    // Fetch users and posts for enrichment
    const [{ data: users }, { data: posts }] = await Promise.all([
      supabase.from("users").select("username, fullname, profile_pic, profile_type, verified"),
      supabase2.from("Posts").select("id, username, text, media, likes, comments, created_at, type")
    ]);

    const userMap = {};
    (users || []).forEach(u => { userMap[u.username] = u; });

    const postMap = {};
    (posts || []).forEach(p => { postMap[String(p.id)] = p; });

    const qLower = query.toLowerCase().trim();
    const now = Date.now();

    // Search users
    const userResults = userSearchEngine.search(query);
    const postResults = postSearchEngine.search(query);

    const finalResults = [];
    const seen = new Set();

    userResults.forEach(r => {
      const username = r.doc.metadata.username;
      if (!username || seen.has(username)) return;
      seen.add(username);

      const u = userMap[username];
      if (!u) return;

      const isOrg = (u.profile_type || "").toLowerCase() === "organisation";
      let score = r.score;
      if (!isOrg && yourFriends.has(username)) score *= 2;
      if (isOrg && yourFollowing.has(username)) score *= 1.5;
      if (u.verified) score *= 1.3;

      finalResults.push({
        type: "user",
        username: u.username,
        fullname: u.fullname,
        profile_pic: u.profile_pic,
        profile_type: isOrg ? "organisation" : "individual",
        relation: isOrg
          ? (yourFollowing.has(u.username) ? "following" : "not_following")
          : (yourFriends.has(u.username) ? "friended" : "not_friended"),
        score: Math.round(score)
      });
    });

    postResults.forEach(r => {
      const postId = r.doc.id;
      if (!postId || seen.has(`post:${postId}`)) return;
      seen.add(`post:${postId}`);

      const p = postMap[String(postId)];
      if (!p) return;

      let score = r.score;

      // Engagement boost
      const likes = (p.likes || []).length;
      const comments = (p.comments || []).length;
      const engagement = likes + comments * 3;
      score *= (1 + Math.log(1 + engagement) * 0.05);

      // Recency boost
      if (p.created_at) {
        const ageDays = (now - new Date(p.created_at).getTime()) / 86400000;
        if (ageDays < 2) score *= 1.3;
        else if (ageDays < 7) score *= 1.1;
      }

      finalResults.push({
        type: "post",
        id: p.id,
        username: p.username,
        text: p.text,
        media: p.media || [],
        likes: Array.isArray(p.likes) ? p.likes : [],
        comments: Array.isArray(p.comments) ? p.comments : [],
        created_at: p.created_at,
        post_type: p.type,
        score: Math.round(score)
      });
    });

    finalResults.sort((a, b) => b.score - a.score);
    res.json(finalResults);
  } catch (err) {
    console.error("General Search Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Supabase Helper Functions
async function getUserCount() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function getPostCount() {
  const { count, error } = await supabase2
    .from('Posts')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function getGroupCount() {
  const { count, error } = await supabase2
    .from('groups')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

// Cloudinary Helper Function
async function getCloudinaryUsage() {
  return new Promise((resolve, reject) => {
    cloudinary.api.usage((error, result) => {
      if (error) {
        reject(error);
      } else {
        const storageGB = (result.storage.usage / 1024 / 1024 / 1024).toFixed(2); // Bytes to GB
        const assets = result.objects.usage;
        resolve({ storage: storageGB, assets });
      }
    });
  });
}
// --- NEW: Lightweight Profile Pic Endpoint ---
// This fetches ONLY the image string, saving massive bandwidth
app.get("/profile-pic/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("profile_pic")
      .eq("username", username)
      .single();

    if (error || !data) {
      // Return a default or 404, but json is safer for client handling
      return res.json({ profile_pic: null });
    }

    res.json({ profile_pic: data.profile_pic });
  } catch (error) {
    console.error("Profile Pic Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- EXISTING: Optimized Profile Fetch ---
app.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const [userRes, countRes] = await Promise.all([
      supabase
        .from("users")
        .select("fullname, username,following, followers, friends, email, phone, userType, profile_pic, biography, notifications, profile_type, notification_prefs, feed_prefs, verified")
        .eq("username", username)
        .single(),
      supabase2
        .from("Posts")
        .select("id", { count: "exact", head: true })
        .eq("username", username),
    ]);

    const { data: user, error } = userRes;

    if (error || !user) {
      return res.json({
        profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg',
        notifications: [],
        post_count: 0,
        error: "User not found"
      });
    }
    res.json({ ...user, post_count: countRes.count || 0 });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
// --- EXISTING: Unread Count ---
app.get("/ms-unread", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const { count, error } = await supabase
      .from("Messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver", username)
      .eq("read", false);

    if (error) throw error;
    res.json({ unreadCount: count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});
// Profile Update (delete old, upload new)
app.post(
  "/profile/:username/update",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const { username } = req.params;
      const { fullName, phone, email, biography, password } = req.body;

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, profile_pic_public_id, fullname, phone, email, biography")
        .eq("username", username)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      let newProfilePicUrl = user.profile_pic;
      let newProfilePicPublicId = user.profile_pic_public_id;

      if (req.file) {
        // delete old if exists
        if (user.profile_pic_public_id) {
          await cloudinary.uploader.destroy(user.profile_pic_public_id);
        }
        // upload new
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "profile-pictures", resource_type: "auto" },
            (error, result) => error ? reject(error) : resolve(result)
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
        newProfilePicUrl = uploadResult.secure_url;
        newProfilePicPublicId = uploadResult.public_id;
      }

      const updatedFields = {
        fullname: fullName || user.fullname,
        phone: phone || user.phone,
        email: email || user.email,
        biography: biography || user.biography,
        profile_pic: newProfilePicUrl,
        profile_pic_public_id: newProfilePicPublicId
      };

      // Add password to updated fields if provided
      if (password) {
        updatedFields.password = password; // Store plain password (not recommended for production)
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updatedFields)
        .eq("username", username);

      if (updateError) throw updateError;

      // Update memoryDB
      if (memoryDb && memoryDb.isReady) {
        memoryDb.updateUser(username, updatedFields);
      }

      res.json({ message: "Profile updated successfully", updatedFields });

    } catch (error) {
      console.error("Profile Update Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ---- notifications-server.js (append or paste into your existing server file) ----
// Requires: an existing `app` (Express) and `supabase` client in scope.
// No external uuid library used. IDs are generated with Date.now + Math.random.

function makeId() {
  // short unique-ish id
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

// Send to Expo push service in batches of 100
async function sendExpoPushMessages(messages) {
  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      const json = await resp.json();
      results.push(json);
    } catch (err) {
      console.error("sendExpoPushMessages chunk error:", err);
      results.push({ error: String(err) });
    }
  }
  return results;
}

/**
 * POST /register-token
 * body: { username, token, deviceId, platform }
 * Stores device info in `userType` column (stringified JSON).
 */
app.post("/register-token", async (req, res) => {
  try {
    const { username, token, deviceId, platform } = req.body || {};
    if (!username || !token) {
      return res.status(400).json({ error: "username and token required" });
    }

    // fetch current userType (string or null)
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("userType")
      .eq("username", username)
      .single();

    if (fetchErr) {
      console.error("register-token fetch user error:", fetchErr);
      return res.status(500).json({ error: "user lookup failed" });
    }

    let devices = [];
    try {
      if (user && user.userType) {
        // userType saved as stringified JSON; try to parse
        if (typeof user.userType === "string") {
          devices = JSON.parse(user.userType || "[]");
        } else {
          // just in case it's already JSON
          devices = user.userType || [];
        }
      }
    } catch (e) {
      console.warn("Failed parsing userType; resetting to empty array", e);
      devices = [];
    }

    const normalizedDeviceId = String(deviceId || token).slice(0, 120);
    let updated = false;

    const nextDevices = devices.map((d) => {
      if (d.deviceId === normalizedDeviceId) {
        updated = true;
        return { deviceId: normalizedDeviceId, token, platform: platform || d.platform || "unknown" };
      }
      return d;
    });

    if (!updated) {
      // avoid duplicate tokens
      const exists = nextDevices.some((d) => d.token === token);
      if (!exists) nextDevices.push({ deviceId: normalizedDeviceId, token, platform: platform || "unknown" });
    }

    // save back as stringified JSON in userType column
    const { error: updateErr } = await supabase
      .from("users")
      .update({ userType: JSON.stringify(nextDevices) })
      .eq("username", username);

    if (updateErr) {
      console.error("register-token update error:", updateErr);
      return res.status(500).json({ error: "failed to save token" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { userType: JSON.stringify(nextDevices) });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("register-token err:", e);
    return res.status(500).json({ error: "internal server error" });
  }
});

/**
 * GET /get-notifications?username=...
 * returns notifications array for the user
 */
app.get("/get-notifications", async (req, res) => {
  try {
    const { username } = req.query || {};
    if (!username) return res.status(400).json({ error: "Username is required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();

    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    return res.json(user && user.notifications ? user.notifications : []);
  } catch (err) {
    console.error("get-notifications err:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

/**
 * addNotification(recipientUsername, notification)
 * - Appends the notification into user's notifications.
 * - Attempts to send a push to every device stored in userType (stringified).
 *
 * Expected notification object: { id, title, message, data, read, created_at }
 * If id missing, one will be generated.
 */
async function addNotification(recipientUsername, notification) {
  try {
    if (!recipientUsername || !notification) {
      console.warn("addNotification missing params");
      return;
    }

    // ensure notification has id and timestamp
    const notif = Object.assign({}, notification);
    if (!notif.id) notif.id = makeId();
    if (!notif.created_at) notif.created_at = new Date().toISOString();
    if (typeof notif.read === "undefined") notif.read = false;

    // fetch current notifications and userType
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications, userType")
      .eq("username", recipientUsername)
      .single();

    if (fetchError || !user) {
      console.error("User not found for notifications:", fetchError);
      return;
    }

    const existingNotifs = Array.isArray(user.notifications) ? user.notifications : [];
    const updatedNotifications = existingNotifs.concat([notif]);

    const { error: updateError } = await supabase
      .from("users")
      .update({ notifications: updatedNotifications })
      .eq("username", recipientUsername);

    if (updateError) {
      console.error("Error updating notifications:", updateError);
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(recipientUsername, { notifications: updatedNotifications });
    }

    // parse devices from userType (stringified)
    let devices = [];
    try {
      if (user && user.userType) {
        if (typeof user.userType === "string") {
          // Only parse if it looks like JSON array/object
          if (user.userType.trim().startsWith("[") || user.userType.trim().startsWith("{")) {
            devices = JSON.parse(user.userType || "[]");
          } else {
            // It's likely a label like "Muslim" or "Individual" - skip parsing
            devices = [];
          }
        } else {
          devices = user.userType || [];
        }
      }
    } catch (e) {
      // Catch error silently if it still fails
      devices = [];
    }


    if (devices.length === 0) {
      // nothing to push to
      return;
    }

    // build messages
    const messages = devices.map((d) => {
      return {
        to: d.token,
        sound: "default",
        title: notif.title || "TextMob",
        body: notif.message || notif.body || "You have a new notification",
        data: Object.assign({}, notif.data || {}, { notificationId: notif.id }),
        // include _contentAvailable to hint iOS background (works with expo/FCM/APNs)
        _contentAvailable: true,
      };
    });

    // send messages
    try {
      const results = await sendExpoPushMessages(messages);
      console.log("addNotification push results length:", results.length);
    } catch (e) {
      console.error("Error sending pushes in addNotification", e);
    }
  } catch (e) {
    console.error("addNotification error:", e);
  }
}

/**
 * POST /trigger-notifications
 * - Sends unread notifications to all users' devices (scans DB).
 * - Useful for scheduled daily run.
 */

app.post("/trigger-notifications", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("username, notifications, userType");

    if (error) {
      console.error("trigger-notifications fetch users error:", error);
      return res.status(500).json({ error: "failed to fetch users" });
    }

    const allMessages = [];

    for (const u of users || []) {
      const notifs = Array.isArray(u.notifications) ? u.notifications : [];
      const devices = (() => {
        try {
          if (!u.userType) return [];
          if (typeof u.userType === "string") return JSON.parse(u.userType || "[]");
          return u.userType || [];
        } catch (e) {
          console.warn("parse userType in trigger:", e);
          return [];
        }
      })();

      const unread = notifs.filter((n) => !n.read);
      if (unread.length === 0 || devices.length === 0) continue;

      for (const n of unread) {
        for (const d of devices) {
          allMessages.push({
            to: d.token,
            sound: "default",
            title: n.title || "TextMob",
            body: n.message || n.body || "You have a notification",
            data: Object.assign({}, n.data || {}, { notificationId: n.id }),
            _contentAvailable: true,
          });
        }
      }
    }

    if (allMessages.length === 0) {
      return res.json({ ok: true, sent: 0 });
    }

    // send in batches
    const results = await sendExpoPushMessages(allMessages);
    return res.json({ ok: true, sent: allMessages.length, resultsSummary: results.length });
  } catch (err) {
    console.error("trigger-notifications err:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

app.get("/get-sparks", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("Sparks")
      .select("*")
      .eq("username", username)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get Sparks Error:", error);
      return res.status(500).json({ error: "Failed to fetch sparks" });
    }
    return res.json(data)
  } catch (error) {
    console.error("Get Sparks Catch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete Spark Cleanup (update to Cloudinary)
setInterval(async () => {
  try {
    const now = new Date().toISOString();
    const { data: expired, error: selectErr } = await supabase
      .from("Sparks")
      .select("id, media_public_id")
      .lt("expires_at", now);
    if (selectErr || !expired.length) return;

    // delete media from Cloudinary
    for (const s of expired) {
      if (s.media_public_id) {
        await cloudinary.uploader.destroy(s.media_public_id);
      }
    }

    const expiredIds = expired.map(s => s.id);
    await supabase.from("Sparks").delete().in("id", expiredIds);

  } catch (err) {
    console.error("Spark cleanup error:", err);
  }
}, 86400000);

// Helper function (used by legacy chat endpoints)
function normalizeChatId(a, b) {
  var sa = String(a || '');
  var sb = String(b || '');
  if (sa < sb) return sa + '-' + sb;
  return sb + '-' + sa;
}

app.post("/create-spark", upload.single("media"), async (req, res) => {
  if (await isUserDisabled(req.body?.username)) return res.status(403).json({ error: "Account disabled" });
  try {
    const { username, caption } = req.body;
    if (!username || !req.file) {
      return res.status(400).json({ error: "Username and media are required" });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "sparks", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const mediaUrl = uploadResult.secure_url;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("Sparks")
      .insert([
        {
          username,
          caption,
          media: mediaUrl,
          created_at: createdAt,
          expires_at: expiresAt,
          viewers: [],
        },
      ]);

    if (insertError) {
      console.error("Insert Spark Error:", insertError);
      return res.status(500).json({ error: "Failed to create spark" });
    }

    res.json({ message: "Spark lit! 🔥", mediaUrl });
  } catch (error) {
    console.error("Create Spark Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/delete-notification", async (req, res) => {
  try {
    const { username, notificationId } = req.body;

    if (!username || !notificationId) {
      return res.status(400).json({ error: "Username and notificationId are required" });
    }

    // Fetch the current notifications for the user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove the notification with the specified ID
    const updatedNotifications = (user.notifications || []).filter(
      (notification) => notification.id !== notificationId
    );

    // Update the user's notifications
    const { error: updateError } = await supabase
      .from("users")
      .update({ notifications: updatedNotifications })
      .eq("username", username);

    if (updateError) {
      console.error("Error updating notifications:", updateError);
      return res.status(500).json({ error: "Failed to delete notification" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { notifications: updatedNotifications });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error in delete-notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Batch delete all notifications for a user
app.post("/delete-all-notifications", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const { error } = await supabase
      .from("users")
      .update({ notifications: [] })
      .eq("username", username);

    if (error) {
      console.error("Error in delete-all-notifications:", error);
      return res.status(500).json({ error: "Failed to clear notifications" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { notifications: [] });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in delete-all-notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark a notification as read
app.post("/mark-notification-read", async (req, res) => {
  try {
    const { username, notificationId } = req.body;
    if (!username || !notificationId) {
      return res.status(400).json({ error: "Username and notificationId are required" });
    }

    // Fetch the current notifications for the user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();
    if (fetchError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the notification's read status
    const updatedNotifications = (user.notifications || []).map(notification => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    });

    const { error: updateError } = await supabase
      .from("users")
      .update({ notifications: updatedNotifications })
      .eq("username", username);
    if (updateError) {
      return res.status(500).json({ error: "Failed to update notifications" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { notifications: updatedNotifications });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error in mark-notification-read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create Post (multiple media via Cloudinary)
// Helper: Get all unique friends and followers for a username
async function getAllUserConnections(username) {
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('friends, followers')
    .eq('username', username)
    .single();
  if (userErr || !user) return [];
  const { friends = [], followers = [] } = user;
  return [...new Set([...friends, ...followers].filter(u => u !== username))];
}

// Helper: Notify all connections of a new post (in-app and email)
async function notifyConnectionsOnPost(username, postText, postId) {
  const connections = await getAllUserConnections(username);
  // Get poster's profile for better notification text (optional)
  const { data: user } = await supabase
    .from('users')
    .select('fullname')
    .eq('username', username)
    .single();

  for (const connection of connections) {
    // Get email for connection
    const { data: connUser } = await supabase
      .from('users')
      .select('email, fullname')
      .eq('username', connection)
      .single();

    // In-app notification
    await addNotification(connection, {
      id: Date.now() + Math.random(),
      message: `${user.fullname || username} just created a new post: "${postText.slice(0, 80)}..."`,
      read: false,
      link: `/post/${postId}`,
      timestamp: new Date().toISOString(),
      type: 'newPost',
      sender: username,
    });

    // Email notification
    if (connUser && connUser.email) {
      await sendNotificationEmail(
        connUser.email,
        `${user.fullname || username} posted on Textmob`,
        `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>${user.fullname || username}</strong> just shared something new on Textmob.</p>
        <div style="margin:0 0 16px;padding:12px 16px;background-color:#f8fafc;border-left:3px solid #2563eb;border-radius:8px;font-size:14px;line-height:1.5;color:#334155;">${postText.length > 180 ? postText.slice(0, 180) + "..." : postText}</div>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="background-color:#2563eb;border-radius:8px;">
              <a href="https://textmob.web.app/post/${postId}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Post</a>
            </td>
          </tr>
        </table>
        `
      );
    }

    // Real-time (Socket.io, optional)
    if (onlineUsers[connection]) {
      onlineUsers[connection].emit('new-notification', {
        message: `${user.fullname || username} just created a new post!`,
        link: `/post/${postId}`,
      });
    }
  }
}
app.post("/create-snap", upload.array("media", 6), async (req, res) => {
  try {
    const { username, text, visib } = req.body;
    const snapCategories = req.body.categories ? JSON.parse(req.body.categories) : [];

    if (!username || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate media size before upload
    for (const file of req.files) {
      if (file.size > 100 * 1024 * 1024) {
        return res.status(400).json({ error: "Each file must be under 100MB" });
      }
    }

    // Upload media to Cloudinary
    const mediaUrls = await Promise.all(
      (req.files || []).map((file) =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "snaps", resource_type: "video" }, // or "auto" if mixed media
            (error, result) => (error ? reject(error) : resolve(result.secure_url))
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        })
      )
    );

    // Extract hashtags from caption
    const hashtags = text.match(/#[\w-]+/g) || [];

    // Insert Snap into Supabase
    const { error: insertError, data } = await supabase2
      .from("Posts")
      .insert([
        {
          username,
          text, // Used as caption
          media: mediaUrls,
          likes: [],
          comments: [],
          hashtags,
          categories: snapCategories,
          visib,
          type: "snap"
        }
      ])
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating snap:", insertError);
      return res.status(500).json({ error: "Failed to create snap" });
    }

    // Update memoryDB immediately
    if (memoryDb && memoryDb.isReady && data) {
      memoryDb.upsertPost(data);
    }

    // Notify followers (same as post)
    await notifyConnectionsOnPost(username, text, data.id);
    await updateMobcoins(
      username.split("@").pop().trimEnd(),
      +15,
      true,
      `You Just Received 15 Mobcoins for creating a Snap on Textmob`
    );

    res.json({ message: "Snap created successfully!" });
  } catch (error) {
    console.error("Snap Creation Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

let userSnapSeenMap = new Map();
let snapFeedSessionMap = new Map();
let userPostSeenMap = new Map(); // username -> Set<postId> for /get-posts

// Restore seen maps from persisted cache on startup
if (memoryDb) {
  const savedPostMap = memoryDb.userPostSeenMap;
  if (savedPostMap && savedPostMap.size > 0) userPostSeenMap = savedPostMap;
  const savedSnapMap = memoryDb.userSnapSeenMap;
  if (savedSnapMap && savedSnapMap.size > 0) userSnapSeenMap = savedSnapMap;
}

// Unique ID generator for Snap Feed
function generateSnapSessionId() {
  return 'snap-xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Shuffle function specific to snaps
function shuffleSnapsArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Snap caching and intervals removed to fetch directly from DB
app.post("/snaps-feed", express.json(), async (req, res) => {
  try {
    const params = req.body;
    const { username, seenIds: rawSeenIds } = params;
    const limit = parseInt(params.limit, 10) || 12;
    const page = parseInt(params.page, 10) || 1;

    const { data: snapFeedPosts, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("type", "snap")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Snap feed fetching error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    const snaps = snapFeedPosts || [];

    let userFollowing = new Set();
    let seen = new Set();
    if (rawSeenIds) {
      rawSeenIds.split(',').filter(Boolean).forEach(id => seen.add(id));
    }
    if (username) {
      if (!userSnapSeenMap.has(username)) userSnapSeenMap.set(username, new Set());
      userSnapSeenMap.get(username).forEach(id => seen.add(id));
      try {
        const { data: me } = await supabase.from("users").select("following").eq("username", username).single();
        userFollowing = new Set(me?.following || []);
      } catch { /* ignore */ }
    }

    const now = Date.now();
    const HOUR = 3600000;

    const scored = snaps.map(p => {
      const ageMs = now - new Date(p.created_at).getTime();
      const ageHours = Math.max(0.1, ageMs / HOUR);
      const likes = (p.likes || []).length;
      const comments = (p.comments || []).length;
      const reactions = (p.reactions || []).length;

      const isFollowing = userFollowing.has(p.username);
      const affinityMul = isFollowing ? 3.0 : 1.0;

      const halfLifeHours = isFollowing ? 12 : 6;
      const freshness = Math.pow(0.5, ageHours / halfLifeHours);

      const totalEngagement = likes + (comments * 3) + (reactions * 1.5);
      const velocity = totalEngagement / Math.pow(ageHours + 1, 1.3);

      let typeBonus = 1.0;
      if (p.type === "live") typeBonus = 3.0;
      if (p.media && p.media.length > 0) typeBonus = 1.5;

      const boostScoreValue = (p.boost_score || 0) * 2.0;
      const mediaBonus = (p.media && p.media.length > 0) ? 2.0 : 0;

      const seenPenalty = seen.has(String(p.id)) ? 0.00001 : 1.0;
      const selfPenalty = p.username === username ? 0.1 : 1.0;
      const userInfluence = 0.0;

      const score = (
        (freshness * 10) +
        (velocity * 5) +
        (typeBonus * 2) +
        (userInfluence * 0.05) +
        boostScoreValue +
        mediaBonus
      ) * affinityMul * seenPenalty * selfPenalty;

      return { ...p, _score: score + (Math.random() * 0.5) };
    });

    scored.sort((a, b) => b._score - a._score);

    // Diversify: max 2 per author per batch
    function diversifySnaps(scoredSnaps, targetCount) {
      const result = [];
      const skipped = [];
      const userCount = new Map();
      for (const snap of scoredSnaps) {
        if (result.length >= targetCount) break;
        const count = userCount.get(snap.username) || 0;
        if (count < 2) {
          result.push(snap);
          userCount.set(snap.username, count + 1);
        } else {
          skipped.push(snap);
        }
      }
      if (result.length < targetCount) {
        for (const snap of skipped) {
          if (result.length >= targetCount) break;
          result.push(snap);
        }
      }
      return result;
    }

    // Paginate: use page to slice the scored array, then diversify
    const startIdx = (page - 1) * limit * 2;
    const pagePool = scored.slice(startIdx, startIdx + limit * 2);
    const diversified = diversifySnaps(pagePool, limit);
    const batch = diversified.map(({ _score, ...snap }) => snap);

    const snapUsernames = [...new Set(batch.map(s => s.username))];
    if (snapUsernames.length > 0) {
      const { data: authors } = await supabase
        .from("users")
        .select("username, verified")
        .in("username", snapUsernames);

      if (authors) {
        const verifiedMap = {};
        authors.forEach(u => verifiedMap[u.username] = u.verified || false);
        batch.forEach(s => s.verified = verifiedMap[s.username] || false);
      }
    }

    batch.forEach(s => { seen.add(String(s.id)); });

    if (username && userSnapSeenMap.has(username)) {
      const serverSeen = userSnapSeenMap.get(username);
      seen.forEach(id => serverSeen.add(id));
    }

    if (seen.size > 1000) {
      const iter = seen.keys();
      for (let i = 0; i < 200; i++) seen.delete(iter.next().value);
    }

    res.json({ snaps: batch, page, hasMore: batch.length >= limit });

  } catch (err) {
    console.error("Snap Feed Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function extractPublicIdFromUrl(url) {
  try {
    const parts = url.split("/");
    const folderAndFile = parts.slice(-2).join("/").split(".")[0]; // e.g., post-media/filename
    return folderAndFile;
  } catch (e) {
    console.error("[Cleaner] Failed to extract public_id from:", url);
    return null;
  }
}

// ============================================================
//  GET /search-suggest
// -------------------------------------------------------------
//  Route
// -------------------------------------------------------------
app.get('/search-suggest', async (req, res) => {
  try {
    const { query, currentUsername } = req.query;
    const q = (query || '').trim().toLowerCase();
    if (!q) return res.json([]);

    const results = [];
    const isMention = q.startsWith('@');
    const isHashtag = q.startsWith('#');
    const qClean = q.replace(/^[@#]/, '');

    if (isHashtag) {
      const { data: recentPosts } = await supabase2
        .from('Posts')
        .select('hashtags')
        .not('hashtags', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      const counts = {};
      (recentPosts || []).forEach(p => {
        if (Array.isArray(p.hashtags)) {
          p.hashtags.forEach(tag => {
            const t = tag.toLowerCase();
            if (t.includes(qClean)) {
              counts[t] = (counts[t] || 0) + 1;
            }
          });
        }
      });

      const tags = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 9)
        .map(([tQuery, count]) => ({ query: '#' + tQuery, count, type: 'hashtag' }));

      results.push(...tags);
    } else {
      const searchQ = isMention ? qClean : q;
      const rawResults = userSearchEngine.search(searchQ);
      const seen = new Set();

      rawResults.forEach(r => {
        const u = r.doc.metadata;
        const username = u.username;
        if (!username || seen.has(username) || username === currentUsername) return;
        seen.add(username);
        results.push({ type: 'user', username: u.username, fullname: u.fullname, profile_pic: u.profile_pic });
      });
    }

    res.json(results.slice(0, 9));
  } catch (err) {
    console.error('/search-suggest error:', err);
    res.json([]);
  }
});

// ─── /search-users – mention autocomplete for PostCard/PostContent ───
app.get('/search-users', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 6;
    if (!q) return res.json([]);

    const rawResults = userSearchEngine.search(q);
    const results = [];
    const seen = new Set();

    rawResults.forEach(r => {
      const u = r.doc.metadata;
      const username = u.username;
      if (!username || seen.has(username)) return;
      seen.add(username);
      results.push({ username: u.username, fullname: u.fullname, profile_pic: u.profile_pic });
    });

    res.json(results.slice(0, limit));
  } catch (err) {
    console.error('/search-users error:', err);
    res.json([]);
  }
});
// ─── Shared Groq API Helper ──────────────────────────────────────────────
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  "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"
].filter(Boolean);

const Groq = require('groq-sdk');
let groqKeyIndex = 0;
function getGroqClient() {
  const apiKey = GROQ_KEYS[groqKeyIndex];
  groqKeyIndex = (groqKeyIndex + 1) % GROQ_KEYS.length;
  return new Groq({ apiKey });
}

async function groqChat(messages, options = {}) {
  const { model = "llama-3.3-70b-versatile", temperature = 0.3, max_tokens = 1024 } = options;
  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    try {
      const client = getGroqClient();
      const res = await client.chat.completions.create({ model, messages, temperature, max_tokens });
      if (res?.choices?.[0]?.message?.content) {
        return res.choices[0].message.content.trim();
      }
    } catch (err) {
      if (err?.status === 429 && attempt < GROQ_KEYS.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      if (attempt === GROQ_KEYS.length - 1) console.error('[Groq] All keys failed:', err?.message);
    }
  }
  return null;
}

// ─── Post Moderation ─────────────────────────────────────────────────────
const POST_CATEGORIES = ['music', 'sports', 'gaming', 'news', 'education', 'entertainment', 'technology', 'fashion', 'art', 'food', 'travel', 'lifestyle', 'comedy', 'science', 'business', 'health', 'other'];

async function analyzePost(text, mediaUrls, currentPostId) {
  let spamScore = 0, baitScore = 0, duplicateOf = null;
  if (!text) return { spamScore, baitScore, duplicateOf };

  try {
    // Duplicate detection: check word overlap with recent posts
    if (text.length > 20) {
      const { data: recent } = await supabase2
        .from('Posts')
        .select('id, text')
        .limit(100)
        .order('created_at', { ascending: false });
      if (recent) {
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const r of recent) {
          if (currentPostId && String(r.id) === String(currentPostId)) continue;
          if (!r.text) continue;
          const rWords = r.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const overlap = words.filter(w => rWords.includes(w)).length;
          const ratio = overlap / Math.max(words.length, rWords.length);
          if (ratio > 0.85) { duplicateOf = String(r.id); break; }
        }
      }
    }

    // Simple keyword-based spam/bait heuristics
    const lower = text.toLowerCase();
    const spamPatterns = [/buy now/i, /click here/i, /free money/i, /earn \d+k/i, /sign up/i, /follow for follow/i];
    for (const p of spamPatterns) { if (p.test(lower)) spamScore = Math.max(spamScore, 0.5); }
    const baitPatterns = [/like if/i, /share if/i, /comment.*tag/i, /ignore if/i, /only.*will understand/i];
    for (const p of baitPatterns) { if (p.test(lower)) baitScore = Math.max(baitScore, 0.5); }
  } catch (err) {
    console.error('[analyzePost] Error:', err?.message);
  }

  return { spamScore, baitScore, duplicateOf };
}

// ─── Hall of Fame AI Curation ────────────────────────────────────────────
const HOF_CACHE_KEY = 'hof_curated';
const HOF_CACHE_TTL = 3600000; // 1 hour

async function curateHallOfFame() {
  try {
    const { data: posts } = await supabase2
      .from('Posts')
      .select('id, username, text, media, likes, comments, reactions, created_at, type, category, categories')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!posts || posts.length === 0) return [];

    const scored = posts.map(p => ({
      ...p,
      likesCount: (p.likes || []).length,
      commentsCount: (p.comments || []).length,
      reactionsCount: (p.reactions || []).length,
    }));

    // Use Groq to filter spam/bait and rank top posts
    const candidates = scored.filter(p => p.likesCount + p.commentsCount + p.reactionsCount > 5);
    const topCandidates = candidates.sort((a, b) =>
      (b.likesCount + b.commentsCount * 3 + b.reactionsCount * 1.5) -
      (a.likesCount + a.commentsCount * 3 + a.reactionsCount * 1.5)
    ).slice(0, 50);

    const postSummaries = topCandidates.map(p =>
      `[${p.id}] by @${p.username} | ${p.likesCount} likes, ${p.commentsCount} comments | "${(p.text || '').slice(0, 100)}"`
    ).join('\n');

    const prompt = `From these 50 candidate posts, select the top 15 that deserve to be in the "Hall of Fame" on Textmob.
    Criteria: high-quality, authentic, not spam/engagement-bait, original content, meaningful engagement.
    Return a JSON array of post IDs ordered by quality (best first): [id1, id2, ...id15]

Candidates:
${postSummaries}`;

    const aiRes = await groqChat([
      { role: 'system', content: 'You are a content curator for a social platform. Return ONLY a valid JSON array of post IDs.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, max_tokens: 1024 });

    if (aiRes) {
      try {
        const ids = JSON.parse(aiRes);
        if (Array.isArray(ids)) {
          const curated = ids.map(id => topCandidates.find(p => String(p.id) === String(id))).filter(Boolean);
          if (curated.length > 0) return curated;
        }
      } catch {}
    }

    // Fallback: return top 15 by engagement (filtered)
    return topCandidates.slice(0, 15);
  } catch (err) {
    console.error('[curateHallOfFame] Error:', err?.message);
    return [];
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// --- AI Reply Helper ---
/**
 * triggerAIReply
 * - Robust error handling and logging
 * - No optional chaining
 * - Duplicate-reply protection (simple exact-text check)
 * - Sends in-app notification and email if available
 *
 * Returns: { ok: boolean, reason?: string, details?: any }
 */
async function triggerAIReply(content, mediaUrls, mediaTypes, postId, parentType, parentUser) {
  // parentType defaults to "post" when caller does not provide it
  if (!parentType) parentType = "post";
  try {
    // Basic validation
    if (!postId) {
      console.error("[triggerAIReply] invalid postId:", postId);
      return { ok: false, reason: "invalid_postId" };
    }

    // 1) Fetch post (text + media + comments + username)
    const { data: post, error: postFetchError } = await supabase2
      .from("Posts")
      .select("text, media, comments, username")
      .eq("id", postId)
      .single();

    if (postFetchError) {
      console.error("[triggerAIReply] failed fetching post:", postFetchError);
      return { ok: false, reason: "post_fetch_error", details: postFetchError };
    }
    if (!post) {
      console.error("[triggerAIReply] post not found:", postId);
      return { ok: false, reason: "post_not_found" };
    }

    // Normalize values
    var postText = "";
    if (post.text) postText = post.text;
    var postMedia = [];
    if (post.media && Array.isArray(post.media)) postMedia = post.media;
    var postOwner = "";
    if (post.username) postOwner = post.username;

    const systemPrompt = `
You are Textmob AI, an intelligent AI assistant integrated into Textmob.
Textmob is a social media app where users can post text, images, and videos and interact with each other.
Your goal is to help users understand, discuss, and explore posts.

When someone tags you:
- Mention the user who tagged you by starting with @username.
- Respond naturally to the post.
- If asked a question, answer it directly.
- If no question is asked, provide a useful observation, explanation, or insight.
- Never sound robotic or overly formal.

Images:
- Carefully describe only what is actually visible.
- Point out notable details, objects, text, colors, expressions, or activities.
- If asked to analyze or explain the image, do so clearly.
- Never identify real people or make unsupported assumptions.

Videos:
- If video understanding is available, analyze the visible content similarly.
- If unavailable, ignore the video unless metadata is provided.

Reasoning:
- Be factual.
- Distinguish observations from inferences.
- If you're uncertain, say so instead of guessing.
- Never invent information.

Tone:
- Friendly, intelligent, and conversational.
- Adapt your tone to the user's post.
- Use humor only when it naturally fits.
- Avoid repetitive phrases.
- Avoid unnecessary emojis.

Safety:
- Refuse harmful, illegal, or explicit requests.
- Don't spread misinformation.
- Respect privacy.

Return only the reply.

Current time (Africa/Lagos):
${new Date().toLocaleString("en-US", {
      timeZone: "Africa/Lagos"
    })}
`;
    var messages = [{ role: "system", content: systemPrompt }];

    // Build context block
    var contextBlock = "Post content: " + (postText || "— no text available") + "\n";
    if (postMedia && postMedia.length > 0) {
      contextBlock = contextBlock + "Post has media. First media URL: " + postMedia[0] + "\n";
    } else {
      contextBlock = contextBlock + "Post has no media.\n";
    }

    if (parentType === "comment" && content && typeof content === "string") {
      contextBlock = contextBlock + "Comment that mentioned TextmobAI: " + content + "\n";
    }

    if (parentUser) {
      contextBlock = contextBlock + "Mentioned by: @" + parentUser + "\n";
    }
    if (postOwner) {
      contextBlock = contextBlock + "Post owner: @" + postOwner + "\n";
    }

    contextBlock = contextBlock + "Instruction: Compose a concise reply that references the post/comment, and helps the user. Dont mention more that one peson on a row, if you need to reply to two people, make it paragraphic form. Do not answer with 'What can I help you with?' unless the post has no actionable content.\n";
    messages.push({ role: "user", content: contextBlock });

    // Add explicit trigger content if provided
    if (parentType === "comment" && content && typeof content === "string") {
      messages.push({ role: "user", content: "User message that triggered the mention: " + content });
    } else if (parentType === "post" && content && typeof content === "string") {
      messages.push({ role: "user", content: "User mentioned me in the post with: " + content });
    }

    // 3) Determine media to send to generateAIResponse (prefer passed mediaUrls, else post media)
    var mediaUrlToSend = null;
    var mediaTypeToSend = null;
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      mediaUrlToSend = mediaUrls[0];
      if (mediaTypes && Array.isArray(mediaTypes) && mediaTypes.length > 0) {
        mediaTypeToSend = mediaTypes[0];
      } else {
        mediaTypeToSend = "image";
      }
    } else if (postMedia && postMedia.length > 0) {
      mediaUrlToSend = postMedia[0];
      var ext = (postMedia[0] || "").split(".").pop().toLowerCase();
      if (ext === "mp4" || ext === "mov" || ext === "webm") {
        mediaTypeToSend = "video";
      } else {
        mediaTypeToSend = "image";
      }
    }

    // 4) Call generateAIResponse with robust try/catch
    var aiReplyRaw = null;
    try {
      aiReplyRaw = await generateAIResponse(messages, mediaUrlToSend, mediaTypeToSend);
    } catch (aiErr) {
      console.error("[triggerAIReply] generateAIResponse failed:", aiErr);
      return { ok: false, reason: "ai_failure", details: aiErr.message || aiErr };
    }

    if (!aiReplyRaw || typeof aiReplyRaw !== "string" || aiReplyRaw.trim().length === 0) {
      console.warn("[triggerAIReply] empty AI reply");
      return { ok: false, reason: "empty_ai_reply" };
    }

    var replyText = aiReplyRaw.trim();
    if (parentUser) {
      replyText = "@" + parentUser + " " + replyText;
    }

    // 5) Reload current comments to avoid race conditions
    var { data: currentPostData, error: curFetchErr } = await supabase2
      .from("Posts")
      .select("comments")
      .eq("id", postId)
      .single();

    if (curFetchErr) {
      console.error("[triggerAIReply] failed fetching current comments:", curFetchErr);
      return { ok: false, reason: "comments_fetch_error", details: curFetchErr };
    }
    if (!currentPostData) {
      console.error("[triggerAIReply] post disappeared while processing:", postId);
      return { ok: false, reason: "post_disappeared" };
    }

    var existingComments = [];
    if (currentPostData.comments && Array.isArray(currentPostData.comments)) {
      existingComments = currentPostData.comments;
    }

    // 6) Duplicate detection: do not insert if an identical textmobai reply exists already
    var alreadyExists = false;
    for (var i = 0; i < existingComments.length; i++) {
      var c = existingComments[i];
      if (c && c.username === "textmobai" && c.text === replyText) {
        alreadyExists = true;
        break;
      }
    }
    if (alreadyExists) {
      console.log("[triggerAIReply] duplicate reply detected; skipping insert.");
      return { ok: true, reason: "duplicate_skipped" };
    }

    // 7) Append the new comment
    var newComments = existingComments.slice(0); // shallow copy
    newComments.push({
      username: "textmobai",
      text: replyText,
      timestamp: new Date().toISOString()
    });

    var { error: updateErr } = await supabase2
      .from("Posts")
      .update({ comments: newComments })
      .eq("id", postId);

    if (updateErr) {
      console.error("[triggerAIReply] failed to update comments:", updateErr);
      return { ok: false, reason: "comments_update_error", details: updateErr };
    }

    // 8) Notify the user who mentioned (in-app)
    if (parentUser) {
      var notification = {
        id: Date.now(),
        message: "@textmobai replied to you: \"" + replyText + "\"",
        read: false,
        link: "/post/" + postId,
        timestamp: new Date().toISOString(),
        type: 'textmobai',
        sender: 'textmobai',
      };

      // addNotification may throw or return rejected promise; wrap in try/catch
      try {
        await addNotification(parentUser, notification);
      } catch (notifErr) {
        console.error("[triggerAIReply] addNotification failed for", parentUser, notifErr);
        // proceed: we don't fail the entire function because of notification problems
      }

      // 9) Send email if user has one
      var { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, fullname")
        .eq("username", parentUser)
        .single();

      if (userError) {
        console.warn("[triggerAIReply] could not fetch user email for", parentUser, userError);
      } else if (userData && userData.email) {
        try {
          var emailBody = `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${userData.fullname || parentUser},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>@textmobai</strong> replied to your post:</p>
          <div style="margin:0 0 16px;padding:12px 16px;background-color:#f8fafc;border-radius:8px;">
            <div style="font-size:13px;font-weight:600;color:#2563eb;margin-bottom:4px;">@textmobai</div>
            <div style="font-size:14px;line-height:1.5;color:#0f172a;">${replyText}</div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color:#2563eb;border-radius:8px;">
                <a href="https://textmob.web.app/post/${postId}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Reply</a>
              </td>
            </tr>
          </table>
        `;

          await sendNotificationEmail(
            userData.email,
            "TextmobAI Replied to You",
            emailBody
          );

        } catch (emailErr) {
          console.error("[triggerAIReply] sendNotificationEmail failed for", userData.email, emailErr);
          // Do not fail the whole flow
        }
      } else {
        console.log("[triggerAIReply] user has no email or userData missing for", parentUser);
      }
    }

    // Success
    console.log("[triggerAIReply] AI reply posted and notifications handled for postId:", postId);
    return { ok: true };
  } catch (err) {
    // Final catch-all to prevent unhandled exceptions
    console.error("[triggerAIReply] unexpected error:", err);
    return { ok: false, reason: "unexpected_error", details: err.message || err };
  }
}

// ================== triggerAskifyReply ==================
async function triggerAskifyReply(content, postId, parentType, parentUser) {
  // parentType defaults to "post" when caller does not provide it
  if (!parentType) parentType = "post";
  try {
    // Basic validation
    if (!postId) {
      console.error("[triggerAskifyReply] invalid postId:", postId);
      return { ok: false, reason: "invalid_postId" };
    }

    // 1) Fetch post (text + comments + username)
    const { data: post, error: postFetchError } = await supabase2
      .from("Posts")
      .select("text, comments, username")
      .eq("id", postId)
      .single();

    if (postFetchError) {
      console.error("[triggerAskifyReply] failed fetching post:", postFetchError);
      return { ok: false, reason: "post_fetch_error", details: postFetchError };
    }
    if (!post) {
      console.error("[triggerAskifyReply] post not found:", postId);
      return { ok: false, reason: "post_not_found" };
    }

    // Normalize values
    const postText = post.text || "";
    const postOwner = post.username || "";

    // 2) Build system prompt and message context
    const { full } = getLocalDateTime({ timeZone: "Africa/Lagos" });
    const systemPrompt = (
      "You are Askify — a helpful AI assistant inside Textmob that provides clear, accurate, and concise answers.\n" +
      "When mentioned, ALWAYS:\n" +
      "- Read the post and any comment provided, then compose a short, useful reply (2-5 sentences).\n" +
      "- Start by referencing what you are replying to (quote a short excerpt, up to 30 words), then answer the user's intent.\n" +
      "- Mention the user who triggered you (prepend @username).\n" +
      "- Be helpful, friendly, and do not produce political, sexual, or harmful content.\n" +
      "- Do not generate or reference images, focus only on text-based responses.\n" +
      "Return just the reply text.\n" +
      `Current time (Africa/Lagos): ${full}\n`
    );

    const messages = [{ role: "system", content: systemPrompt }];

    // Build context block
    let contextBlock = `Post content: ${postText || "— no text available"}\n`;
    contextBlock += `Post has no media.\n`; // Askify does not process media
    if (parentType === "comment" && content && typeof content === "string") {
      contextBlock += `Comment that mentioned Askify: ${content}\n`;
    }
    if (parentUser) {
      contextBlock += `Mentioned by: @${parentUser}\n`;
    }
    if (postOwner) {
      contextBlock += `Post owner: @${postOwner}\n`;
    }
    contextBlock += "Instruction: Compose a concise reply that references the post/comment, and helps the user. Do not mention more than one person in a row. If you need to reply to two people, use paragraph form. Do not answer with 'What can I help you with?' unless the post has no actionable content.\n";
    messages.push({ role: "user", content: contextBlock });

    // Add explicit trigger content if provided
    if (parentType === "comment" && content && typeof content === "string") {
      messages.push({ role: "user", content: `User message that triggered the mention: ${content}` });
    } else if (parentType === "post" && content && typeof content === "string") {
      messages.push({ role: "user", content: `User mentioned me in the post with: ${content}` });
    }

    // Fetch past messages for history
    const { data: pastMessages } = await supabase
      .from("Messages")
      .select("sender, receiver, message")
      .or(`and(sender.eq.${parentUser},receiver.eq.askify),and(sender.eq.askify,receiver.eq.${parentUser})`)
      .order("timestamp", { ascending: false })
      .limit(9);

    const formattedHistory = (pastMessages || []).reverse().map(m => ({
      role: m.sender === parentUser ? "user" : "assistant",
      content: m.message
    }));

    // Combine history with current messages
    const finalMessages = [...formattedHistory, ...messages];

    // 3) Call generateAskifyResponse
    let aiReplyRaw = null;
    try {
      aiReplyRaw = await generateAskifyResponse(finalMessages);
    } catch (aiErr) {
      console.error("[triggerAskifyReply] generateAskifyResponse failed:", aiErr);
      return { ok: false, reason: "ai_failure", details: aiErr.message || aiErr };
    }

    if (!aiReplyRaw || typeof aiReplyRaw !== "string" || aiReplyRaw.trim().length === 0) {
      console.warn("[triggerAskifyReply] empty AI reply");
      return { ok: false, reason: "empty_ai_reply" };
    }

    let replyText = aiReplyRaw.trim();
    if (parentUser) {
      replyText = `@${parentUser} ${replyText}`;
    }

    // 4) Reload current comments to avoid race conditions
    const { data: currentPostData, error: curFetchErr } = await supabase2
      .from("Posts")
      .select("comments")
      .eq("id", postId)
      .single();

    if (curFetchErr) {
      console.error("[triggerAskifyReply] failed fetching current comments:", curFetchErr);
      return { ok: false, reason: "comments_fetch_error", details: curFetchErr };
    }
    if (!currentPostData) {
      console.error("[triggerAskifyReply] post disappeared while processing:", postId);
      return { ok: false, reason: "post_disappeared" };
    }

    let existingComments = [];
    if (currentPostData.comments && Array.isArray(currentPostData.comments)) {
      existingComments = currentPostData.comments;
    }

    // 5) Duplicate detection
    const alreadyExists = existingComments.some(c => c && c.username === "askify" && c.text === replyText);
    if (alreadyExists) {
      console.log("[triggerAskifyReply] duplicate reply detected; skipping insert.");
      return { ok: true, reason: "duplicate_skipped" };
    }

    // 6) Append the new comment
    const newComments = [...existingComments, {
      username: "askify",
      text: replyText,
      timestamp: new Date().toISOString()
    }];

    const { error: updateErr } = await supabase2
      .from("Posts")
      .update({ comments: newComments })
      .eq("id", postId);

    if (updateErr) {
      console.error("[triggerAskifyReply] failed to update comments:", updateErr);
      return { ok: false, reason: "comments_update_error", details: updateErr };
    }

    // 7) Notify the user who mentioned (in-app)
    if (parentUser) {
      const notification = {
        id: Date.now(),
        message: `@askify replied to you: "${replyText}"`,
        read: false,
        link: `/post/${postId}`,
        timestamp: new Date().toISOString(),
        type: 'askify',
        sender: 'askify',
      };

      try {
        await addNotification(parentUser, notification);
      } catch (notifErr) {
        console.error("[triggerAskifyReply] addNotification failed for", parentUser, notifErr);
      }

      // 8) Send email if user has one
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, fullname")
        .eq("username", parentUser)
        .single();

      if (userError) {
        console.warn("[triggerAskifyReply] could not fetch user email for", parentUser, userError);
      } else if (userData && userData.email) {
        try {
          const emailBody = `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${userData.fullname || parentUser},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>@askify</strong> replied to your post:</p>
            <div style="margin:0 0 16px;padding:12px 16px;background-color:#f8fafc;border-radius:8px;">
              <div style="font-size:13px;font-weight:600;color:#2563eb;margin-bottom:4px;">@askify</div>
              <div style="font-size:14px;line-height:1.5;color:#0f172a;">${replyText}</div>
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color:#2563eb;border-radius:8px;">
                  <a href="https://textmob.web.app/post/${postId}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Reply</a>
                </td>
              </tr>
            </table>
          `;
          await sendNotificationEmail(
            userData.email,
            "Askify Replied to You",
            emailBody
          );
        } catch (emailErr) {
          console.error("[triggerAskifyReply] sendNotificationEmail failed for", userData.email, emailErr);
        }
      }
    }

    console.log("[triggerAskifyReply] AI reply posted and notifications handled for postId:", postId);
    return { ok: true };
  } catch (err) {
    console.error("[triggerAskifyReply] unexpected error:", err);
    return { ok: false, reason: "unexpected_error", details: err.message || err };
  }
}

// --- CREATE POST ---
app.post("/create-post", upload.array("media", 10), async (req, res) => {
  try {
    const { username, text, visib, activities, quoted_post_id, category, categories } = req.body;
    let { options } = req.body;
    if (await isUserDisabled(username)) return res.status(403).json({ error: "Account disabled" });

    if (!username || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Support both single `category` (legacy) and `categories` array (JSON string from FormData)
    let userCategories = [];
    if (categories) {
      try {
        const parsed = typeof categories === 'string' ? JSON.parse(categories) : categories;
        if (Array.isArray(parsed)) userCategories = parsed.filter(c => POST_CATEGORIES.includes(c));
      } catch {}
    }
    if (userCategories.length === 0 && category) {
      if (POST_CATEGORIES.includes(category)) userCategories = [category];
    }
    if (userCategories.length === 0) userCategories = ['other'];

    // Validate media files: either up to 10 images or 1 video, but not both
    const filesArray = req.files ? req.files : [];
    if (filesArray.length > 0) {
      const hasVideo = filesArray.some(f => f.mimetype.startsWith("video"));
      const hasImage = filesArray.some(f => f.mimetype.startsWith("image"));
      if (hasVideo && hasImage) {
        return res.status(400).json({ error: "Cannot mix images and videos" });
      }
      if (hasVideo && filesArray.length > 1) {
        return res.status(400).json({ error: "Only one video is allowed" });
      }
      if (filesArray.length > 10) {
        return res.status(400).json({ error: "Maximum 10 images or 1 video allowed" });
      }
      for (const file of filesArray) {
        if (file.size > 100 * 1024 * 1024) {
          return res.status(400).json({ error: "Each file must be under 100MB" });
        }
      }
    }

    // Detect post type (poll vs post)
    let type = "post";
    if (options) {
      try {
        if (typeof options === "string") options = JSON.parse(options);
        if (Array.isArray(options) && options.length >= 2) {
          const validFormat = options.every(opt =>
            typeof opt.id === "number" &&
            typeof opt.text === "string" &&
            Array.isArray(opt.votes)
          );
          if (validFormat) type = "poll";
          else options = null;
        } else options = null;
      } catch (parseErr) {
        options = null;
      }
    }

    // Hashtags
    var hashtags = [];
    var rawHashtags = text.match(/#[\w-]+/g);
    if (rawHashtags && Array.isArray(rawHashtags)) {
      hashtags = rawHashtags;
    }

    // Mentions (@username), sanitized
    var rawMentions = text.match(/@\w+/g) || [];
    var mentions = rawMentions.map(function (m) {
      return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    });

    // Upload media (Cloudinary)
    var mediaUrls = [];
    try {
      mediaUrls = await Promise.all(
        filesArray.map(function (file) {
          return new Promise(function (resolve, reject) {
            var uploadStream = cloudinary.uploader.upload_stream(
              { folder: "post-media", resource_type: "auto" },
              function (error, result) {
                if (error) return reject(error);
                if (result && result.secure_url) return resolve(result.secure_url);
                return reject(new Error("Cloudinary returned unexpected result"));
              }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          });
        })
      );
    } catch (uploadErr) {
      console.error("[create-post] media upload failed:", uploadErr);
      return res.status(500).json({ error: "Media upload failed" });
    }

    // Insert post into DB
    var { error: insertError, data } = await supabase2
      .from("Posts")
      .insert([{
        username: username,
        text: text,
        media: mediaUrls,
        likes: [],
        comments: [],
        hashtags: hashtags,
        visib: visib,
        type: type,
        options: options,
        activities: activities,
        quoted_post_id: quoted_post_id,
        categories: userCategories
      }])
      .select("*")
      .single();

    if (insertError) {
      console.error("[create-post] Error creating post:", insertError);
      return res.status(500).json({ error: "Failed to create post" });
    }

    // Update memoryDB immediately
    if (memoryDb && memoryDb.isReady && data) {
      memoryDb.upsertPost(data);
    }

    // Award Mobcoins (best-effort)
    try {
      await updateMobcoins(
        username.split("@").pop().trimEnd(),
        +7,
        true,
        "You just received 7 Mobcoins for creating a " + type + " on Textmob"
      );
    } catch (mobErr) {
      console.error("[create-post] updateMobcoins failed:", mobErr);
    }

    // Immediately respond to client
    res.json({ message: (type === "poll" ? "Poll" : "Post") + " created successfully!" });

    // Background notifications & AI (non-blocking)
    (async function backgroundWork() {
      try {
        console.log("[create-post] starting backgroundWork for postId:", data.id);
        try { tatuEvents.push({ username: username, event: "post_create", metadata: { postId: data.id, type: data.type }, timestamp: new Date().toISOString() }); if (tatuEvents.length > TATU_MAX_EVENTS) tatuEvents.splice(0, tatuEvents.length - Math.floor(TATU_MAX_EVENTS / 2)); } catch (_) {}

        // EMIT REAL-TIME NEW POST TO ALL CONNECTED CLIENTS
        try {
          // get full authored post so clients can render without fetching
          const { data: authorData } = await supabase.from('users').select('fullname, profile_pic').eq('username', username).single();
          const realtimePost = { ...data };

          if (authorData) {
            // attach author data (optional depending on frontend layout but helpful)
            realtimePost._authorFullName = authorData.fullname;
            realtimePost._authorProfilePic = authorData.profile_pic;
          }

          // emit to everyone
          if (io) {
            io.emit('new-post', realtimePost);
            console.log(`[create-post] Emitted new-post event for ${data.id}`);
          }
        } catch (e) {
          console.error("[create-post] Error emitting new-post:", e);
        }

        // Prepare safe mediaTypes array to pass to triggerAIReply
        var safeMediaTypes = [];
        if (filesArray.length > 0) {
          safeMediaTypes = filesArray.map(function (f) {
            try {
              return f.mimetype.split("/")[0];
            } catch (e) {
              return "image";
            }
          });
        }

        // Trigger AI replies FIRST (before email notifications)
        for (var i = 0; i < mentions.length; i++) {
          var mentionedUser = mentions[i];
          if (mentionedUser && mentionedUser !== username) {
            triggerNotification(mentionedUser, 'mentions', {
              msg: `@${username} mentioned you in a post`,
              link: "/post/" + data.id,
              sender: username,
              subject: `@${username} mentioned you on Textmob`,
              html: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${mentionedUser},</p><p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;"><strong>@${username}</strong> just mentioned you in a post on Textmob.</p>`
            });
          }

          const lowerMentionedUser = mentionedUser?.toLowerCase();
          if (lowerMentionedUser === "textmobai") {
            triggerAIReply(text, mediaUrls, safeMediaTypes, data.id, "post").catch(e => console.error(e));
          } else if (lowerMentionedUser === "askify") {
            triggerAskifyReply(text, data.id, "post", username).catch(e => console.error(e));
          }
        }

        // Notify connections (fire-and-forget, don't block AI)
        notifyConnectionsOnPost(username, text, data.id).catch(function (nErr) {
          console.error("[create-post] notifyConnectionsOnPost failed:", nErr);
        });

        // ─── Post Analysis (spam, bait, duplicate detection) ───
        (async () => {
          try {
            const analysis = await analyzePost(text, mediaUrls, data.id);
            const updates = {};
            if (analysis.spamScore > 0) updates.spam_score = analysis.spamScore;
            if (analysis.baitScore > 0) updates.bait_score = analysis.baitScore;
            if (analysis.duplicateOf) updates.duplicate_of = String(analysis.duplicateOf);
            if (Object.keys(updates).length > 0) {
              await supabase2.from('Posts').update(updates).eq('id', data.id);
              if (memoryDb && memoryDb.isReady) {
                const cp = memoryDb.findPost(data.id);
                if (cp) Object.assign(cp, updates);
              }
            }
          } catch (postErr) {
            console.error('[create-post] Post analysis failed:', postErr?.message);
          }
        })();

        console.log("[create-post] backgroundWork completed for postId:", data.id);
      } catch (bgErr) {
        console.error("[create-post] unexpected backgroundWork error:", bgErr);
      }
    })();

  } catch (error) {
    console.error("[create-post] Post Creation Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ---------------------- LIVE HELPERS (create/update post) -------------------
async function createLivePostInDB(opts) {
  // opts: { username, text, visib, activities }
  try {
    const { username, text, visib, activities } = opts;

    if (!username) {
      throw new Error("Missing required field: username");
    }

    var hashtags = (text.match(/#[\w-]+/g) || []);
    var rawMentions = (text.match(/@\w+/g) || []);
    var mentions = rawMentions.map(function (m) {
      return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    });

    var insertPayload = {
      username: String(username),
      text: String(text || (username + " is live now!")),
      media: [],
      likes: [],
      comments: [],
      hashtags: hashtags,
      visib: visib || "public",
      type: "live",
      options: null,
      activities: activities || null
    };

    var insertRes = await supabase2
      .from("Posts")
      .insert([insertPayload])
      .select("*")
      .single();

    if (insertRes.error) {
      console.error("createLivePostInDB insert error:", insertRes.error);
      throw insertRes.error;
    }

    var createdRow = insertRes.data;

      // Background tasks (non-blocking)
      setTimeout(async () => {
        // Award Mobcoins (best-effort)
        try {
          await updateMobcoins(
            username.split("@").pop().trimEnd(),
            10,
            true,
            "You just received 10 Mobcoins for starting a live on Textmob"
          );
        } catch (e) {
          console.error("createLivePostInDB mobcoin error:", e);
        }

        // Background notifications
      try {
        await notifyConnectionsOnPost(username, text, createdRow.id);
        for (var i = 0; i < mentions.length; i++) {
          var mentionedUser = mentions[i];
          var notification = {
            id: Date.now(),
            message: username + " mentioned you in a live post",
            read: false,
            link: "/post/" + createdRow.id,
            type: 'mention',
            sender: username,
          };
          await addNotification(mentionedUser, notification);
        }
      } catch (e) {
        console.error("createLivePostInDB background notify error:", e);
      }
    }, 0);

    // Immediately return the created row to the caller so they get the ID
    return createdRow;
  } catch (e) {
    throw e;
  }
}

async function updatePostAfterLive(postId, savedUrl) {
  try {
    console.log("[updatePostAfterLive] Start", { postId, savedUrl });

    var updateObj = { type: "live_ended" };

    if (savedUrl) {
      updateObj.media = [savedUrl];
      console.log("[updatePostAfterLive] Adding savedUrl to media:", savedUrl);
    }

    console.log("[updatePostAfterLive] updateObj prepared:", updateObj);

    var updateRes = await supabase2
      .from("Posts")
      .update(updateObj)
      .eq("id", postId)
      .select("*")
      .single();

    if (updateRes.error) {
      console.error("[updatePostAfterLive] Supabase error:", updateRes.error);
      throw updateRes.error;
    }

    console.log("[updatePostAfterLive] Update successful:", updateRes.data);
    return updateRes.data;
  } catch (e) {
    console.error("[updatePostAfterLive] Exception caught:", e);
    throw e;
  }
}



// ---------------------------------------------------------------------------

// ---------------------- LIVE SOCKET.IO MANAGER ------------------------------

// in-memory sessions: postId -> session object
// (already declared at top)

async function ensureDir(p) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch (e) { }
}
async function appendChunk(filePath, chunkBuffer) {
  await fs.appendFile(filePath, chunkBuffer);
}
async function removeDirRecursive(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (e) { }
}
async function cleanupLiveSessionData(postId, s) {
  if (s) {
    if (s.activeStreams) {
      for (const clientRes of s.activeStreams) {
        try { clientRes.end(); } catch (e) { }
      }
      s.activeStreams.clear();
    }
  }
  liveSessions.delete(postId);
  try {
    const postTempDir = path.join(TMP_DIR, String(postId));
    await fs.rm(postTempDir, { recursive: true, force: true });
  } catch (e) { }
}
function joinIndexAdd(socketId, postId) {
  var set = socketJoins.get(socketId);
  if (!set) { set = new Set(); socketJoins.set(socketId, set); }
  set.add(postId);
}
function joinIndexDelete(socketId, postId) {
  var set = socketJoins.get(socketId);
  if (!set) return;
  set.delete(postId);
  if (set.size === 0) socketJoins.delete(socketId);
}

const userSockets = new Map(); // username -> Set(socketId)  (for targeted emits)

// username <-> socket helpers (for targeted push)
function addUserSocket(username, socketId) {
  if (!username) return;
  try {
    var set = userSockets.get(username);
    if (!set) { set = new Set(); userSockets.set(username, set); }
    set.add(socketId);
  } catch (e) { }
}
function removeUserSocket(username, socketId) {
  if (!username) return;
  try {
    var set = userSockets.get(username);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) userSockets.delete(username);
  } catch (e) { }
}

// ===============================
// LIVE SOCKET STATE (room/session only)
// Keep your WebM/media buffer in a separate Map.
// ===============================

const LIVE_HEARTBEAT_TTL_MS = 30 * 1000;
const LIVE_MONITOR_INTERVAL_MS = 10 * 1000;

function getSocketById(socketId) {
  try {
    if (!socketId) return null;

    if (io.sockets && io.sockets.sockets && typeof io.sockets.sockets.get === "function") {
      return io.sockets.sockets.get(socketId) || null;
    }

    if (io.sockets && io.sockets.connected) {
      return io.sockets.connected[socketId] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function addSocketJoin(socketId, postId) {
  const sid = String(socketId);
  const pid = String(postId);

  if (!socketJoins.has(sid)) socketJoins.set(sid, new Set());
  socketJoins.get(sid).add(pid);
}

function deleteSocketJoin(socketId, postId) {
  const sid = String(socketId);
  const pid = String(postId);

  const set = socketJoins.get(sid);
  if (!set) return;

  set.delete(pid);
  if (set.size === 0) socketJoins.delete(sid);
}

function cleanupRoomMembers(roomState, postId) {
  try {
    if (roomState?.viewers && roomState.viewers.size) {
      for (const viewerSocketId of Array.from(roomState.viewers)) {
        try {
          deleteSocketJoin(viewerSocketId, postId);
        } catch { }
      }
    }
    if (roomState?.host) {
      try {
        deleteSocketJoin(roomState.host, postId);
      } catch { }
    }
  } catch (e) {
    console.warn("cleanupRoomMembers failed", e);
  }
}

async function finishLiveSession(postId, opts = {}) {
  try {
    postId = String(postId);
    const s = liveRooms.get(postId);
    if (!s) {
      return { ok: true, reason: "not_found" };
    }

    const savedUrl = opts.savedUrl || null;
    const reason = opts.reason || "server-ended";

    try {
      io.to(s.room).emit("liveEnded", { postId, savedUrl, reason });
    } catch (e) {
      console.warn("emit room liveEnded failed", e);
    }

    try {
      io.emit("liveEnded", { postId, savedUrl, reason });
    } catch (e) {
      console.warn("emit global liveEnded failed", e);
    }

    cleanupRoomMembers(s, postId);

    try {
      if (s.rec && s.rec.dir && typeof removeDirRecursive === "function") {
        await removeDirRecursive(s.rec.dir).catch((e) => console.warn("removeDirRecursive failed", e));
      }
    } catch (e) {
      console.warn("finishLiveSession removeDirRecursive error", e);
    }

    try {
      if (typeof cleanupLiveSessionData === "function") {
        await cleanupLiveSessionData(postId, s);
      }
    } catch (e) {
      console.warn("cleanupLiveSessionData failed", e);
    }

    liveRooms.delete(postId);

    if (opts.savedUrl && typeof updatePostAfterLive === "function") {
      try {
        await updatePostAfterLive(postId, opts.savedUrl);
      } catch (e) {
        console.warn("updatePostAfterLive failed", e);
      }
    }

    console.log(`Finished live session ${postId} (reason=${reason})`);
    return { ok: true, reason };
  } catch (e) {
    console.error("finishLiveSession error", e);
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

// heartbeat monitor: only runs once for the whole server
setInterval(async () => {
  try {
    const now = Date.now();
    const checks = [];

    for (const [postId, s] of liveRooms.entries()) {
      const hostSocket = getSocketById(s.host);
      const hostAlive = !!hostSocket && hostSocket.disconnected !== true;

      // Only kill if the heartbeat has timed out. 
      // Do NOT kill immediately if hostAlive is false, to allow for reconnection.
      if (s.lastPulse && (now - s.lastPulse) > LIVE_HEARTBEAT_TTL_MS) {
        console.log(`Monitor: heartbeat timeout for post ${postId}`);
        checks.push(finishLiveSession(postId, { reason: "heartbeat-timeout" }));
        continue;
      }
    }

    if (checks.length) await Promise.all(checks);
  } catch (e) {
    console.error("live monitor error", e);
  }
}, LIVE_MONITOR_INTERVAL_MS);

// ===============================
// MAIN Socket.IO handlers
// ===============================
io.on("connection", function (socket) {
  // handshake username
  try {
    const hsUser = socket.handshake && socket.handshake.auth && socket.handshake.auth.username;
    if (hsUser) {
      socket.data.username = hsUser;
      if (typeof addUserSocket === "function") addUserSocket(hsUser, socket.id);
    }
  } catch { }

  // allow clients to identify themselves after connection
  socket.on("identify", function (username) {
    try {
      if (!username) return;
      socket.data.username = username;
      if (typeof addUserSocket === "function") addUserSocket(username, socket.id);
    } catch { }
  });

  // host heartbeat
  socket.on("livePulse", function (payload) {
    try {
      if (!payload || !payload.postId) return;
      const postId = String(payload.postId);
      const s = liveRooms.get(postId);
      if (!s || s.host !== socket.id) return;

      s.lastPulse = Date.now();
      if (payload.tracks) s.lastTracks = payload.tracks;
    } catch (e) {
      console.warn("livePulse handler error", e);
    }
  });

  // ---- startLive ----
  socket.on("startLive", async function (payload, ack) {
    try {
      if (!payload || !payload.username) {
        if (ack) ack({ ok: false, error: "Missing username" });
        return;
      }

      let postId = payload.postId ? String(payload.postId) : null;
      if (!postId) {
        try {
          const created = await createLivePostInDB({
            username: payload.username,
            text: payload.text || `${payload.username} is live now!`,
            visib: payload.visib || "public",
            activities: payload.activities || null
          });
          postId = String(created.id);
        } catch (e) {
          console.error("startLive createLivePostInDB failed:", e);
          if (ack) ack({ ok: false, error: "Failed to create live post" });
          return;
        }
      }

      const room = "live:" + postId;
      const existing = liveRooms.get(postId);

      if (existing) {
        existing.host = socket.id;
        existing.lastPulse = Date.now();
        liveRooms.set(postId, existing);
      } else {
        liveRooms.set(postId, {
          host: socket.id,
          username: payload.username,
          room,
          viewers: new Set(),
          startedAt: Date.now(),
          lastPulse: Date.now(),
          paused: false,
          rec: null
        });
      }

      socket.join(room);

      io.to(room).emit("liveStarted", { postId, username: payload.username });
      io.emit("liveStarted", { postId, username: payload.username });

      if (ack) ack({ ok: true, postId });
    } catch (e) {
      console.error("startLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- getLiveUrl -----------------
  socket.on("getLiveUrl", function (postId, ack) {
    try {
      postId = String(postId);
      const s = liveRooms.get(postId);
      if (!s) {
        if (ack) ack({ ok: true, postId, url: null, count: 0, paused: false });
        return;
      }
      if (ack) ack({ ok: true, postId, url: s.room, count: s.viewers.size, paused: !!s.paused });
    } catch (e) {
      console.error("getLiveUrl error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- joinLive (viewer) -----------------
  socket.on("joinLive", function (payload, ack) {
    try {
      if (!payload || !payload.postId) {
        if (ack) ack({ ok: false, error: "Missing postId" });
        return;
      }

      const postId = String(payload.postId);
      const s = liveRooms.get(postId);
      if (!s) {
        if (ack) ack({ ok: false, error: "Live not found" });
        return;
      }

      socket.join(s.room);
      s.viewers.add(socket.id);
      addSocketJoin(socket.id, postId);

      io.to(s.room).emit("viewerCountUpdate", { postId, count: s.viewers.size });
      io.emit("liveStatsUpdate", { postId, count: s.viewers.size });

      try {
        if (s.host) {
          io.to(s.host).emit("viewer-wants-offer", {
            postId,
            viewerSocketId: socket.id
          });
        }
      } catch (e) {
        console.warn("failed to notify host for offer:", e);
      }

      if (ack) ack({ ok: true, room: s.room, count: s.viewers.size, paused: !!s.paused });
    } catch (e) {
      console.error("joinLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- host-offer forward -> viewer -----------------
  socket.on("host-offer", function (payload) {
    try {
      if (!payload || !payload.to || !payload.sdp) return;
      const to = payload.to;
      const sdp = payload.sdp;
      const postId = payload.postId ? String(payload.postId) : null;
      io.to(to).emit("host-offer", { from: socket.id, sdp, postId });
    } catch (e) {
      console.error("host-offer forward error:", e);
    }
  });

  // ----------------- viewer-answer forward -> host -----------------
  socket.on("viewer-answer", function (payload) {
    try {
      if (!payload || !payload.to || !payload.sdp) return;
      const to = payload.to;
      const sdp = payload.sdp;
      io.to(to).emit("viewer-answer", { from: socket.id, sdp });
    } catch (e) {
      console.error("viewer-answer forward error:", e);
    }
  });

  // ----------------- ice-candidate-live forwarding -----------------
  socket.on("ice-candidate-live", function (payload) {
    try {
      if (!payload || !payload.to || !payload.candidate) return;
      const to = payload.to;
      const candidate = payload.candidate;
      io.to(to).emit("ice-candidate-live", { from: socket.id, candidate });
    } catch (e) {
      console.error("ice-candidate-live forward error:", e);
    }
  });

  // ----------------- liveComment broadcast -----------------
  socket.on("liveComment", function (payload) {
    try {
      if (!payload || !payload.postId || !payload.comment) return;
      const postId = String(payload.postId);
      io.to("live:" + postId).emit("liveComment", { postId, comment: payload.comment });
    } catch (e) {
      console.error("liveComment error:", e);
    }
  });

  // ----------------- mobcoins-gift broadcast -----------------
  socket.on("mobcoins-gift", function (payload) {
    try {
      if (!payload || !payload.postId || !payload.giftId) return;
      const postId = String(payload.postId);
      const room = "live:" + postId;

      io.to(room).emit("mobcoins-gift", {
        fromId: payload.fromId || null,
        toIds: payload.toIds || [],
        amount: payload.amount || 0,
        giftId: payload.giftId,
        postId
      });

      console.log(
        "[gift] " +
        (payload.fromId || "anon") +
        " → " +
        payload.giftId +
        " (" +
        (payload.amount || 0) +
        " coins) room=" +
        room
      );
    } catch (e) {
      console.error("mobcoins-gift handler error:", e);
    }
  });

  // ----------------- livePaused / liveResumed relay -----------------
  socket.on("livePaused", function (payload) {
    try {
      if (!payload || !payload.postId) return;
      const postId = String(payload.postId);
      const s = liveRooms.get(postId);
      if (s) s.paused = true;
      socket.to("live:" + postId).emit("livePaused", payload);
    } catch (e) {
      console.error("livePaused relay error:", e);
    }
  });

  socket.on("liveResumed", function (payload) {
    try {
      if (!payload || !payload.postId) return;
      const postId = String(payload.postId);
      const s = liveRooms.get(postId);
      if (s) s.paused = false;
      socket.to("live:" + postId).emit("liveResumed", payload);
    } catch (e) {
      console.error("liveResumed relay error:", e);
    }
  });

  // ----------------- leaveLive -----------------
  socket.on("leaveLive", function (payload, ack) {
    try {
      if (!payload || !payload.postId) {
        if (ack) ack({ ok: false, error: "Missing postId" });
        return;
      }

      const postId = String(payload.postId);
      const s = liveRooms.get(postId);
      if (s) {
        s.viewers.delete(socket.id);
        socket.leave(s.room);
        deleteSocketJoin(socket.id, postId);
        io.to(s.room).emit("viewerCountUpdate", { postId, count: s.viewers.size });
      }

      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("leaveLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- endLive -----------------
  socket.on("endLive", async function (payload, ack) {
    try {
      if (!payload || !payload.postId) {
        if (ack) ack({ ok: false, error: "Missing postId" });
        return;
      }

      const postId = String(payload.postId);
      const savedUrl = payload.savedUrl || null;
      const s = liveRooms.get(postId);

      if (!s) {
        if (ack) ack({ ok: true, message: "Already ended" });
        return;
      }

      io.to(s.room).emit("liveEnded", { postId, savedUrl });
      io.emit("liveEnded", { postId, savedUrl });

      if (typeof updatePostAfterLive === "function") {
        try {
          await updatePostAfterLive(postId);
        } catch (e) {
          console.warn("updatePostAfterLive failed", e);
        }
      }

      cleanupRoomMembers(s, postId);

      try {
        if (s.rec && s.rec.dir && typeof removeDirRecursive === "function") {
          await removeDirRecursive(s.rec.dir);
        }
      } catch (e) {
        console.warn("endLive: removeDirRecursive failed", e);
      }

      if (typeof cleanupLiveSessionData === "function") {
        await cleanupLiveSessionData(postId, s);
      }

      liveRooms.delete(postId);

      if (ack) ack({ ok: true, savedUrl });
    } catch (e) {
      console.error("endLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- disconnect cleanup -----------------
  socket.on("disconnect", async function () {
    try {
      try {
        if (socket.data && socket.data.username && typeof removeUserSocket === "function") {
          removeUserSocket(socket.data.username, socket.id);
        }
      } catch { }

      const joined = socketJoins.get(socket.id);
      if (!joined) return;

      const copy = Array.from(joined);
      for (let i = 0; i < copy.length; i++) {
        const postId = String(copy[i]);
        const s = liveRooms.get(postId);
        if (!s) {
          deleteSocketJoin(socket.id, postId);
          continue;
        }

        if (s.host === socket.id) {
          console.log(`Host socket ${socket.id} disconnected from post ${postId}. Waiting for pulse...`);
        } else {
          s.viewers.delete(socket.id);
          try {
            io.to(s.room).emit("viewerCountUpdate", { postId, count: s.viewers.size });
          } catch { }
        }

        deleteSocketJoin(socket.id, postId);
      }

      socketJoins.delete(socket.id);
    } catch (e) {
      console.error("disconnect cleanup error:", e);
    }
  });
}); // end io.on("connection")

app.post("/like-post", async (req, res) => {
  try {
    const { postId, username } = req.body;
    if (!postId || !username) return res.status(400).json({ error: "Post ID and username are required" });
    if (await isUserDisabled(username)) return res.status(403).json({ error: "Account disabled" });

    // Fetch the post owner and type for notifications
    const { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("likes, username, type, title")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Retry loop: read-modify-write with conflict detection (max 3 attempts)
    let action;
    let success = false;
    let updatedLikes = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: freshPost } = await supabase2
        .from("Posts")
        .select("likes")
        .eq("id", postId)
        .single();

      if (!freshPost) break;

      const currentLikes = freshPost.likes || [];
      if (currentLikes.includes(username)) {
        action = "unliked";
        updatedLikes = currentLikes.filter(u => u !== username);
        const { error: upErr } = await supabase2
          .from("Posts")
          .update({ likes: updatedLikes })
          .eq("id", postId);
        if (!upErr) { success = true; break; }
      } else {
        action = "liked";
        updatedLikes = [...currentLikes, username];
        const { error: upErr } = await supabase2
          .from("Posts")
          .update({ likes: updatedLikes })
          .eq("id", postId);
        if (!upErr) { success = true; break; }
      }
    }
    if (!success) {
      console.error("Failed to update likes after retries");
      return res.status(500).json({ error: "Failed to update likes" });
    }

    if (memoryDb && memoryDb.isReady) {
      const cachedP = memoryDb.findPost(postId);
      if (cachedP) {
        cachedP.likes = updatedLikes;
      }
    }

    // Send notification only if it's a like and not the post owner's own like
    if (username !== post.username && action === "liked") {
      const type = (post.type === 'event') ? 'events' : 'likes';
      const msg = (post.type === 'event')
        ? `${username} is interested in your event: ${post.title}`
        : `${username} liked your post`;

      triggerNotification(post.username, type, {
        msg,
        link: `/post/${postId}`,
        sender: username,
        subject: (post.type === 'event')
          ? `${username} is interested in your event`
          : `New like from ${username}`,
        html: `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${post.username},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>${username}</strong> ${action} your ${post.type === 'event' ? 'event' : 'post'} on Textmob.</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color:#2563eb;border-radius:8px;">
                  <a href="https://textmob.web.app/post/${postId}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View ${post.type === 'event' ? 'Event' : 'Post'}</a>
                </td>
              </tr>
            </table>
          `
      });
    }
    res.json({ message: "Post likes updated successfully!", likes: updatedLikes });
  } catch (error) {
    console.error("Like Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/react-post", async (req, res) => {
  try {
    const { postId, username, reaction, etext } = req.body;

    if (!postId || !username || !reaction || !etext) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("reactions, username, title, type")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    let updatedReactions = post.reactions || [];
    let existing = updatedReactions.find(r => r.username === username);
    let action;

    // If user already reacted with the same emoji → remove it
    if (existing && existing.reaction === reaction) {
      updatedReactions = updatedReactions.filter(r => r.username !== username);
      action = "removed";
    } else {
      // If reacted with a different emoji → update
      if (existing) {
        existing.reaction = reaction;
        existing.etext = etext;
        action = "changed";
      } else {
        updatedReactions.push({
          username: username,
          type: "emoji",
          reaction: reaction,
          etext: etext
        });
        action = "added";
      }
    }

    const { error: updateError } = await supabase2
      .from("Posts")
      .update({ reactions: updatedReactions })
      .eq("id", postId);

    if (updateError) {
      console.error("Error updating reactions:", updateError);
      return res.status(500).json({ error: "Failed to update reactions" });
    }

    // Update memoryDB immediately
    if (memoryDb && memoryDb.isReady) {
      const cachedP = memoryDb.findPost(postId);
      if (cachedP) {
        cachedP.reactions = updatedReactions;
      }
    }

    // Notifications (if not reacting to own post)
    if (username !== post.username && action === "added") {
      triggerNotification(post.username, 'likes', {
        msg: `${username} reacted to your post with ${reaction}`,
        link: `/post/${postId}`,
        sender: username,
        subject: `New reaction from ${username}`,
        html: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${post.username},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>${username}</strong> reacted to your post with ${reaction} on Textmob.</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color:#2563eb;border-radius:8px;">
                <a href="https://textmob.web.app/post/${postId}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Post</a>
              </td>
            </tr>
          </table>
        `
      });
    }
    res.json({
      message: "Reaction updated successfully",
      reactions: updatedReactions,
      action: action
    });
  } catch (error) {
    console.error("React Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/about', (req, res) => {
  res.redirect(301, '/about.html');
})
// Endpoint to get a single post by ID
app.get("/get-post", async (req, res) => {
  try {
    const id = req.query.id || req.query.postId;
    if (!id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    // Assuming posts are stored in your "Posts" table in Supabase
    const { data: post, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Optionally, fetch user profile info for the post owner if not included already
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("profile_pic, verified")
      .eq("username", post.username)
      .single();

    if (!userError && user) {
      post.profile_pic = user.profile_pic;
      post.verified = user.verified;
    } else {
      post.profile_pic = "https://via.placeholder.com/40";
      post.verified = false;
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/get-user-posts", async (req, res) => {
  try {
    const { username } = req.query;
    const page = Math.max(parseInt(req.query.page || "0", 10) || 0, 0);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "0", 10) || 0, 0), 100);
    const shouldPaginate = page > 0 || limit > 0;
    const pageSize = limit || 24;
    const from = (Math.max(page, 1) - 1) * pageSize;
    const to = from + pageSize;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch posts sorted by created_at (most recent first)
    let query = supabase2
      .from("Posts")
      .select("*")
      .eq("username", username)
      .order("created_at", { ascending: false }); // <-- sort here

    if (shouldPaginate) {
      query = query.range(from, to);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({ error: "Failed to fetch posts" });
    }

    res.json(posts);

  } catch (error) {
    console.error("Post Fetch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/edit-post", async (req, res) => {
  try {
    const { postId, content, comments, likes } = req.body;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Build update object. Only include fields that are provided.
    const updateFields = {};
    if (content !== undefined) {
      updateFields.text = content;
      updateFields.hashtags = content.match(/#[\w-]+/g) || [];
    }
    if (comments !== undefined) updateFields.comments = comments;
    if (likes !== undefined) updateFields.likes = likes;

    const { data, error } = await supabase2
      .from("Posts")
      .update(updateFields)
      .eq("id", postId);

    if (error) {
      console.error("Error editing post:", error);
      return res.status(500).json({ error: "Failed to edit post" });
    }

    // Update memoryDB immediately
    if (memoryDb && memoryDb.isReady) {
      const cachedP = memoryDb.findPost(postId);
      if (cachedP) {
        Object.assign(cachedP, updateFields);
      }
    }

    res.json({ message: "Post updated successfully", data });
  } catch (error) {
    console.error("Edit Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.delete("/delete-post", async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // fetch post to get public IDs
    const { data: post, error: fetchErr } = await supabase2
      .from("Posts")
      .select("media_public_ids")
      .eq("id", postId)
      .single();
    if (fetchErr) throw fetchErr;

    // delete each from Cloudinary
    (post.media_public_ids || []).forEach(async publicId => {
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    });

    // delete row
    const { error: deleteErr } = await supabase2
      .from("Posts")
      .delete()
      .eq("id", postId);
    if (deleteErr) throw deleteErr;

    // Remove from memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.posts = memoryDb.posts.filter(p => String(p.id) !== String(postId));
    }

    res.json({ message: "Post deleted successfully" });

  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- ADD COMMENT ---
app.post("/add-comment", async (req, res) => {
  try {
    const { postId, username, comment, parentId } = req.body;

    if (!postId || !username || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const commenterUsername = String(username).trim();
    const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    // Helper: normalize usernames for Mobcoins logic
    const normalizeMobcoinUser = (name) =>
      String(name || "").trim().replace(/^@/, "");

    // Fetch current comments + post owner's username
    const { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("comments, username")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      console.error("[add-comment] Error fetching post:", fetchError);
      return res.status(404).json({ error: "Post not found" });
    }

    const ownerUsername = String(post.username || "").trim();

    let currentComments = Array.isArray(post.comments) ? post.comments : [];
    let repliedUsername = null;

    function addReplyToParent(comments, pid, reply) {
      return comments.map(c => {
        if (String(c.id) === String(pid)) {
          repliedUsername = c.username;
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: addReplyToParent(c.replies, pid, reply) };
        }
        return c;
      });
    }

    if (parentId) {
      const newReply = {
        id: genId(),
        username: commenterUsername,
        text: comment,
        timestamp: new Date().toISOString(),
        parentId,
      };
      const updated = addReplyToParent(currentComments, parentId, newReply);
      if (repliedUsername) {
        currentComments = updated;
      } else {
        currentComments = [...currentComments, newReply];
      }
    } else {
      currentComments = [
        ...currentComments,
        {
          id: genId(),
          username: commenterUsername,
          text: comment,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    // Update post with new comment
    const { error: updateError } = await supabase2
      .from("Posts")
      .update({ comments: currentComments })
      .eq("id", postId);

    if (updateError) {
      console.error("[add-comment] Error updating comments:", updateError);
      return res.status(500).json({ error: "Failed to add comment" });
    }

    // Update memoryDB immediately
    if (memoryDb && memoryDb.isReady) {
      const cachedP = memoryDb.findPost(postId);
      if (cachedP) {
        cachedP.comments = currentComments;
      }
    }

    const postLink = `/post/${postId}`;
    const isSelfComment = commenterUsername === ownerUsername;

    // Reward ONLY the post owner when someone else comments
    if (!isSelfComment) {
      try {
        await updateMobcoins(
          normalizeMobcoinUser(ownerUsername),
          +10,
          true,
          "You just received 10 Mobcoins because someone commented on your post"
        );
      } catch (mbErr) {
        console.error("[add-comment] updateMobcoins (post owner) failed:", mbErr);
      }
    }

    // If replying to a specific comment, notify that comment's author
    if (parentId && repliedUsername && repliedUsername !== commenterUsername && repliedUsername !== ownerUsername) {
      triggerNotification(repliedUsername, "comments", {
        msg: `${commenterUsername} replied to your comment: "${comment}"`,
        link: postLink,
        sender: commenterUsername,
        subject: `${commenterUsername} replied to your comment`,
        html: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${repliedUsername},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>${commenterUsername}</strong> replied to your comment:</p>
          <div style="margin:0 0 16px;padding:12px 16px;background-color:#f8fafc;border-radius:8px;">
            <div style="font-size:14px;line-height:1.5;color:#0f172a;">${comment}</div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color:#2563eb;border-radius:8px;">
                <a href="https://textmob.web.app${postLink}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Post</a>
              </td>
            </tr>
          </table>
        `,
      });
    }

    // Notify post owner only if it's not their own comment (skip if already notified as replied user)
    if (!isSelfComment && (!parentId || repliedUsername !== ownerUsername)) {
      triggerNotification(ownerUsername, "comments", {
        msg: `${commenterUsername} commented on your post: "${comment}"`,
        link: postLink,
        sender: commenterUsername,
        subject: `New comment from ${commenterUsername}`,
        html: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${ownerUsername},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>${commenterUsername}</strong> commented on your post:</p>
          <div style="margin:0 0 16px;padding:12px 16px;background-color:#f8fafc;border-radius:8px;">
            <div style="font-size:13px;font-weight:600;color:#2563eb;margin-bottom:4px;">${commenterUsername}</div>
            <div style="font-size:14px;line-height:1.5;color:#0f172a;">${comment}</div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color:#2563eb;border-radius:8px;">
                <a href="https://textmob.web.app${postLink}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Post</a>
              </td>
            </tr>
          </table>
        `,
      });
    }

    // Parse mentions in comment (@username)
    const rawMentions = comment.match(/@\w+/g) || [];
    const mentions = [...new Set(
      rawMentions.map((m) => m.slice(1).replace(/[^a-zA-Z0-9_]/g, ""))
    )];

    for (let i = 0; i < mentions.length; i++) {
      const mentionedUser = mentions[i];
      const lowerMentionedUser = mentionedUser.toLowerCase();

      if (
        mentionedUser &&
        mentionedUser !== ownerUsername &&
        mentionedUser !== commenterUsername
      ) {
        triggerNotification(mentionedUser, "mentions", {
          msg: `${commenterUsername} mentioned you in a comment`,
          link: postLink,
          sender: commenterUsername,
          subject: `@${commenterUsername} mentioned you in a comment`,
          html: `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${mentionedUser},</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;"><strong>@${commenterUsername}</strong> mentioned you in a comment on Textmob.</p>
          `,
        });
      }

      if (lowerMentionedUser === "textmobai") {
        triggerAIReply(comment, null, null, postId, "comment", commenterUsername)
          .catch((ce) => console.error(ce));
      } else if (lowerMentionedUser === "askify") {
        triggerAskifyReply(comment, postId, "comment", commenterUsername)
          .catch((ae) => console.error(ae));
      }
    }

    return res.json({ message: "Comment added successfully!" });
  } catch (error) {
    console.error("[add-comment] Add Comment Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE COMMENT ──────────────────────────────────────────────────
app.post("/delete-comment", express.json(), async (req, res) => {
  try {
    const { postId, commentId, username } = req.body;
    if (!postId || !commentId) return res.status(400).json({ error: "Missing fields" });

    const { data: post, error: fetchError } = await supabase2.from("Posts").select("comments, username").eq("id", postId).single();
    if (fetchError) return res.status(404).json({ error: "Post not found" });

    function deleteInTree(comments) {
      return comments.map(c => {
        if (String(c.id) === String(commentId)) {
          if (c.username !== username && post.username !== username) {
            throw new Error("Not authorized");
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, text: "[deleted]", deleted: true };
          }
          return null;
        }
        if (c.replies && c.replies.length > 0) {
          const filtered = deleteInTree(c.replies).filter(Boolean);
          return { ...c, replies: filtered };
        }
        return c;
      });
    }
    const updatedComments = deleteInTree(post.comments).filter(Boolean);

    await supabase2.from("Posts").update({ comments: updatedComments }).eq("id", postId);
    if (memoryDb && memoryDb.isReady) {
      const cached = memoryDb.findPost(postId);
      if (cached) cached.comments = updatedComments;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EDIT COMMENT ────────────────────────────────────────────────────
app.post("/edit-comment", express.json(), async (req, res) => {
  try {
    const { postId, commentId, username, text } = req.body;
    if (!postId || !commentId || !text) return res.status(400).json({ error: "Missing fields" });

    const { data: post } = await supabase2.from("Posts").select("comments").eq("id", postId).single();
    if (!post) return res.status(404).json({ error: "Post not found" });

    function editInTree(comments) {
      return comments.map(c => {
        if (String(c.id) === String(commentId) && c.username === username) {
          return { ...c, text, edited: true };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: editInTree(c.replies) };
        }
        return c;
      });
    }
    const updatedComments = editInTree(post.comments);

    await supabase2.from("Posts").update({ comments: updatedComments }).eq("id", postId);
    if (memoryDb && memoryDb.isReady) {
      const cached = memoryDb.findPost(postId);
      if (cached) cached.comments = updatedComments;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inside your server.js (or wherever you set up routes)

// Helper function to bypass the 1000 row limit
async function fetchAll(client, table, selectQuery, orderByColumn = 'created_at') {
  let allData = [];
  let from = 0;
  const limit = 1000;
  let fetchMore = true;

  while (fetchMore) {
    const { data, error } = await client
      .from(table)
      .select(selectQuery)
      .order(orderByColumn, { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(`Error fetching ${table}: ${error.message}`);

    if (data && data.length > 0) {
      allData.push(...data);
      from += limit; // Move to the next 1000 rows
      if (data.length < limit) fetchMore = false; // We reached the end
    } else {
      fetchMore = false;
    }
  }
  return allData;
}
// In-memory cache
// -------------------------------------------------------------
// -------------------------------------------------------------
// REDEMPTION SYSTEM
// -------------------------------------------------------------

app.get("/api/user/payouts", async (req, res) => {
  try {
    const { userId } = req.query; // This is a username
    if (!userId) return res.status(400).json({ error: "User ID required" });

    // Resolve username to UUID
    const { data: user, error: uErr } = await supabase.from('users').select('id').eq('username', userId).single();
    if (uErr || !user) return res.status(404).json({ error: "User not found" });

    const { data, error } = await supabase
      .from('redemption_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('User payouts error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Migrate friends to followers
app.post("/api/migrate-friends", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, friends, followers')
      .eq('username', username)
      .single();

    if (userError || !user) return res.status(404).json({ error: "User not found" });

    const friends = user.friends || [];
    const currentFollowers = user.followers || [];

    // Migrate friends to followers (friends become followers for Professional accounts)
    const newFollowers = [...new Set([...currentFollowers, ...friends])];

    const { error: updateError } = await supabase
      .from('users')
      .update({ followers: newFollowers })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({ success: true, message: "Friends migrated to followers!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/redeem", async (req, res) => {
  try {
    const { userId, amount, type, details } = req.body; // userId is username

    if (!userId || !amount || !type || !details) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const coinAmount = parseInt(amount);
    if (isNaN(coinAmount) || coinAmount < 2000) {
      return res.status(400).json({ error: "Minimum redemption is 2,000 Mobcoins" });
    }

    // Check if it's Saturday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Fetch user by username to get UUID and current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, mobcoins, username')
      .eq('username', userId)
      .single();

    if (userError || !user) return res.status(404).json({ error: "User not found" });

    // Check for existing pending or recent completed requests (once a week rule)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: existing, error: existingError } = await supabase
      .from('redemption_queue')
      .select('id, created_at, status')
      .eq('user_id', user.id)
      .or(`status.eq.PENDING,created_at.gte.${sevenDaysAgo.toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const lastRequest = new Date(existing[0].created_at);
      const diffDays = Math.ceil((now - lastRequest) / (1000 * 60 * 60 * 24));

      if (existing[0].status === 'PENDING') {
        return res.status(400).json({ error: "You already have a pending redemption request." });
      }
      return res.status(400).json({ error: `You can only redeem once a week. Please wait ${7 - diffDays} more days.` });
    }

    if (user.mobcoins < coinAmount) {
      return res.status(400).json({ error: "Insufficient Mobcoins" });
    }

    const nairaValue = (coinAmount * 0.1).toFixed(2);

    // Atomic operation: Deduct coins and create queue entry
    const { error: deductError } = await supabase
      .from('users')
      .update({ mobcoins: user.mobcoins - coinAmount })
      .eq('id', user.id);

    if (deductError) throw deductError;

    const { error: queueError } = await supabase
      .from('redemption_queue')
      .insert({
        user_id: user.id,
        coin_amount: coinAmount,
        naira_value: nairaValue,
        type: type,
        payout_details: details,
        status: 'PENDING',
        created_at: now.toISOString()
      });

    if (queueError) {
      // Rollback
      await supabase.from('users').update({ mobcoins: user.mobcoins }).eq('id', user.id);
      throw queueError;
    }

    // Notify Admin
    console.log(`[REDEMPTION] @${user.username} queued ${coinAmount} Mobcoins for ${type}`);

    // Send notification to user
    await triggerNotification(user.username, 'mobcoins', {
      msg: `Your redemption request for ${coinAmount} Mobcoins (₦${nairaValue}) has been queued successfully! Payouts are every Saturday.`,
      subject: "Redemption Request Received! 💰",
      html: `Hi @${user.username},<br><br>We've received your redemption request for <b>${coinAmount} Mobcoins (₦${nairaValue})</b>. Your request has been queued and will be processed manually this coming Saturday.<br><br>If today is Saturday, your request will be processed next Saturday.<br><br>Thank you for using Textmob!`,
      link: "/wallet"
    });

    const message = dayOfWeek === 6
      ? "Your request is queued! Since today is Saturday, it will be processed next Saturday."
      : "Your request is queued! Payouts are processed every Saturday.";

    res.json({ success: true, message });
  } catch (err) {
    console.error('Redemption error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Try cached leaderboard from MemoryDB
    if (memoryDb && memoryDb.isReady) {
      const cached = memoryDb.getCachedLeaderboard();
      if (cached) {
        return res.json(cached);
      }
    }

    // Use MemoryDB if available, otherwise fallback to fetchAll
    let users, posts;
    if (memoryDb && memoryDb.isReady) {
      users = memoryDb.users.map(u => ({
        id: u.id,
        profile_pic: u.profile_pic,
        username: u.username,
        fullname: u.fullname,
        mobcoins: u.mobcoins,
        followers: u.followers,
        created_at: u.created_at,
        biography: u.biography,
        profile_type: u.profile_type,
      }));
      posts = memoryDb.posts.map(p => ({
        id: p.id,
        username: p.username,
        type: p.type,
        likes: p.likes,
        comments: p.comments,
        created_at: p.created_at,
        text: p.text,
        media: p.media,
        reactions: p.reactions,
      }));
    } else {
      users = await fetchAll(
        supabase,
        "users",
        "id, profile_pic, username, fullname, mobcoins, followers, created_at, biography, profile_type"
      );
      posts = await fetchAll(
        supabase2,
        "Posts",
        "id, username, type, likes, comments, created_at, text, media, reactions"
      );
    }

    const recentPosts = posts.filter(p => p.created_at && new Date(p.created_at) >= sevenDaysAgo);

    // Trackers for Metrics
    const userMetrics = {};
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

    recentPosts.forEach(p => {
      if (!p.username) return;

      // Initialize user tracker if it doesn't exist
      if (!userMetrics[p.username]) {
        userMetrics[p.username] = {
          rawPostCount: 0,
          effortPoints: 0,
          likesCount: 0,
          commentsCount: 0,
          reactionsCount: 0,
          activeDays: new Set(),
          creatorReplies: 0,
          topPost: null,
          maxPostEngagementScore: -1
        };
      }

      const meta = userMetrics[p.username];
      meta.rawPostCount += 1;

      // Track unique days worked (Consistency)
      if (p.created_at) {
        const dayString = new Date(p.created_at).toDateString();
        meta.activeDays.add(dayString);
      }

      // Calculate Effort Points per post (The Grind)
      const hasMedia = p.media && p.media.length > 0;
      const rawText = p.content || p.text || '';
      const textWithoutEmojis = rawText.replace(emojiRegex, '').trim();
      const wordCount = textWithoutEmojis.split(/\s+/).filter(w => w.length > 0).length;

      if (hasMedia) {
        meta.effortPoints += 3;
      } else if (wordCount > 15) {
        meta.effortPoints += 2;
      } else if (wordCount > 3) {
        meta.effortPoints += 1;
      } else {
        meta.effortPoints += 0.1;
      }

      // Calculate localized engagement for this specific post to see if it's their "Featured Post"
      const pLikes = Array.isArray(p.likes) ? p.likes.length : 0;
      const pReactions = Array.isArray(p.reactions) ? p.reactions.length : 0;
      const pComments = Array.isArray(p.comments) ? p.comments.length : 0;

      const postEngagementScore = (pComments * 3) + ((pReactions || pLikes) * 0.5);

      // Update best post if this one ranks higher in raw traction
      if (postEngagementScore > meta.maxPostEngagementScore && rawText.trim().length > 0) {
        meta.maxPostEngagementScore = postEngagementScore;
        meta.topPost = {
          id: p.id,
          text: rawText,
          engagement: `${pComments} comments, ${pReactions || pLikes} reactions`
        };
      }

      // Track aggregate incoming crowd reactions
      meta.likesCount += pLikes;
      meta.reactionsCount += pReactions;

      // Parse comments for community depth and creator responses
      if (Array.isArray(p.comments)) {
        meta.commentsCount += pComments;

        p.comments.forEach(c => {
          if (c.username === p.username) {
            meta.creatorReplies += 1;
          }
        });
      }
    });

    const excluded = ["textmobofficial", "ismailg", "IBG", "IbrahimG", "textmobai", "bossprogrammer"];

    const users7dMetrics = users
      .filter(u => !excluded.includes(u.username))
      .map(u => {
        const metrics = userMetrics[u.username] || {
          rawPostCount: 0, effortPoints: 0, likesCount: 0, commentsCount: 0, reactionsCount: 0,
          activeDays: new Set(), creatorReplies: 0, topPost: null
        };

        const totalReactions = metrics.reactionsCount > 0 ? metrics.reactionsCount : metrics.likesCount;

        // 🌟 HARD WORK CALCULATIONS
        const totalActiveDays = metrics.activeDays.size;
        const consistencyMultiplier = 1 + (totalActiveDays * 0.1);
        const finalEffortScore = (metrics.effortPoints + (metrics.creatorReplies * 1.5)) * consistencyMultiplier;

        // 🌟 COMMUNITY VIRALITY SCORE
        const finalEngagementScore = (metrics.commentsCount * 3.0) + (totalReactions * 0.5);

        // Balance 40% Hard Work/Consistency and 60% Virality/Impact
        const finalScore = (0.4 * finalEffortScore) + (0.6 * finalEngagementScore);
        const finalScoreRounded = Math.round(finalScore * 10) / 10;

        // 🌟 DYNAMIC GENERATION OF TRUE EVIDENCE WHYS AND HOWS
        let whyReason = "Maintained an active presence and shared direct thoughts with the community.";
        if (metrics.creatorReplies > 3 && metrics.commentsCount > 10) {
          whyReason = `Drove intense conversation this week. They didn't just post—they actively anchored their own comment sections with ${metrics.creatorReplies} personal responses to community questions.`;
        } else if (totalActiveDays >= 4 && metrics.rawPostCount >= 5) {
          whyReason = `Earned this slot through absolute consistency. Posted across ${totalActiveDays} separate days this week, keeping the timeline supplied with high-effort content.`;
        } else if (finalEngagementScore > finalEffortScore && metrics.commentsCount > 5) {
          whyReason = `Sparked highly interactive discussions. The crowd gravitated heavily toward their thoughts, generating deep debate in the comment feeds.`;
        } else if (metrics.effortPoints > 8) {
          whyReason = `Brought heavy substance to Textmob this week through deep, long-form thoughts or highly engaging media shares that raised the collective baseline.`;
        }

        return {
          id: u.id,
          username: u.username,
          fullname: u.fullname || '',
          avatar: u.profile_pic || '',
          score7d: finalScoreRounded,
          evidence: {
            why: whyReason,
            metrics: [
              { label: "Timeline Grind", value: `${metrics.rawPostCount} Posts over ${totalActiveDays} Days` },
              { label: "Community Echo", value: `${metrics.commentsCount} Comments & ${totalReactions} Reactions` }
            ],
            topPost: metrics.topPost || {
              id: null,
              text: "Consistently interacting across various community channels.",
              engagement: "Organic Traction"
            }
          }
        };
      });

    // Sort descending by score
    users7dMetrics.sort((a, b) => b.score7d - a.score7d);

    // Keep top 5 with non-zero points
    const leaderboard = users7dMetrics
      .filter(u => u.score7d > 0)
      .slice(0, 5);

    const result = {
      success: true,
      leaderboard,
      fetchedAt: now.toISOString()
    };

    // Cache in MemoryDB for 5 minutes
    if (memoryDb && memoryDb.isReady) {
      memoryDb.setCachedLeaderboard(result);
    }

    res.json(result);

  } catch (err) {
    console.error("Leaderboard error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const randomMessages = [
  // 1 — Community vibes
  "✨ This week on Textmob, users reconnected with old friends and sparked new ones. One story we loved? A user shared how they found their childhood friend after 10 years—just by scrolling their feed. It’s moments like these that remind us why Textmob exists. 💜\n\nJump back in today—you never know which connection could change your week. 🔥",

  // 2 — Fun discovery
  "🚀 Did you know? The most talked-about topic on Textmob this week was music. 🎶 From underground hip-hop tracks to timeless classics, people were dropping recommendations left and right. One playlist even got over 200 likes in a single day! 🤯\n\nHop in and see what your friends are vibing to—you might discover your new favorite song. 🎧",

  // 3 — Messaging highlight
  "💌 Over 1,200 new private conversations started on Textmob this week. One user told us they hadn’t talked to their cousin in years—until they both landed on Textmob and reconnected through a single message. Stories like that make us smile. 💬\n\nCheck your inbox—you might have a new conversation waiting for you right now. 📬",

  // 4 — Post engagement
  "💬 A post about personal growth went viral this week with hundreds of thoughtful comments. People from different walks of life shared advice, encouragement, and stories of their own struggles. 🌱 It turned into a mini-community where strangers lifted each other up. \n\nTake a look at what’s trending today—you might find the exact words you needed to hear. ✨",

  // 5 — Notification buzz
  "🔔 The Textmob community has been buzzing with activity—likes, comments, and friend requests flying everywhere. One creator said, “I posted just for fun, but the support I got was overwhelming.” 🥹\n\nOpen your notifications—you could be sitting on some moments worth celebrating too. 🎉",

  // 6 — Real-time energy
  "🎉 At peak hours, thousands of users log into Textmob at the same time. Last Friday night, a casual live post about football turned into an all-out debate with over 500 comments in under an hour. ⚽🔥\n\nYour friends might be online right now—join the energy and spark a conversation. 🫱🏿‍🫲🏽",

  // 7 — Profile stories
  "🧠 Profiles on Textmob aren’t just pages—they’re living timelines. We saw a user update their bio with ‘Finally graduated!’ and the love poured in instantly—friends, family, even classmates they hadn’t seen in years jumped in to celebrate. 🎓\n\nCheck your profile—you might be surprised by how much love your updates can spark. 👀",

  // 8 — Weekly recap
  "⏳ A week flies by fast, but Textmob keeps the memories alive. From funny memes to inspiring stories, the feed has been full of gems. One highlight? A random photo post turned into a global thread with people sharing pictures of their morning skies. 🌅\n\nDon’t miss out—catch up on what’s been happening and drop your voice into the mix. 📲"
];

const generateRandomDigest = () => {
  const randomIndex = Math.floor(Math.random() * randomMessages.length);
  return randomMessages[randomIndex];
};

async function sendWeeklyDigest() {
  try {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("email, fullname");
    if (userError) {
      console.error("Error fetching users:", userError);
      return;
    }
    if (!Array.isArray(users) || users.length === 0) {
      console.error("No users found or data is not an array");
      return;
    }

    for (const user of users) {
      const digestMessage = generateRandomDigest();
      const digestHtml = `
      <p style="font-size:16px; line-height:1.6; color:#333;">
        Hi ${user.fullname || user.email},
      </p>
    
      <h2 style="color:#1E90FF; font-size:20px; margin-top:16px;">
        📬 Your Weekly Textmob Digest
      </h2>
    
      <p style="font-size:15px; color:#333; margin:16px 0; line-height:1.6;">
        ${digestMessage}
      </p>
    
      <p style="font-size:15px; margin:24px 0; text-align:center;">
        <a href="https://textmob.web.app" 
           style="background:#1E90FF; color:#fff; padding:14px 32px; border-radius:8px; 
                  text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
          🚀 Go to Textmob
        </a>
      </p>
    
      <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
        Stay connected and never miss a moment on <strong style="color:#1E90FF;">Textmob</strong>.
      </p>
    `;
      try {
        await sendNotificationEmail(
          user.email,
          "📬 Your Weekly Textmob Digest",
          digestHtml
        );
        console.log(`Weekly digest sent to ${user.email}`);
      } catch (emailErr) {
        console.error(`Failed to send digest to ${user.email}:`, emailErr);
      }
    }
  } catch (err) {
    console.error("Failed to send weekly digest:", err);
  }
}

app.get('/week', async function (req, res) {
  await sendWeeklyDigest()
  res.json({ message: 'Weekly Digest sent to all users' })
})
// Updated Backend (server.js) - Minor tweaks for better handling
// (Full code with your existing + small additions)

require('dotenv').config();

// Your existing routes (unchanged except small additions)
app.get('/online-users', (req, res) => {
  return res.json({ users: Object.keys(onlineUsers) });
});

// Socket.IO
io.on('connection', socket => {
  socket.on('register', username => {
    socket.username = username;
    onlineUsers[username] = socket;
    socket.join(username);
    socket.emit('online-users', Object.keys(onlineUsers));
    socket.broadcast.emit('user-status', { username, status: 'online' });
  });

  // Always-online bot
  onlineUsers["textmobai"] = {
    emit: (...args) => {
      console.log("[textmobai reply trigger]", ...args);
    }
  };

  // Always-online bot
  onlineUsers["askify"] = {
    emit: (...args) => {
      console.log("[Askify AI reply trigger]", ...args);
    }
  };
  socket.on('call-user', ({ to, offer, from }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('incoming-call', { from, offer });
    } else {
      socket.emit('call-unavailable', { to });
    }
  });

  socket.on('answer-call', ({ to, answer }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('call-answered', { answer });
    }
  });

  socket.on('decline-call', ({ to }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('call-declined'); // Already emits to caller
    }
  });

  socket.on('end-call', ({ to }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('call-ended');
    }
    // Emit back to self too? No, frontend handles local close
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('ice-candidate', { candidate });
    }
  });

  socket.on('typing', ({ to }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('typing', { from: socket.username });
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      socket.broadcast.emit('user-status', { username: socket.username, status: 'offline' });
    }
    io.emit('online-users', Object.keys(onlineUsers)); // Broadcast to all
  });
});

async function generateAIResponse(messages, mediaUrl, mediaType) {
  // Input validation
  if (!Array.isArray(messages)) {
    throw new Error("messages must be an array");
  }

  // Normalize messages into [{role, content}, ...]
  var normalized = [];
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (typeof m === "string") {
      // plain string -> user role
      normalized.push({ role: "user", content: m });
    } else if (m && typeof m === "object" && typeof m.role === "string" && (typeof m.content === "string" || Array.isArray(m.content) || typeof m.content === "object")) {
      // valid message object
      normalized.push({ role: m.role, content: m.content });
    } else {
      // skip unknown message shapes but log for debugging
      console.warn("[generateAIResponse] skipping message with unexpected shape at index", i, m);
    }
  }

  // Build system prompt (keeps your existing system prompt text and context)
  var currentTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos", weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", hour12: true });

  var systemPrompt = (
    "You are TextmobAI — a regular on Textmob, always active and keeping it real. You talk like a cool Textmobber, not a robot.\n" +
    "Keep your replies short, snappy, and interesting. No long paragraphs, no over-explaining. Be direct but friendly.\n" +
    "When someone asks something, give them the info straight up. When they're chatting, match their vibe.\n" +
    "If you don't know something, just say so — don't make stuff up.\n" +
    "The url of Textmob is https://textmob.web.app\n" +
    "If asked about your origins, say: \"I'm TextmobAI, your AI friend on Textmob.\"\n" +
    "No political, sexual, or harmful content.\n" +
    "Current Time: " + currentTime + "\n"
  ).trim();

  // Build finalMessages
  var finalMessages = [{ role: "system", content: systemPrompt }];

  // If it's a video, return early
  if (mediaUrl && mediaType === "video") {
    return "I can't view the video file, but I can help with any questions about the post.";
  }

  // If there's an image, describe it using the vision model first
  var imageDescription = "";
  if (mediaUrl && mediaType === "image") {
    try {
      var visionKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || "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";
      var visionHeaders = {
        Authorization: "Bearer " + visionKey,
        "Content-Type": "application/json"
      };
      var visionPayload = {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: mediaUrl } },
              { type: "text", text: "Describe this image in detail, including any people, objects, text, colors, and the overall scene." }
            ]
          }
        ],
        max_tokens: 1000
      };
      var visionRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", visionPayload, { headers: visionHeaders, timeout: 30000 });
      if (visionRes.data && visionRes.data.choices && visionRes.data.choices[0] && visionRes.data.choices[0].message && visionRes.data.choices[0].message.content) {
        imageDescription = visionRes.data.choices[0].message.content;
      }
    } catch (err) {
      console.error("[generateAIResponse] image description failed:", err && err.message ? err.message : err);
    }
  }

  // Inject image description as context if available
  if (imageDescription) {
    finalMessages.push({
      role: "system",
      content: "[Image Description from Vision Model]: " + imageDescription
    });
  }

  // push normalized conversation history after system context
  for (var k = 0; k < normalized.length; k++) {
    finalMessages.push(normalized[k]);
  }

  // Select model (vision model only used for image description above)
  var selectedModel = "openai/gpt-oss-120b";

  // Collect API keys for rotation
  var apiKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5
  ].filter(Boolean);
  if (apiKeys.length === 0) {
    apiKeys.push("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");
  }

  // Retry loop with backoff and key rotation
  var maxTries = 10;
  var attempt = 0;
  var lastErr = null;
  while (attempt < maxTries) {
    attempt = attempt + 1;
    try {
      var groqModel = (selectedModel === "openai/gpt-oss-120b") ? "llama-3.3-70b-versatile" : selectedModel;
      var payload = {
        model: groqModel,
        messages: finalMessages,
        temperature: 0.8,
        max_tokens: 2000
      };

      var payloadStr = JSON.stringify(payload);
      var payloadBytes = Buffer.byteLength(payloadStr, 'utf-8');
      console.log("[generateAIResponse] payload size:", payloadBytes, "bytes");
      if (payloadBytes > 20000) {
        console.warn("[generateAIResponse] Payload too large:", payloadBytes, "bytes — truncating conversation");
        var truncated = [finalMessages[0]];
        if (finalMessages.length > 1 && finalMessages[1] && finalMessages[1].role === "system") {
          truncated.push(finalMessages[1]);
        }
        var msgs = [];
        for (var fi = 0; fi < finalMessages.length; fi++) {
          if (finalMessages[fi].role !== "system") msgs.push(finalMessages[fi]);
        }
        truncated = truncated.concat(msgs.slice(-5));
        finalMessages = truncated;
        payload.messages = finalMessages;
        payloadStr = JSON.stringify(payload);
        payloadBytes = Buffer.byteLength(payloadStr, 'utf-8');
        console.log("[generateAIResponse] after truncation payload size:", payloadBytes, "bytes");
        if (payloadBytes > 20000) {
          throw new Error("Payload still too large after truncation: " + payloadBytes + " bytes (max 20000)");
        }
      }

      var currentKey = apiKeys[(attempt - 1) % apiKeys.length];
      var headers = {
        Authorization: "Bearer " + currentKey,
        "Content-Type": "application/json"
      };

      var aiRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { headers: headers, timeout: 60000 });

      // Validate response shape
      if (!aiRes || !aiRes.data) {
        throw new Error("Empty response from Groq API");
      }

      // Different APIs sometimes put text in choices[0].message.content or choices[0].text
      if (aiRes.data.choices && Array.isArray(aiRes.data.choices) && aiRes.data.choices.length > 0) {
        var choice = aiRes.data.choices[0];
        var replyText = null;

        if (choice.message && typeof choice.message.content === "string") {
          replyText = choice.message.content;
        } else if (typeof choice.text === "string") {
          replyText = choice.text;
        } else {
          // fallback: try stringifying the choice object
          replyText = JSON.stringify(choice).slice(0, 2000);
        }

        if (replyText && typeof replyText === "string") {
          return replyText;
        } else {
          throw new Error("Could not extract reply text from model response");
        }
      } else {
        // unexpected response body
        var bodyPreview = JSON.stringify(aiRes.data).slice(0, 2000);
        throw new Error("Unexpected model response shape: " + bodyPreview);
      }
    } catch (err) {
      lastErr = err;
      console.error("[generateAIResponse] attempt", attempt, "failed:", err && err.message ? err.message : err);
      // if last attempt, throw
      if (attempt >= maxTries) {
        throw new Error("Model call failed after " + maxTries + " attempts: " + (err && err.message ? err.message : String(err)));
      }
      // backoff: wait attempt * 1500 ms
      await new Promise(function (resolve) { setTimeout(resolve, attempt * 1500); });
    }
  }

  // If we got here something unexpected happened
  throw new Error("generateAIResponse failed: " + (lastErr && lastErr.message ? lastErr.message : "unknown error"));
}


app.post('/chat', async (req, res) => {
  try {
    const messages = req.body.messages;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }
    const reply = await generateAIResponse(messages, null, null);
    res.json({ reply });
  } catch (err) {
    console.error('Chat route error:', err.message);
    res.status(500).json({ error: 'AI Post Writer failed' });
  }
});

// ================== Keys ==================
const openaiKey = process.env.openaiKey;
const tavilyKey = process.env.tavily;

// ================== Local date/time helpers ==================
function getLocalDateTime({ timeZone = "Africa/Lagos" } = {}) {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone
  }).format(now);
  return { dateStr, timeStr, full: `${dateStr} ${timeStr}` };
}

function isLocalDateOrTimeQuestion(q) {
  return /\b(today|what('?s| is) the date|date today|what day|current date|what time|time now|now)\b/i.test(q);
}

// ================== Tavily Search ==================
async function askTavily(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tavilyKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, max_results: 5 })
    });

    if (!response.ok) {
      console.error("❌ Tavily API error:", await response.text());
      return null;
    }

    const data = await response.json();
    if (!data.results) return null;
    return data.results.map(r => r.content).join("\n\n") || null;
  } catch (err) {
    console.error("❌ Tavily Fetch Error:", err);
    return null;
  }
}

// ================== Askify Response Generator ==================
async function generateAskifyResponse(messages) {
  try {
    const { full } = getLocalDateTime({ timeZone: "Africa/Lagos" });
    const lastUserContent = messages[messages.length - 1].content;

    // Inline checker to determine if web search is needed
    const needsWebSearch = (query) => {
      // Convert query to lowercase for case-insensitive matching
      const lowerQuery = query.toLowerCase();

      // Keywords indicating real-time or external data needs
      const realTimeKeywords = [
        'current', 'today', 'now', 'recent', 'latest', 'news',
        'weather', 'stock', 'price', 'update', 'trend', 'event'
      ];

      // Question types that likely require external data
      const questionPatterns = [
        /^what is the (current|latest|recent)/,
        /^who is the (current|new)/,
        /^what happened/,
        /^what is happening/,
        /^give me the latest/,
        /^how is the.*(today|now)/,
        /^weather in/,
        /^news about/,
        /^stock price of/,
        /^recent (event|news|development)/
      ];

      // Check for real-time keywords or question patterns
      const hasRealTimeKeyword = realTimeKeywords.some(keyword => lowerQuery.includes(keyword));
      const matchesQuestionPattern = questionPatterns.some(pattern => pattern.test(lowerQuery));

      // Additional heuristic: queries with specific dates or numbers might need validation
      const hasSpecificDateOrNumber = /\b(202[4-9]|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/.test(lowerQuery) || /\b[0-9]+ (million|billion|percent)\b/.test(lowerQuery);

      // Return true if any condition suggests a web search is needed
      return hasRealTimeKeyword || matchesQuestionPattern || hasSpecificDateOrNumber;
    };

    // Fetch web search results only if needed
    let searchResults = '';
    if (needsWebSearch(lastUserContent)) {
      searchResults = await askTavily(lastUserContent);
      if (!searchResults) searchResults = '';
    }

    // Append search results to user content if available
    let finalUserContent = lastUserContent;
    if (searchResults) {
      finalUserContent += `\n\nUse the following web search results to inform your answer (its not user-provided context):\n${searchResults}, if these search results do not align with the uer's question, make up your response to fit and satisfy the user, but if it matches it, make sure to reference from chat hostory to keep is conversational, and if you've got no match at all, completely ignore the search results`;
    }

    const finalMessages = [...messages.slice(0, -1), { role: 'user', content: finalUserContent }];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Askify, an AI assistant that gives clear, accurate, and concise answers." },
          { role: "system", content: `Current date/time (Africa/Lagos): ${full}` },
          ...finalMessages
        ],
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      console.error("❌ OpenAI API error:", await response.text());
      return "AI could not answer.";
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return "AI could not answer.";
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Askify Response Error:", err);
    return "AI could not answer.";
  }
}

app.post('/send-message', upload.single('file'), async (req, res) => {
  try {
    let sender, receiver, message = '', history = [], userMediaUrl = null, userMediaType = null;
    let generatedImageUrl = null;
    function ensureTimestamp(obj, fallbackTs) {
      if (!obj) return obj;
      if (!obj.timestamp) obj.timestamp = fallbackTs || new Date().toISOString();
      return obj;
    }
    if (req.file) {
      ({ sender, receiver } = req.body);
      message = req.body.message || '';
      if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'messages', resource_type: 'auto', public_id: `user_${Date.now()}` },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      userMediaUrl = uploadResult.secure_url;
      userMediaType = uploadResult.resource_type === 'image' ? 'image' : 'video';
    } else if (req.body.media_url) {
      ({ sender, receiver, message = '', media_url: userMediaUrl, media_type: userMediaType } = req.body);
      if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
    } else {
      ({ sender, receiver, message = '', history =[], media_url: userMediaUrl = null, media_type: userMediaType = null } = req.body || {});
      if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
    }
    if (!message && !userMediaUrl) return res.status(400).json({ error: 'Missing message or media' });
    const imagePromptRegex = /\b(?:create\s+(?:an?\s+)?image\s+of|imagine|draw(?:\s+(?:me|a))?|sketch(?:\s+(?:me|a))?|design(?:\s+(?:a|an))?|make(?:\s+me)?(?:\s+a)?\s?(?:picture|image|drawing)\s+of|generate(?:\s+(?:an?\s+)?(?:image|art|picture))|i\s+need\s+(?:a|an)?\s*(?:picture|image|drawing)\s+of|render(?:\s+(?:a|an))?)\b/i;
    const wantsAiImage = (receiver === 'textmobai') && (typeof message === 'string') && (imagePromptRegex.test(message)) && !req.file && !req.body.media_url;
    const userTs = new Date().toISOString();
    const userMsg = {
      sender,
      receiver,
      type: userMediaUrl ? userMediaType : 'text',
      message: message || '',
      ...(userMediaUrl ? { media_url: userMediaUrl, media_type: userMediaType } : {}),
      status: 'pending',
      read: false,
      timestamp: userTs
    };
    const selectCols = 'id, sender, receiver, type, message, media_url, media_type, status, read, timestamp';
    const { data: savedMessage, error: saveError } = await supabase
      .from('Messages')
      .insert([userMsg])
      .select(selectCols)
      .single();
    if (saveError || !savedMessage) {
      console.error('Message save error:', saveError);
      return res.status(500).json({ error: 'Failed to save message' });
    }
    const normalizedSavedMessage = ensureTimestamp(savedMessage, userTs);
    if (onlineUsers[receiver]) {
      onlineUsers[receiver].emit('new-message', normalizedSavedMessage);
      await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedMessage.id);
      if (onlineUsers[sender]) {
        onlineUsers[sender].emit('message-status', { messageId: savedMessage.id, status: 'delivered' });
      }
    }
    let aiReply = null;
    if (receiver === 'textmobai') {
      if (wantsAiImage) {
        try {
          const promptEncoded = encodeURIComponent(message);
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?nologo=true`;
          const imageResp = await fetch(pollinationsUrl);
          if (!imageResp.ok) throw new Error(`Pollinations fetch failed: ${imageResp.status} ${imageResp.statusText}`);
          const buffer = await imageResp.arrayBuffer ? Buffer.from(await imageResp.arrayBuffer()) : await imageResp.buffer();
          const cloudResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: 'messages', resource_type: 'image', public_id: `ai_${Date.now()}` },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(buffer);
          });
          generatedImageUrl = cloudResult.secure_url;
          const aiTs = new Date().toISOString();
          const aiImageMessage = {
            sender: 'textmobai',
            receiver: sender,
            type: 'image',
            message: 'Here is The Image You requested',
            media_url: generatedImageUrl,
            media_type: 'image',
            status: 'delivered',
            read: true,
            timestamp: aiTs
          };
          const { data: savedAiImageMessage, error: aiImageSaveError } = await supabase
            .from('Messages')
            .insert([aiImageMessage])
            .select(selectCols)
            .single();
          if (aiImageSaveError) {
            console.error('AI image save error:', aiImageSaveError);
          } else {
            aiReply = ensureTimestamp(savedAiImageMessage, aiTs);
            if (onlineUsers[sender]) {
              onlineUsers[sender].emit('new-message', aiReply);
              await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedAiImageMessage.id);
            }
          }
        } catch (pollErr) {
          console.error('Pollinations fetch/upload error:', pollErr);
        }
      } else {
        try {
          const { data: pastMessages } = await supabase
            .from('Messages')
            .select('sender, receiver, message')
            .or(`and(sender.eq.${sender},receiver.eq.textmobai),and(sender.eq.textmobai,receiver.eq.${sender})`)
            .order('timestamp', { ascending: false })
            .limit(9);
          const formattedHistory = (pastMessages || []).reverse().map(m => ({
            role: m.sender === sender ? 'user' : 'assistant',
            content: m.message
          }));
          const reply = await generateAIResponse(formattedHistory.concat([{ role: 'user', content: message || '' }]));
          const aiTs = new Date().toISOString();
          const aiMessage = {
            sender: 'textmobai',
            receiver: sender,
            type: 'text',
            message: reply,
            status: 'delivered',
            read: true,
            timestamp: aiTs
          };
          const { data: savedAiMessage, error: aiSaveError } = await supabase
            .from('Messages')
            .insert([aiMessage])
            .select(selectCols)
            .single();
          if (!aiSaveError && savedAiMessage) {
            aiReply = ensureTimestamp(savedAiMessage, aiTs);
            if (onlineUsers[sender]) {
              onlineUsers[sender].emit('new-message', aiReply);
              await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedAiMessage.id);
            }
          } else {
            console.error('AI text save error:', aiSaveError);
          }
        } catch (err) {
          console.error('Error in AI reply flow:', err);
        }
      }
    } else if (receiver === 'askify') {
      try {
        const { data: pastMessages } = await supabase
          .from('Messages')
          .select('sender, receiver, message')
          .or(`and(sender.eq.${sender},receiver.eq.askify),and(sender.eq.askify,receiver.eq.${sender})`)
          .order('timestamp', { ascending: false })
          .limit(9);
        const formattedHistory = (pastMessages || []).reverse().map(m => ({
          role: m.sender === sender ? 'user' : 'assistant',
          content: m.message
        }));
        const reply = await generateAskifyResponse(formattedHistory.concat([{ role: 'user', content: message || '' }]));
        const aiTs = new Date().toISOString();
        const aiMessage = {
          sender: 'askify',
          receiver: sender,
          type: 'text',
          message: reply,
          status: 'delivered',
          read: true,
          timestamp: aiTs
        };
        const { data: savedAiMessage, error: aiSaveError } = await supabase
          .from('Messages')
          .insert([aiMessage])
          .select(selectCols)
          .single();
        if (!aiSaveError && savedAiMessage) {
          aiReply = ensureTimestamp(savedAiMessage, aiTs);
          if (onlineUsers[sender]) {
            onlineUsers[sender].emit('new-message', aiReply);
            await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedAiMessage.id);
          }
        } else {
          console.error('Askify text save error:', aiSaveError);
        }
      } catch (err) {
        console.error('Error in Askify reply flow:', err);
      }
    }
    return res.json({ success: true, data: normalizedSavedMessage, aiReply });
  } catch (err) {
    console.error('Error in /send-message:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Run 10s after server start, stream messages and update chat_id in batches.
// Node 12 compatible, no optional chaining. Short comments inline.

var START_DELAY_MS = 10000; // wait 10s after server boot
var PAGE_SIZE = 1000;       // rows to read per page
var UPSERT_BATCH = 400;     // how many rows to upsert at once
var SMALL_PAUSE_MS = 60;    // short pause between pages
var CHUNK_PAUSE_MS = 200;   // pause between upsert chunks
var RETRY_PAUSE_MS = 2000;  // backoff on unexpected errors


// tiny helper delay
function delay(ms) {
  return new Promise(function (res) { setTimeout(res, ms); });
}

// // start background job after small delay
// setTimeout(function () {
//   processMessagesAndWriteChatId().catch(function (err) {
//     console.error('Background chat_id job failed:', err);
//   });
// }, START_DELAY_MS);

// main processor: pages through Messages table
async function processMessagesAndWriteChatId() {
  console.log('[chat_id job] starting message stream...');
  var offset = 0;
  var more = true;

  while (more) {
    try {
      var start = offset;
      var end = offset + PAGE_SIZE - 1;

      // read a page of messages (light fields only)
      var resp = await supabase
        .from('Messages')
        .select('id, sender, receiver')
        .order('id', { ascending: true })
        .range(start, end);

      if (resp.error) {
        // transient error: wait and retry this page
        console.error('[chat_id job] read error:', resp.error);
        await delay(RETRY_PAUSE_MS);
        continue;
      }

      var rows = resp.data || [];
      if (!rows || rows.length === 0) {
        // nothing left, finish loop
        more = false;
        break;
      }

      // prepare upsert payload: each item { id, chat_id }
      var upsertRows = rows.map(function (r) {
        return {
          id: r.id,
          chat_id: normalizeChatId(r.sender, r.receiver)
        };
      });

      // upsert in smaller chunks to avoid big single writes
      for (var i = 0; i < upsertRows.length; i += UPSERT_BATCH) {
        var chunk = upsertRows.slice(i, i + UPSERT_BATCH);
        try {
          // upsert will update existing rows because id is primary key
          var now = new Date().toISOString();
          // attach an optional audit field if you want to track progress
          var payload = chunk.map(function (c) {
            c._chatid_updated_at = now; // harmless extra metadata column if present
            return c;
          });

          var up = await supabase.from('Messages').upsert(payload, { onConflict: 'id' });
          if (up.error) {
            console.error('[chat_id job] upsert chunk error:', up.error);
            // small pause, then continue with next chunk
            await delay(CHUNK_PAUSE_MS);
            continue;
          }
        } catch (err) {
          console.error('[chat_id job] exception during upsert:', err);
          await delay(RETRY_PAUSE_MS);
        }
      }

      // advance to next page
      offset = offset + PAGE_SIZE;

      // polite pause so CPU/IO can breathe
      await delay(SMALL_PAUSE_MS);
    } catch (err) {
      console.error('[chat_id job] unexpected loop error:', err);
      await delay(RETRY_PAUSE_MS);
    }
  } // end while

  console.log('[chat_id job] finished scanning all messages.');
}

app.get('/get-messages', async function (req, res) {
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var limit = req.query.limit || 50;
  var offset = req.query.offset || 0;

  if (!user1 || !user2) {
    return res.status(400).json({ error: 'user1 and user2 required' });
  }

  var chatId = normalizeChatId(user1, user2);

  // fallback (original behavior)
  try {
    var resp = await supabase
      .from('Messages')
      .select('*')
      .or(
        'and(sender.eq.' + user1 + ',receiver.eq.' + user2 + '),' +
        'and(sender.eq.' + user2 + ',receiver.eq.' + user1 + ')'
      )
      .order('timestamp', { ascending: true })
      .range(offset, parseInt(offset) + parseInt(limit) - 1);

    if (resp.error) throw resp.error;
    res.json(resp.data || []);
  } catch (err) {
    console.error('/get-messages fallback failed:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});


app.get('/search-messages', async (req, res) => {
  const { query, user } = req.query;
  try {
    const { data, error } = await supabase
      .from('Messages')
      .select('*')
      .ilike('message', `%${query}%`)
      .or(`sender.eq.${user},receiver.eq.${user}`)
      .order('timestamp', { ascending: false })
      .limit(30);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

function extractMeta(html, href) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
  const contentMatch = html.match(/<meta name="content" content="(.*?)"/i);
  const ogDesc = html.match(/<meta property="og:description" content="(.*?)"/i);
  const ogImg = html.match(/<meta property="og:image" content="(.*?)"/i);
  const iconMatch =
    html.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+rel=["']shortcut icon["'][^>]+href=["']([^"']+)["']/i);

  const desc =
    (descMatch && descMatch[1]) ||
    (contentMatch && contentMatch[1]) ||
    (ogDesc && ogDesc[1]) ||
    "";

  let favicon = "";
  if (iconMatch && iconMatch[1]) {
    favicon = iconMatch[1];
    if (favicon.startsWith("/")) {
      const u = new URL(href);
      favicon = u.origin + favicon;
    }
  } else {
    const u = new URL(href);
    favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}`;
  }

  return {
    title: titleMatch ? titleMatch[1] : href,
    desc,
    image: ogImg ? ogImg[1] : "",
    favicon,
  };
}

async function checkAndDeliverPendingMessages(username) {
  try {
    const { data: pending, error } = await supabase
      .from("Messages")
      .select("*")
      .eq("receiver", username)
      .eq("status", "pending");
    if (error) throw error;
    if (!pending || !pending.length) return;
    for (const msg of pending) {
      if (onlineUsers[msg.receiver]) {
        onlineUsers[msg.receiver].emit("new-message", msg);
        await supabase
          .from("Messages")
          .update({ status: "delivered" })
          .eq("id", msg.id);
        if (onlineUsers[msg.sender]) {
          onlineUsers[msg.sender].emit("message-status", {
            messageId: msg.id,
            status: "delivered"
          });
        }
      }
    }
  } catch (err) {
    console.error("Delivery check error:", err);
  }
}

function checkUserOnlineStatus(username) {
  return !!onlineUsers[username];
}

const SummarizerManager = require("node-summarizer").SummarizerManager;
// In-memory post cache
// -------------------------------------------------------------
// GET /trending-hashtags
// Extracted dynamically from recent 200 posts to avoid caching all posts
// -------------------------------------------------------------
app.get("/trending-hashtags", async (req, res) => {
  try {
    const TREND_LIMIT = 4;
    const { data: posts, error } = await supabase2
      .from("Posts")
      .select("hashtags, created_at, text")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error || !posts || posts.length === 0) {
      return res.json([
        { tag: "textmob", count: 15 },
        { tag: "africanvoice", count: 12 },
        { tag: "hidden_gem", count: 8 },
        { tag: "tech", count: 5 }
      ].slice(0, TREND_LIMIT));
    }

    const counts = {};
    const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;

    posts.forEach(p => {
      let tags = [];
      if (Array.isArray(p.hashtags)) {
        tags = p.hashtags.map(t => t.replace(/^#/, ''));
      } else if (p.text) {
        let match;
        while ((match = hashtagRegex.exec(p.text)) !== null) {
          if (match[1]) tags.push(match[1]);
        }
      }
      tags.forEach(t => {
        const lower = t.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      });
    });

    const sortedTags = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
      .slice(0, TREND_LIMIT);

    if (sortedTags.length === 0) {
      return res.json([{ tag: "textmob", count: 1 }]);
    }

    res.json(sortedTags);
  } catch (err) {
    console.error("Error generating trending tags", err);
    res.status(500).json({ error: "Failed" });
  }
});

// -------------------------------------------------------------
// GET/POST /get-posts
// -------------------------------------------------------------
app.post("/get-posts", express.json(), async (req, res) => {
  try {
    const params = req.body;
    const { username, tab = "foryou", page = 1, seenIds = "" } = params;
    const limit = parseInt(params.limit, 10) || 10;
    const pg = parseInt(page, 10) || 1;

    const isPublic = !username;
    const POST_LIMIT = isPublic ? 500 : 300;

    // Determine the user's social graph
    let userFollowing = new Set();
    let userFriends = new Set();
    let blockedUsers = new Set();
    if (!isPublic) {
      try {
        const { data: me } = await supabase
          .from("users")
          .select("following, friends, blocked_users")
          .eq("username", username)
          .single();
        userFollowing = new Set(me?.following || []);
        userFriends = new Set(me?.friends || []);
        blockedUsers = new Set(me?.blocked_users || []);
      } catch { /* non-fatal */ }
    }

    const isColdStart = !isPublic && userFollowing.size === 0 && userFriends.size === 0;

    // ─── NEW UNIFIED SCORING ENGINE ───
    // Used by both /get-posts and /snaps-feed
    const isVideo = file => /\.(mp4|webm|ogg)$/i.test(String(file || ''));

    function computeScore(post, ctx) {
      const ageHours = Math.max(0.1, ctx.ageHours);
      const likes = (post.likes || []).length;
      const comments = (post.comments || []).length;
      const reactions = (post.reactions || []).length;
      const contentType = post.type || 'post';

      // Verified author boost: +5.0 if author is verified
      let verifiedBoost = 0;
      if (memoryDb && memoryDb.isReady && post.username) {
        const author = memoryDb.findUser(post.username);
        if (author && String(author.verified) === "true") verifiedBoost = 5.0;
      }

      // Boost score from paid boosts
      const boostScoreValue = (post.boost_score || 0) * 2.0;

      // Media bonus — removed (text-only posts deserve a fair shot)
      const mediaBonus = 0;
      const videoLengthBonus = 0;

      // Half-life based on tab
      const halfLife = ctx.tab === 'following' ? 36 : 12;
      const freshness = Math.pow(0.5, ageHours / halfLife);

      const totalEngagement = likes + (comments * 3) + (reactions * 1.5);
      const velocity = totalEngagement / Math.pow(ageHours + 1, 1.3);

      // Mild follow nudge (replaces affinityMul completely)
      const followNudge = ctx.following.has(post.username) ? 1.2 : 1.0;

      // Per-user content type weight (from feed_prefs)
      const typeWeight = (ctx.contentTypeWeights && ctx.contentTypeWeights[contentType]) || 1.0;

      // Seen penalty: absolute kill if already viewed
      const seenPenalty = ctx.seenIds.has(String(post.id)) ? 0 : 1.0;

      // Liked penalty: absolute kill if user has already liked this post
      const likedPenalty = (ctx.username && Array.isArray(post.likes) && post.likes.includes(ctx.username)) ? 0 : 1.0;

      // Self penalty: don't show own posts
      const selfPenalty = post.username === ctx.username ? 0.1 : 1.0;

      // Negative signal suppression
      let negPenalty = 1.0;
      if (ctx.negativeSignals) {
        const sigs = ctx.negativeSignals.get(post.username) || [];
        for (const s of sigs) {
          if (s.type === 'hide') { negPenalty = 0; break; }
          if (s.type === 'not_interested' && s.contentType === contentType) negPenalty *= 0.1;
          if (s.type === 'skip' && s.contentType === contentType) negPenalty *= 0.3;
        }
        // If 3+ skips on same author for any type, suppress entirely
        const skipCount = sigs.filter(s => s.type === 'skip').length;
        if (skipCount >= 3) negPenalty = 0;
      }

      // Per-category weight multiplier (from feed_prefs.categoryWeights)
      let catWeight = 1.0;
      const postCats = post.categories || [];
      if (ctx.categoryWeights) {
        for (const c of postCats) {
          const w = ctx.categoryWeights[c];
          if (w !== undefined) { catWeight = w; break; }
        }
        // Fallback: if none of the post's categories have a weight, check if user has the category as interest
        if (catWeight === 1.0 && ctx.userCategories && postCats.length > 0) {
          if (postCats.some(c => ctx.userCategories.includes(c))) catWeight = 1.3;
        }
      } else if (ctx.userCategories && ctx.userCategories.length > 0) {
        if (postCats.some(c => ctx.userCategories.includes(c))) catWeight = 1.3;
      }

      const freshnessWeight = ctx.tab === 'following' ? 15.0 : 10.0;
      const velocityWeight = ctx.tab === 'following' ? 5.0 : 4.0;

      const score = (
        (freshness * freshnessWeight) +
        (velocity * velocityWeight) +
        boostScoreValue +
        mediaBonus +
        videoLengthBonus
      ) * followNudge * typeWeight * seenPenalty * likedPenalty * selfPenalty * negPenalty * catWeight;

      if (ctx.username && post.id && process.env.LOG_SCORES) {
        console.log(`[score] user=${ctx.username} post=${post.id} score=${score.toFixed(4)} freshness=${freshness.toFixed(4)} velocity=${velocity.toFixed(4)} followNudge=${followNudge} typeWeight=${typeWeight} seenPenalty=${seenPenalty} negPenalty=${negPenalty} catWeight=${catWeight}`);
      }

      return score + verifiedBoost + (Math.random() * 0.2);
    }

    // Build user context for scoring
    async function buildUserContext(username, tab, seenIds, pg, limit) {
      const { following: fSet, friends: frSet, blocked: bSet } = memoryDb && memoryDb.isReady
        ? memoryDb.getUserSets(username)
        : { following: new Set(), friends: new Set(), blocked: new Set() };

      const following = new Set([...fSet, ...frSet]);

      // Feed preferences
      let feedPrefs = {};
      let userCategories = [];
      let negativeSignals = new Map();
      if (memoryDb && memoryDb.isReady) {
        const userData = memoryDb.findUser(username);
        if (userData) {
          feedPrefs = userData.feed_prefs || {};
          userCategories = userData.categories || [];
          negativeSignals = memoryDb.getNegativeSignals(username) || new Map();
        }
      }

      const clientSeenIds = new Set((seenIds || '').split(',').filter(Boolean));
      if (memoryDb && memoryDb.isReady) {
        const serverSeen = memoryDb.getSeenPosts(username);
        serverSeen.forEach(id => clientSeenIds.add(id));
      } else {
        if (!userPostSeenMap.has(username)) userPostSeenMap.set(username, new Set());
        userPostSeenMap.get(username).forEach(id => clientSeenIds.add(id));
      }

      const categoryWeights = feedPrefs.categoryWeights || {};
      if (process.env.LOG_SCORES && Object.keys(categoryWeights).length > 0) {
        console.log(`[context] user=${username} categoryWeights=${JSON.stringify(categoryWeights)} contentTypeWeights=${JSON.stringify(feedPrefs.contentTypeWeights)}`);
      }

      return {
        username,
        following: new Set([...fSet, ...frSet]),
        blocked: bSet,
        tab,
        seenIds: clientSeenIds,
        contentTypeWeights: feedPrefs.contentTypeWeights || {},
        categoryWeights,
        userCategories,
        negativeSignals,
        ageHours: 0,
      };
    }

    // Last N posts pool (configurable, defaults to 700)
    const POST_POOL_LIMIT = 700;

    // ─── MemoryDB fast path (unified scoring) ───
    if (memoryDb && memoryDb.isReady && !isPublic) {
      let pool = memoryDb.posts.filter(p =>
        p && p.id && p.username &&
        !p.disabled &&
        !(p.type && p.type.startsWith('group')) &&
        !blockedUsers.has(p.username)
      );

      // Sort by created_at desc and take last POST_POOL_LIMIT
      pool.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      pool = pool.slice(0, POST_POOL_LIMIT);

      if (tab === 'following') {
        if (isColdStart) return res.json([]);
        const { following: fSet, friends: frSet } = memoryDb.getUserSets(username);
        const connected = new Set([...fSet, ...frSet]);
        pool = pool.filter(p => connected.has(p.username));
      }

      const ctx = await buildUserContext(username, tab, seenIds, pg, limit);
      const now = Date.now();
      const HOUR = 3600000;

      const scored = pool.map(p => {
        const ageMs = now - new Date(p.created_at).getTime();
        return {
          ...p,
          _score: computeScore(p, { ...ctx, ageHours: Math.max(0.1, ageMs / HOUR) })
        };
      });

      scored.sort((a, b) => b._score - a._score);

      // Diversity: max 2 per author (4 for cold-start)
      function diversify(arr, targetCount) {
        const result = [];
        const skipped = [];
        const userCount = new Map();
        const maxPer = isColdStart ? 4 : 2;
        for (const post of arr) {
          if (result.length >= targetCount * 2) break;
          const cnt = userCount.get(post.username) || 0;
          if (cnt < maxPer) {
            result.push(post);
            userCount.set(post.username, cnt + 1);
          } else {
            skipped.push(post);
          }
        }
        if (result.length < targetCount * 2) {
          for (const post of skipped) {
            if (result.length >= targetCount * 2) break;
            result.push(post);
          }
        }
        const final = [];
        const fc = new Map();
        for (const post of result) {
          if (final.length >= targetCount) break;
          const cnt = fc.get(post.username) || 0;
          if (cnt < maxPer) {
            final.push(post);
            fc.set(post.username, cnt + 1);
          } else {
            final.push(post);
          }
        }
        return final.length >= targetCount ? final : result.slice(0, targetCount);
      }

      const startIdx = (pg - 1) * limit;
      const bestNext = scored.slice(startIdx, startIdx + limit * 2);
      const final = diversify(bestNext, limit).map(({ _score, ...p }) => p);

      final.forEach(p => memoryDb.markPostSeen(username, p.id));

      // Attach verified flags
      const unames = [...new Set(final.map(p => p.username))];
      const vMap = memoryDb.getVerifiedMap(unames);
      final.forEach(p => p.verified = vMap[p.username] || false);

      return res.json(final);
    }
    // ─── End MemoryDB fast path ───

    // ─── Fallback paths (DB query) ───
    const clientSeenIds = new Set((seenIds || '').split(',').filter(Boolean));
    if (username && !isPublic) {
      if (!userPostSeenMap.has(username)) userPostSeenMap.set(username, new Set());
      userPostSeenMap.get(username).forEach(id => clientSeenIds.add(id));
    }
    const NOW = Date.now();
    const HOUR = 3600000;

    if (tab === 'following') {
      if (!username || isColdStart) {
        const { data: posts } = await supabase2
          .from('Posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(POST_POOL_LIMIT);
        if (!posts) return res.json([]);
        const filtered = posts.filter(p => p && p.id && p.username && !(p.disabled === true));
        const ctx = await buildUserContext(username, tab, seenIds, pg, limit);
        const scored = filtered.map(p => ({
          ...p,
          _score: computeScore(p, { ...ctx, ageHours: Math.max(0.1, (NOW - new Date(p.created_at).getTime()) / HOUR) })
        }));
        scored.sort((a, b) => b._score - a._score);
        const sliced = scored.slice((pg - 1) * limit, (pg - 1) * limit + limit).map(({ _score, ...p }) => p);
        sliced.forEach(p => {
          clientSeenIds.add(String(p.id));
          if (username) {
            if (memoryDb && memoryDb.isReady) memoryDb.markPostSeen(username, p.id);
            else if (!isPublic) { if (!userPostSeenMap.has(username)) userPostSeenMap.set(username, new Set()); userPostSeenMap.get(username).add(String(p.id)); }
          }
        });
        if (clientSeenIds.size > 2000) {
          const iter = clientSeenIds.keys();
          for (let i = 0; i < 500; i++) clientSeenIds.delete(iter.next().value);
        }
        return res.json(sliced);
      }
      const followingsAndFriends = [...new Set([...userFollowing, ...userFriends])].filter(u => !blockedUsers.has(u));
      if (followingsAndFriends.length === 0) return res.json([]);

      const { data: posts } = await supabase2
        .from('Posts')
        .select('*')
        .in('username', followingsAndFriends)
        .order('created_at', { ascending: false })
        .limit(POST_POOL_LIMIT);
      if (!posts) return res.json([]);
      const filtered = posts.filter(p => p && p.id && p.username && !(p.type || '').toLowerCase().startsWith('group') && !(p.disabled === true));

      const ctx = await buildUserContext(username, tab, seenIds, pg, limit);
      const scored = filtered.map(p => ({
        ...p,
        _score: computeScore(p, { ...ctx, ageHours: Math.max(0.1, (NOW - new Date(p.created_at).getTime()) / HOUR) })
      }));
      scored.sort((a, b) => b._score - a._score);
      const startIndex = (pg - 1) * limit;
      const final = scored.slice(startIndex, startIndex + limit).map(({ _score, ...p }) => p);
      final.forEach(p => {
        clientSeenIds.add(String(p.id));
        if (username) {
          if (memoryDb && memoryDb.isReady) memoryDb.markPostSeen(username, p.id);
          else if (!isPublic) { if (!userPostSeenMap.has(username)) userPostSeenMap.set(username, new Set()); userPostSeenMap.get(username).add(String(p.id)); }
        }
      });
      if (clientSeenIds.size > 2000) {
        const iter = clientSeenIds.keys();
        for (let i = 0; i < 500; i++) clientSeenIds.delete(iter.next().value);
      }
      return res.json(final);
    }

    // Tab is "foryou" — fallback
    let fetchedPosts = [];
    try {
      const [meResult, postsResult] = await Promise.all([
        !isPublic ? supabase.from('users').select('following, friends, blocked_users').eq('username', username).single() : Promise.resolve({ data: null }),
        supabase2.from('Posts').select('*').order('created_at', { ascending: false }).limit(POST_POOL_LIMIT)
      ]);
      if (meResult?.data) {
        userFollowing = new Set(meResult.data.following || []);
        userFriends = new Set(meResult.data.friends || []);
        blockedUsers = new Set(meResult.data.blocked_users || []);
      }
      fetchedPosts = postsResult.data || [];
    } catch {
      const { data } = await supabase2.from('Posts').select('*').order('created_at', { ascending: false }).limit(POST_POOL_LIMIT);
      fetchedPosts = data || [];
    }

    if (!fetchedPosts.length) return res.json([]);

    const eligible = fetchedPosts.filter(p =>
      p && p.id && p.username && !p.group_id && !p.isGroupPost && !blockedUsers.has(p.username) && !(p.disabled === true)
    );
    if (!eligible.length) return res.json([]);

    const ctx = await buildUserContext(username, 'foryou', seenIds, pg, limit);

    const scoredPosts = eligible.map(p => ({
      ...p,
      _score: computeScore(p, { ...ctx, ageHours: Math.max(0.1, (NOW - new Date(p.created_at).getTime()) / HOUR) })
    }));
    scoredPosts.sort((a, b) => b._score - a._score);

    // Diversity pass
    function diversify(arr, targetCount) {
      const result = [];
      const skipped = [];
      const userCount = new Map();
      const maxPer = (isColdStart || isPublic) ? 4 : 2;
      for (const post of arr) {
        if (result.length >= targetCount) break;
        const cnt = userCount.get(post.username) || 0;
        if (cnt < maxPer) {
          result.push(post);
          userCount.set(post.username, cnt + 1);
        } else {
          skipped.push(post);
        }
      }
      if (result.length < targetCount) {
        for (const post of skipped) {
          if (result.length >= targetCount) break;
          result.push(post);
        }
      }
      return result;
    }

    const humanPosts = scoredPosts.filter(p => p.username !== 'textmobai');
    const aiPosts = scoredPosts.filter(p => p.username === 'textmobai' && !clientSeenIds.has(String(p.id)));

    const startIdx = (pg - 1) * limit;
    const bestNext = humanPosts.slice(startIdx, startIdx + limit * 2);
    const diversified = diversify(bestNext, limit);

    // Interleave AI posts every 5th position
    const finalFeed = [];
    let aiIdx = 0;
    for (let i = 0; i < diversified.length; i++) {
      finalFeed.push({ ...diversified[i] });
      delete finalFeed[finalFeed.length - 1]._score;
      if ((i + 1) % 5 === 0 && aiIdx < aiPosts.length) {
        finalFeed.push({ ...aiPosts[aiIdx++] });
        delete finalFeed[finalFeed.length - 1]._score;
      }
    }

    const unames = [...new Set(finalFeed.map(p => p.username))];
    if (unames.length > 0) {
      const { data: authors } = await supabase
        .from('users')
        .select('username, verified')
        .in('username', unames);
      if (authors) {
        const vm = {};
        authors.forEach(u => vm[u.username] = u.verified || false);
        finalFeed.forEach(p => p.verified = vm[p.username] || false);
      }
    }

    finalFeed.forEach(p => {
      clientSeenIds.add(String(p.id));
      if (username) {
        if (memoryDb && memoryDb.isReady) memoryDb.markPostSeen(username, p.id);
        else if (!isPublic) { if (!userPostSeenMap.has(username)) userPostSeenMap.set(username, new Set()); userPostSeenMap.get(username).add(String(p.id)); }
      }
    });
    if (clientSeenIds.size > 2000) {
      const iter = clientSeenIds.keys();
      for (let i = 0; i < 500; i++) clientSeenIds.delete(iter.next().value);
    }

    res.json(finalFeed);

  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/get-live-posts", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    // Fetch active live posts directly from Supabase
    const { data: livePosts, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("type", "live")
      .order("created_at", { ascending: false });

    if (error || !livePosts) {
      return res.json([]);
    }

    // Filter out posts from blocked users if the blocklist is available
    let blockedUsers = new Set();
    try {
      const { data: me } = await supabase
        .from("users")
        .select("blocked_users")
        .eq("username", username)
        .single();
      blockedUsers = new Set(me?.blocked_users || []);
    } catch { /* non-fatal */ }

    const eligible = livePosts.filter(p => p && p.username && !blockedUsers.has(p.username) && !(p.disabled === true));

    // Optional: Rank by creator's mobcoins to prioritize popular creators
    const authorUsernames = [...new Set(eligible.map(p => p.username))];
    if (authorUsernames.length > 0) {
      try {
        const { data: authorsInfo } = await supabase
          .from("users")
          .select("username, mobcoins")
          .in("username", authorUsernames);

        if (authorsInfo) {
          const mobcoinsMap = {};
          authorsInfo.forEach(u => {
            mobcoinsMap[u.username] = u.mobcoins || 0;
          });
          eligible.sort((a, b) => {
            const scoreA = new Date(a.created_at).getTime() + (mobcoinsMap[a.username] || 0) * 1e9;
            const scoreB = new Date(b.created_at).getTime() + (mobcoinsMap[b.username] || 0) * 1e9;
            return scoreB - scoreA;
          });
        }
      } catch { /* fallback to default order */ }
    }

    res.json(eligible);

  } catch (err) {
    console.error("Live Feed Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-suggestions-feed", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch user's connections
    const { data: you, error } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;
    if (!you) {
      console.warn(`[Suggestions] User "${username}" not found.`);
      return res.json([]);
    }

    const friends = you.friends || [];
    const following = you.following || [];
    const connected = new Set(friends.concat(following).concat(username));

    // Fetch all users
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("username, fullname, profile_pic, friends, followers");
    if (userErr) throw userErr;

    const scored = users
      .filter(function (u) {
        return !connected.has(u.username);
      })
      .map(function (u) {
        var score = 0;

        var uFriends = u.friends || [];
        var uFollowers = u.followers || [];

        // Mutual friends
        var mutuals = uFriends.filter(function (f) {
          return friends.indexOf(f) !== -1;
        }).length;
        score += mutuals * 5;

        // Shared followings
        var sharedFollowings = uFriends.filter(function (f) {
          return following.indexOf(f) !== -1;
        }).length;
        score += sharedFollowings * 2;

        // Popularity
        score += uFollowers.length * 0.5;

        // Randomness (TikTok-style injection)
        score += Math.random() * 2;

        return {
          username: u.username,
          fullname: u.fullname,
          profile_pic: u.profile_pic,
          mutuals: mutuals,
          score: score
        };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 4);

    res.json(scored);
  } catch (err) {
    console.error("Suggestion Feed Error:", err);
    res.status(500).json({ error: "Failed to load suggestions" });
  }
});

// POST endpoint to summarize a user's bio
app.post('/summarize-bio', async (req, res) => {
  const { bio } = req.body;

  if (!bio || typeof bio !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing bio text.' });
  }

  try {
    const summarizer = new SummarizerManager(bio, 2); // Summarize into 2 sentences
    const summaryObj = await summarizer.getSummaryByRank();
    res.json({ summary: summaryObj.summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to summarize bio.' });
  }
});


app.get('/get-user-postse', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    // 1) Fetch all the user’s posts (including likes[] and comments[])
    const { data: posts, error: postsErr } = await supabase2
      .from('Posts')                     // <-- make sure this matches your exact table name
      .select('id, text, media, likes, comments, created_at')
      .eq('username', username)
      .order('created_at', { ascending: false });

    if (postsErr) throw postsErr;
    if (!posts || posts.length === 0) return res.json([]);

    // 2) Fetch the user’s profile info once
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('fullname, profile_pic')
      .eq('username', username)
      .single();

    if (userErr) throw userErr;

    // 3) Stitch together the final shape
    const shaped = posts.map(post => ({
      id: post.id,
      text: post.text,
      media: post.media,
      fullname: user.fullname,
      profile_pic: user.profile_pic,
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments : []
    }));
    res.json(shaped)

  } catch (err) {
    console.error('Error fetching posts:', err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/events', async (req, res) => {
  const { username, title, text, scheduled_for, location, registration_url, visib } = req.body;
  if (!username || !title.trim() || !text.trim() || !scheduled_for) {
    return res.status(400).json({ error: 'username, title, text, and scheduled_for are required' });
  }

  const { data, error } = await supabase2
    .from('Posts')
    .insert([{
      username,
      title: title.trim(),
      text: text.trim(),
      scheduled_for,
      location: location || null,
      registration_url: registration_url || null,
      type: 'event',
      visib
    }])
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Update memoryDB immediately
  if (memoryDb && memoryDb.isReady && data) {
    memoryDb.upsertPost(data);
  }

  res.json({ event: data });
});

// --- Helpers ---
async function logActivityRow(row) {
  var insert = await supabase.from('user_activity').insert([row]);
  if (insert.error) {
    throw insert.error;
  }
  return insert.data[0];
}

async function getUserIdFromUsername(username) {
  if (!username) return null;
  var q = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .limit(1)
    .maybeSingle();
  if (q.error) {
    throw q.error;
  }
  if (!q.data) return null;
  return q.data.id || null;
}

app.get('/default-avatar', (req, res) => {
  res.redirect(301, 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg');
});
app.get('/events-feed', async (req, res) => {
  const now = new Date().toISOString();
  const sevenDays = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase2
    .from('Posts')
    .select('id, username, title, text, scheduled_for, location, registration_url, likes')
    .eq('type', 'event')
    .order('scheduled_for', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data });
});

// request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, req.body);
  next();
});

// — GET all groups
app.get('/groups', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data, error } = await supabase2
      .from('groups')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    const filteredGroups = (data || []).filter(function (group) {
      // Guard against null/undefined groups
      if (!group) return false;

      // Guard payload/users
      const users = (group.payload && Array.isArray(group.payload.users)) ? group.payload.users : [];

      // Determine group visibility based on type and membership
      const isPublicGroup = group.type === 'public';
      const isPrivateGroup = ['secret', 'private', 'private_visible'].includes(group.type);
      const isGroupMember = users.some(function (u) { return u.user_id === username; });

      // Show public groups to everyone, private groups only to members
      return isPublicGroup || (isPrivateGroup && isGroupMember);
    });

    res.json(filteredGroups);
  } catch (err) {
    console.error('GET /groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — GET one group
app.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data, error } = await supabase2
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) return res.status(404).json({ error: error.message });

    // normalize payload
    if (!data.payload) data.payload = {};
    if (!Array.isArray(data.payload.users)) data.payload.users = [];

    var accessDenied = false;
    if ((data.type === 'secret' || data.type === 'private_visible') && !data.payload.users.some(function (u) { return u.user_id === username; })) {
      accessDenied = true;
    }

    if (accessDenied) {
      return res.status(403).json({ error: 'Access denied to private group' });
    }

    res.json(data);
  } catch (err) {
    console.error(`GET /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/groups/:groupId/light', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;

    // If username is provided, we need to check membership for private groups
    const checkMembership = username !== undefined;

    const { data, error } = await supabase2
      .from('groups')
      .select('*') // Need full record to check payload.users
      .eq('id', groupId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: error && error.message || 'Group not found' });
    }

    // Normalize payload
    if (!data.payload) data.payload = {};
    if (!Array.isArray(data.payload.users)) data.payload.users = [];

    // Determine access based on group type and membership
    let hasAccess = false;

    if (data.type === 'public') {
      // Public groups are always accessible
      hasAccess = true;
    } else if (checkMembership && username) {
      // For private groups, check if user is a member
      hasAccess = data.payload.users.some(function (u) {
        return u.user_id === username;
      });
    } else {
      // If no username provided for private group, deny access
      hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return the light version
    res.json({
      id: groupId,
      name: data.name,
      profile_pic: data.profile_url || data.profile_pic // Handle both field names
    });

  } catch (err) {
    console.error(`GET /groups/${req.params.groupId}/light error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// — CREATE group
app.post('/groups', async (req, res) => {
  try {
    const {
      name,
      initialAdmins = [],
      members = [],
      username,
      type = 'public',
      description = '',
      settings = { post_approval: false, event_calendar: true }
    } = req.body;

    if (!name || !username) {
      return res.status(400).json({ error: 'Missing name or username' });
    }

    // validate type
    if (!['public', 'private_visible', 'secret'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type setting' });
    }

    const users = [
      { user_id: username, role: 'admin', joined_at: new Date().toISOString(), badges: { helpful: 0 } },
      ...initialAdmins.map(function (u) { return { user_id: u, role: 'admin', joined_at: new Date().toISOString(), badges: { helpful: 0 } }; }),
      ...members.map(function (u) { return { user_id: u, role: 'member', joined_at: new Date().toISOString(), badges: { helpful: 0 } }; })
    ];

    const { data, error } = await supabase2
      .from('groups')
      .insert([{
        name,
        created_by: username,
        type, // store as `type`
        payload: {
          users,
          messages: [],
          description,
          settings,
          chat_count: 0,
          badges: {}
        }
      }])
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // notify members for private/secret groups (if any were added on creation)
    if ((type === 'private_visible' || type === 'secret') && members.length > 0) {
      const notification = {
        id: Date.now(),
        message: `You were added to the ${type} group "${name}" by ${username}.`,
        read: false,
        created_at: new Date().toISOString(),
        type: 'group',
        sender: username,
      };
      for (var i = 0; i < members.length; i++) {
        const member = members[i];
        await addNotification(member, notification);

        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('username', member)
          .single();

        if (user && user.email) {
          await sendNotificationEmail(
            user.email,
            `You've been added to ${name}`,
            `
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi there,</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;"><strong>${username}</strong> added you to the ${type} group <strong>"${name}"</strong>.</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color:#2563eb;border-radius:8px;">
                  <a href="https://textmob.web.app/group/${encodeURIComponent(name)}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Open Group</a>
                </td>
              </tr>
            </table>
            `
          );
        }

        io.to(`user_${member}`).emit('notification', notification);
      }
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — JOIN group
app.post('/groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type, name')
      .eq('id', groupId)
      .single();

    if (grpErr) return res.status(500).json({ error: grpErr.message });

    // normalize payload
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (typeof grp.payload.chat_count !== 'number') grp.payload.chat_count = 0;

    if (grp.type === 'secret') {
      return res.status(403).json({ error: 'Cannot join secret group without invitation' });
    }
    if (grp.payload.users.some(function (u) { return u.user_id === username; })) {
      return res.status(400).json({ error: 'Already a member' });
    }

    const updated = {
      ...grp.payload,
      users: [...grp.payload.users, { user_id: username, role: 'member', joined_at: new Date().toISOString(), badges: { helpful: 0 } }],
      chat_count: (grp.payload.chat_count || 0) + 1
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);

    if (updErr) return res.status(500).json({ error: updErr.message });

    const admins = updated.users.filter(function (u) { return u.role === 'admin'; }).map(function (u) { return u.user_id; });
    const notif = {
      id: Date.now(),
      message: `${username} joined the group.`,
      read: false,
      created_at: new Date().toISOString(),
      type: 'group',
      sender: username,
    };

    for (var j = 0; j < admins.length; j++) {
      const admin = admins[j];
      if (admin !== username) {
        await addNotification(admin, notif);
        io.to(`user_${admin}`).emit('notification', notif);
      }
    }

    io.to(`group_${groupId}`).emit('group_member_added', { user_id: username });
    res.json({ success: true });
  } catch (err) {
    console.error(`POST /groups/${req.params.groupId}/join error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// New server routes needed by AccountsCenter.jsx
// Add these to your main Express server file
// ─────────────────────────────────────────────────────────────────────────────

app.get("/account-stats", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is actually required" });

    // ── Mobcoins — reuse your existing /t/wallet logic ──────────
    let mobcoins = 0;
    try {
      const { data: walletUser } = await supabase
        .from("users")
        .select("mobcoins, username")
        .eq("username", username)
        .single();
      mobcoins = walletUser?.mobcoins || 0;
    } catch { /* non-fatal */ }

    // ── Followers + streak ────────────────────────────────────────
    let followers = 0;
    let postingStreak = 0;
    try {
      const { data: user } = await supabase
        .from("users")
        .select("followers, posting_streak")
        .eq("username", username)
        .single();
      followers = user?.followers?.length ?? 0;
      postingStreak = user?.posting_streak ?? 0;
    } catch { /* non-fatal */ }

    // ── Post count ────────────────────────────────────────────────
    let postCount = 0;
    try {
      const { count } = await supabase2
        .from("Posts")
        .select("id", { count: "exact", head: true })
        .eq("username", username);
      postCount = count || 0;
    } catch { /* non-fatal */ }

    // ── Hall of Fame rank — reuse your leaderboard cache ─────────
    // The leaderboard route already has the cache built and sorted.
    // We just call the same logic here instead of duplicating it.
    let rank = null;
    try {
      // Ensure cache is ready (same guard your /leaderboard uses)
      if (!isCacheInitialized) await updateCache();

      const { analytics = {} } = cache;
      const { topUsers7d = [] } = analytics;

      // topUsers7d is already sorted by score descending
      // Check if this user appears anywhere in it (not just top 5)
      // For rank we look at the full sorted list, not just top 5
      const allUsers = (cache.users || [])
        .map(u => {
          const entry = topUsers7d.find(t => t.username === u.username);
          return { username: u.username, score: entry?.score7d || 0 };
        })
        .sort((a, b) => b.score - a.score);

      const idx = allUsers.findIndex(u => u.username === username);
      if (idx !== -1) rank = idx + 1;
    } catch { /* non-fatal — rank stays null */ }

    res.json({
      mobcoins,
      followers,
      streak: postingStreak,
      post_count: postCount,
      rank,
    });
  } catch (err) {
    console.error("/account-stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Switches profile_type between Individual and Organisation 
app.post("/profile/:username/update-type", async (req, res) => {
  try {
    const { username } = req.params;
    const { profile_type } = req.body;

    // Ensure parameters exist
    if (!username) return res.status(400).json({ error: "Username required" });
    if (!profile_type) return res.status(400).json({ error: "Profile type required" });

    // Correctly enforce allowed values
    const finalType = ['Individual', 'Organisation'].includes(profile_type)
      ? profile_type
      : 'Individual';

    const { error } = await supabase
      .from("users")
      .update({ profile_type: finalType })
      .eq("username", username)
      .select(); // Optional: add select() to get the updated row back

    if (error) {
      console.error("/update-type DB error:", error);
      return res.status(500).json({ error: "Failed to update profile type" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { profile_type: finalType });
    }

    res.json({ success: true, profile_type: finalType });
  } catch (err) {
    console.error("/update-type error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /profile/:username/notification-prefs ───────────────────────────────
// Updates the detailed notification preferences (likes, comments, etc.)
app.post("/profile/:username/notification-prefs", async (req, res) => {
  try {
    const { username } = req.params;
    const { notification_prefs } = req.body;

    if (!username || !notification_prefs) {
      return res.status(400).json({ error: "Username and preferences required" });
    }

    const { error } = await supabase
      .from("users")
      .update({ notification_prefs })
      .eq("username", username);

    if (error) {
      console.error("/notification-prefs DB error:", error);
      return res.status(500).json({ error: "Failed to update notification preferences" });
    }

    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { notification_prefs });
    }

    res.json({ success: true, notification_prefs });
  } catch (err) {
    console.error("/notification-prefs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Feed Preferences ─────────────────────────────────────────────────
app.post("/feed-prefs", async (req, res) => {
  try {
    const { username, feed_prefs } = req.body;
    if (!username || !feed_prefs) {
      return res.status(400).json({ error: "Username and feed_prefs required" });
    }
    const { error } = await supabase
      .from("users")
      .update({ feed_prefs })
      .eq("username", username);
    if (error) {
      console.error("/feed-prefs DB error:", error);
      return res.status(500).json({ error: "Failed to update feed preferences" });
    }
    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { feed_prefs });
    }
    res.json({ success: true, feed_prefs });
  } catch (err) {
    console.error("/feed-prefs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Negative Signal ──────────────────────────────────────────────────
app.post("/negative-signal", async (req, res) => {
  try {
    const { username, postId, signalType, contentType } = req.body;
    if (!username || !postId || !signalType) {
      return res.status(400).json({ error: "username, postId, and signalType required" });
    }
    if (!['skip', 'hide', 'not_interested'].includes(signalType)) {
      return res.status(400).json({ error: "signalType must be skip, hide, or not_interested" });
    }
    // Store in memoryDB session map
    if (memoryDb && memoryDb.isReady) {
      memoryDb.addNegativeSignal(username, { postId: String(postId), type: signalType, contentType: contentType || 'post', timestamp: Date.now() });
    }
    // Also persist to negative_signals table for cross-session durability
    await supabase.from("negative_signals").insert({
      username,
      post_id: String(postId),
      signal_type: signalType,
      content_type: contentType || 'post',
      created_at: new Date().toISOString()
    }).then(r => { if (r.error) console.error("/negative-signal persist error:", r.error); });

    // Also get post categories to store category-level signal
    const { data: postData } = await supabase2.from("Posts").select("categories").eq("id", postId).single();
    if (postData?.categories && memoryDb?.isReady) {
      memoryDb.addCategoryNegativeSignal(username, postData.categories, signalType);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("/negative-signal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Hall of Fame ─────────────────────────────────────────────────────
app.get("/hof", async (req, res) => {
  try {
    // Check cache
    if (memoryDb && memoryDb.isReady) {
      const cached = memoryDb.getCachedLeaderboard(); // reuse leaderboard cache mechanism
      if (cached && cached._hof) {
        return res.json(cached._hof);
      }
    }
    const curated = await curateHallOfFame();
    // Cache result
    if (memoryDb && memoryDb.isReady) {
      memoryDb.setCachedLeaderboard({ _hof: curated, _cachedAt: Date.now() });
    }
    res.json(curated);
  } catch (err) {
    console.error("/hof error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Update User Categories (onboarding interests) ────────────────────
app.post("/update-categories", async (req, res) => {
  try {
    const { username, categories } = req.body;
    if (!username || !Array.isArray(categories)) {
      return res.status(400).json({ error: "Username and categories array required" });
    }
    const valid = categories.filter(c => POST_CATEGORIES.includes(c));
    const { error } = await supabase
      .from("users")
      .update({ categories: valid })
      .eq("username", username);
    if (error) {
      console.error("/update-categories DB error:", error);
      return res.status(500).json({ error: "Failed to update categories" });
    }
    // Update memoryDB
    if (memoryDb && memoryDb.isReady) {
      memoryDb.updateUser(username, { categories: valid });
    }
    res.json({ success: true, categories: valid });
  } catch (err) {
    console.error("/update-categories error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// — ADD member
app.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, newMember, role = 'member' } = req.body;
    if (!username || !newMember || !['admin', 'mod', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Missing/invalid fields' });
    }

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type, name')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (typeof grp.payload.chat_count !== 'number') grp.payload.chat_count = 0;

    const userRole = grp.payload.users.find(function (u) { return u.user_id === username; });
    const userRoleVal = userRole ? userRole.role : null;
    const isAdminOrMod = userRoleVal === 'admin' || userRoleVal === 'mod';

    if (!grp.payload.users.some(function (u) { return u.user_id === username; })) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    if (grp.type === 'secret' && !isAdminOrMod) {
      return res.status(403).json({ error: 'Only admins can add to secret groups' });
    }
    if (grp.payload.users.some(function (u) { return u.user_id === newMember; })) {
      return res.status(400).json({ error: 'User already in group' });
    }

    const updated = {
      ...grp.payload,
      users: [...grp.payload.users, { user_id: newMember, role, joined_at: new Date().toISOString(), badges: { helpful: 0 } }],
      chat_count: (grp.payload.chat_count || 0) + 1
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);

    if (updErr) throw updErr;

    const notification = {
      id: Date.now(),
      message: `You were added to the ${grp.type} group "${grp.name}" by ${username} as ${role}.`,
      read: false,
      created_at: new Date().toISOString(),
      type: 'group',
      sender: username,
    };
    await addNotification(newMember, notification);

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('username', newMember)
      .single();

    if (user && user.email) {
      await sendNotificationEmail(
        user.email,
        `You've been added to ${grp.name}`,
        `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${user.fullname || user.username},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">${notification.message}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color:#2563eb;border-radius:8px;">
                <a href="https://textmob.web.app/group/${encodeURIComponent(grp.name)}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Open Group</a>
              </td>
            </tr>
          </table>
        `
      );

    }

    io.to(`user_${newMember}`).emit('notification', notification);
    io.to(`group_${groupId}`).emit('group_member_added', { user_id: newMember, role });
    res.json({ newMember, role });
  } catch (err) {
    console.error(`POST /groups/${req.params.groupId}/members error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — ASSIGN role
app.post('/groups/:groupId/roles', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, targetUser, role } = req.body;
    if (!username || !targetUser || !['admin', 'mod', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Missing/invalid fields' });
    }

    const { data: grp, error } = await supabase2
      .from('groups')
      .select('payload')
      .eq('id', groupId)
      .single();

    if (error) throw error;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    if (!grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; })) {
      return res.status(403).json({ error: 'Only admins can assign roles' });
    }
    if (!grp.payload.users.some(function (u) { return u.user_id === targetUser; })) {
      return res.status(404).json({ error: 'Target user not in group' });
    }

    const updated = {
      ...grp.payload,
      users: grp.payload.users.map(function (u) {
        return u.user_id === targetUser ? { ...u, role } : u;
      })
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);

    if (updErr) throw updErr;

    const notif = {
      id: Date.now(),
      message: `${username} assigned you ${role} role in the group.`,
      read: false,
      created_at: new Date().toISOString(),
      type: 'group',
      sender: username,
    };
    await addNotification(targetUser, notif);
    io.to(`user_${targetUser}`).emit('notification', notif);
    io.to(`group_${groupId}`).emit('group_role_updated', { user_id: targetUser, role });

    res.json({ success: true, role });
  } catch (err) {
    console.error(`POST /groups/${groupId}/roles error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — SEND message
app.post(
  '/groups/:groupId/messages',
  upload.single('media'),
  async (req, res) => {
    const { groupId } = req.params;
    console.log(`POST /groups/${groupId}/messages`, { body: req.body, file: !!req.file });
    try {
      const { username, type = 'message', content = '' } = req.body;
      if (!username) return res.status(400).json({ error: 'Missing username' });
      if (!content && !req.file) return res.status(400).json({ error: 'Message or media required' });

      let media_url = null, media_public_id = null;
      if (req.file) {
        try {
          const up = await new Promise(function (resolve, reject) {
            cloudinary.uploader.upload_stream(
              { resource_type: 'auto', folder: 'textmob/groups' },
              function (error, result) {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(req.file.buffer);
          });
          media_url = up.secure_url;
          media_public_id = up.public_id;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({ error: 'Failed to upload media to Cloudinary' });
        }
      }

      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload')
        .eq('id', groupId)
        .single();

      if (grpErr) throw grpErr;

      if (!grp.payload) grp.payload = {};
      if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
      if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
      if (typeof grp.payload.chat_count !== 'number') grp.payload.chat_count = 0;

      const userRoleObj = grp.payload.users.find(function (u) { return u.user_id === username; });
      const userRole = userRoleObj ? userRoleObj.role : null;
      if (!userRole) return res.status(403).json({ error: 'Not a member' });

      const newMsg = {
        id: Date.now(),
        sender: username,
        type: req.file ? (content ? type : 'image') : type,
        content,
        media_url,
        media_public_id,
        created_at: new Date().toISOString(),
        seen: []
      };

      const updatedPayload = {
        ...grp.payload,
        messages: [...grp.payload.messages, newMsg],
        chat_count: (grp.payload.chat_count || 0) + 1
      };

      const { error: updErr } = await supabase2
        .from('groups')
        .update({ payload: updatedPayload })
        .eq('id', groupId);

      if (updErr) throw updErr;

      // emit message
      io.to(`group_${groupId}`)
        .emit('new_group_message', { message: newMsg, groupId: groupId });

      res.status(201).json(newMsg);
    } catch (err) {
      console.error(`POST /groups/${groupId}/messages error:`, err);
      res.status(500).json({ error: err.message });
    }
  }
);

// — MARK message seen
app.post('/groups/:groupId/messages/:msgId/seen', async (req, res) => {
  try {
    const { groupId, msgId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error } = await supabase2
      .from('groups')
      .select('payload')
      .eq('id', groupId)
      .single();

    if (error) throw error;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];

    if (!grp.payload.users.some(function (u) { return u.user_id === username; })) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const msgIndex = grp.payload.messages.findIndex(function (m) { return String(m.id) === String(msgId); });
    if (msgIndex === -1) return res.status(404).json({ error: 'Message not found' });

    const currentSeen = grp.payload.messages[msgIndex].seen || [];
    const updatedSeen = currentSeen.filter(function (s) { return s.user_id !== username; }).concat([{ user_id: username, seen_at: new Date().toISOString() }]);
    const updatedMsg = {
      ...grp.payload.messages[msgIndex],
      seen: updatedSeen
    };
    const updatedMessages = [...grp.payload.messages];
    updatedMessages[msgIndex] = updatedMsg;

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: { ...grp.payload, messages: updatedMessages } })
      .eq('id', groupId);

    if (updErr) throw updErr;

    io.to(`group_${groupId}`).emit('group_message_seen', { msgId: parseInt(msgId, 10), user_id: username });
    res.json({ success: true });
  } catch (err) {
    console.error(`POST /groups/${groupId}/messages/${req.params.msgId}/seen error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — UPDATE group settings
app.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    // accept 'type' directly from body
    const { username, name, type: newType, description, settings } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type, created_by')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    const isAdmin = grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; });
    if (grp.type === 'secret' && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can modify secret group settings' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (newType && ['public', 'private_visible', 'secret'].includes(newType)) updates.type = newType;

    const payloadUpdates = {};
    if (description !== undefined) payloadUpdates.description = description;
    if (settings) {
      var currentSettings = grp.payload.settings || {};
      payloadUpdates.settings = { ...currentSettings, ...settings };
    }

    const fullPayload = { ...grp.payload, ...payloadUpdates };
    updates.payload = fullPayload;

    const { error: updErr } = await supabase2
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (updErr) throw updErr;

    res.json({ success: true });
  } catch (err) {
    console.error(`PUT /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — UPDATE profile pic
app.post(
  '/groups/:groupId/profile',
  upload.single('profile'),
  async (req, res) => {
    const { groupId } = req.params;
    console.log(`POST /groups/${groupId}/profile`, { body: req.body, file: !!req.file });
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: 'Missing username' });
      if (!req.file) return res.status(400).json({ error: 'No profile file uploaded' });

      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload, profile_public_id, type')
        .eq('id', groupId)
        .single();

      if (grpErr) throw grpErr;

      if (!grp.payload) grp.payload = {};
      if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

      const isAdmin = grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; });
      if (grp.type === 'secret' && !isAdmin) {
        return res.status(403).json({ error: 'Only admins can update secret group profile' });
      }

      if (grp.profile_public_id) {
        await cloudinary.uploader.destroy(grp.profile_public_id);
      }

      const up = await new Promise(function (resolve, reject) {
        cloudinary.uploader.upload_stream(
          { folder: 'textmob/group_profiles' },
          function (error, result) {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      const { data, error: updateErr } = await supabase2
        .from('groups')
        .update({
          profile_url: up.secure_url,
          profile_public_id: up.public_id
        })
        .eq('id', groupId)
        .select('profile_url')
        .single();

      if (updateErr) throw updateErr;

      io.to(`group_${groupId}`).emit('group_profile_updated', up.secure_url);
      res.json({ profile_url: up.secure_url });
    } catch (err) {
      console.error(`POST /groups/${groupId}/profile error:`, err);
      res.status(500).json({ error: err.message });
    }
  }
);

// — DELETE message
app.delete('/groups/:groupId/messages/:msgId', async (req, res) => {
  try {
    const { groupId, msgId } = req.params;
    const { username } = req.body;

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    const msg = grp.payload.messages.find(function (m) { return String(m.id) === String(msgId); });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const adminOrModObj = grp.payload.users.find(function (u) { return u.user_id === username && (u.role === 'admin' || u.role === 'mod'); });
    const isAdminOrMod = !!adminOrModObj;
    const isSender = msg.sender === username;
    if (!isAdminOrMod && !isSender) {
      return res.status(403).json({ error: 'Only admins, mods, or the message sender can delete this message' });
    }

    if (msg.media_public_id) {
      await cloudinary.uploader.destroy(msg.media_public_id, { resource_type: 'image' });
    }

    const { error: updErr } = await supabase2
      .from('groups')
      .update({
        payload: {
          ...grp.payload,
          messages: grp.payload.messages.filter(function (m) { return String(m.id) !== String(msgId); })
        }
      })
      .eq('id', groupId);

    if (updErr) throw updErr;

    io.to(`group_${groupId}`)
      .emit('group_message_deleted', { id: parseInt(msgId, 10) });

    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /groups/${req.params.groupId}/messages/${req.params.msgId} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — DELETE group
app.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('created_by, profile_public_id')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (grp.created_by !== username) {
      return res.status(403).json({ error: 'Only the group owner can delete the group' });
    }

    if (grp.profile_public_id) {
      await cloudinary.uploader.destroy(grp.profile_public_id);
    }

    const { error: delErr } = await supabase2
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (delErr) throw delErr;

    io.to(`group_${groupId}`).emit('group_deleted', { groupId });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — GET discoverable groups
app.get('/groups/discover', async (req, res) => {
  try {
    const { username, query: search = '', limit = 20 } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    // Fetch all groups first, then filter with JavaScript
    const { data, error } = await supabase2
      .from('groups')
      .select('*')
      .ilike('name', `%${search}%`)
      .limit(parseInt(limit) * 2); // Get extra to account for filtering

    if (error) return res.status(500).json({ error: error.message });

    // Filter out private/secret groups with JavaScript
    const discoverableGroups = (data || []).filter(group => {
      const privateTypes = ['secret', 'private', 'private_visible'];
      return !privateTypes.includes(group.type);
    });

    // Apply the actual limit after filtering
    const limitedGroups = discoverableGroups

    res.json(limitedGroups);
  } catch (err) {
    console.error('GET /groups/discover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// — GET main feed
app.get('/feed', async (req, res) => {
  try {
    const { username, limit = 50 } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: groups, error: groupsErr } = await supabase2
      .from('groups')
      .select('id')
      .or(`created_by.eq.${username},payload.users.user_id.eq.${username}`);

    if (groupsErr) throw groupsErr;

    const { data: personalPosts, error: perErr } = await supabase2
      .from('Posts')
      .select('*')
      .not('type', 'ilike', 'group-post-%')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (perErr) throw perErr;

    var groupPosts = [];
    if (groups && groups.length > 0) {
      for (var k = 0; k < groups.length; k++) {
        const g = groups[k];
        const { data: gp, error: gpErr } = await supabase2
          .from('Posts')
          .select('*, groups(name)')
          .eq('type', `group-post-${g.id}`)
          .order('created_at', { ascending: false });

        if (gpErr) continue;
        groupPosts = groupPosts.concat(gp.map(function (p) { return { ...p, group_name: p.groups ? p.groups.name : null }; }));
      }
    }

    const allPosts = [].concat(personalPosts || [], groupPosts);
    const ranked = allPosts.sort(function (a, b) {
      if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      var aLikes = a.likes ? a.likes.length : 0;
      var bLikes = b.likes ? b.likes.length : 0;
      return bLikes - aLikes;
    }).slice(0, parseInt(limit));

    res.json(ranked);
  } catch (err) {
    console.error('GET /feed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — GET group feed
app.get('/groups/:groupId/feed', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type')
      .eq('id', groupId)
      .single();

    if (grpErr) return res.status(404).json({ error: grpErr.message });

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    var accessDenied = false;
    if ((grp.type === 'private_visible' || grp.type === 'secret') && !grp.payload.users.some(function (u) { return u.user_id === username; })) {
      accessDenied = true;
    }
    if (accessDenied) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: posts, error } = await supabase2
      .from('Posts')
      .select('*')
      .eq('type', `group-post-${groupId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const rankedPosts = posts.sort(function (a, b) {
      if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      var aLikes = a.likes ? a.likes.length : 0;
      var bLikes = b.likes ? b.likes.length : 0;
      return bLikes - aLikes;
    });

    res.json(rankedPosts);
  } catch (err) {
    console.error(`GET /groups/${req.params.groupId}/feed error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — CREATE group post (no group_id column, behaves like /create-post)
app.post(
  '/groups/:groupId/posts',
  upload.array("media", 6),
  async (req, res) => {
    try {
      var groupId = req.params.groupId;
      var username = req.body.username;
      var text = req.body.text;
      var visib = req.body.visib || 'group';
      var activities = req.body.activities;
      var options = req.body.options;

      if (!username || !text) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // load group
      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload, type, name')
        .eq('id', groupId)
        .single();

      if (grpErr) return res.status(404).json({ error: 'Group not found' });

      if (!grp.payload) grp.payload = {};
      if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

      var userRoleObj = grp.payload.users.find(function (u) { return u.user_id === username; });
      var userRole = userRoleObj ? userRoleObj.role : null;
      if (!userRole) return res.status(403).json({ error: 'Not a member' });

      var currentSettings = grp.payload.settings || {};
      if (currentSettings.post_approval && userRole !== 'admin' && userRole !== 'mod') {
        return res.status(403).json({ error: 'Post approval required' });
      }

      if ((grp.type === 'private_visible' || grp.type === 'secret') && !userRole) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Detect post type (poll vs post)
      var type = "post";
      if (options) {
        try {
          if (typeof options === "string") options = JSON.parse(options);
          if (Array.isArray(options) && options.length >= 2) {
            var validFormat = options.every(function (opt) {
              return typeof opt.id === "number" &&
                typeof opt.text === "string" &&
                Array.isArray(opt.votes);
            });
            if (validFormat) type = "poll";
            else options = null;
          } else options = null;
        } catch (parseErr) {
          options = null;
        }
      }

      // Hashtags
      var hashtags = [];
      var rawHashtags = text.match(/#[\w-]+/g);
      if (rawHashtags && Array.isArray(rawHashtags)) {
        hashtags = rawHashtags;
      }

      // Mentions (@username), sanitized
      var rawMentions = text.match(/@\w+/g) || [];
      var mentions = rawMentions.map(function (m) {
        return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
      });

      // Upload media (Cloudinary)
      var mediaUrls = [];
      try {
        var filesArray = req.files ? req.files : [];
        mediaUrls = await Promise.all(
          filesArray.map(function (file) {
            return new Promise(function (resolve, reject) {
              var uploadStream = cloudinary.uploader.upload_stream(
                { folder: "post-media", resource_type: "auto" },
                function (error, result) {
                  if (error) return reject(error);
                  if (result && result.secure_url) return resolve(result.secure_url);
                  return reject(new Error("Cloudinary returned unexpected result"));
                }
              );
              streamifier.createReadStream(file.buffer).pipe(uploadStream);
            });
          })
        );
      } catch (uploadErr) {
        console.error("[group-post] media upload failed:", uploadErr);
        return res.status(500).json({ error: "Media upload failed" });
      }

      // Set final type for DB: polls stay 'poll', everything else becomes group-post-<groupId>
      var finalType = "";
      finalType = 'group-post-' + groupId;

      // Insert post into DB (NO group_id column)
      var { error: insertError, data } = await supabase2
        .from("Posts")
        .insert([{
          username: username,
          text: text,
          media: mediaUrls,
          likes: [],
          comments: [],
          hashtags: hashtags,
          visib: visib,
          type: finalType,
          options: options,
          activities: activities
        }])
        .select("*")
        .single();

      if (insertError) {
        console.error("[group-post] Error creating post:", insertError);
        return res.status(500).json({ error: "Failed to create post" });
      }

      // Update memoryDB immediately
      if (memoryDb && memoryDb.isReady && data) {
        memoryDb.upsertPost(data);
      }

      // Award Mobcoins (best-effort)
      try {
        await updateMobcoins(
          username.split("@").pop().trim(),
          +7,
          true,
          "You just received 7 Mobcoins for creating a " + (type === 'poll' ? 'poll' : 'group post') + " on Textmob"
        );
      } catch (mobErr) {
        console.error("[group-post] updateMobcoins failed:", mobErr);
      }

      // Immediately respond to client
      res.json({ message: (type === "poll" ? "Poll" : "Group post") + " created successfully!" });

      // Background notifications & AI (non-blocking)
      (async function backgroundWork() {
        try {
          console.log("[group-post] starting backgroundWork for postId:", data.id);

          // notify group members
          var groupMembers = [];
          if (grp.payload && Array.isArray(grp.payload.users)) {
            for (var ii = 0; ii < grp.payload.users.length; ii++) {
              var u = grp.payload.users[ii];
              if (u.user_id !== username) groupMembers.push(u.user_id);
            }
          }

          for (var m = 0; m < groupMembers.length; m++) {
            var member = groupMembers[m];
            var notif = {
              id: Date.now(),
              message: username + " posted in " + grp.name,
              read: false,
              link: "/post/" + data.id,
              timestamp: new Date().toISOString(),
              type: 'group',
              sender: username,
            };
            try {
              await addNotification(member, notif);
            } catch (addNotifErr) {
              console.error("[group-post] addNotification failed for", member, addNotifErr);
            }

            try {
              var { data: user } = await supabase.from('users').select('email, payload').eq('username', member).single();
              if (user && user.payload && user.payload.opt_email && user.email) {
                await sendNotificationEmail(
                  user.email,
                  `New post in ${grp.name}`,
                  `
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">Hi ${user.fullname || user.username},</p>
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0f172a;">${notif.message}</p>
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="background-color:#2563eb;border-radius:8px;">
                        <a href="https://textmob.web.app/group/${encodeURIComponent(grp.name)}" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Group</a>
                      </td>
                    </tr>
                  </table>
                  `
                );

              }
            } catch (emailErr) {
              console.error("[group-post] checking user/email failed for", member, emailErr);
            }

            try {
              io.to("user_" + member).emit('notification', notif);
            } catch (emitErr) {
              console.error("[group-post] io.emit failed for", member, emitErr);
            }
          }

          // Mentions notifications + TextmobAI trigger (AI first, don't block on emails)
          var safeMediaTypes = [];
          var filesForTypes = req.files ? req.files : [];
          if (filesForTypes.length > 0) {
            safeMediaTypes = filesForTypes.map(function (f) {
              try { return f.mimetype.split("/")[0]; } catch (e) { return "image"; }
            });
          }

          // Fire AI reply immediately if needed
          for (var j = 0; j < mentions.length; j++) {
            var mentionedUser = mentions[j];
            if (mentionedUser && typeof mentionedUser === "string" && mentionedUser.toLowerCase() === "textmobai") {
              triggerAIReply(text, mediaUrls, safeMediaTypes, data.id, "post").catch(function (aiErr) {
                console.error("[group-post] triggerAIReply failed:", aiErr);
              });
            }
          }

          // Then mention notifications (best-effort, don't await)
          for (var j = 0; j < mentions.length; j++) {
            var mentionedUser = mentions[j];
            try {
              var notification = {
                id: Date.now(),
                message: username + " mentioned you in a post",
                read: false,
                link: "/post/" + data.id,
                timestamp: new Date().toISOString(),
                type: 'mention',
                sender: username,
              };
              addNotification(mentionedUser, notification).catch(function () { });
            } catch (addNotifErr2) {
              console.error("[group-post] addNotification failed for", mentionedUser, addNotifErr2);
            }
          }

          // emit group new_group_post
          try {
            io.to("group_" + groupId).emit('new_group_post', data);
          } catch (emitGroupErr) {
            console.error("[group-post] io.emit group failed:", emitGroupErr);
          }

          // update badges for sender within group payload (best-effort)
          var senderIndex = -1;
          if (grp.payload && Array.isArray(grp.payload.users)) {
            for (var k = 0; k < grp.payload.users.length; k++) {
              if (grp.payload.users[k].user_id === username) { senderIndex = k; break; }
            }
          }
          if (senderIndex !== -1) {
            var currentBadges = grp.payload.users[senderIndex].badges || {};
            var updatedBadges = { ...currentBadges, helpful: (currentBadges.helpful || 0) + 1 };
            grp.payload.users[senderIndex].badges = updatedBadges;
            try {
              await supabase2.from('groups').update({ payload: grp.payload }).eq('id', groupId);
            } catch (updErr) {
              console.error("[group-post] failed updating group badges:", updErr);
            }
          }

          console.log("[group-post] backgroundWork completed for postId:", data.id);
        } catch (bgErr) {
          console.error("[group-post] unexpected backgroundWork error:", bgErr);
        }
      })();

    } catch (error) {
      console.error("[group-post] Post Creation Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// Socket.IO
io.on('connection', function (socket) {
  socket.on('join_group', function ({ groupId }) { socket.join(`group_${groupId}`); });
  socket.on('leave_group', function ({ groupId }) { socket.leave(`group_${groupId}`); });
  socket.on('join_user', function ({ username }) { socket.join(`user_${username}`); });
  socket.on('mark_message_seen', function ({ groupId, msgId, username }) {
    // Proxy to mark seen
    const body = { username };
    console.log('Mark seen:', { groupId, msgId, username });
    // If you want, you can call the seen endpoint here or do DB updates.
  });
});

// Route: POST /t/send-mobcoins
app.post("/t/send-mobcoins", async (req, res) => {
  const { fromId, toIds, amount, postId } = req.body;

  if (!fromId || !toIds || !Array.isArray(toIds) || toIds.length === 0 || !amount || amount <= 0)
    return res.status(400).send("Invalid transfer data");

  try {
    // Fetch sender's balance and info
    const { data: sender, error: senderErr } = await supabase
      .from("users")
      .select("mobcoins, fullname")
      .eq("username", fromId)
      .single();

    if (senderErr || !sender) return res.status(404).send("Sender not found");

    const totalAmount = amount * toIds.length;
    if ((sender.mobcoins || 0) < totalAmount)
      return res.status(400).send("Insufficient balance for bulk transaction");

    // Verify all recipients exist
    const { data: recipients, error: recipErr } = await supabase
      .from("users")
      .select("username")
      .in("username", toIds);

    if (recipErr) return res.status(500).send("Error verifying recipients");
    const validRecipients = recipients.map(r => r.username);
    const invalidRecipients = toIds.filter(id => !validRecipients.includes(id));
    if (invalidRecipients.length > 0)
      return res.status(404).send(`Recipients not found: ${invalidRecipients.join(", ")}`);

    // Fetch sender's profile pic for notification
    const { data: senderProfile } = await supabase
      .from("users")
      .select("profile_pic")
      .eq("username", fromId)
      .single();
    const senderPic = senderProfile?.profile_pic || null;

    // Proceed with bulk transfer
    const senderName = sender.fullname || fromId;
    const postLink = postId ? `/post/${postId}` : "/wallet";
    const postUrl = postId ? `https://textmob.web.app/post/${postId}` : null;

    await updateMobcoins(fromId, -totalAmount, true, `You sent ${amount} Mobcoins to ${toIds.length} users`, "/wallet");

    for (const toId of toIds) {
      if (postId) {
        const extraMsg = `🎁 <strong>${senderName}</strong> gifted you <strong>${amount} Mobcoins</strong> on your post · <a href="${postUrl}" style="color:#2563eb;text-decoration:underline;">View post</a>`;
        await updateMobcoins(toId, amount, false, `Gift from ${fromId} on post #${postId}`, postLink, extraMsg);
        // Also send a rich notification with sender avatar
        try {
          const { data: recipientUser } = await supabase
            .from("users")
            .select("notifications")
            .eq("username", toId)
            .single();
          if (recipientUser) {
            const existingNotifs = Array.isArray(recipientUser.notifications) ? recipientUser.notifications : [];
            const newNotif = {
              id: Date.now() + Math.random(),
              message: extraMsg,
              read: false,
              link: postLink,
              timestamp: new Date().toISOString(),
              type: 'mobcoins',
              sender: fromId,
              senderPic: senderPic
            };
            const updatedNotifications = existingNotifs.concat([newNotif]);
            await supabase
              .from("users")
              .update({ notifications: updatedNotifications })
              .eq("username", toId);
          }
        } catch (notifErr) {
          console.error("[send-mobcoins] failed to add rich notification:", notifErr);
        }
      } else {
        await updateMobcoins(toId, amount, true, `You received ${amount} from ${fromId}`);
      }
    }

    return res.json({ success: true, message: `Mobcoins sent to ${toIds.length} recipients` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Route: GET /t/wallet?userId=abc
app.get("/t/wallet", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send("Missing userId");

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("mobcoins, fullname, username, profile_type")
      .eq("username", userId)
      .single();

    if (error || !user) return res.status(404).send("User not found");

    return res.json({
      username: user.username,
      fullname: user.fullname,
      mobcoins: user.mobcoins,
      profile_type: user.profile_type,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

// Utility function to map organization to provider key
function getProviderKeyFromOrg(org) {
  if (!org) return 'unknown';
  const orgLower = org.toLowerCase();
  if (orgLower.includes('mtn')) return 'mtn';
  if (orgLower.includes('airtel')) return 'airtel';
  if (orgLower.includes('globacom') || orgLower.includes('glo')) return 'glo';
  if (orgLower.includes('9mobile') || orgLower.includes('etisalat')) return 'nine';
  return 'unknown';
}

app.get('/api/detect-operator', async (req, res) => {
  try {
    // Extract client IP
    let clientIp = 'unknown';
    if (req.headers['x-forwarded-for']) {
      clientIp = req.headers['x-forwarded-for'].split(',')[0].trim();
    } else if (req.headers['x-real-ip']) {
      clientIp = req.headers['x-real-ip'];
    } else if (req.connection && req.connection.remoteAddress) {
      clientIp = req.connection.remoteAddress;
    } else if (req.socket && req.socket.remoteAddress) {
      clientIp = req.socket.remoteAddress;
    }

    // Handle IPv6 localhost case
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
      clientIp = '197.210.0.1'; // Use a test Nigerian IP for local development
    }

    // Remove IPv6 prefix if present
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    // Query ipapi.co
    const ipapiResponse = await axios.get(`https://ipapi.co/${encodeURIComponent(clientIp)}/json/`, {
      timeout: 5000, // Add timeout to prevent hanging
    });
    const infoJson = ipapiResponse.data;

    // Handle ipapi.co error response
    if (infoJson.error) {
      throw new Error(infoJson.reason || 'ipapi.co API error');
    }

    // Extract organization (fallback to multiple fields)
    const org = infoJson.org || infoJson.isp || infoJson.asn || 'unknown';
    const key = getProviderKeyFromOrg(org);

    // Log for debugging
    console.log('IP:', clientIp, 'Org:', org, 'Provider Key:', key);

    // Return structured response
    res.json({
      key: key,
      org: org,
      ip: clientIp,
      raw: infoJson,
    });
  } catch (error) {
    console.error('Error detecting operator:', error.message);
    res.status(500).json({
      key: 'unknown',
      org: null,
      ip: null,
      raw: { error: error.message },
    });
  }
});


// ─── WEEKLY RECAP SYSTEM ────────────────────────────────────────────────
// Uses only raw DB queries. Skips users with zero activity (no posts + no engagement).
// If user engaged with others' posts, sends an engagement-focused recap.

const recapWeekSent = new Map();

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
}

async function gatherWeeklyActivity(username) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: newPosts }, { data: allUserPosts }, { data: recentPosts }, { data: user }] = await Promise.all([
    supabase2.from("Posts").select("id, text, likes, comments, created_at, type, media").eq("username", username).gte("created_at", weekAgo).order("created_at", { ascending: false }),
    supabase2.from("Posts").select("id, text, likes, comments, created_at").eq("username", username),
    supabase2.from("Posts").select("id, username, text, likes, comments, created_at").gte("created_at", weekAgo).order("created_at", { ascending: false }),
    supabase.from("users").select("fullname, email").eq("username", username).single()
  ]);

  if (!user || !user.email) return null;

  // Comments received on user's own posts this week
  const commentsReceived = [];
  for (const post of allUserPosts || []) {
    if (post.comments && Array.isArray(post.comments)) {
      for (const c of post.comments) {
        if (c.timestamp && c.timestamp >= weekAgo && c.username !== username) {
          commentsReceived.push({ postId: post.id, postText: post.text, ...c });
        }
      }
    }
  }

  // Engagement: comments user made on OTHER people's posts this week
  const commentsGiven = [];
  for (const post of recentPosts || []) {
    if (post.username === username) continue;
    if (post.comments && Array.isArray(post.comments)) {
      for (const c of post.comments) {
        if (c.timestamp && c.timestamp >= weekAgo && c.username === username) {
          commentsGiven.push({ postId: post.id, postText: post.text, onPostBy: post.username, ...c });
        }
      }
    }
  }

  // Engagement: likes user gave on posts created this week
  let likesGiven = 0;
  for (const post of recentPosts || []) {
    if (post.username === username) continue;
    if (post.likes && Array.isArray(post.likes) && post.likes.includes(username)) {
      likesGiven++;
    }
  }

  let likesOnNewPosts = 0;
  let mostLikedPost = null;
  for (const p of newPosts || []) {
    const likeCount = (p.likes || []).length;
    likesOnNewPosts += likeCount;
    if (!mostLikedPost || likeCount > ((mostLikedPost.likes || []).length)) mostLikedPost = p;
  }

  return {
    postsCreated: newPosts || [],
    commentsReceived,
    commentsGiven,
    likesGiven,
    user,
    totals: {
      postCount: (newPosts || []).length,
      likesOnNewPosts,
      commentsCount: commentsReceived.length,
      commentsGiven: commentsGiven.length,
      likesGiven,
    },
    mostLikedPost
  };
}

async function generateRecapAI(activity) {
  const { postsCreated, commentsReceived, commentsGiven, likesGiven, totals, mostLikedPost, user } = activity;
  const name = user?.fullname || 'there';

  // Truly inactive — skip by returning null
  if (totals.postCount === 0 && totals.commentsCount === 0 && totals.likesOnNewPosts === 0 && totals.commentsGiven === 0 && totals.likesGiven === 0) {
    return null;
  }

  // Only outgoing engagement, no posts
  const onlyEngagement = totals.postCount === 0 && totals.commentsCount === 0 && totals.likesOnNewPosts === 0 && (totals.commentsGiven > 0 || totals.likesGiven > 0);

  const parts = [`Fullname: ${name}`];
  if (totals.postCount > 0) {
    parts.push(`Posts created this week: ${totals.postCount}`);
    for (const p of postsCreated.slice(0, 3)) {
      parts.push(`- "${(p.text || '').slice(0, 100)}" (${(p.likes || []).length} likes, ${(p.comments || []).length} comments)`);
    }
  }
  if (totals.likesOnNewPosts > 0) parts.push(`Total likes received on new posts: ${totals.likesOnNewPosts}`);
  if (totals.commentsCount > 0) {
    parts.push(`Comments received: ${totals.commentsCount}`);
    for (const c of commentsReceived.slice(0, 3)) {
      parts.push(`- @${c.username}: "${(c.text || '').slice(0, 80)}"`);
    }
  }
  if (totals.likesGiven > 0) parts.push(`Likes given to others this week: ${totals.likesGiven}`);
  if (totals.commentsGiven > 0) {
    parts.push(`Comments you left on others' posts: ${totals.commentsGiven}`);
    for (const c of commentsGiven.slice(0, 3)) {
      parts.push(`- on @${c.onPostBy}'s post: "${(c.text || '').slice(0, 80)}"`);
    }
  }
  if (mostLikedPost?.text) {
    parts.push(`Most liked post: "${mostLikedPost.text.slice(0, 120)}" with ${(mostLikedPost.likes || []).length} likes`);
  }

  let systemPrompt;
  if (onlyEngagement) {
    systemPrompt = `You are Textmob's weekly recap assistant. This user didn't post this week but was active engaging with others' content. Write a warm, friendly 2-3 sentence summary acknowledging their engagement and encouraging them to share their own thoughts too. Keep it encouraging. No emojis except one at the end. Sign off with "— Textmob"`;
  } else {
    systemPrompt = `You are Textmob's weekly recap assistant. Write a warm, friendly 2-4 sentence summary of the user's week on Textmob based on their stats. Keep it natural and encouraging. No emojis except one at the end. Sign off with "— Textmob"`;
  }

  const apiKeys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);
  if (apiKeys.length === 0) apiKeys.push("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");

  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    // Jitter to desync parallel workers
    await new Promise(r => setTimeout(r, 100 + Math.random() * 400));
    try {
      const groqModel = "openai/gpt-oss-120b" === "openai/gpt-oss-120b" ? "llama-3.3-70b-versatile" : "openai/gpt-oss-120b";
      const aiRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: groqModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here's the user's weekly stats:\n${parts.join('\n')}\n\nWrite a short, friendly recap.` }
        ],
        temperature: 0.8,
        max_tokens: 500
      }, {
        headers: { Authorization: `Bearer ${apiKeys[attempt]}`, "Content-Type": "application/json" },
        timeout: 30000
      });

      if (aiRes?.data?.choices?.[0]?.message?.content) {
        return aiRes.data.choices[0].message.content.trim();
      }
    } catch (err) {
      if (err?.response?.status === 429 && attempt < apiKeys.length - 1) {
        console.log(`[WeeklyRecap] Key ${attempt + 1} rate-limited, waiting 1s then trying next...`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      console.error(`[WeeklyRecap] AI failed for ${name} (key ${attempt + 1}):`, err?.message);
    }
  }

  if (onlyEngagement) {
    return `Hey ${name}, you were active on Textmob this week — you gave ${totals.likesGiven} like(s) and left ${totals.commentsGiven} comment(s). We'd love to see what you have to share too. — Textmob`;
  }
  return `Hey ${name}, here's your weekly Textmob recap! You created ${totals.postCount} post(s) and got ${totals.likesOnNewPosts} like(s) and ${totals.commentsCount} comment(s). Keep being awesome. — Textmob`;
}

async function sendWeeklyRecapEmail(username) {
  try {
    const activity = await gatherWeeklyActivity(username);
    if (!activity || !activity.user || !activity.user.email) return;

    const weekKey = getWeekKey();
    if (recapWeekSent.get(username) === weekKey) return;

    const recapText = await generateRecapAI(activity);
    if (!recapText) {
      console.log(`[WeeklyRecap] Skipping ${username} — no activity this week`);
      return;
    }

    const stats = activity.totals;

    const subject = `Your week on Textmob — ${weekKey}`;

    const plainText = `Hi ${activity.user.fullname || 'there'},

${recapText}

Your activity this week:
${stats.postCount > 0 ? `- ${stats.postCount} post(s) created` : ''}
${stats.likesOnNewPosts > 0 ? `- ${stats.likesOnNewPosts} like(s) received` : ''}
${stats.commentsCount > 0 ? `- ${stats.commentsCount} comment(s) received` : ''}
${stats.likesGiven > 0 ? `- ${stats.likesGiven} post(s) liked` : ''}
${stats.commentsGiven > 0 ? `- ${stats.commentsGiven} reply/comment(s) left` : ''}

Open Textmob: https://textmob.web.app

Notification Settings: https://textmob.web.app/settings/notifications

Textmob, 42 Marina Street, Lagos Island, Lagos, Nigeria`;

    let badgeCells = '';
    if (stats.postCount > 0) badgeCells += `<td style="padding:4px 8px 4px 0;"><span style="display:inline-block;background:#eff6ff;color:#2563eb;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${stats.postCount} post(s)</span></td>`;
    if (stats.likesOnNewPosts > 0) badgeCells += `<td style="padding:4px 8px;"><span style="display:inline-block;background:#fdf2f8;color:#db2777;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${stats.likesOnNewPosts} like(s)</span></td>`;
    if (stats.commentsCount > 0) badgeCells += `<td style="padding:4px 8px;"><span style="display:inline-block;background:#ecfdf5;color:#059669;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${stats.commentsCount} comment(s)</span></td>`;
    if (stats.likesGiven > 0) badgeCells += `<td style="padding:4px 8px;"><span style="display:inline-block;background:#fef3c7;color:#d97706;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${stats.likesGiven} liked</span></td>`;
    if (stats.commentsGiven > 0) badgeCells += `<td style="padding:4px 0 4px 8px;"><span style="display:inline-block;background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${stats.commentsGiven} replied</span></td>`;
    const statsBlock = badgeCells ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${badgeCells}</tr></table></td></tr></table>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:24px 0;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
<tr><td align="center" style="padding:28px 24px 0;">
<img src="https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png" alt="Textmob" width="40" height="40" style="display:block;margin:0 auto 12px;border-radius:8px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Your week on Textmob</h1>
<p style="margin:4px 0 0;font-size:14px;color:#64748b;">${weekKey}</p>
</td></tr>
<tr><td style="padding:24px;">
<p style="font-size:16px;line-height:1.7;color:#0f172a;margin:0;white-space:pre-wrap;">${recapText}</p>
${statsBlock}
</td></tr>
<tr><td align="center" style="padding:0 24px 28px;">
<a href="https://textmob.web.app" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Open Textmob</a>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="font-size:12px;color:#94a3b8;line-height:1.5;">
<a href="https://textmob.web.app/settings/notifications" style="color:#2563eb;text-decoration:none;">Notification Settings</a>
<p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">Textmob, 42 Marina Street, Lagos Island, Lagos, Nigeria</p>
<p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">&copy; 2026 Textmob. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Textmob" <${process.env.SMTP_USER || "sharpbrainspublishers@gmail.com"}>`,
      to: activity.user.email,
      subject,
      text: plainText,
      html,
      headers: { 'List-Unsubscribe': '<https://textmob.web.app/settings/notifications>' }
    });

    recapWeekSent.set(username, weekKey);
    console.log(`[WeeklyRecap] Recap sent to ${username} (${activity.user.email})`);
  } catch (err) {
    console.error(`[WeeklyRecap] Error for ${username}:`, err?.message);
  }
}

async function processAllWeeklyRecaps() {
  console.log('[WeeklyRecap] Starting weekly recap cycle...');
  const weekKey = getWeekKey();
  let sent = 0, skipped = 0, noEmail = 0;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("username, email, fullname");

    if (error || !users) {
      console.error('[WeeklyRecap] Failed to fetch users:', error);
      return;
    }

    for (const user of users) {
      if (!user.email) { noEmail++; continue; }
      if (recapWeekSent.get(user.username) === weekKey) { skipped++; continue; }
      await sendWeeklyRecapEmail(user.username);
      sent++;
      // Rate limit: 10 users per second to avoid overwhelming the email server
      if (sent % 10 === 0) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[WeeklyRecap] Cycle complete: ${sent} sent, ${skipped} skipped (already sent), ${noEmail} no email`);
  } catch (err) {
    console.error('[WeeklyRecap] Cycle error:', err?.message);
  }
}

// Schedule: check every hour if it's Monday (or time to send)
const WEEKLY_RECAP_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(() => {
  const now = new Date();
  // Send on Monday between 9-10 AM (server time)
  if (now.getDay() === 1 && now.getHours() === 9) {
    processAllWeeklyRecaps();
  }
}, WEEKLY_RECAP_CHECK_INTERVAL);
// Also run once on startup (in case of restart on a Monday)
if (new Date().getDay() === 1 && new Date().getHours() >= 8 && new Date().getHours() <= 12) {
  setTimeout(processAllWeeklyRecaps, 30000); // 30s delay to let server warm up
}

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
// ============================================================
// ADMIN ROUTES (asilfcismail)
// ============================================================

app.get("/asilfcismail", (req, res) => {
  res.sendFile(path.join(__dirname, "asilfcismail.html"));
});

app.get("/api/asilfcismail/data", async (req, res) => {
  try {
    const now = new Date();

    let users, posts;

    if (memoryDb && memoryDb.isReady && memoryDb.users.length > 0 && memoryDb.posts.length > 0) {
      users = memoryDb.users;
      posts = memoryDb.posts;
    } else {
      [users, posts] = await Promise.all([
        fetchAll(
          supabase,
          "users",
          "id, profile_pic, username, fullname, mobcoins, followers, created_at, biography, phone, notifications, email, profile_type, disabled, password"
        ),
        fetchAll(
          supabase2,
          "Posts",
          "id, username, type, likes, comments, created_at, text, media, reactions"
        )
      ]);
    }

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPosts = posts.filter(p => p.created_at && new Date(p.created_at) >= sevenDaysAgo);

    // ANALYTICS LOGIC
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${23 - i} hours ago`);
    const hourCounts = Array(24).fill(0);
    const dayLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    });
    const dayCounts = Array(7).fill(0);
    const weekLabels = Array.from({ length: 4 }, (_, i) => i < 3 ? `${3 - i} weeks ago` : 'This Week');
    const weekCounts = Array(4).fill(0);
    const monthLabels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    });
    const monthCounts = Array(12).fill(0);

    users.forEach(u => {
      if (!u.created_at) return;
      const d = new Date(u.created_at);
      const diffMs = now - d;
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffH >= 0 && diffH < 24) hourCounts[23 - diffH]++;
      const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffD >= 0 && diffD < 7) dayCounts[6 - diffD]++;
      const diffW = Math.floor(diffD / 7);
      if (diffW >= 0 && diffW < 4) weekCounts[3 - diffW]++;
      const diffM = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffM >= 0 && diffM < 12) monthCounts[11 - diffM]++;
    });

    const postHourLabels = Array.from({ length: 24 }, (_, i) => `${23 - i} hours ago`);
    const postHourCounts = Array(24).fill(0);
    const postDayLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    });
    const postDayCounts = Array(7).fill(0);
    const postWeekLabels = Array.from({ length: 4 }, (_, i) => i < 3 ? `${3 - i} weeks ago` : 'This Week');
    const postWeekCounts = Array(4).fill(0);
    const postMonthLabels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    });
    const postMonthCounts = Array(12).fill(0);

    posts.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const diffMs = now - d;
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffH >= 0 && diffH < 24) postHourCounts[23 - diffH]++;
      const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffD >= 0 && diffD < 7) postDayCounts[6 - diffD]++;
      const diffW = Math.floor(diffD / 7);
      if (diffW >= 0 && diffW < 4) postWeekCounts[3 - diffW]++;
      const diffM = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffM >= 0 && diffM < 12) postMonthCounts[11 - diffM]++;
    });

    const postMap = {};
    posts.forEach(p => {
      if (p.username) postMap[p.username] = (postMap[p.username] || 0) + 1;
    });

    const posts7dMap = {};
    const likes7dMap = {};
    const comments7dMap = {};
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

    recentPosts.forEach(p => {
      if (p.username) {
        let postScore = 0;
        const hasMedia = p.media && p.media.length > 0;
        const rawText = p.content || p.text || '';
        const textWithoutEmojis = rawText.replace(emojiRegex, '').trim();
        const wordCount = textWithoutEmojis.split(/\s+/).filter(w => w.length > 0).length;

        if (hasMedia) postScore += 2;
        if (wordCount > 3) postScore += 1;
        else if (!hasMedia) postScore += 0.1;

        posts7dMap[p.username] = (posts7dMap[p.username] || 0) + postScore;
        likes7dMap[p.username] = (likes7dMap[p.username] || 0) + (Array.isArray(p.likes) ? p.likes.length : 0);
        comments7dMap[p.username] = (comments7dMap[p.username] || 0) + (Array.isArray(p.comments) ? p.comments.length : 0);
      }
    });

    const totalLikesPerUser = {};
    const totalCommentsPerUser = {};
    const totalReactionsPerUser = {};

    posts.forEach(p => {
      if (p.username) {
        const likeCount = Array.isArray(p.likes) ? p.likes.length : 0;
        const commentCount = Array.isArray(p.comments) ? p.comments.length : 0;
        const reactionCount = Array.isArray(p.reactions) ? p.reactions.length : 0;

        totalLikesPerUser[p.username] = (totalLikesPerUser[p.username] || 0) + likeCount;
        totalCommentsPerUser[p.username] = (totalCommentsPerUser[p.username] || 0) + commentCount;
        totalReactionsPerUser[p.username] = (totalReactionsPerUser[p.username] || 0) + reactionCount;
      }
    });

    const excluded = ["textmobofficial", "ismailg", "IBG", "IbrahimG", "textmobai"];
    const rankedUsers = users
      .filter(u => !excluded.includes(u.username))
      .map(u => {
        const followers = Array.isArray(u.followers) ? u.followers.length : 0;
        const coins = u.mobcoins || 0;
        const userLikes = totalLikesPerUser[u.username] || 0;
        const userComments = totalCommentsPerUser[u.username] || 0;
        const userReactions = totalReactionsPerUser[u.username] || 0;
        
        // Hall of Fame Score: Content Appreciation (Likes & Reactions) + Comments + Followers + Mobcoins
        const totalContentAppreciation = userLikes + userReactions;
        const score = (totalContentAppreciation * 3) + (userComments * 2) + followers + Math.floor(coins / 50);
        
        return {
          id: u.id,
          username: u.username,
          fullname: u.fullname || '',
          avatar: u.profile_pic,
          created_at: u.created_at,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const reactions7dMap = {};
    recentPosts.forEach(p => {
      if (p.username) {
        const reactionCount = Array.isArray(p.reactions) ? p.reactions.length : 0;
        reactions7dMap[p.username] = (reactions7dMap[p.username] || 0) + reactionCount;
      }
    });

    const users7dMetrics = users
      .filter(u => !excluded.includes(u.username))
      .map(u => {
        const posts7d = posts7dMap[u.username] || 0;
        const likes7d = likes7dMap[u.username] || 0;
        const comments7d = comments7dMap[u.username] || 0;
        const reactions7d = reactions7dMap[u.username] || 0;
        const totalEngagement7d = posts7d + likes7d + comments7d;
        const totalReactions = reactions7d > 0 ? reactions7d : likes7d;
        return {
          username: u.username,
          fullname: u.fullname || '',
          avatar: u.profile_pic,
          posts7d,
          likes7d,
          comments7d,
          reactions7d,
          totalEngagement7d,
          mobcoins: u.mobcoins || 0,
          totalReactions
        };
      });

    const weighted7d = users7dMetrics.map(u => {
      const s = 0.6 * u.totalEngagement7d + 0.2 * u.posts7d + 0.2 * u.totalReactions;
      u.score7d = Math.round(s * 10) / 10;
      return u;
    });

    weighted7d.sort((a, b) => b.score7d - a.score7d);
    const topUsers7d = weighted7d.filter(u => u.score7d > 0).slice(0, 10);

    const topCoinHolders = users
      .map(u => ({
        username: u.username,
        fullname: u.fullname || '',
        avatar: u.profile_pic,
        mobcoins: u.mobcoins || 0
      }))
      .sort((a, b) => b.mobcoins - a.mobcoins)
      .slice(0, 5);

    const totalPosts = posts.length;
    const pollPosts = posts.filter(p => p.type === "poll").length;
    const normalPosts = posts.filter(p => p.type === "post" || !p.type || p.type === "text" || p.type === "media").length;
    const anonPosts = posts.filter(p => p.type === "").length;
    const eventPosts = posts.filter(p => p.type === "event").length;
    const totalLikes = posts.reduce((s, p) => s + (Array.isArray(p.likes) ? p.likes.length : 0), 0);
    const totalComments = posts.reduce((s, p) => s + (Array.isArray(p.comments) ? p.comments.length : 0), 0);
    const avgLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
    const avgComments = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;
    const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(2) : 0;
    const totalMobcoins = users.reduce((s, u) => s + (u.mobcoins || 0), 0);

    const prevWeekUsers = weekCounts[2] || 0;
    const currWeekUsers = weekCounts[3] || 0;
    const userWeeklyGrowth = prevWeekUsers > 0 ? ((currWeekUsers - prevWeekUsers) / prevWeekUsers * 100).toFixed(1) : '0';

    const prevWeekPosts = postWeekCounts[2] || 0;
    const currWeekPosts = postWeekCounts[3] || 0;
    const postWeeklyGrowth = prevWeekPosts > 0 ? ((currWeekPosts - prevWeekPosts) / prevWeekPosts * 100).toFixed(1) : '0';

    const sortedUsers = (users || []).sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    res.json({
      users: sortedUsers,
      analytics: {
        signups: { hourLabels, hourCounts, dayLabels, dayCounts, weekLabels, weekCounts, monthLabels, monthCounts },
        postCreations: { hourLabels: postHourLabels, hourCounts: postHourCounts, dayLabels: postDayLabels, dayCounts: postDayCounts, weekLabels: postWeekLabels, weekCounts: postWeekCounts, monthLabels: postMonthLabels, monthCounts: postMonthCounts },
        posts: { totalPosts, pollPosts, normalPosts, anonPosts, eventPosts, avgLikes, avgComments, totalLikes, totalComments, engagementRate },
        topUsers: rankedUsers,
        topUsers7d,
        topCoinHolders,
        postCountsPerUser: postMap,
        totalMobcoins,
        userWeeklyGrowth,
        postWeeklyGrowth
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: "Server error generating analytics" });
  }
});

app.get("/api/admin/payouts", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('redemption_queue')
      .select('*, users(username, fullname, profile_pic)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/payout/update", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: "ID and status required" });
    const { data: payout, error: fetchError } = await supabase
      .from('redemption_queue')
      .select('*, users(username, email, fullname)')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    const { error: updateError } = await supabase
      .from('redemption_queue')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;
    const user = payout.users;
    if (user && user.username) {
      const msg = status === 'COMPLETED'
        ? `Your redemption of ${payout.coin_amount} Mobcoins was processed!`
        : `Your redemption request has been rejected.`;
      const subject = status === 'COMPLETED' ? "Redemption Successful" : "Redemption Update";
      await triggerNotification(user.username, 'mobcoins', { msg, subject, html: msg, link: "/wallet" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/verification-requests", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('id, created_at, users(username)')
      .eq('status', 'PENDING');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/verification-update", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !['ACCEPTED', 'REJECTED'].includes(status)) return res.status(400).json({ error: "Invalid request" });
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'ACCEPTED') {
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      updates.verified_until = oneMonthFromNow.toISOString();
    }
    const { data: request, error: updateError } = await supabase
      .from('verification_requests')
      .update(updates)
      .eq('id', id)
      .select('user_id, users(username)')
      .single();
    if (updateError) throw updateError;
    if (status === 'ACCEPTED') {
      await triggerNotification(request.users.username, 'verification', { msg: "You have been verified!", subject: "Verification Accepted!", html: `Hi @${request.users.username},<br><br>You are now verified!`, link: "/accountscenter" });
    } else {
      await triggerNotification(request.users.username, 'verification', { msg: "Your verification was rejected.", subject: "Verification Update", html: `Hi @${request.users.username},<br><br>Please ensure you meet all criteria.`, link: "/accountscenter" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/user/toggle-status", async (req, res) => {
  try {
    const { userId, disabled } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;

    const disabledStr = String(!!disabled);
    const { error } = await supabase.from('users').update({ disabled: disabledStr }).eq('id', userId);
    if (error) throw error;

    // Update MemoryDB in real-time
    if (memoryDb && memoryDb.isReady && user) {
      memoryDb.updateUser(user.username, { disabled: disabledStr });
      if (disabled) {
        memoryDb.removeUserPosts(user.username);
      }
    }

    res.json({ success: true, disabled: disabledStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/user/update-coins", async (req, res) => {
  try {
    const { userId, mobcoins } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;

    const { error } = await supabase.from('users').update({ mobcoins: parseInt(mobcoins) || 0 }).eq('id', userId);
    if (error) throw error;

    // Update MemoryDB in real-time
    if (memoryDb && memoryDb.isReady && user) {
      memoryDb.updateUser(user.username, { mobcoins: parseInt(mobcoins) || 0 });
    }

    res.json({ success: true, mobcoins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NEW ADMIN ENDPOINTS ──────────────────────────────────────────────────────

app.post("/api/admin/user/set-verified", async (req, res) => {
  try {
    const { userId, verified } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("username, fullname")
      .eq("id", userId)
      .single();
    if (fetchErr) throw fetchErr;

    const { error: updateErr } = await supabase
      .from("users")
      .update({ verified: !!verified })
      .eq("id", userId);
    if (updateErr) throw updateErr;

    // Update MemoryDB in real-time
    if (memoryDb && memoryDb.isReady && user) {
      memoryDb.updateUser(user.username, { verified: !!verified });
    }

    if (verified && user) {
      await triggerNotification(user.username, 'verification', {
        msg: `Congratulations @${user.username}! You have been verified by the admin.`,
        subject: "You're Verified on Textmob!",
        html: `Hi ${user.fullname || user.username},<br><br>You have been verified by the Textmob admin team. Enjoy your verified badge!`,
        link: "/accountscenter"
      });
    }

    res.json({ success: true, verified: !!verified });
  } catch (err) {
    console.error("[ADMIN SET VERIFIED ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/user/details", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;

    const { data: posts, error: postsErr } = await supabase2
      .from("Posts")
      .select("id, type, text, created_at, likes, comments, media")
      .eq("username", user.username)
      .order("created_at", { ascending: false })
      .limit(20);
    if (postsErr) throw postsErr;

    res.json({ user, posts: posts || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/posts", async (req, res) => {
  try {
    const { search, username, limit: queryLimit, id } = req.query;
    let query = supabase2
      .from("Posts")
      .select("id, username, type, text, created_at, likes, comments, media, boost_score")
      .order("created_at", { ascending: false });

    if (username) query = query.eq("username", username);
    if (search) query = query.ilike("text", `%${search}%`);
    if (id) query = query.eq("id", id);

    const qLimit = parseInt(queryLimit) || 50;
    query = query.limit(qLimit);

    const { data: posts, error } = await query;
    if (error) throw error;

    res.json(posts || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/delete-post", async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: "postId required" });

    const { data: post, error: fetchErr } = await supabase2
      .from("Posts")
      .select("media_public_ids")
      .eq("id", postId)
      .single();
    if (fetchErr) throw fetchErr;

    (post.media_public_ids || []).forEach(async publicId => {
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    });

    const { error: deleteErr } = await supabase2
      .from("Posts")
      .delete()
      .eq("id", postId);
    if (deleteErr) throw deleteErr;

    if (memoryDb && memoryDb.isReady) {
      memoryDb.posts = memoryDb.posts.filter(p => String(p.id) !== String(postId));
    }

    res.json({ success: true, message: "Post deleted by admin" });
  } catch (err) {
    console.error("[ADMIN DELETE POST ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Boost Post ──────────────────────────────────────────────────────
app.post("/api/boost-post", express.json(), async (req, res) => {
  try {
    const { postId, username, boostAmount } = req.body;
    if (!postId || !username || !boostAmount) return res.status(400).json({ error: "Missing fields" });
    if (boostAmount < 1 || boostAmount > 100) return res.status(400).json({ error: "Boost amount 1-100" });

    const cost = boostAmount * 500;

    const { data: user } = await supabase.from("users").select("mobcoins").eq("username", username).single();
    if (!user || (user.mobcoins || 0) < cost) return res.status(400).json({ error: "Insufficient mobcoins" });

    await supabase.from("users").update({ mobcoins: (user.mobcoins || 0) - cost }).eq("username", username);
    if (memoryDb?.isReady) {
      const u = memoryDb.findUser(username);
      if (u) u.mobcoins = (u.mobcoins || 0) - cost;
    }

    const { data: post, error: fetchErr } = await supabase2.from("Posts").select("boost_score").eq("id", postId).single();
    if (fetchErr) return res.status(500).json({ error: "Failed to fetch post: " + fetchErr.message });
    const currentBoost = post?.boost_score || 0;
    const { error: updateErr } = await supabase2.from("Posts").update({ boost_score: currentBoost + boostAmount, boosted: (currentBoost + boostAmount) > 0 }).eq("id", postId);
    if (updateErr) return res.status(500).json({ error: "Failed to update boost: " + updateErr.message });

    if (memoryDb?.isReady) {
      const p = memoryDb.findPost(postId);
      if (p) { p.boost_score = currentBoost + boostAmount; p.boosted = (currentBoost + boostAmount) > 0; }
    }

    res.json({ success: true, newBoostScore: currentBoost + boostAmount, cost });
  } catch (err) {
    console.error("Boost error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Set Boost ─────────────────────────────────────────────────
app.post("/api/admin/set-boost", express.json(), async (req, res) => {
  try {
    const { postId, boostScore } = req.body;
    await supabase2.from("Posts").update({ boost_score: boostScore, boosted: boostScore > 0 }).eq("id", postId);
    if (memoryDb?.isReady) {
      const p = memoryDb.findPost(postId);
      if (p) { p.boost_score = boostScore; p.boosted = boostScore > 0; }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Track Profile View ──────────────────────────────────────────────
app.post("/api/track-profile-view", express.json(), async (req, res) => {
  try {
    const { targetUsername, viewerUsername } = req.body;
    if (!targetUsername || !viewerUsername) return res.status(400).json({ error: "Missing fields" });
    if (targetUsername === viewerUsername) return res.json({ success: true });

    const { data: user } = await supabase.from("users").select("profile_views").eq("username", targetUsername).single();
    const views = (user?.profile_views || 0) + 1;
    await supabase.from("users").update({ profile_views: views }).eq("username", targetUsername);
    if (memoryDb?.isReady) {
      const u = memoryDb.findUser(targetUsername);
      if (u) u.profile_views = views;
    }
    res.json({ success: true, views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User Stats ──────────────────────────────────────────────────────
app.get("/api/user/stats", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });

    const { data: user } = await supabase.from("users").select("mobcoins, profile_views, followers, following, created_at").eq("username", username).single();
    const { count: postCount } = await supabase2.from("Posts").select("*", { count: "exact", head: true }).eq("username", username);

    res.json({
      mobcoins: user?.mobcoins || 0,
      profileViews: user?.profile_views || 0,
      followerCount: user?.followers?.length || 0,
      followingCount: user?.following?.length || 0,
      postCount,
      joinedAt: user?.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get User Following List ─────────────────────────────────────────
app.get("/get-user-following", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json([]);
    const { data: user } = await supabase.from("users").select("following").eq("username", username).single();
    res.json(Array.isArray(user?.following) ? user.following : []);
  } catch (err) {
    res.json([]);
  }
});

// ─── User Boosted Posts ──────────────────────────────────────────────
app.get("/api/user/boosted-posts", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    const { data } = await supabase2.from("Posts").select("*").eq("username", username).gt("boost_score", 0).order("created_at", { ascending: false }).limit(50);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback catch-all route for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'asilfcismail.html'));
});

// Periodically persist seen maps to disk (every 5 minutes)
setInterval(() => {
  if (memoryDb && memoryDb.isReady) {
    memoryDb.userPostSeenMap = userPostSeenMap;
    memoryDb.userSnapSeenMap = userSnapSeenMap;
    memoryDb.saveSeenMaps();
  }
}, 5 * 60 * 1000);

if (require.main === module) {
  memoryDb.initialize().then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('[MemoryDB] Failed to initialize. Starting without cache.', err);
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (NO CACHE)`);
    });
  });
}

module.exports = { gatherWeeklyActivity, generateRecapAI, sendWeeklyRecapEmail, getWeekKey, recapWeekSent, processAllWeeklyRecaps, transporter };

