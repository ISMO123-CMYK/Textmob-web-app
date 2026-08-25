const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client using credentials from your server.js
const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserPassword(identifier) {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("username, fullname, email, password")
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .limit(5);

    if (error) {
      console.error("❌ Error fetching user:", error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log("❌ User not found.");
      return;
    }

    if (users.length > 1) {
      console.log(`⚠️  Found ${users.length} matches:\n`);
    }

    for (const user of users) {
      console.log("-----------------------------------------");
      console.log(`👤 User Info:`);
      console.log(`- Username: ${user.username}`);
      console.log(`- Full Name: ${user.fullname}`);
      console.log(`- Email:    ${user.email}`);
      console.log(`- Password:  ${user.password}`);
      console.log("-----------------------------------------");
      
      if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
        console.log("⚠️  Note: This password appears to be hashed (bcrypt).");
      } else {
        console.log("✅ Note: This password is stored in plain text.");
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

// Get username from command line argument
const arg = process.argv[2];
if (!arg) {
  console.log("Usage: node check_password.js <username_or_email>");
  process.exit(1);
}

checkUserPassword(arg);
