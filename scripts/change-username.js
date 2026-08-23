const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUrl2 = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKey2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUrl2, supabaseKey2);

function replaceInArray(arr, oldVal, newVal) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(v => (String(v) === String(oldVal) ? newVal : v));
}

function renameCommentUsername(comments, oldVal, newVal) {
  if (!Array.isArray(comments)) return comments;
  let changed = false;
  const next = comments.map(c => {
    const n = { ...c };
    if (String(n.username) === String(oldVal)) { n.username = newVal; changed = true; }
    if (Array.isArray(n.replies)) {
      const nr = renameCommentUsername(n.replies, oldVal, newVal);
      if (nr !== n.replies) { n.replies = nr; changed = true; }
    }
    return n;
  });
  return changed ? next : comments;
}

async function paginateAll(client, table, select = '*') {
  let all = [];
  let page = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .range(page * size, (page + 1) * size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    page++;
  }
  return all;
}

async function changeUsername(oldUsername, newUsername) {
  console.log(`\n🔄 Starting username change: @${oldUsername} → @${newUsername}\n`);
  
  const oldU = oldUsername.trim();
  const newU = newUsername.trim();
  
  if (!oldU || !newU) {
    console.error("❌ Error: Both old and new usernames are required");
    process.exit(1);
  }
  
  if (oldU === newU) {
    console.error("❌ Error: Old and new usernames are the same");
    process.exit(1);
  }
  
  if (!/^[a-z0-9_]{3,30}$/.test(newU)) {
    console.error("❌ Error: New username must be 3-30 characters (lowercase letters, numbers, underscores only)");
    process.exit(1);
  }

  try {
    // 1. Check if old user exists
    console.log("1️⃣  Checking if old user exists...");
    const { data: oldUser, error: userErr } = await supabase
      .from("users")
      .select("*")
      .eq("username", oldU)
      .single();
    
    if (userErr || !oldUser) {
      console.error(`❌ Error: User @${oldU} not found`);
      process.exit(1);
    }
    console.log(`   ✅ Found user: @${oldUser.username} (${oldUser.fullname})`);

    // 2. Check if new username is available
    console.log("\n2️⃣  Checking if new username is available...");
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", newU)
      .single();
    
    if (existingUser) {
      console.error(`❌ Error: Username @${newU} is already taken`);
      process.exit(1);
    }
    console.log(`   ✅ Username @${newU} is available`);

    // 3. Update users table - main user record
    console.log("\n3️⃣  Updating main user record...");
    const { error: updateUserErr } = await supabase
      .from("users")
      .update({ username: newU })
      .eq("username", oldU);
    
    if (updateUserErr) throw updateUserErr;
    console.log(`   ✅ Updated main user record`);

    // 4. Update followers array in all users
    console.log("\n4️⃣  Updating followers arrays...");
    const allUsers = await paginateAll(supabase, "users", "username, followers, following, friends");
    let updatedCount = 0;
    for (const user of allUsers) {
      const newFollowers = replaceInArray(user.followers, oldU, newU);
      const newFollowing = replaceInArray(user.following, oldU, newU);
      const newFriends = replaceInArray(user.friends, oldU, newU);
      
      if (JSON.stringify(newFollowers) !== JSON.stringify(user.followers) ||
          JSON.stringify(newFollowing) !== JSON.stringify(user.following) ||
          JSON.stringify(newFriends) !== JSON.stringify(user.friends)) {
        try {
          await supabase
            .from("users")
            .update({ 
              followers: newFollowers, 
              following: newFollowing,
              friends: newFriends
            })
            .eq("username", user.username);
          updatedCount++;
        } catch (e) {
          console.log(`   ⚠️  Failed to update @${user.username}: ${e.message}`);
        }
      }
    }
    console.log(`   ✅ Updated ${updatedCount} users' relationship arrays`);

    // 4b. Try to update blocked_users if column exists
    console.log("\n4b️⃣  Checking blocked_users column...");
    try {
      const allUsersBlocked = await paginateAll(supabase, "users", "username, blocked_users");
      let blockedUpdated = 0;
      for (const user of allUsersBlocked) {
        if (user.blocked_users && Array.isArray(user.blocked_users)) {
          const newBlocked = replaceInArray(user.blocked_users, oldU, newU);
          if (JSON.stringify(newBlocked) !== JSON.stringify(user.blocked_users)) {
            await supabase
              .from("users")
              .update({ blocked_users: newBlocked })
              .eq("username", user.username);
            blockedUpdated++;
          }
        }
      }
      console.log(`   ✅ Updated blocked_users on ${blockedUpdated} users`);
    } catch (e) {
      console.log(`   ℹ️  blocked_users column not found or not accessible, skipping`);
    }

    // 5. Update Posts table - username field
    console.log("\n5️⃣  Updating Posts table (username field)...");
    const { data: userPosts, error: postsErr } = await supabase2
      .from("Posts")
      .select("id, username, comments, likes, reactions")
      .eq("username", oldU);
    
    if (postsErr) throw postsErr;
    
    if (userPosts && userPosts.length > 0) {
      // Batch update username
      const { error: batchErr } = await supabase2
        .from("Posts")
        .update({ username: newU })
        .eq("username", oldU);
      if (batchErr) throw batchErr;
      console.log(`   ✅ Updated username on ${userPosts.length} posts`);
    } else {
      console.log(`   ℹ️  No posts found for @${oldU}`);
    }

    // 6. Update comments in all posts (where user commented)
    console.log("\n6️⃣  Updating comments across all posts...");
    const allPosts = await paginateAll(supabase2, "Posts", "id, comments");
    let commentsUpdated = 0;
    for (const post of allPosts) {
      const newComments = renameCommentUsername(post.comments, oldU, newU);
      if (newComments !== post.comments) {
        await supabase2
          .from("Posts")
          .update({ comments: newComments })
          .eq("id", post.id);
        commentsUpdated++;
      }
    }
    console.log(`   ✅ Updated comments on ${commentsUpdated} posts`);

    // 7. Update likes arrays in all posts
    console.log("\n7️⃣  Updating likes arrays...");
    let likesUpdated = 0;
    for (const post of allPosts) {
      const newLikes = replaceInArray(post.likes, oldU, newU);
      if (JSON.stringify(newLikes) !== JSON.stringify(post.likes)) {
        await supabase2
          .from("Posts")
          .update({ likes: newLikes })
          .eq("id", post.id);
        likesUpdated++;
      }
    }
    console.log(`   ✅ Updated likes on ${likesUpdated} posts`);

    // 8. Update reactions arrays in all posts
    console.log("\n8️⃣  Updating reactions arrays...");
    let reactionsUpdated = 0;
    for (const post of allPosts) {
      if (post.reactions && Array.isArray(post.reactions)) {
        let changed = false;
        const newReactions = post.reactions.map(r => {
          if (String(r.username) === String(oldU)) {
            changed = true;
            return { ...r, username: newU };
          }
          return r;
        });
        if (changed) {
          await supabase2
            .from("Posts")
            .update({ reactions: newReactions })
            .eq("id", post.id);
          reactionsUpdated++;
        }
      }
    }
    console.log(`   ✅ Updated reactions on ${reactionsUpdated} posts`);

    // 9. Update Messages table
    console.log("\n9️⃣  Updating Messages table...");
    const { data: sentMessages } = await supabase2
      .from("Messages")
      .select("id")
      .eq("sender", oldU);
    
    const { data: receivedMessages } = await supabase2
      .from("Messages")
      .select("id")
      .eq("receiver", oldU);
    
    if (sentMessages && sentMessages.length > 0) {
      await supabase2
        .from("Messages")
        .update({ sender: newU })
        .eq("sender", oldU);
      console.log(`   ✅ Updated sender on ${sentMessages.length} messages`);
    }
    
    if (receivedMessages && receivedMessages.length > 0) {
      await supabase2
        .from("Messages")
        .update({ receiver: newU })
        .eq("receiver", oldU);
      console.log(`   ✅ Updated receiver on ${receivedMessages.length} messages`);
    }
    
    if ((!sentMessages || sentMessages.length === 0) && (!receivedMessages || receivedMessages.length === 0)) {
      console.log(`   ℹ️  No messages found for @${oldU}`);
    }

    // 10. Update Sparks table
    console.log("\n🔟 Updating Sparks table...");
    const { data: userSparks } = await supabase
      .from("Sparks")
      .select("id")
      .eq("username", oldU);
    
    if (userSparks && userSparks.length > 0) {
      await supabase
        .from("Sparks")
        .update({ username: newU })
        .eq("username", oldU);
      console.log(`   ✅ Updated username on ${userSparks.length} sparks`);
    } else {
      console.log(`   ℹ️  No sparks found for @${oldU}`);
    }

    // 11. Groups table skipped (non-existent)

    // 12. Update notifications in users table
    console.log("\n1️⃣2️⃣  Updating notifications sender references...");
    let notifUpdated = 0;
    for (const user of allUsers) {
      if (user.notifications && Array.isArray(user.notifications)) {
        let changed = false;
        const newNotifs = user.notifications.map(n => {
          if (String(n.sender) === String(oldU)) {
            changed = true;
            return { ...n, sender: newU };
          }
          return n;
        });
        if (changed) {
          await supabase
            .from("users")
            .update({ notifications: newNotifs })
            .eq("username", user.username);
          notifUpdated++;
        }
      }
    }
    console.log(`   ✅ Updated notifications on ${notifUpdated} users`);

    // 13. Update verification_requests table
    console.log("\n1️⃣3️⃣  Updating verification_requests table...");
    const { data: verifications } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("user_id", oldU);
    
    if (verifications && verifications.length > 0) {
      await supabase
        .from("verification_requests")
        .update({ user_id: newU })
        .eq("user_id", oldU);
      console.log(`   ✅ Updated ${verifications.length} verification requests`);
    } else {
      console.log(`   ℹ️  No verification requests found`);
    }

    // 14. Update redemption_queue table
    console.log("\n1️⃣4️⃣  Updating redemption_queue table...");
    const { data: redemptions } = await supabase
      .from("redemption_queue")
      .select("id")
      .eq("user_id", oldU);
    
    if (redemptions && redemptions.length > 0) {
      await supabase
        .from("redemption_queue")
        .update({ user_id: newU })
        .eq("user_id", oldU);
      console.log(`   ✅ Updated ${redemptions.length} redemption requests`);
    } else {
      console.log(`   ℹ️  No redemption requests found`);
    }

    // 15. Update tatu analytics (in-memory, would need server restart to persist)
    console.log("\n1️⃣5️⃣  Note: In-memory analytics (tatuEvents, tatuSessions) will reset on server restart");
    console.log("   To persist, you'd need to update the server's in-memory stores or restart the server");

    console.log(`\n✅✅✅ Username change complete: @${oldU} → @${newU} ✅✅✅`);
    console.log(`\n📝 Summary:`);
    console.log(`   - Main user record: Updated`);
    console.log(`   - Followers/Following/Friends/Blocked arrays: ${updatedCount} users updated`);
    console.log(`   - Posts username: ${userPosts?.length || 0} posts updated`);
    console.log(`   - Comments: ${commentsUpdated} posts updated`);
    console.log(`   - Likes: ${likesUpdated} posts updated`);
    console.log(`   - Reactions: ${reactionsUpdated} posts updated`);
    console.log(`   - Messages: ${(sentMessages?.length || 0) + (receivedMessages?.length || 0)} messages updated`);
    console.log(`   - Sparks: ${userSparks?.length || 0} updated`);
    console.log(`   - Groups: skipped`);
    console.log(`   - Notifications: ${notifUpdated} users updated`);
    console.log(`   - Verification requests: ${verifications?.length || 0} updated`);
    console.log(`   - Redemption requests: ${redemptions?.length || 0} updated`);
    console.log(`\n⚠️  IMPORTANT: Restart the server to refresh in-memory caches (MemoryDB, search engines, socket maps)`);
    
  } catch (err) {
    console.error("\n❌ Error during username change:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Get arguments from command line
const oldUsername = process.argv[2];
const newUsername = process.argv[3];

if (!oldUsername || !newUsername) {
  console.log("Usage: node scripts/change-username.js <old_username> <new_username>");
  console.log("Example: node scripts/change-username.js olduser newuser");
  process.exit(1);
}

changeUsername(oldUsername, newUsername);