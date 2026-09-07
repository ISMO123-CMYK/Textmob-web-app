const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("verified", true);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No verified users found.");
    return;
  }

  console.log(`Total verified users: ${data.length}\n`);
  console.log("=".repeat(80));

  data.forEach((u, i) => {
    console.log(`\n#${i + 1}`);
    console.log(`  ID:          ${u.id}`);
    console.log(`  Username:    ${u.username}`);
    console.log(`  Full Name:   ${u.fullname}`);
    console.log(`  Email:       ${u.email}`);
    console.log(`  Phone:       ${u.phone || "N/A"}`);
    console.log(`  User Type:   ${u.userType || "N/A"}`);
    console.log(`  Profile Pic: ${u.profile_pic || "N/A"}`);
    console.log(`  Cover Photo: ${u.cover_photo || "N/A"}`);
    console.log(`  Bio:         ${u.biography || "N/A"}`);
    console.log(`  Disabled:    ${u.disabled || "false"}`);
    console.log(`  Verified:    ${u.verified}`);
    console.log(`  Mobcoins:    ${u.mobcoins || 0}`);
    console.log(`  Followers:   ${u.followers?.length || 0}`);
    console.log(`  Following:   ${u.following?.length || 0}`);
    console.log(`  Friends:     ${u.friends?.length || 0}`);
    console.log(`  Blocked:     ${u.blocked_users?.length || 0}`);
    console.log(`  Created At:  ${u.created_at}`);
    console.log("-".repeat(80));
  });
}

main();
