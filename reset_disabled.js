const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDisabled() {
  console.log("Fetching all users...");
  const { data: users, error } = await supabase
    .from("users")
    .select("id, username, disabled")
    .eq("disabled", true);

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  if (!users || users.length === 0) {
    console.log("No users found with disabled = true. Nothing to reset.");
    return;
  }

  console.log(`Found ${users.length} users with disabled=true. Resetting to false...`);

  const ids = users.map(u => u.id);
  const { error: updateError } = await supabase
    .from("users")
    .update({ disabled: false })
    .in("id", ids);

  if (updateError) {
    console.error("Error updating users:", updateError);
    return;
  }

  console.log(`Successfully reset ${ids.length} users to disabled=false`);
  users.forEach(u => console.log(`  - @${u.username} (${u.id})`));
}

resetDisabled().catch(console.error);
