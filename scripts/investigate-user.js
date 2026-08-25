const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUrl2 = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKey2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUrl2, supabaseKey2);

async function investigateUser(username) {
  console.log(`\n🔍 INVESTIGATING USER: @${username}\n`);
  console.log("=".repeat(60));

  // 1. Get user profile
  console.log("\n📋 USER PROFILE");
  console.log("-".repeat(40));
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (userError || !user) {
    console.error("❌ User not found:", userError?.message || "No data");
    return;
  }

  console.log(`Username:    ${user.username}`);
  console.log(`Full Name:   ${user.fullname}`);
  console.log(`Email:       ${user.email}`);
  console.log(`Phone:       ${user.phone || "N/A"}`);
  console.log(`Created:     ${user.created_at}`);
  console.log(`Disabled:    ${user.disabled || "false"}`);
  console.log(`Verified:    ${user.verified || false}`);
  console.log(`Mobcoins:    ${user.mobcoins || 0}`);
  console.log(`Followers:   ${user.followers?.length || 0}`);
  console.log(`Following:   ${user.following?.length || 0}`);
  console.log(`Friends:     ${user.friends?.length || 0}`);
  console.log(`Blocked:     ${user.blocked_users?.length || 0}`);
  console.log(`Bio:         ${user.biography || "N/A"}`);
  console.log(`Profile Pic: ${user.profile_pic || "N/A"}`);

  // 2. Get all posts by this user
  console.log("\n📝 POSTS BY USER");
  console.log("-".repeat(40));
  let allPosts = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: posts, error: postsError } = await supabase2
      .from("Posts")
      .select("*")
      .eq("username", username)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (postsError) {
      console.error("Error fetching posts:", postsError.message);
      break;
    }

    if (!posts || posts.length === 0) break;
    allPosts.push(...posts);
    if (posts.length < pageSize) break;
    page++;
  }

  console.log(`Total posts: ${allPosts.length}`);

  if (allPosts.length > 0) {
    // Show recent posts
    console.log("\n📅 RECENT POSTS (last 10):");
    allPosts.slice(0, 10).forEach((post, i) => {
      console.log(`\n  [${i + 1}] ${post.created_at}`);
      console.log(`  Type: ${post.type || "post"}`);
      console.log(`  Text: ${(post.text || "").substring(0, 200)}${post.text?.length > 200 ? "..." : ""}`);
      console.log(`  Media: ${post.media?.length || 0} items`);
      console.log(`  Likes: ${post.likes?.length || 0} | Comments: ${post.comments?.length || 0}`);
      if (post.hashtags?.length > 0) {
        console.log(`  Hashtags: ${post.hashtags.join(", ")}`);
      }
    });

    // Post types breakdown
    console.log("\n📊 POST TYPES:");
    const types = {};
    allPosts.forEach(p => {
      const t = p.type || "post";
      types[t] = (types[t] || 0) + 1;
    });
    Object.entries(types).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Posts with media
    const mediaPosts = allPosts.filter(p => p.media?.length > 0);
    console.log(`\n📸 Posts with media: ${mediaPosts.length}`);

    // Posts with links or suspicious content
    console.log("\n⚠️  POSTS WITH POTENTIAL ISSUES:");
    let issuesFound = 0;
    allPosts.forEach((post, i) => {
      const text = (post.text || "").toLowerCase();
      const hasLink = /https?:\/\/|www\.|\.com|\.org|\.net/i.test(post.text);
      const hasMentions = /@\w+/g.test(post.text);
      const hasPhone = /\d{10,}/.test(post.text);

      if (hasLink || hasPhone) {
        issuesFound++;
        console.log(`  [${post.created_at}] ${post.text?.substring(0, 150)}`);
        if (hasLink) console.log("    ⚠️  Contains link(s)");
        if (hasPhone) console.log("    ⚠️  Contains phone number(s)");
      }
    });
    if (issuesFound === 0) console.log("  None found");

    // Most active times
    console.log("\n⏰ MOST ACTIVE TIMES:");
    const hours = {};
    allPosts.forEach(p => {
      if (p.created_at) {
        const hour = new Date(p.created_at).getHours();
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });
    const sortedHours = Object.entries(hours).sort((a, b) => b[1] - a[1]).slice(0, 5);
    sortedHours.forEach(([hour, count]) => {
      console.log(`  ${hour}:00 - ${count} posts`);
    });
  }

  // 3. Get messages sent by this user
  console.log("\n💬 MESSAGES (sent & received)");
  console.log("-".repeat(40));
  let allMessages = [];
  page = 0;

  while (true) {
    const { data: messages, error: msgError } = await supabase2
      .from("Messages")
      .select("*")
      .or(`sender.eq.${username},receiver.eq.${username}`)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (msgError) {
      console.error("Error fetching messages:", msgError.message);
      break;
    }

    if (!messages || messages.length === 0) break;
    allMessages.push(...messages);
    if (messages.length < pageSize) break;
    page++;
  }

  console.log(`Total messages: ${allMessages.length}`);

  const sent = allMessages.filter(m => m.sender === username);
  const received = allMessages.filter(m => m.receiver === username);
  console.log(`  Sent: ${sent.length}`);
  console.log(`  Received: ${received.length}`);

  if (allMessages.length > 0) {
    console.log("\n📨 RECENT MESSAGES (last 10):");
    allMessages.slice(0, 10).forEach((msg, i) => {
      console.log(`\n  [${i + 1}] ${msg.created_at}`);
      console.log(`  From: ${msg.sender} → To: ${msg.receiver}`);
      console.log(`  Text: ${(msg.text || "").substring(0, 150)}${msg.text?.length > 150 ? "..." : ""}`);
      console.log(`  Read: ${msg.read || false}`);
    });

    // Messages with links
    const linkMessages = allMessages.filter(m => /https?:\/\/|www\.|\.com|\.org|\.net/i.test(m.text));
    console.log(`\n🔗 Messages with links: ${linkMessages.length}`);
    if (linkMessages.length > 0) {
      linkMessages.slice(0, 5).forEach(m => {
        console.log(`  [${m.created_at}] ${m.text?.substring(0, 150)}`);
      });
    }
  }

  // 4. Comments by this user
  console.log("\n💭 COMMENTS BY USER");
  console.log("-".repeat(40));

  // Search through recent posts for comments by this user
  let commentCount = 0;
  let commentIssues = [];

  const { data: recentPosts } = await supabase2
    .from("Posts")
    .select("id, comments, username, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (recentPosts) {
    recentPosts.forEach(post => {
      if (post.comments && Array.isArray(post.comments)) {
        post.comments.forEach(comment => {
          if (comment.username === username) {
            commentCount++;
            if (comment.text && /https?:\/\/|www\.|\.com/i.test(comment.text)) {
              commentIssues.push({
                postId: post.id,
                postUser: post.username,
                text: comment.text,
                date: comment.created_at || post.created_at
              });
            }
          }
          // Check replies too
          if (comment.replies && Array.isArray(comment.replies)) {
            comment.replies.forEach(reply => {
              if (reply.username === username) {
                commentCount++;
              }
            });
          }
        });
      }
    });
  }

  console.log(`Comments found (in recent 100 posts): ${commentCount}`);
  if (commentIssues.length > 0) {
    console.log("\n⚠️  COMMENTS WITH LINKS:");
    commentIssues.forEach(c => {
      console.log(`  On post by @${c.postUser}: ${c.text.substring(0, 100)}`);
    });
  }

  // 5. Who follows this user
  console.log("\n👥 FOLLOWERS & FOLLOWING");
  console.log("-".repeat(40));
  console.log(`Followers (${user.followers?.length || 0}): ${(user.followers || []).slice(0, 20).join(", ")}${user.followers?.length > 20 ? "..." : ""}`);
  console.log(`Following (${user.following?.length || 0}): ${(user.following || []).slice(0, 20).join(", ")}${user.following?.length > 20 ? "..." : ""}`);
  console.log(`Friends (${user.friends?.length || 0}): ${(user.friends || []).slice(0, 20).join(", ")}${user.friends?.length > 20 ? "..." : ""}`);
  console.log(`Blocked (${user.blocked_users?.length || 0}): ${(user.blocked_users || []).join(", ") || "None"}`);

  // 6. Check if user is blocked by others
  console.log("\n🚫 BLOCK STATUS");
  console.log("-".repeat(40));
  const { data: allUsers } = await supabase
    .from("users")
    .select("username, blocked_users");

  if (allUsers) {
    const blockedBy = allUsers.filter(u => u.blocked_users?.includes(username));
    console.log(`Blocked by ${blockedBy.length} users:`);
    blockedBy.forEach(u => console.log(`  - @${u.username}`));
  }

  // 7. Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`User: @${username}`);
  console.log(`Total Posts: ${allPosts.length}`);
  console.log(`Total Messages: ${allMessages.length}`);
  console.log(`Account Status: ${user.disabled === "true" ? "❌ DISABLED" : "✅ ACTIVE"}`);
  console.log(`Verified: ${user.verified ? "✅ Yes" : "❌ No"}`);

  // Action recommendations
  console.log("\n💡 RECOMMENDED ACTIONS:");
  if (user.disabled === "true") {
    console.log("  - Account is already disabled");
  }
  if (commentIssues.length > 3 || linkMessages.length > 5) {
    console.log("  - ⚠️  High volume of links - possible spam");
  }
  if (blockedBy.length > 5) {
    console.log(`  - ⚠️  Blocked by ${blockedBy.length} users - check complaints`);
  }
  if (allPosts.length > 50) {
    console.log("  - High post volume - review content");
  }
}

// Get username from command line
const username = process.argv[2];
if (!username) {
  console.log("Usage: node investigate-user.js <username>");
  console.log("Example: node investigate-user.js believersspt");
  console.log("Example: node investigate-user.js gospelvibes");
  process.exit(1);
}

investigateUser(username).catch(console.error);
