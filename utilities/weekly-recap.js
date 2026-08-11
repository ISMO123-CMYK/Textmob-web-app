// Standalone script: run `node weekly-recap.js` to send weekly recaps to all users.
// Preparation (gather + AI) runs across 6 parallel workers.
// Email sending runs sequentially (1 worker) to respect rate limits.
// Imports shared functions from server.js to avoid duplication.

try { require("dotenv").config(); } catch (_) {}

const { createClient } = require("@supabase/supabase-js");
const { gatherWeeklyActivity, generateRecapAI, getWeekKey, recapWeekSent, transporter } = require("./server.js");

const SUPABASE_URL = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WORKERS = 6;

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

// ── Phase 1: Preparation (runs in parallel workers) ──

async function prepareOne(username) {
  const weekKey = getWeekKey();
  if (recapWeekSent.get(username) === weekKey) return null;

  const activity = await gatherWeeklyActivity(username);
  if (!activity || !activity.user || !activity.user.email) return null;

  const recapText = await generateRecapAI(activity);
  if (!recapText) return null;

  return { username, email: activity.user.email, recapText, weekKey, totals: activity.totals };
}

async function worker(chunk) {
  const results = [];
  for (const u of chunk) {
    const prepped = await prepareOne(u.username);
    if (prepped) results.push(prepped);
  }
  return results;
}

// ── Phase 2: Email sending (single worker) ──

function statsHtml(totals) {
  if (totals.postCount === 0 && totals.commentsCount === 0 && totals.likesGiven === 0 && totals.commentsGiven === 0) return '';
  let cells = '';
  if (totals.postCount > 0) cells += `<td style="padding:4px 8px 4px 0;"><span style="display:inline-block;background:#eff6ff;color:#2563eb;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${totals.postCount} post(s)</span></td>`;
  if (totals.likesOnNewPosts > 0) cells += `<td style="padding:4px 8px;"><span style="display:inline-block;background:#fdf2f8;color:#db2777;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${totals.likesOnNewPosts} like(s)</span></td>`;
  if (totals.commentsCount > 0) cells += `<td style="padding:4px 8px;"><span style="display:inline-block;background:#ecfdf5;color:#059669;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${totals.commentsCount} comment(s)</span></td>`;
  if (totals.likesGiven > 0) cells += `<td style="padding:4px 8px;"><span style="display:inline-block;background:#fef3c7;color:#d97706;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${totals.likesGiven} liked</span></td>`;
  if (totals.commentsGiven > 0) cells += `<td style="padding:4px 0 4px 8px;"><span style="display:inline-block;background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;">${totals.commentsGiven} replied</span></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;background:#f8fafc;border-radius:8px;"><tr><td style="padding:16px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr></table>`;
}

function buildEmailHtml(recapText, weekKey, totals) {
  const sb = statsHtml(totals);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:24px 0;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
<tr><td align="center" style="padding:28px 24px 0;">
<img src="https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png" alt="Textmob" width="40" height="40" style="display:block;margin:0 auto 12px;border-radius:8px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Your week on Textmob</h1>
<p style="margin:4px 0 0;font-size:14px;color:#64748b;">${weekKey}</p>
</td></tr>
<tr><td style="padding:24px;">
<p style="font-size:16px;line-height:1.7;color:#0f172a;margin:0;white-space:pre-wrap;">${recapText}</p>
${sb}
</td></tr>
<tr><td align="center" style="padding:0 24px 28px;">
<a href="https://textmob.web.app" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Open Textmob</a>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="font-size:12px;color:#94a3b8;line-height:1.5;">
<a href="https://textmob.web.app/settings/notifications" style="color:#2563eb;text-decoration:none;">Notification Settings</a>
<p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">Textmob, 42 Marina Street, Lagos Island, Lagos, Nigeria</p>
<p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">&copy; 2026 Textmob. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildPlainText(recapText, weekKey, totals) {
  let lines = `${recapText}\n\nYour activity this week:\n`;
  if (totals.postCount > 0) lines += `- ${totals.postCount} post(s) created\n`;
  if (totals.likesOnNewPosts > 0) lines += `- ${totals.likesOnNewPosts} like(s) received\n`;
  if (totals.commentsCount > 0) lines += `- ${totals.commentsCount} comment(s) received\n`;
  if (totals.likesGiven > 0) lines += `- ${totals.likesGiven} post(s) liked\n`;
  if (totals.commentsGiven > 0) lines += `- ${totals.commentsGiven} reply/comment(s) left\n`;
  lines += `\nOpen Textmob: https://textmob.web.app\n\nNotification Settings: https://textmob.web.app/settings/notifications\n\nTextmob, 42 Marina Street, Lagos Island, Lagos, Nigeria`;
  return lines;
}

async function sendAllEmails(preparedList) {
  let sent = 0;
  for (const p of preparedList) {
    if (recapWeekSent.get(p.username) === p.weekKey) continue;
    try {
      await transporter.sendMail({
        from: `"Textmob" <${process.env.SMTP_USER || "sharpbrainspublishers@gmail.com"}>`,
        to: p.email,
        subject: `Your week on Textmob — ${p.weekKey}`,
        text: buildPlainText(p.recapText, p.weekKey, p.totals),
        html: buildEmailHtml(p.recapText, p.weekKey, p.totals),
        headers: { 'List-Unsubscribe': '<https://textmob.web.app/settings/notifications>' }
      });
      recapWeekSent.set(p.username, p.weekKey);
      sent++;
      console.log(`[EMAIL OK] ${p.username} <${p.email}>`);
    } catch (err) {
      console.error(`[EMAIL FAIL] ${p.username}:`, err?.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return sent;
}

// ── Main ──

async function main() {
  console.log("=== Weekly Recap Run ===");
  console.log("Week:", getWeekKey());
  console.log("Workers:", WORKERS);
  console.log();

  const { data: users, error } = await supabase.from("users").select("username, email, fullname");
  if (error || !users) { console.error("Failed to fetch users:", error); process.exit(1); }

  const withEmail = users.filter(u => u.email);
  console.log(`${users.length} total, ${withEmail.length} with email`);
  if (withEmail.length === 0) { console.log("Nothing to do."); process.exit(0); }

  const chunks = chunk(withEmail, Math.ceil(withEmail.length / WORKERS));
  console.log(`Split into ${chunks.length} worker chunks`);
  console.log();

  console.log("── Phase 1: Preparing recaps (6 workers) ──");
  const start = Date.now();
  const nested = await Promise.all(chunks.map(c => worker(c)));
  const prepared = nested.flat();
  const prepTime = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Prepared ${prepared.length} recaps in ${prepTime}s (${withEmail.length - prepared.length} skipped)`);
  console.log();

  if (prepared.length === 0) { console.log("Nothing to send."); process.exit(0); }

  console.log("── Phase 2: Sending emails (1 worker) ──");
  const sendStart = Date.now();
  const sent = await sendAllEmails(prepared);
  const sendTime = ((Date.now() - sendStart) / 1000).toFixed(1);
  console.log();
  console.log(`Sent ${sent} emails in ${sendTime}s`);
  console.log(`Total time: ${((Date.now() - start) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main();
