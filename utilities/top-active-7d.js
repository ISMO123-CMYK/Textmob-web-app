require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const supabase2 = createClient(process.env.SUPABASE_2_URL, process.env.SUPABASE_2_KEY);

const PAGE_SIZE = 1000;
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

async function fetchAll(client, table, columns, apply) {
  const all = [];
  let page = 0;
  while (true) {
    let q = client.from(table).select(columns).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (apply) q = apply(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table} page ${page}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

async function main() {
  console.log("Fetching users...");
  const users = await fetchAll(supabase, "users", "id, username, fullname, profile_pic, verified");
  const nameMap = {};
  const picMap = {};
  const verifiedMap = {};
  for (const u of users) {
    nameMap[u.username] = u.fullname;
    picMap[u.username] = u.profile_pic;
    verifiedMap[u.username] = !!u.verified;
  }

  console.log("Fetching posts from the last 7 days...");
  const recentPosts = await fetchAll(
    supabase2,
    "Posts",
    "username, likes, comments, created_at",
    (q) => q.gte("created_at", weekAgo)
  );
  console.log(`${recentPosts.length} recent posts.`);

  console.log("Fetching all posts (for comments given)...");
  const allPosts = await fetchAll(supabase2, "Posts", "username, comments, created_at");
  console.log(`${allPosts.length} total posts scanned for comments.`);

  const stats = {};
  function s(username) {
    if (!username) return null;
    if (!stats[username]) stats[username] = { posts: 0, likesReceived: 0, commentsReceived: 0, commentsGiven: 0, lastPostAt: null };
    return stats[username];
  }

  for (const p of recentPosts) {
    const a = s(p.username);
    if (a) {
      a.posts++;
      if (!a.lastPostAt || p.created_at > a.lastPostAt) a.lastPostAt = p.created_at;
    }
    a.likesReceived += Array.isArray(p.likes) ? p.likes.length : 0;
    a.commentsReceived += Array.isArray(p.comments) ? p.comments.length : 0;
  }

  for (const p of allPosts) {
    const walk = (list) => {
      if (!Array.isArray(list)) return;
      for (const c of list) {
        if (!c) continue;
        const ts = c.timestamp || null;
        if (ts && ts >= weekAgo && c.username) {
          const a = s(c.username);
          if (a) a.commentsGiven++;
        }
        if (Array.isArray(c.replies)) walk(c.replies);
      }
    };
    walk(p.comments);
  }

  const rows = Object.entries(stats)
    .map(([username, v]) => ({
      username,
      fullname: nameMap[username] || "",
      verified: verifiedMap[username] || false,
      ...v,
      score: v.posts * 3 + v.commentsGiven * 2 + v.likesReceived * 1 + v.commentsReceived * 1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  console.log("\n========== MOST ACTIVE USERS (last 7 days) ==========");
  console.log("Score = posts*3 + commentsGiven*2 + likesReceived + commentsReceived\n");
  const pad = (str, n) => String(str).padEnd(n);
  console.log(
    pad("#", 4) + pad("@username", 24) + pad("Posts", 7) + pad("CmGiven", 9) + pad("LkRecv", 8) + pad("CmRecv", 8) + pad("Score", 7) + "Name"
  );
  rows.forEach((r, i) => {
    console.log(
      pad(i + 1 + ".", 4) +
        pad("@" + r.username, 24) +
        pad(r.posts, 7) +
        pad(r.commentsGiven, 9) +
        pad(r.likesReceived, 8) +
        pad(r.commentsReceived, 8) +
        pad(r.score, 7) +
        (r.verified ? "✓ " : "") + r.fullname
    );
  });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
