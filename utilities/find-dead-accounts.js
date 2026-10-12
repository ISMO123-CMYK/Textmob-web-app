require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const supabase2 = createClient(process.env.SUPABASE_2_URL, process.env.SUPABASE_2_KEY);

const INACTIVE_DAYS = 365;
const CUTOFF_MS = Date.now() - INACTIVE_DAYS * 86400000;
const PAGE_SIZE = 1000;

const DEFAULT_AVATAR_MARKERS = [
  "data:image/svg+xml",
  "e5e7eb", // default avatar rect fill
];

function isDefaultAvatar(url) {
  if (!url) return true;
  return DEFAULT_AVATAR_MARKERS.some((m) => String(url).includes(m));
}

async function fetchAll(client, table, columns) {
  const all = [];
  let page = 0;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`${table} page ${page}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

function latestIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

async function main() {
  console.log("[find-dead-accounts] Fetching users...");
  const users = await fetchAll(
    supabase,
    "users",
    "id, username, fullname, email, profile_pic, followers, following, created_at, disabled"
  );
  console.log(`[find-dead-accounts] ${users.length} users loaded.`);

  console.log("[find-dead-accounts] Fetching posts...");
  const posts = await fetchAll(supabase2, "Posts", "username, created_at, likes, comments");
  console.log(`[find-dead-accounts] ${posts.length} posts loaded.`);

  // Build per-user activity map
  const activity = new Map();
  function act(username) {
    if (!username) return null;
    if (!activity.has(username)) {
      activity.set(username, {
        postCount: 0,
        lastPostAt: null,
        lastCommentAt: null,
        likesGiven: 0,
      });
    }
    return activity.get(username);
  }

  for (const p of posts) {
    const a = act(p.username);
    if (a) {
      a.postCount++;
      a.lastPostAt = latestIso(a.lastPostAt, p.created_at);
    }

    const likes = Array.isArray(p.likes) ? p.likes : [];
    for (const liker of likes) {
      const la = act(liker);
      if (la) la.likesGiven++;
    }

    const walkComments = (list) => {
      if (!Array.isArray(list)) return;
      for (const c of list) {
        if (!c || !c.username) continue;
        const ca = act(c.username);
        if (ca) ca.lastCommentAt = latestIso(ca.lastCommentAt, c.timestamp || null);
        if (Array.isArray(c.replies)) walkComments(c.replies);
      }
    };
    walkComments(p.comments);
  }

  const fakeAccounts = [];
  const inactiveAccounts = [];
  const alreadyDisabled = [];
  let activeCount = 0;

  for (const u of users) {
    const a = activity.get(u.username) || {
      postCount: 0,
      lastPostAt: null,
      lastCommentAt: null,
      likesGiven: 0,
    };
    const followers = Array.isArray(u.followers) ? u.followers.length : 0;
    const following = Array.isArray(u.following) ? u.following.length : 0;
    const createdAtMs = u.created_at ? new Date(u.created_at).getTime() : 0;

    const record = {
      id: u.id,
      username: u.username,
      fullname: u.fullname,
      email: u.email,
      created_at: u.created_at,
      postCount: a.postCount,
      lastPostAt: a.lastPostAt,
      lastCommentAt: a.lastCommentAt,
      likesGiven: a.likesGiven,
      followers,
      following,
      defaultAvatar: isDefaultAvatar(u.profile_pic),
    };

    if (String(u.disabled) === "true") {
      alreadyDisabled.push(record);
      continue;
    }

    const isFake =
      a.postCount === 0 &&
      followers === 0 &&
      following === 0 &&
      record.defaultAvatar;

    const lastActivity = latestIso(a.lastPostAt, a.lastCommentAt);
    const lastActivityMs = lastActivity ? new Date(lastActivity).getTime() : null;
    const tooOldToHaveGrace = createdAtMs && createdAtMs < CUTOFF_MS;
    const isInactive =
      !isFake &&
      (lastActivityMs !== null
        ? lastActivityMs < CUTOFF_MS
        : tooOldToHaveGrace);

    if (isFake) {
      record.reasons = ["zero posts", "zero followers", "zero following", "default avatar"];
      fakeAccounts.push(record);
    } else if (isInactive) {
      record.reasons = lastActivityMs !== null
        ? [`no post/comment activity since ${lastActivity} (> ${INACTIVE_DAYS}d)`]
        : [`no post/comment activity ever (account older than ${INACTIVE_DAYS}d)`];
      inactiveAccounts.push(record);
    } else {
      activeCount++;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    inactiveDays: INACTIVE_DAYS,
    totals: {
      users: users.length,
      postsScanned: posts.length,
      activeOrRecentlyCreated: activeCount,
      fake: fakeAccounts.length,
      inactive: inactiveAccounts.length,
      alreadyDisabled: alreadyDisabled.length,
    },
    fakeAccounts,
    inactiveAccounts,
    alreadyDisabled,
  };

  const outPath = path.join(process.cwd(), "dead-accounts-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n========== SUMMARY ==========");
  console.log(`Total users:        ${users.length}`);
  console.log(`Active / recent:    ${activeCount}`);
  console.log(`Fake accounts:      ${fakeAccounts.length}`);
  console.log(`Inactive (>${INACTIVE_DAYS}d):  ${inactiveAccounts.length}`);
  console.log(`Already disabled:   ${alreadyDisabled.length}`);
  console.log(`\nReport written to: ${outPath}`);

  if (fakeAccounts.length) {
    console.log("\n--- Fake accounts (up to 20) ---");
    fakeAccounts.slice(0, 20).forEach((r) =>
      console.log(`  @${r.username} — created ${r.created_at}, ${r.fullname || ""}`)
    );
    if (fakeAccounts.length > 20) console.log(`  ...and ${fakeAccounts.length - 20} more (see report)`);
  }

  if (inactiveAccounts.length) {
    console.log("\n--- Inactive accounts (up to 20) ---");
    inactiveAccounts.slice(0, 20).forEach((r) =>
      console.log(
        `  @${r.username} — last post ${r.lastPostAt || "never"}, last comment ${r.lastCommentAt || "never"}`
      )
    );
    if (inactiveAccounts.length > 20) console.log(`  ...and ${inactiveAccounts.length - 20} more (see report)`);
  }
}

main().catch((err) => {
  console.error("[find-dead-accounts] Failed:", err);
  process.exit(1);
});
