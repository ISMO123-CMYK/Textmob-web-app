const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const { Resend } = require("resend");
const resend = new Resend("re_WEZ7aYbs_MTCCZf8HLXmBVjhzs3Et6oQU");

const users = [
  { username: "handifuncomedy", id: "b67e27b2-0b14-42c8-82cb-d3f1013fe922" },
  { username: "anuoluwapo", id: "61dba5f4-9108-456e-b503-213c4886885e" },
  { username: "Mubii", id: "03a6e2b0-3a51-4234-9858-042e24c0d951" },
];

const emailHtml = (fullname, username) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verification Expired — Textmob</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <tr><td align="center" style="padding:32px 24px 8px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.3px;">textmob</h1>
        </td></tr>
        <tr><td style="padding:0 24px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-bottom:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table></td></tr>
        <tr><td style="padding:8px 24px 24px;font-size:15px;line-height:1.6;color:#0f172a;">
          <p style="margin:0 0 16px;">Hi ${fullname || username},</p>
          <p style="margin:0 0 16px;">Your free verified badge on Textmob has now expired.</p>
          <p style="margin:0 0 16px;">You can re-verify anytime by visiting the <strong>Accounts Center</strong> in the app and subscribing to the verified plan.</p>
          <p style="margin:0;">We appreciate you being part of the Textmob community!</p>
        </td></tr>
        <tr><td align="center" style="padding:0 24px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background-color:#2563eb;border-radius:8px;">
              <a href="https://textmob.web.app/accountscenter" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Open Textmob</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const inAppMsg = "Your free verified badge has expired. Visit the Accounts Center to re-subscribe and get your badge back!";

async function main() {
  for (const u of users) {
    console.log(`\nProcessing @${u.username}...`);

    // 1. Fetch user details
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("username, fullname, email, notifications")
      .eq("id", u.id)
      .single();

    if (fetchErr || !user) {
      console.error(`  ❌ Could not fetch @${u.username}:`, fetchErr?.message);
      continue;
    }

    // 2. Set verified = false
    const { error: updateErr } = await supabase
      .from("users")
      .update({ verified: false })
      .eq("id", u.id);

    if (updateErr) {
      console.error(`  ❌ Failed to update @${u.username}:`, updateErr.message);
      continue;
    }
    console.log(`  ✅ Verified set to false`);

    // 3. In-app notification
    const notif = {
      id: Date.now() + Math.random(),
      message: inAppMsg,
      read: false,
      link: "/accountscenter",
      timestamp: new Date().toISOString(),
      type: "admin",
      sender: "admin",
    };
    const existingNotifs = Array.isArray(user.notifications) ? user.notifications : [];
    const updatedNotifs = existingNotifs.concat([notif]);

    const { error: notifErr } = await supabase
      .from("users")
      .update({ notifications: updatedNotifs })
      .eq("id", u.id);

    if (notifErr) {
      console.error(`  ❌ Failed to add in-app notification for @${u.username}:`, notifErr.message);
    } else {
      console.log(`  ✅ In-app notification sent`);
    }

    // 4. Email notification
    if (user.email) {
      try {
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: user.email,
          subject: "Your Verified Badge Has Expired — Textmob",
          html: emailHtml(user.fullname, user.username),
        });
        console.log(`  ✅ Email sent to ${user.email}`);
      } catch (emailErr) {
        console.error(`  ❌ Failed to send email to @${u.username}:`, emailErr.message);
      }
    } else {
      console.log(`  ⚠️  No email on file, skipping email`);
    }
  }

  console.log("\n✅ Done. All 3 users processed.");
}

main();
