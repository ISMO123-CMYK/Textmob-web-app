const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUrl2 = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKey2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUrl2, supabaseKey2);

async function bulkInvestigate(usernames) {
  console.log("\n🔍 BULK USER INVESTIGATION");
  console.log("=".repeat(70));
  console.log(`Investigating ${usernames.length} users: ${usernames.join(", ")}`);
  console.log("=".repeat(70));

  const results = [];

  for (const username of usernames) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`📋 @${username}`);
    console.log(`${"─".repeat(70)}`);

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("username, fullname, email, disabled, verified, created_at, followers, following, friends, blocked_users, biography")
      .eq("username", username)
      .single();

    if (!user) {
      console.log("  ❌ User not found");
      results.push({ username, status: "NOT_FOUND" });
      continue;
    }

    // Get posts
    const { data: posts } = await supabase2
      .from("Posts")
      .select("id, text, type, created_at, likes, comments, media, hashtags")
      .eq("username", username)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get messages
    const { data: messages } = await supabase2
      .from("Messages")
      .select("id, sender, receiver, text, created_at")
      .or(`sender.eq.${username},receiver.eq.${username}`)
      .order("created_at", { ascending: false })
      .limit(50);

    // Analyze
    const postCount = posts?.length || 0;
    const msgCount = messages?.length || 0;
    const linksInPosts = posts?.filter(p => /https?:\/\/|www\.|\.com/i.test(p.text)).length || 0;
    const linksInMsgs = messages?.filter(m => /https?:\/\/|www\.|\.com/i.test(m.text)).length || 0;
    const mediaPosts = posts?.filter(p => p.media?.length > 0).length || 0;

    // Status flags
    const flags = [];
    if (user.disabled === "true") flags.push("❌ DISABLED");
    if (linksInPosts > 3) flags.push("⚠️ SPAM_POSTS");
    if (linksInMsgs > 5) flags.push("⚠️ SPAM_MSGS");
    if (user.blocked_users?.length > 3) flags.push("⚠️ BLOCKS_OTHERS");
    if (postCount > 30) flags.push("⚠️ HIGH_VOLUME");

    // Check if blocked by others
    const { data: allUsers } = await supabase
      .from("users")
      .select("username, blocked_users");
    const blockedBy = allUsers?.filter(u => u.blocked_users?.includes(username)).length || 0;
    if (blockedBy > 2) flags.push(`🚫 BLOCKED_BY_${blockedBy}`);

    console.log(`  Name:      ${user.fullname}`);
    console.log(`  Email:     ${user.email}`);
    console.log(`  Joined:    ${user.created_at}`);
    console.log(`  Posts:     ${postCount} (${linksInPosts} with links)`);
    console.log(`  Messages:  ${msgCount} (${linksInMsgs} with links)`);
    console.log(`  Followers: ${user.followers?.length || 0} | Following: ${user.following?.length || 0}`);
    console.log(`  Blocked by: ${blockedBy} users`);
    if (flags.length > 0) {
      console.log(`  Flags:     ${flags.join(", ")}`);
    } else {
      console.log(`  Status:    ✅ CLEAN`);
    }

    // Recent posts sample
    if (posts && posts.length > 0) {
      console.log(`\n  Recent posts:`);
      posts.slice(0, 3).forEach((p, i) => {
        const text = (p.text || "").substring(0, 100);
        console.log(`    [${i + 1}] ${p.created_at?.split("T")[0]} - ${text}${p.text?.length > 100 ? "..." : ""}`);
      });
    }

    results.push({
      username,
      status: user.disabled === "true" ? "DISABLED" : "ACTIVE",
      posts: postCount,
      messages: msgCount,
      linksInPosts,
      linksInMsgs,
      blockedBy,
      flags
    });
  }

  // Summary table
  console.log("\n\n" + "=".repeat(70));
  console.log("📊 SUMMARY TABLE");
  console.log("=".repeat(70));
  console.log("Username".padEnd(20) + "Status".padEnd(12) + "Posts".padEnd(8) + "Msgs".padEnd(8) + "Links".padEnd(8) + "Flags");
  console.log("-".repeat(70));

  results.forEach(r => {
    console.log(
      `@${r.username}`.padEnd(20) +
      (r.status || "N/A").padEnd(12) +
      String(r.posts || 0).padEnd(8) +
      String(r.messages || 0).padEnd(8) +
      String((r.linksInPosts || 0) + (r.linksInMsgs || 0)).padEnd(8) +
      (r.flags?.join(", ") || "✅")
    );
  });
}

// Get usernames from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node bulk-investigate.js <username1> <username2> ...");
  console.log("Example: node bulk-investigate.js believersspt gospelvibes");
  process.exit(1);
}

bulkInvestigate(args).catch(console.error);
