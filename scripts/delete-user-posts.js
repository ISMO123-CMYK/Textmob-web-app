const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUrl2 = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKey2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUrl2, supabaseKey2);

async function deleteUserPosts(username) {
  console.log(`\n🗑️  DELETING ALL POSTS FOR: @${username}\n`);

  // Fetch all posts by this user
  let allPosts = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: posts, error } = await supabase2
      .from("Posts")
      .select("id")
      .eq("username", username)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching posts:", error.message);
      break;
    }

    if (!posts || posts.length === 0) break;
    allPosts = allPosts.concat(posts);
    if (posts.length < pageSize) break;
    page++;
  }

  console.log(`Found ${allPosts.length} posts to delete\n`);

  if (allPosts.length === 0) {
    console.log("No posts to delete.");
    return;
  }

  // Delete posts in batches
  let deleted = 0;
  const batchSize = 100;

  for (let i = 0; i < allPosts.length; i += batchSize) {
    const batch = allPosts.slice(i, i + batchSize);
    const ids = batch.map(p => p.id);

    const { error: delErr } = await supabase2
      .from("Posts")
      .delete()
      .in("id", ids);

    if (delErr) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, delErr.message);
    } else {
      deleted += batch.length;
      console.log(`✅ Deleted ${deleted}/${allPosts.length} posts`);
    }
  }

  console.log(`\n✨ Done! Deleted ${deleted} posts from @${username}`);
}

const username = process.argv[2] || "etsyuae";
deleteUserPosts(username).catch(console.error);
