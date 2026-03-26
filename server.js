const express = require("express");
const http = require("http");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const socketIo = require("socket.io");
const Fuse = require("fuse.js");
const path = require("path");
const fs = require("fs").promises;
const axios = require("axios")
const cors = require("cors");
const app = express();
app.use(cors()); // Allow all origins
const server = http.createServer(app); // attach raw HTTP server
const io = socketIo(server);           // attach Socket.IO to the HTTP server
const PORT = process.env.PORT || 5000;
// Initialize Supabase client
const onlineUsers = {};
const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUr = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKe = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUr, supabaseKe);

const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const fetch = require("node-fetch")
// Array of domains to ping
const domains = [
  'https://textmob-web-app.onrender.com',
  'https://louda-back-end.onrender.com',
  'https://astrasearch-r1re.onrender.com',
  'https://mylex.onrender.com',
  'https://textmob-provider-api-99ii.onrender.com'
];

// Function to ping domains
const pingDomains = async () => {
  console.log(`\n--- Pinging domains at ${new Date().toLocaleTimeString()} ---`);

  for (const domain of domains) {
    try {
      const response = await fetch(domain, {
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });

      console.log(`✅ ${domain} - Status: ${response.status} (${response.statusText})`);
    } catch (error) {
      console.error(`❌ ${domain} - Error: ${error.message}`);
    }
  }
};

// Run the pinger every minute
setInterval(pingDomains, 60000); // 60,000 milliseconds = 1 minute

// Initial run immediately
pingDomains();
const pingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
const url = 'https://textmob-provider-api.onrender.com'; // Replace with your app URL
// mailer.js
const nodemailer = require("nodemailer");

// Create transporter using environment variables (set these on Render)
// SMTP_USER: e.g. sharpbrainspublishers@gmail.com
// SMTP_PASS: e.g. Gmail App Password (recommended) or SMTP password
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "sharpbrainspublishers@gmail.com",
    pass: process.env.SMTP_PASS || "vgbp mkny nruf xtfs"
  }
});

// Optional: verify transporter at startup (won't crash app; only logs)
transporter.verify().then(() => {
  console.log("✔️ Mailer ready");
}).catch(err => {
  console.warn("⚠️ Mailer verify failed (will still attempt sends):", err && err.message ? err.message : err);
});

/**
 * Fire-and-forget email sender.
 * Does NOT await transporter.sendMail — caller will not be delayed.
 *
 * @param {string} to - recipient email address (or comma-separated list)
 * @param {string} subject - email subject
 * @param {string} message - main message HTML/text (we inject into template)
 */
function sendNotificationEmail(to, subject, message) {
  const html = `
  <body style="margin:0; padding:0; background:#f4f7fb; font-family:'Inter', Arial, sans-serif; color:#333;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f7fb; padding:20px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden;">
            <tr>
              <td align="center" style="background:#1E90FF; padding:30px;">
                <h1 style="margin:0; font-size:28px; font-weight:800; color:#fff; font-family:'Poppins', Arial, sans-serif;">
                  Textmob
                </h1>
                <p style="margin:8px 0 0; font-size:16px; color:#eaf4ff;">Stay connected. Stay social.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 30px; text-align:center;">
                <p style="font-size:20px; color:#1E90FF; font-weight:600; margin:0 0 20px;">
                  ${message}
                </p>
                <p style="font-size:16px; line-height:1.5; color:#555; margin:0;">
                  Thanks for being part of <strong style="color:#1E90FF;">Textmob</strong>.<br>
                  Let’s keep the conversation alive 🚀
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:20px 30px 40px;">
                <a href="https://textmob.web.app" 
                   style="background:#1E90FF; color:#fff; padding:14px 36px; border-radius:12px; 
                          text-decoration:none; font-weight:600; font-size:16px; 
                          display:inline-block;">
                  Open Textmob
                </a>
              </td>
            </tr>

            <tr>
              <td align="center" style="background:#fafafa; padding:20px 30px; font-size:13px; color:#777; line-height:1.6;">
                <a href="https://textmob.web.app/about" style="color:#1E90FF; text-decoration:none; margin:0 10px;">About</a> | 
                <a href="https://textmob.web.app/privacy" style="color:#1E90FF; text-decoration:none; margin:0 10px;">Privacy</a> | 
                <a href="https://textmob.web.app/terms" style="color:#1E90FF; text-decoration:none; margin:0 10px;">Terms</a>
                <br><br>
                © 2025 Textmob. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  `;

  const mailOptions = {
    from: `"Textmob" <${process.env.SMTP_USER || "sharpbrainspublishers@gmail.com"}>`,
    to: to,
    subject: subject,
    html: html
  };

  // Fire-and-forget: we don't await this promise. We handle success/error in then/catch.
  transporter.sendMail(mailOptions)
    .then(info => {
      console.log("✅ Email queued/sent to", to, "messageId:", info && info.messageId ? info.messageId : "(no id)");
    })
    .catch(err => {
      // Log but do not throw — caller won't be affected
      console.error("⚠️ Failed to send email to", to, ":", err && err.message ? err.message : err);
    });
}

setInterval(async () => {
  try {
    await fetch(url);
    console.log('Pinged app to keep it awake.');
  } catch (error) {
    console.error('Error pinging app:', error);
  }
}, pingInterval);

cloudinary.config({
  cloud_name: 'dzvm9xe1i',
  api_key: '145943618557148',
  api_secret: '48g6aAx6fyU5JdRdhqkQgiBJ7zc',
});

app.use(express.json());
async function updateMobcoins(userId, amount, notify = true, reason = "Mobcoin update") {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("mobcoins, email, fullname, username")
    .eq("username", userId)
    .single();

  if (userErr || !user) throw new Error("User not found");

  const newBalance = (user.mobcoins || 0) + amount;

  const { error: updateErr } = await supabase
    .from("users")
    .update({ mobcoins: newBalance })
    .eq("username", userId);

  if (updateErr) throw new Error("Failed to update Mobcoins");

  if (notify) {
    const message =
      amount > 0
        ? `You received ${amount} Mobcoins.`
        : `You spent ${Math.abs(amount)} Mobcoins.`;

    await sendNotificationEmail(
      user.email,
      "💰 Mobcoin Activity on Textmob",
      `
          <p style="font-size:16px; line-height:1.6; color:#333;">
            Hi <strong>${user.fullname || user.username}</strong>,
          </p>
        
          <p style="font-size:16px; line-height:1.6; color:#333;">
            There has been an update to your <strong style="color:#1E90FF;">Mobcoin</strong> balance:
          </p>
        
          <p style="font-size:16px; line-height:1.6; color:#333; background:#f4f7fb; padding:12px 16px; border-radius:8px;">
            ${message}
          </p>
        
          <p style="font-size:15px; line-height:1.6; color:#555;">
            <em>Reason:</em> ${reason}
          </p>
        
          <p style="font-size:16px; line-height:1.6; color:#333; margin-top:20px;">
            Keep using <strong style="color:#1E90FF;">Textmob</strong> to earn, send, and enjoy more Mobcoin rewards. 🚀  
          </p>
        
          <p style="font-size:14px; line-height:1.6; color:#999;">
            If you did not authorize this activity, please contact us immediately at 
            <a href="mailto:gidadoismail24@gmail.com" style="color:#1E90FF; text-decoration:none;">
              gidadoismail24@gmail.com
            </a>.
          </p>
          `
    );


    await addNotification(userId, {
      id: Date.now() + Math.random(),
      message: `${message} (${reason})`,
      read: false,
      link: `/wallet`,
      timestamp: new Date().toISOString(),
    });
  }

  return newBalance;
}
// Multer config: limit size and only accept images/videos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'newindex.html'))
})

// In-memory array to store reset codes
const resetCodes = [];

// Function to clean expired codes
const cleanExpiredCodes = () => {
  const now = Date.now();
  resetCodes.length = resetCodes.filter(code => code.expiresAt > now).length;
};

// Login Endpoint (Modified to include phone)
app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Identifier: "${identifier}"`);

    if (!identifier || !password) {
      console.warn("[LOGIN FAILED] Missing credentials");
      return res.status(400).json({ error: "Identifier and password are required" });
    }

    const cleanId = identifier.trim();

    // Use ilike for case-insensitive matching on username and email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .or(`username.ilike.${cleanId},fullname.ilike.${cleanId},email.ilike.${cleanId},phone.ilike.${cleanId}`)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("[LOGIN ERROR] Supabase error:", userError);
      return res.status(500).json({ error: "Database error" });
    }

    if (!user) {
      console.warn(`[LOGIN FAILED] User not found for identifier: "${cleanId}"`);
      return res.status(400).json({ error: "Invalid identifier or password" });
    }

    if (user.password !== password) {
      console.warn(`[LOGIN FAILED] Password mismatch for user: "${user.username}"`);
      return res.status(400).json({ error: "Invalid identifier or password" });
    }

    console.log(`[LOGIN SUCCESS] User: "${user.username}"`);

    // Fire-and-forget email notification (safe for both sync and async functions)
    Promise.resolve(
      sendNotificationEmail(
        user.email,
        "🔔 New Login Detected on Textmob",
        `
      <p style="font-size:16px; line-height:1.6; color:#333;">
        Hi <strong>${user.fullname || user.username}</strong>,
      </p>
      <p style="font-size:16px; line-height:1.6; color:#333;">
        We noticed a new login to your <strong style="color:#1E90FF;">Textmob</strong> account.  
      </p>
      <p style="font-size:15px; line-height:1.6; color:#555; margin:16px 0;">
        If this was <strong>you</strong>, no action is needed.  
        If this was <strong>not you</strong>, please secure your account immediately.
      </p>
    `
      )
    ).catch(e => console.error("Email notification failed:", e));

    res.json({ message: "Login successful", user });
  } catch (error) {
    console.error("[LOGIN CRITICAL ERROR]:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Forgot Password Endpoint
app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, fullname, email")
      .or(`username.eq.${identifier.trimEnd()},fullname.eq.${identifier.trimEnd()},email.eq.${identifier.trimEnd()},phone.eq.${identifier.trimEnd()}`)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User with this identifier not found" });
    }

    // Generate 4-digit code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Store reset code in array
    cleanExpiredCodes();
    resetCodes.push({
      userId: user.id,
      resetCode,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiry
      identifier: identifier.trimEnd()
    });

    // Send email with reset code
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "🔔 Textmob Password Reset Request",
      html: `
        <p>Hi ${user.fullname},</p>
        <p>We received a request to reset your Textmob password. Your verification code is:</p>
        <h2>${resetCode}</h2>
        <p>This code is valid for 15 minutes. If you didn't request this, please ignore this email or contact gidadoismail24@gmail.com.</p>
        <p>Best regards,<br>Textmob Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ email: user.email, message: "Password reset code sent to your email" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify Reset Code Endpoint
app.post("/verify-reset-code", async (req, res) => {
  try {
    const { identifier, code } = req.body;

    if (!identifier || !code) {
      return res.status(400).json({ error: "Identifier and code are required" });
    }

    cleanExpiredCodes();
    const resetEntry = resetCodes.find(
      entry => entry.resetCode === code && entry.identifier === identifier.trimEnd() && entry.expiresAt > Date.now()
    );

    if (!resetEntry) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    res.json({ message: "Reset code verified successfully" });
  } catch (error) {
    console.error("Verify Reset Code Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset Password Endpoint
app.post("/reset-password", async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;

    if (!identifier || !code || !newPassword) {
      return res.status(400).json({ error: "Identifier, code, and new password are required" });
    }

    cleanExpiredCodes();
    const resetEntry = resetCodes.find(
      entry => entry.resetCode === code && entry.identifier === identifier.trimEnd() && entry.expiresAt > Date.now()
    );

    if (!resetEntry) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", resetEntry.userId);

    if (updateError) {
      console.error("Error updating password:", updateError);
      return res.status(500).json({ error: "Failed to reset password" });
    }

    // Remove used reset code
    resetCodes.splice(resetCodes.indexOf(resetEntry), 1);

    // Send confirmation email
    const { data: user } = await supabase
      .from("users")
      .select("fullname, email")
      .eq("id", resetEntry.userId)
      .single();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "🔔 Textmob Password Reset Successful",
      html: `
        <p>Hi ${user.fullname},</p>
        <p>Your Textmob password has been successfully reset. If this wasn't you, please contact gidadoismail24@gmail.com immediately.</p>
        <p>Best regards,<br>Textmob Team</p>
      `
    });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get('/auth', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'))
})

app.get('/foryou', function (req, res) {
  res.redirect('/')
})
app.get('/messages', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'chat-ui.html'))
})
app.get('/accountscenter', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'accountscenter.html'))
})

/**
 * server.js
 * Full sitemap + bot-SEO routes for Textmob on Render
 *
 * Requirements / env:
 *   - NODE 18+ (global fetch available)
 *   - Set SITE_URL or SPA_HOST to "https://textmob-provider-api-99ii.onrender.com"
 *   - Optionally set SITEMAP_REFRESH_KEY for protecting the refresh endpoint
 *   - Replace supabase / supabase2 with your actual Supabase clients
 *
 * How to use:
 *   - Place in your Express app root (or replace your current server.js)
 *   - npm install express
 *   - Start with node server.js (Render will handle)
 */

// ---------- CONFIG ----------
const SPA_HOST = process.env.SITE_URL || process.env.SPA_HOST || "https://textmob-provider-api-99ii.onrender.com";
const SITE_URL = SPA_HOST;
const MAX_URLS_PER_SITEMAP = parseInt(process.env.MAX_URLS_PER_SITEMAP || "50000", 10);
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache TTL
const SITEMAP_REFRESH_KEY = process.env.SITEMAP_REFRESH_KEY || ""; // set in Render secrets for safety


// ---------- HELPERS ----------
const BOT_REGEXES = [
  /Googlebot/i,
  /Googlebot-Image/i,
  /Bingbot/i,
  /Baiduspider/i,
  /YandexBot/i,
  /Slurp/i,
  /DuckDuckBot/i,
  /facebookexternalhit/i,
  /Twitterbot/i
];
function isBotReq(req) {
  const ua = (req.headers["user-agent"] || "");
  const q = req.query || {};
  if (q.render === "1" || q._escaped_fragment_ === "1") return true;
  return BOT_REGEXES.some(r => r.test(ua));
}
const escapeHtml = s =>
  (s === undefined || s === null) ? "" : String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// simple in-memory cache
const cach = new Map();
function cacheGet(key) {
  const rec = cach.get(key);
  if (!rec) return null;
  if (Date.now() - rec.ts > CACHE_TTL_MS) {
    cach.delete(key);
    return null;
  }
  return rec.value;
}
function cacheSet(key, value) {
  cach.set(key, { ts: Date.now(), value });
}
function cacheClear(pattern) {
  if (!pattern) return cach.clear();
  for (const k of Array.from(cach.keys())) if (k.includes(pattern)) cache.delete(k);
}

// ---------- BOT-FACING PROFILE: /u/:username ----------
app.get("/u/:username", async (req, res) => {
  try {
    const raw = req.params.username || "";
    const username = raw.split("@").pop().trim();
    if (!username) return res.status(400).send("Invalid username");

    // humans -> redirect to SPA @username
    if (!isBotReq(req)) {
      return res.redirect(302, `${SPA_HOST}/@${encodeURIComponent(username)}`);
    }

    const cacheKey = `profile:${username}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(cached);
    }

    // fetch user row (adjust selected fields if necessary)
    const { data: user, error } = await supabase
      .from("users")
      .select("id,fullname,username,profile_pic,biography,profile_type,followers,following,created_at,created_at")
      .eq("username", username)
      .single();

    if (error || !user) {
      const nf = `<!doctype html><html><head><meta charset="utf-8"/><title>User not found</title><meta name="robots" content="noindex,nofollow"/></head><body><h1>User not found</h1></body></html>`;
      return res.status(404).send(nf);
    }

    const profileUrl = `${SPA_HOST}/@${encodeURIComponent(user.username)}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": user.fullname || user.username,
      "url": profileUrl,
      "image": user.profile_pic || "",
      "description": (user.biography || "").slice(0, 300)
    };

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(user.fullname || user.username)} • Textmob</title>
  <meta name="description" content="${escapeHtml((user.biography || "").slice(0, 160))}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${profileUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(user.fullname || user.username)} • Textmob">
  <meta property="og:description" content="${escapeHtml((user.biography || "").slice(0, 160))}">
  <meta property="og:image" content="${escapeHtml(user.profile_pic || '')}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#0f172a;background:#fff;margin:0;padding:24px;}
    .card{max-width:900px;margin:24px auto;padding:24px;border-radius:12px;border:1px solid #e6eef8;box-shadow:0 8px 24px rgba(15,23,42,0.04);}
    .meta{display:flex;gap:20px;align-items:center;}
    img.avatar{width:96px;height:96px;border-radius:12px;object-fit:cover;border:1px solid #edf2f7;}
    h1{margin:0 0 8px;font-size:22px;color:#0b1320;}
    p.bio{margin:6px 0 12px;color:#334155;}
    .stats{color:#475569;font-size:14px}
    a.cta{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:8px;text-decoration:none;background:#0ea5a4;color:#fff;font-weight:600;}
  </style>
</head>
<body>
  <div class="card">
    <div class="meta">
      <img class="avatar" src="${escapeHtml(user.profile_pic || '')}" alt="${escapeHtml(user.username)}"/>
      <div>
        <h1>${escapeHtml(user.fullname || user.username)}</h1>
        <div class="stats">Followers: ${Array.isArray(user.followers) ? user.followers.length : 0} • Following: ${Array.isArray(user.following) ? user.following.length : 0}</div>
      </div>
    </div>
    <p class="bio">${escapeHtml(user.biography || "This user hasn't written a bio yet.")}</p>
    <a class="cta" href="${profileUrl}">Open @${escapeHtml(user.username)} on Textmob</a>
  </div>
</body>
</html>`;

    cacheSet(cacheKey, html);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Profile SEO error", err);
    res.status(500).send("Server error");
  }
});

// ---------- BOT-FACING POST: /p/:id ----------
app.get("/p/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).send("Invalid id");

    if (!isBotReq(req)) {
      return res.redirect(302, `${SPA_HOST}/post/${encodeURIComponent(id)}`);
    }

    const cacheKey = `post:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(cached);
    }

    const { data: post, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !post) {
      return res.status(404).send(`<!doctype html><html><head><title>Post not found</title><meta name="robots" content="noindex,nofollow"/></head><body><h1>Post not found</h1></body></html>`);
    }

    const postUrl = `${SPA_HOST}/post/${post.id || id}`;
    let jsonLd;
    if (post.type === "event") {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": post.title || `Event by ${post.username}`,
        "description": (post.text || "").slice(0, 300),
        "startDate": post.startDate || undefined,
        "endDate": post.endDate || undefined,
        "url": postUrl
      };
    } else {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title || `Post by ${post.username}`,
        "author": { "@type": "Person", "name": post.username },
        "datePublished": post.created_at || undefined,
        "image": (post.media && post.media[0]) || undefined,
        "articleBody": (post.text || "").slice(0, 300),
        "url": postUrl
      };
    }

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml((post.title || "").slice(0, 60) || `Post by ${post.username}`)} • Textmob</title>
  <meta name="description" content="${escapeHtml((post.text || "").slice(0, 160))}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${postUrl}">
  <meta property="og:type" content="${post.type === 'event' ? 'article' : 'article'}">
  <meta property="og:title" content="${escapeHtml((post.title || "").slice(0, 60) || `Post by ${post.username}`)}">
  <meta property="og:description" content="${escapeHtml((post.text || "").slice(0, 160))}">
  <meta property="og:image" content="${escapeHtml((post.media && post.media[0]) || '')}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    body{font-family:Inter,system-ui,Roboto,-apple-system;line-height:1.45;color:#0b1220;background:#fff;margin:0;padding:20px;}
    .wrap{max-width:900px;margin:28px auto;padding:20px;border-radius:12px;border:1px solid #eef2ff;background:#ffffff;}
    h1{margin:0 0 10px;font-size:20px;color:#0b1320;}
    .by{color:#475569;margin-bottom:12px;}
    .content{color:#334155;font-size:15px;margin-bottom:14px;white-space:pre-wrap;}
    img.media{max-width:100%;height:auto;border-radius:8px;margin-top:8px;border:1px solid #edf2f7;}
    a.cta{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:8px;text-decoration:none;background:#0ea5a4;color:#fff;font-weight:600;}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(post.title || `Post by ${post.username}`)}</h1>
    <div class="by">By <strong>${escapeHtml(post.username)}</strong> • ${new Date(post.created_at || Date.now()).toLocaleString()}</div>
    <div class="content">${escapeHtml(post.text || "")}</div>
    ${Array.isArray(post.media) ? post.media.map(m => `<img class="media" src="${escapeHtml(m)}" alt="post media" />`).join("") : ""}
    <p><a class="cta" href="${postUrl}">Open post on Textmob</a></p>
  </div>
</body>
</html>`;

    cacheSet(cacheKey, html);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("Post SEO error", err);
    res.status(500).send("Server error");
  }
});

// ---------- SITEMAP INDEX: /sitemap.xml ----------
function escapeXml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function urlEntry({ loc, lastmod, changefreq, priority }) {
  let xml = "<url>";
  xml += `<loc>${escapeXml(loc)}</loc>`;
  if (lastmod) xml += `<lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>`;
  if (changefreq) xml += `<changefreq>${escapeXml(changefreq)}</changefreq>`;
  if (typeof priority !== "undefined") xml += `<priority>${escapeXml(String(priority))}</priority>`;
  xml += "</url>\n";
  return xml;
}
// ── POST /profile/:username/change-password ───────────────────────────────────
// Validates current password, then updates to new one.
// Uses the same password hashing you use in /login and /signup.

app.post("/profile/:username/change-password", async (req, res) => {
  try {
    const { username } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 1. Fetch the user's current hashed password
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("password")
      .eq("username", username)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Verify current password
    // Replace bcrypt.compare with whatever hashing library you use
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // 3. Hash new password and update
    const hashed = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabase
      .from("users")
      .update({ password: hashed })
      .eq("username", username);

    if (updateErr) {
      return res.status(500).json({ error: "Failed to update password" });
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("/change-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/sitemap.xml", async (req, res) => {
  try {
    const cacheKey = "sitemap_index";
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set("Content-Type", "application/xml");
      return res.send(cached);
    }

    // counts (head queries)
    const [{ count: postsCountObj }, { count: usersCountObj }] = await Promise.all([
      supabase2.from("Posts").select("id", { count: "exact", head: true }),
      supabase.from("users").select("username", { count: "exact", head: true })
    ]);

    const postsCount = (postsCountObj && postsCountObj.count) || 0;
    const usersCount = (usersCountObj && usersCountObj.count) || 0;

    const postPages = Math.max(1, Math.ceil(postsCount / MAX_URLS_PER_SITEMAP));
    const userPages = Math.max(1, Math.ceil(usersCount / MAX_URLS_PER_SITEMAP));
    const nowIso = new Date().toISOString();

    let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (let i = 1; i <= postPages; i++) {
      indexXml += `<sitemap><loc>${escapeXml(`${SITE_URL}/sitemap-posts-${i}.xml`)}</loc><lastmod>${nowIso}</lastmod></sitemap>\n`;
    }
    for (let i = 1; i <= userPages; i++) {
      indexXml += `<sitemap><loc>${escapeXml(`${SITE_URL}/sitemap-users-${i}.xml`)}</loc><lastmod>${nowIso}</lastmod></sitemap>\n`;
    }

    indexXml += "</sitemapindex>";
    cacheSet(cacheKey, indexXml);
    res.set("Content-Type", "application/xml");
    res.send(indexXml);
  } catch (err) {
    console.error("sitemap index error", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Server error</error>");
  }
});

// ---------- SITEMAP CHUNK BUILDERS ----------
async function buildSitemapChunk(type, page) {
  const cacheKey = `sitemap_${type}_${page}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const limit = MAX_URLS_PER_SITEMAP;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let rows = [];

  if (type === "posts") {
    const { data, error } = await supabase2
      .from("Posts")
      .select("id,created_at,created_at,title")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    rows = data || [];
  } else {
    const { data, error } = await supabase
      .from("users")
      .select("username,created_at,created_at,fullname")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    rows = data || [];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  if (type === "posts") {
    for (const r of rows) {
      const loc = `${SITE_URL}/p/${encodeURIComponent(r.id)}`;
      const lastmod = r.created_at || r.created_at;
      xml += urlEntry({ loc, lastmod, changefreq: "weekly", priority: 0.7 });
    }
  } else {
    for (const r of rows) {
      const username = (r.username || "").split("@").pop().trim();
      const loc = `${SITE_URL}/u/${encodeURIComponent(username)}`;
      const lastmod = r.created_at || r.created_at;
      xml += urlEntry({ loc, lastmod, changefreq: "weekly", priority: 0.8 });
    }
  }

  xml += "</urlset>";
  cacheSet(cacheKey, xml);
  return xml;
}

app.get("/sitemap-posts-:page.xml", async (req, res) => {
  try {
    const page = parseInt(req.params.page || "1", 10);
    if (isNaN(page) || page < 1) return res.status(400).send("Invalid page");
    const xml = await buildSitemapChunk("posts", page);
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("sitemap posts error", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Server error</error>");
  }
});

app.get("/sitemap-users-:page.xml", async (req, res) => {
  try {
    const page = parseInt(req.params.page || "1", 10);
    if (isNaN(page) || page < 1) return res.status(400).send("Invalid page");
    const xml = await buildSitemapChunk("users", page);
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("sitemap users error", err);
    res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Server error</error>");
  }
});

// ---------- SITEMAP REFRESH (cache clear) ----------
app.post("/sitemap-refresh", (req, res) => {
  const key = (req.query.key || req.headers["x-refresh-key"] || "");
  if (SITEMAP_REFRESH_KEY && key !== SITEMAP_REFRESH_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  cacheClear("");
  return res.json({ ok: true, message: "Sitemap cache cleared" });
});
// ── GET /follow-status ──────────────────────────────────────
app.get("/follow-status", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Missing from or to" });
    if (from === to) return res.status(400).json({ error: "Cannot check status with yourself" });

    const { data: target, error } = await supabase
      .from("users")
      .select("profile_type, friends, followers")
      .eq("username", to)
      .single();

    if (error || !target) return res.status(404).json({ error: "User not found" });

    const profileType = (target.profile_type || "individual").toLowerCase();
    const isOrg = profileType !== "individual";
    const isFriend = Array.isArray(target.friends) && target.friends.includes(from);
    const isFollowing = Array.isArray(target.followers) && target.followers.includes(from);

    const status = isOrg
      ? (isFollowing ? "following" : "not_following")
      : (isFriend ? "friended" : "not_friended");

    const label = {
      following: "Following",
      not_following: "Follow",
      friended: "Friends",
      not_friended: "Add Friend",
    }[status];

    res.json({ profileType, status, label });
  } catch (err) {
    console.error("/follow-status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ── POST /follow ────────────────────────────────────────────
// body: { username, currentUsername, action: "follow"|"unfollow" }
app.post("/follow", async (req, res) => {
  try {
    const { username, currentUsername, action } = req.body;

    // ── input checks ──────────────────────────────────────
    if (!username || !currentUsername || !action)
      return res.status(400).json({ error: "Missing required fields" });
    if (username === currentUsername)
      return res.status(400).json({ error: "Cannot follow yourself" });
    if (!["follow", "unfollow"].includes(action))
      return res.status(400).json({ error: "Invalid action. Use follow or unfollow" });

    // ── fetch both users ──────────────────────────────────
    const [{ data: target }, { data: actor }] = await Promise.all([
      supabase.from("users").select("username, profile_type, followers, following").eq("username", username).single(),
      supabase.from("users").select("username, profile_type, followers, following").eq("username", currentUsername).single(),
    ]);

    if (!target) return res.status(404).json({ error: `User '${username}' not found` });
    if (!actor) return res.status(404).json({ error: `User '${currentUsername}' not found` });

    // ── make sure target is actually an org/non-individual ─
    const profileType = (target.profile_type || "individual").toLowerCase();
    if (profileType === "individual")
      return res.status(400).json({ error: "Use /friend for individual profiles" });

    // ── build updated arrays ──────────────────────────────
    let targetFollowers = Array.isArray(target.followers) ? [...target.followers] : [];
    let actorFollowing = Array.isArray(actor.following) ? [...actor.following] : [];

    if (action === "follow") {
      // idempotent — only add if not already present
      if (!targetFollowers.includes(currentUsername)) targetFollowers.push(currentUsername);
      if (!actorFollowing.includes(username)) actorFollowing.push(username);
    } else {
      // idempotent — filter is safe even if not present
      targetFollowers = targetFollowers.filter(u => u !== currentUsername);
      actorFollowing = actorFollowing.filter(u => u !== username);
    }

    // ── persist both atomically ───────────────────────────
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("users").update({ followers: targetFollowers }).eq("username", username),
      supabase.from("users").update({ following: actorFollowing }).eq("username", currentUsername),
    ]);

    if (e1 || e2) {
      console.error("/follow DB error:", e1 || e2);
      return res.status(500).json({ error: "Failed to update follow state" });
    }

    const status = action === "follow" ? "following" : "not_following";
    const label = action === "follow" ? "Following" : "Follow";

    res.json({ status, label, profileType });
  } catch (err) {
    console.error("/follow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ── POST /friend ────────────────────────────────────────────
// body: { username, currentUsername, action: "friend"|"unfriend" }
app.post("/friend", async (req, res) => {
  try {
    const { username, currentUsername, action } = req.body;

    // ── input checks ──────────────────────────────────────
    if (!username || !currentUsername || !action)
      return res.status(400).json({ error: "Missing required fields" });
    if (username === currentUsername)
      return res.status(400).json({ error: "Cannot friend yourself" });
    if (!["friend", "unfriend"].includes(action))
      return res.status(400).json({ error: "Invalid action. Use friend or unfriend" });

    // ── fetch both users ──────────────────────────────────
    const [{ data: target }, { data: actor }] = await Promise.all([
      supabase.from("users").select("username, profile_type, friends").eq("username", username).single(),
      supabase.from("users").select("username, profile_type, friends").eq("username", currentUsername).single(),
    ]);

    if (!target) return res.status(404).json({ error: `User '${username}' not found` });
    if (!actor) return res.status(404).json({ error: `User '${currentUsername}' not found` });

    // ── make sure target is actually an individual ────────
    const profileType = (target.profile_type || "individual").toLowerCase();
    if (profileType !== "individual")
      return res.status(400).json({ error: "Use /follow for organisation profiles" });

    // ── build updated arrays ──────────────────────────────
    let targetFriends = Array.isArray(target.friends) ? [...target.friends] : [];
    let actorFriends = Array.isArray(actor.friends) ? [...actor.friends] : [];

    if (action === "friend") {
      // idempotent — only add if not already present
      if (!targetFriends.includes(currentUsername)) targetFriends.push(currentUsername);
      if (!actorFriends.includes(username)) actorFriends.push(username);
    } else {
      // idempotent — filter is safe even if not present
      targetFriends = targetFriends.filter(u => u !== currentUsername);
      actorFriends = actorFriends.filter(u => u !== username);
    }

    // ── persist both atomically ───────────────────────────
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("users").update({ friends: targetFriends }).eq("username", username),
      supabase.from("users").update({ friends: actorFriends }).eq("username", currentUsername),
    ]);

    if (e1 || e2) {
      console.error("/friend DB error:", e1 || e2);
      return res.status(500).json({ error: "Failed to update friend state" });
    }

    const status = action === "friend" ? "friended" : "not_friended";
    const label = action === "friend" ? "Friends" : "Add Friend";

    res.json({ status, label, profileType });
  } catch (err) {
    console.error("/friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Signup Endpoint (With Profile Picture)
app.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      phone,
      password,
      userType,
      biography,
      profile_type,
      disabled,
    } = req.body;

    if (!fullName || !username || !password || !profile_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if username or email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already taken" });
    }

    let profilePicUrl = null;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "profile-pictures", resource_type: "auto" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
      profilePicUrl = uploadResult.secure_url;
    }

    const { error: insertError } = await supabase
      .from("users")
      .insert([
        {
          fullname: fullName ? fullName.trimEnd() : "Anonymous",
          username: username ? username.split("@").pop().trimEnd() : `user_${Date.now()}`,
          email: email ? email.trimEnd() : "noemail@gmail.com",
          phone: phone ? phone.trimEnd() : "nophone",
          password,
          profile_pic: profilePicUrl || "https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg",
          followers: [],
          following: ["textmobofficial", "textmobai"],
          friends: [],
          notifications: [],
          biography: biography || "Biography not set",
          profile_type: profile_type || "Individual",
          disabled: false,
        },
      ]);
    await sendNotificationEmail(
      email,
      "🔔 Welcome to Textmob!",
      `
      <p style="font-size:16px; line-height:1.6; color:#333;">
        Hi <strong>${fullName}</strong>,
      </p>
      <p style="font-size:16px; line-height:1.6; color:#333;">
        Welcome to <strong style="color:#1E90FF;">Textmob</strong> — your new space to connect, share, and grow with friends, family, and communities around the world. 🎉  
      </p>
      <p style="font-size:16px; line-height:1.6; color:#333;">
        Your email will serve as your central hub for updates and notifications, keeping you informed about everything that matters to you.  
      </p>
      <p style="font-size:16px; line-height:1.6; color:#333;">
        If you did not sign up for Textmob, please report this immediately by contacting us at <a href="mailto:gidadoismail24@gmail.com" style="color:#1E90FF; text-decoration:none;">gidadoismail24@gmail.com</a>.  
      </p>
      <p style="font-size:16px; line-height:1.6; color:#333; margin-top:20px;">
        We’re excited to have you onboard — let’s build connections that last! 🚀  
      </p>
      `
    );

    if (insertError) {
      console.error("Error inserting user:", insertError);
      return res.status(500).json({ error: "Failed to create account" });
    }
    await updateMobcoins(username.split('@').pop().trimEnd(), +70, true, `You Just Received 70 Mobcoins As a new User on Textmob`);
    res.json({ message: "Signup successful! You can now log in." });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// GET all users + check milestone for celebrations
app.get("/users/check-milestone", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, fullname, username, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    const totalUsers = users.length;

    // Calculate if milestone celebration should trigger
    const milestone = totalUsers % 100 === 0 && totalUsers !== 0;

    // Record milestone timestamp to avoid duplicate celebrations
    // You could store it in a separate table, but for simplicity, we return the flag
    res.json({
      users,
      totalUsers,
      showCelebration: milestone,
      // optional: keep timestamp to let frontend display for 7 days
      celebrationTimestamp: milestone ? new Date() : null,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Utility function to calculate Levenshtein Distance
function levenshtein(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,  // deletion
        dp[i][j - 1] + 1,  // insertion
        dp[i - 1][j - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1)  // substitution
      );
    }
  }

  return dp[len1][len2];
}

// Inverted Index Search Engine
class InvertedIndex {
  constructor() {
    this.index = {};
    this.docs = [];
  }

  // Tokenize text (split words and convert to lowercase)
  tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  // Index a document with its unique ID
  indexDocument(docId, text) {
    const tokens = this.tokenize(text);
    tokens.forEach(token => {
      if (!this.index[token]) this.index[token] = [];
      if (!this.index[token].includes(docId)) this.index[token].push(docId);
    });
    this.docs.push({ id: docId, text });
  }

  // Perform a fuzzy search (with Levenshtein distance) and return relevant documents
  search(query, fuzziness = 2) {
    const queryTokens = this.tokenize(query);
    let results = [];

    // Look for documents that match the query
    this.docs.forEach(doc => {
      let score = 0;

      queryTokens.forEach(token => {
        let tokenMatch = false;

        // Check if any token in the document is a fuzzy match
        this.tokenize(doc.text).forEach(docToken => {
          if (levenshtein(token, docToken) <= fuzziness) {
            tokenMatch = true;
            score += 1;  // Increment score based on matches
          }
        });

        // If we find a match, add to results
        if (tokenMatch) {
          results.push({ docId: doc.id, score });
        }
      });
    });

    // Sort results by score (highest first)
    results.sort((a, b) => b.score - a.score);
    return results.map(result => {
      return { ...this.docs.find(doc => doc.id === result.docId), score: result.score };
    });
  }
}

// Initialize inverted index instances
const userSearchEngine = new InvertedIndex();
const postSearchEngine = new InvertedIndex();

// Pre-populate user search engine
async function indexUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, fullname, username, biography, profile_pic');

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  data.forEach(user => {
    const docText = `${user.username} ${user.fullname} ${user.biography || ''} ${user.profile_pic || ''}`;
    userSearchEngine.indexDocument(user.id, docText);
  });
}

// Pre-populate post search engine
async function indexPosts() {
  const { data, error } = await supabase2
    .from('Posts')
    .select('id, username, text, media, likes, comments, created_at, type');

  if (error) {
    console.error("Error fetching posts:", error);
    return;
  }

  data.forEach(post => {
    const docText = `${post.text || ''} ${post.username} ${post.hashtags ? post.hashtags.join(' ') : ''}`;
    postSearchEngine.indexDocument(post.id, docText);
  });
}

// Initialize search engines on app start
indexUsers();
indexPosts();

// Original /search route using Fuse.js for users only
app.get("/search", async (req, res) => {
  try {
    const { query, currentUsername } = req.query;

    if (!query || !currentUsername) {
      return res
        .status(400)
        .json({ error: "Both `query` and `currentUsername` are required" });
    }

    // Fetch your own relationships (friends + following)
    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", currentUsername)
      .single();

    if (youErr || !you) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const yourFriends = you.friends || [];
    const yourFollowing = you.following || [];

    // Fetch all users
    const { data, error } = await supabase
      .from("users")
      .select(`
        username,
        fullname,
        profile_pic,
        profile_type,
        friends,
        followers
      `);

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Error fetching users" });
    }

    // Run Fuse.js fuzzy search on the full set
    const fuse = new Fuse(data, {
      keys: ["username", "fullname"],
      threshold: 0.3,
    });
    const rawResults = fuse.search(query);

    if (rawResults.length === 0) {
      return res.status(200).json([]);  // no matches
    }

    // Map each match to the minimal shape your frontend needs
    const results = rawResults.map(r => {
      const u = r.item;
      const isOrg = u.profile_type.toLowerCase() === "organisation";
      let relation;

      if (isOrg) {
        relation = yourFollowing.includes(u.username)
          ? "following"
          : "not_following";
      } else {
        relation = yourFriends.includes(u.username)
          ? "friended"
          : "not_friended";
      }

      return {
        type: "user",
        username: u.username,
        fullname: u.fullname,
        profile_pic: u.profile_pic,
        profile_type: isOrg ? "organisation" : "individual",
        relation
      };
    });

    return res.json(results);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/general/search", async (req, res) => {
  try {
    const { query, currentUsername } = req.query;
    if (!query || !currentUsername) {
      return res.status(400).json({ error: "Both `query` and `currentUsername` are required" });
    }

    const qLower = query.toLowerCase().trim();
    const queryWords = qLower.split(/\s+/).filter(w => w.length > 0);

    // --- Load current user's relationships ---
    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", currentUsername)
      .single();

    if (youErr || !you) {
      return res.status(404).json({ error: "Current user not found" });
    }

    function toNameSet(arr) {
      if (!Array.isArray(arr)) return new Set();
      const s = new Set();
      for (let item of arr) {
        if (typeof item === "string") s.add(item);
        else if (item && item.username) s.add(item.username);
        else if (item && (typeof item.id !== "undefined")) s.add(String(item.id));
      }
      return s;
    }

    const yourFriendsSet = toNameSet(you.friends);
    const yourFollowingSet = toNameSet(you.following);

    // --- Fetch all users and posts ---
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, username, fullname, profile_pic, profile_type, friends, followers, biography");

    if (userErr || !users) return res.status(500).json({ error: "Error fetching users" });

    const { data: posts, error: postErr } = await supabase2
      .from("Posts")
      .select("id, username, text, media, likes, comments, created_at, type");

    if (postErr || !posts) return res.status(500).json({ error: "Error fetching posts" });

    // Fast lookups
    const usersById = {};
    const usersByUsername = {};
    users.forEach(u => {
      usersById[String(u.id)] = u;
      if (u.username) usersByUsername[u.username] = u;
    });

    const postsById = {};
    posts.forEach(p => postsById[String(p.id)] = p);

    // --- Inverted Index results (keep them) ---
    const rawUserInv = (userSearchEngine && userSearchEngine.search) ? userSearchEngine.search(query, 2) : [];
    const rawPostInv = (postSearchEngine && postSearchEngine.search) ? postSearchEngine.search(query, 2) : [];

    const maxUserInvScore = Math.max(...rawUserInv.map(d => d.score || 0), 1);
    const maxPostInvScore = Math.max(...rawPostInv.map(d => d.score || 0), 1);

    // --- Custom fuzzy scoring function ---
    function customUserScore(user, queryWords, qLower) {
      if (!user) return 0;

      let score = 0;
      const username = (user.username || "").toLowerCase();
      const fullname = (user.fullname || "").toLowerCase();
      const bio = (user.biography || "").toLowerCase();

      // Exact username match = huge boost
      if (username === qLower) return 1.5;

      // Starts with username = strong
      if (username.startsWith(qLower)) score += 0.8;
      // Contains username
      if (username.includes(qLower)) score += 0.6;

      // Word-by-word partial matching
      for (let word of queryWords) {
        if (username.includes(word)) score += 0.3;
        if (username.startsWith(word)) score += 0.4;
        if (fullname.includes(word)) score += 0.25;
        if (bio.includes(word)) score += 0.15;
      }

      // Relation boosts
      const isOrg = (user.profile_type || "").toLowerCase().includes("org");
      if (!isOrg && yourFriendsSet.has(user.username)) score += 0.25;
      if (isOrg && yourFollowingSet.has(user.username)) score += 0.15;

      return score;
    }

    function customPostScore(post, queryWords, qLower) {
      if (!post) return 0;

      let score = 0;
      const text = (post.text || "").toLowerCase();
      const username = (post.username || "").toLowerCase();

      // Text contains full query
      if (text.includes(qLower)) score += 0.7;

      // Word matches in text
      for (let word of queryWords) {
        if (text.includes(word)) score += 0.25;
        if (username.includes(word)) score += 0.15;
      }

      // Recent post boost
      if (post.created_at) {
        const ageDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < 1) score += 0.1;
        else if (ageDays < 7) score += 0.05;
      }

      return score;
    }

    // --- Collect all candidates ---
    const candidates = [];

    // From Inverted Index (keep the good fast results)
    rawUserInv.forEach(doc => {
      const idStr = String(doc.id);
      const u = usersById[idStr] || usersByUsername[idStr];
      if (u) {
        candidates.push({
          type: "user",
          username: u.username,
          fullname: u.fullname,
          profile_pic: u.profile_pic,
          profile_type: (u.profile_type || "").toLowerCase().includes("org") ? "organisation" : "individual",
          relation: (u.profile_type || "").toLowerCase().includes("org")
            ? (yourFollowingSet.has(u.username) ? "following" : "not_following")
            : (yourFriendsSet.has(u.username) ? "friended" : "not_friended"),
          score: (doc.score || 0) / maxUserInvScore + 0.3  // boost inverted a bit
        });
      }
    });

    rawPostInv.forEach(doc => {
      const p = postsById[String(doc.id)];
      if (p) {
        candidates.push({
          type: "post",
          ...p,
          post_type: p.type,
          score: (doc.score || 0) / maxPostInvScore + 0.2
        });
      }
    });

    // Custom search on ALL users and posts (lightweight fallback + catch misses)
    users.forEach(u => {
      const custom = customUserScore(u, queryWords, qLower);
      if (custom > 0.1) {  // only if somewhat relevant
        candidates.push({
          type: "user",
          username: u.username,
          fullname: u.fullname,
          profile_pic: u.profile_pic,
          profile_type: (u.profile_type || "").toLowerCase().includes("org") ? "organisation" : "individual",
          relation: (u.profile_type || "").toLowerCase().includes("org")
            ? (yourFollowingSet.has(u.username) ? "following" : "not_following")
            : (yourFriendsSet.has(u.username) ? "friended" : "not_friended"),
          score: custom
        });
      }
    });

    posts.forEach(p => {
      const custom = customPostScore(p, queryWords, qLower);
      if (custom > 0.1) {
        candidates.push({
          type: "post",
          ...p,
          post_type: p.type,
          score: custom
        });
      }
    });

    // --- Dedupe & sort by score ---
    const seen = new Set();
    const finalResults = [];

    candidates
      .sort((a, b) => b.score - a.score)  // highest score first
      .forEach(item => {
        const key = item.type === "user" ? `user:${item.username}` : `post:${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          // Clean output
          const clean = {
            type: item.type,
            ...(item.type === "user" ? {
              username: item.username,
              fullname: item.fullname,
              profile_pic: item.profile_pic,
              profile_type: item.profile_type,
              relation: item.relation
            } : {
              id: item.id,
              username: item.username,
              text: item.text,
              media: item.media || [],
              likes: Array.isArray(item.likes) ? item.likes : [],
              comments: Array.isArray(item.comments) ? item.comments : [],
              created_at: item.created_at,
              post_type: item.post_type
            })
          };
          finalResults.push(clean);
        }
      });

    // Limit to top 20
    res.json(finalResults.slice(0, 20));

  } catch (err) {
    console.error("General Search Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, fullname, profile_pic, profile_type, friends, followers, biography");

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Error fetching users" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Users route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Supabase Helper Functions
async function getUserCount() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function getPostCount() {
  const { count, error } = await supabase2
    .from('Posts')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

async function getGroupCount() {
  const { count, error } = await supabase2
    .from('groups')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

// Cloudinary Helper Function
async function getCloudinaryUsage() {
  return new Promise((resolve, reject) => {
    cloudinary.api.usage((error, result) => {
      if (error) {
        reject(error);
      } else {
        const storageGB = (result.storage.usage / 1024 / 1024 / 1024).toFixed(2); // Bytes to GB
        const assets = result.objects.usage;
        resolve({ storage: storageGB, assets });
      }
    });
  });
}
app.get('/admin-dashboard', async (req, res) => {
  // Simple authentication via query parameter
  const adminKey = req.query.key;
  if (adminKey !== 'secret_admin_key') { // Replace with a secure key in production
    return res.status(403).send('Unauthorized');
  }

  // Fetch data with error handling
  let userCount;
  try {
    userCount = await getUserCount();
  } catch {
    userCount = 'N/A';
  }

  let postCount;
  try {
    postCount = await getPostCount();
  } catch {
    postCount = 'N/A';
  }

  let groupCount;
  try {
    groupCount = await getGroupCount();
  } catch {
    groupCount = 'N/A';
  }

  let onlineCount = Object.keys(onlineUsers).length;

  let cloudinaryUsage;
  try {
    cloudinaryUsage = await getCloudinaryUsage();
  } catch {
    cloudinaryUsage = { storage: 'N/A', assets: 'N/A' };
  }

  const lastUpdated = new Date().toISOString();

  // Render static HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
    </head>
    <body>
      <h1>Admin Dashboard</h1>
      <p><b>Total Users:</b> ${userCount}</p>
      <p><b>Total Posts:</b> ${postCount}</p>
      <p><b>Total Groups:</b> ${groupCount}</p>
      <p><b>Online Users:</b> ${onlineCount}</p>
      <p><b>Cloudinary Storage Used:</b> ${cloudinaryUsage.storage} GB</p>
      <p><b>Cloudinary Assets:</b> ${cloudinaryUsage.assets}</p>
      <p><b>Last Updated:</b> ${lastUpdated}</p>
      <p><a href="/admin-dashboard?key=${adminKey}">Refresh</a></p>
    </body>
    </html>
  `;

  // Prevent caching of sensitive data
  res.set('Cache-Control', 'no-store');
  res.send(html);
});
// --- NEW: Lightweight Profile Pic Endpoint ---
// This fetches ONLY the image string, saving massive bandwidth
app.get("/profile-pic/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("profile_pic")
      .eq("username", username)
      .single();

    if (error || !data) {
      // Return a default or 404, but json is safer for client handling
      return res.json({ profile_pic: null });
    }

    res.json({ profile_pic: data.profile_pic });
  } catch (error) {
    console.error("Profile Pic Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- EXISTING: Optimized Profile Fetch ---
app.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { data: user, error } = await supabase
      .from("users")
      .select("fullname, username,following, followers, friends, email, userType, profile_pic, biography, notifications, profile_type") // REMOVED friends/followers/following lists to save RAM
      .eq("username", username)
      .single();

    if (error || !user) {
      return res.json({
        profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg',
        notifications: [],
        error: "User not found"
      });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/quick-profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { data: user, error } = await supabase
      .from("users")
      .select("fullname, username, profile_pic") // REMOVED friends/followers/following lists to save RAM
      .eq("username", username)
      .single();

    if (error || !user) {
      return res.json({
        profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg',
        notifications: [],
        error: "User not found"
      });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
// --- EXISTING: Unread Count ---
app.get("/ms-unread", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const { count, error } = await supabase
      .from("Messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver", username)
      .eq("read", false);

    if (error) throw error;
    res.json({ unreadCount: count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});
// Profile Update (delete old, upload new)
app.post(
  "/profile/:username/update",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const { username } = req.params;
      const { fullName, phone, email, biography, password } = req.body;

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, profile_pic_public_id, fullname, phone, email, biography")
        .eq("username", username)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      let newProfilePicUrl = user.profile_pic;
      let newProfilePicPublicId = user.profile_pic_public_id;

      if (req.file) {
        // delete old if exists
        if (user.profile_pic_public_id) {
          await cloudinary.uploader.destroy(user.profile_pic_public_id);
        }
        // upload new
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "profile-pictures", resource_type: "auto" },
            (error, result) => error ? reject(error) : resolve(result)
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
        newProfilePicUrl = uploadResult.secure_url;
        newProfilePicPublicId = uploadResult.public_id;
      }

      const updatedFields = {
        fullname: fullName || user.fullname,
        phone: phone || user.phone,
        email: email || user.email,
        biography: biography || user.biography,
        profile_pic: newProfilePicUrl,
        profile_pic_public_id: newProfilePicPublicId
      };

      // Add password to updated fields if provided
      if (password) {
        updatedFields.password = password; // Store plain password (not recommended for production)
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updatedFields)
        .eq("username", username);

      if (updateError) throw updateError;
      res.json({ message: "Profile updated successfully", updatedFields });

    } catch (error) {
      console.error("Profile Update Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get("/notifications", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // 1️⃣ Fetch user's notifications
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    const unread = (user.notifications || [])
    // 3️⃣ Return unread ones
    res.json({ unread });
  } catch (err) {
    console.error("Error in get-notifications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/notifications-count", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();

    if (error) throw error;

    // Filter unread and return only the length
    const unreadCount = (user.notifications || []).filter(n => !n.read).length;

    res.json({ count: unreadCount });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});
// ---- notifications-server.js (append or paste into your existing server file) ----
// Requires: an existing `app` (Express) and `supabase` client in scope.
// No external uuid library used. IDs are generated with Date.now + Math.random.

function makeId() {
  // short unique-ish id
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

// Send to Expo push service in batches of 100
async function sendExpoPushMessages(messages) {
  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      const json = await resp.json();
      results.push(json);
    } catch (err) {
      console.error("sendExpoPushMessages chunk error:", err);
      results.push({ error: String(err) });
    }
  }
  return results;
}

/**
 * POST /register-token
 * body: { username, token, deviceId, platform }
 * Stores device info in `userType` column (stringified JSON).
 */
app.post("/register-token", async (req, res) => {
  try {
    const { username, token, deviceId, platform } = req.body || {};
    if (!username || !token) {
      return res.status(400).json({ error: "username and token required" });
    }

    // fetch current userType (string or null)
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("userType")
      .eq("username", username)
      .single();

    if (fetchErr) {
      console.error("register-token fetch user error:", fetchErr);
      return res.status(500).json({ error: "user lookup failed" });
    }

    let devices = [];
    try {
      if (user && user.userType) {
        // userType saved as stringified JSON; try to parse
        if (typeof user.userType === "string") {
          devices = JSON.parse(user.userType || "[]");
        } else {
          // just in case it's already JSON
          devices = user.userType || [];
        }
      }
    } catch (e) {
      console.warn("Failed parsing userType; resetting to empty array", e);
      devices = [];
    }

    const normalizedDeviceId = String(deviceId || token).slice(0, 120);
    let updated = false;

    const nextDevices = devices.map((d) => {
      if (d.deviceId === normalizedDeviceId) {
        updated = true;
        return { deviceId: normalizedDeviceId, token, platform: platform || d.platform || "unknown" };
      }
      return d;
    });

    if (!updated) {
      // avoid duplicate tokens
      const exists = nextDevices.some((d) => d.token === token);
      if (!exists) nextDevices.push({ deviceId: normalizedDeviceId, token, platform: platform || "unknown" });
    }

    // save back as stringified JSON in userType column
    const { error: updateErr } = await supabase
      .from("users")
      .update({ userType: JSON.stringify(nextDevices) })
      .eq("username", username);

    if (updateErr) {
      console.error("register-token update error:", updateErr);
      return res.status(500).json({ error: "failed to save token" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("register-token err:", e);
    return res.status(500).json({ error: "internal server error" });
  }
});

/**
 * GET /get-notifications?username=...
 * returns notifications array for the user
 */
app.get("/get-notifications", async (req, res) => {
  try {
    const { username } = req.query || {};
    if (!username) return res.status(400).json({ error: "Username is required" });

    const { data: user, error } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();

    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    return res.json(user && user.notifications ? user.notifications : []);
  } catch (err) {
    console.error("get-notifications err:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

/**
 * addNotification(recipientUsername, notification)
 * - Appends the notification into user's notifications.
 * - Attempts to send a push to every device stored in userType (stringified).
 *
 * Expected notification object: { id, title, message, data, read, created_at }
 * If id missing, one will be generated.
 */
async function addNotification(recipientUsername, notification) {
  try {
    if (!recipientUsername || !notification) {
      console.warn("addNotification missing params");
      return;
    }

    // ensure notification has id and timestamp
    const notif = Object.assign({}, notification);
    if (!notif.id) notif.id = makeId();
    if (!notif.created_at) notif.created_at = new Date().toISOString();
    if (typeof notif.read === "undefined") notif.read = false;

    // fetch current notifications and userType
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications, userType")
      .eq("username", recipientUsername)
      .single();

    if (fetchError || !user) {
      console.error("User not found for notifications:", fetchError);
      return;
    }

    const existingNotifs = Array.isArray(user.notifications) ? user.notifications : [];
    const updatedNotifications = existingNotifs.concat([notif]);

    const { error: updateError } = await supabase
      .from("users")
      .update({ notifications: updatedNotifications })
      .eq("username", recipientUsername);

    if (updateError) {
      console.error("Error updating notifications:", updateError);
    }

    // parse devices from userType (stringified)
    let devices = [];
    try {
      if (user && user.userType) {
        if (typeof user.userType === "string") {
          devices = JSON.parse(user.userType || "[]");
        } else {
          devices = user.userType || [];
        }
      }
    } catch (e) {
      console.warn("Failed parse userType in addNotification", e);
      devices = [];
    }

    if (devices.length === 0) {
      // nothing to push to
      return;
    }

    // build messages
    const messages = devices.map((d) => {
      return {
        to: d.token,
        sound: "default",
        title: notif.title || "TextMob",
        body: notif.message || notif.body || "You have a new notification",
        data: Object.assign({}, notif.data || {}, { notificationId: notif.id }),
        // include _contentAvailable to hint iOS background (works with expo/FCM/APNs)
        _contentAvailable: true,
      };
    });

    // send messages
    try {
      const results = await sendExpoPushMessages(messages);
      console.log("addNotification push results length:", results.length);
    } catch (e) {
      console.error("Error sending pushes in addNotification", e);
    }
  } catch (e) {
    console.error("addNotification error:", e);
  }
}

/**
 * POST /trigger-notifications
 * - Sends unread notifications to all users' devices (scans DB).
 * - Useful for scheduled daily run.
 */

app.post("/trigger-notifications", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("username, notifications, userType");

    if (error) {
      console.error("trigger-notifications fetch users error:", error);
      return res.status(500).json({ error: "failed to fetch users" });
    }

    const allMessages = [];

    for (const u of users || []) {
      const notifs = Array.isArray(u.notifications) ? u.notifications : [];
      const devices = (() => {
        try {
          if (!u.userType) return [];
          if (typeof u.userType === "string") return JSON.parse(u.userType || "[]");
          return u.userType || [];
        } catch (e) {
          console.warn("parse userType in trigger:", e);
          return [];
        }
      })();

      const unread = notifs.filter((n) => !n.read);
      if (unread.length === 0 || devices.length === 0) continue;

      for (const n of unread) {
        for (const d of devices) {
          allMessages.push({
            to: d.token,
            sound: "default",
            title: n.title || "TextMob",
            body: n.message || n.body || "You have a notification",
            data: Object.assign({}, n.data || {}, { notificationId: n.id }),
            _contentAvailable: true,
          });
        }
      }
    }

    if (allMessages.length === 0) {
      return res.json({ ok: true, sent: 0 });
    }

    // send in batches
    const results = await sendExpoPushMessages(allMessages);
    return res.json({ ok: true, sent: allMessages.length, resultsSummary: results.length });
  } catch (err) {
    console.error("trigger-notifications err:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

app.get("/get-sparks", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("Sparks")
      .select("*")
      .eq("username", username)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get Sparks Error:", error);
      return res.status(500).json({ error: "Failed to fetch sparks" });
    }
    return res.json(data)
  } catch (error) {
    console.error("Get Sparks Catch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete Spark Cleanup (update to Cloudinary)
setInterval(async () => {
  try {
    const now = new Date().toISOString();
    const { data: expired, error: selectErr } = await supabase
      .from("Sparks")
      .select("id, media_public_id")
      .lt("expires_at", now);
    if (selectErr || !expired.length) return;

    // delete media from Cloudinary
    for (const s of expired) {
      if (s.media_public_id) {
        await cloudinary.uploader.destroy(s.media_public_id);
      }
    }

    const expiredIds = expired.map(s => s.id);
    await supabase.from("Sparks").delete().in("id", expiredIds);

  } catch (err) {
    console.error("Spark cleanup error:", err);
  }
}, 5000);

app.get("/feed-sparks", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("friends, following, followers")
      .eq("username", username)
      .single();

    if (userError || !user) {
      console.error("User not found or error fetching user:", userError);
      return res.status(404).json({ error: "User not found" });
    }

    const allTargets = [...([`${username}`]), ...(user.friends || []), ...(user.following || [])];
    console.log("All Targets:", allTargets);

    if (allTargets.length === 0) return res.json([]);

    const now = new Date().toISOString();
    console.log("Current time (now):", now);

    const { data, error } = await supabase
      .from("Sparks")
      .select("*")
      .in("username", allTargets)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Feed Sparks Error:", error);
      return res.status(500).json({ error: "Failed to fetch sparks feed" });
    }

    if (!data || data.length === 0) {
      console.log("No sparks found for targets:", allTargets);
      return res.json([]);
    }

    res.json(data);
  } catch (error) {
    console.error("Feed Sparks Catch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

let userCache = []; // In-memory cache for all user profiles

// Function to fetch and cache all user profiles
async function refreshUserCache() {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("username,fullname,profile_pic");

    if (error) {
      console.error("Error refreshing user cache:", error, new Date().toISOString());
      return;
    }

    userCache = users; // Update cache
    console.log("User cache refreshed:", users.length, "users", new Date().toISOString());
  } catch (err) {
    console.error("Error in refreshUserCache:", err, new Date().toISOString());
  }
}

// Initial cache refresh (fire-and-forget)
setImmediate(() => {
  refreshUserCache().catch(err => {
    console.error("Error in initial cache refresh:", err, new Date().toISOString());
  });
});

// Schedule periodic cache refresh every 30 seconds (fire-and-forget)
setInterval(() => {
  refreshUserCache().catch(err => {
    console.error("Error in periodic cache refresh:", err, new Date().toISOString());
  });
}, 10000);

app.get("/feed-contacts-with-meta", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    let usernamesToFetch;

    // Handle special accounts
    if (["textmobai", "textmobofficial", "askify"].includes(username)) {
      usernamesToFetch = ["textmobofficial", "textmobai", "askify"];
      if (userCache.length > 0) {
        usernamesToFetch.push(...userCache.map(u => u.username));
      } else {
        const { data: allUsers, error: allError } = await supabase
          .from("users")
          .select("username");
        if (allError) {
          console.error("Error fetching all users:", allError);
          return res.status(500).json({ error: "Failed to fetch all users" });
        }
        usernamesToFetch.push(...allUsers.map(u => u.username));
      }
    } else {
      // Regular users
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("friends,followers,following")
        .eq("username", username)
        .single();

      if (userError || !user) {
        console.error("User not found:", userError);
        return res.status(404).json({ error: "User not found" });
      }

      usernamesToFetch = [
        username,
        "textmobofficial",
        "textmobai",
        "askify",
        ...(user.friends || []),
        ...(user.followers || []),
        ...(user.following || [])
      ];
    }

    // Deduplicate
    const uniqueUsernames = [...new Set(usernamesToFetch)];

    // Fetch profiles from cache
    let profiles;
    if (userCache.length > 0) {
      profiles = userCache.filter(user => uniqueUsernames.includes(user.username));
    } else {
      const { data: dbProfiles, error: profileError } = await supabase
        .from("users")
        .select("username,fullname,profile_pic")
        .in("username", uniqueUsernames);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        return res.status(500).json({ error: "Failed to fetch profiles" });
      }
      profiles = dbProfiles;
    }

    // NEW: Fetch last messages and unread counts for ALL contacts in ONE query
    const metadata = {};

    // Use chat_id for faster queries (from your background job)
    const chatIds = uniqueUsernames
      .filter(u => u !== username)
      .map(u => normalizeChatId(username, u));

    // Fetch last messages using chat_id (much faster!)
    const { data: lastMessages, error: msgError } = await supabase
      .from("Messages")
      .select("sender,receiver,chat_id,message,timestamp,type,media_url,media_type,status,read")
      .in("chat_id", chatIds)
      .order("timestamp", { ascending: false });

    if (msgError) {
      console.error("Error fetching last messages:", msgError);
    }

    // Group messages by chat_id and get the first (most recent) one
    const lastMsgByChat = {};
    if (lastMessages) {
      lastMessages.forEach(msg => {
        if (!lastMsgByChat[msg.chat_id]) {
          lastMsgByChat[msg.chat_id] = msg;
        }
      });
    }

    // Fetch unread counts in ONE query
    const { data: unreadMessages, error: unreadError } = await supabase
      .from("Messages")
      .select("receiver,chat_id")
      .eq("receiver", username)
      .eq("read", false)
      .in("chat_id", chatIds);

    if (unreadError) {
      console.error("Error fetching unread counts:", unreadError);
    }

    // Count unreads per chat
    const unreadByChat = {};
    if (unreadMessages) {
      unreadMessages.forEach(msg => {
        unreadByChat[msg.chat_id] = (unreadByChat[msg.chat_id] || 0) + 1;
      });
    }

    // Build metadata for each contact
    uniqueUsernames.forEach(contactUsername => {
      if (contactUsername === username) return; // Skip self

      const chatId = normalizeChatId(username, contactUsername);

      metadata[contactUsername] = {
        lastMsg: lastMsgByChat[chatId] || null,
        unreadCount: unreadByChat[chatId] || 0
      };
    });

    // Return combined data
    return res.json({
      contacts: profiles,
      metadata: metadata
    });

  } catch (error) {
    console.error("Feed Contacts With Meta Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function (add at top of file if not already there)
function normalizeChatId(a, b) {
  var sa = String(a || '');
  var sb = String(b || '');
  if (sa < sb) return sa + '-' + sb;
  return sb + '-' + sa;
}

app.post("/create-spark", upload.single("media"), async (req, res) => {
  try {
    const { username, caption } = req.body;
    if (!username || !req.file) {
      return res.status(400).json({ error: "Username and media are required" });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "sparks", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const mediaUrl = uploadResult.secure_url;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("Sparks")
      .insert([
        {
          username,
          caption,
          media: mediaUrl,
          created_at: createdAt,
          expires_at: expiresAt,
          viewers: [],
        },
      ]);

    if (insertError) {
      console.error("Insert Spark Error:", insertError);
      return res.status(500).json({ error: "Failed to create spark" });
    }

    res.json({ message: "Spark lit! 🔥", mediaUrl });
  } catch (error) {
    console.error("Create Spark Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/delete-notification", async (req, res) => {
  try {
    const { username, notificationId } = req.body;

    if (!username || !notificationId) {
      return res.status(400).json({ error: "Username and notificationId are required" });
    }

    // Fetch the current notifications for the user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove the notification with the specified ID
    const updatedNotifications = (user.notifications || []).filter(
      (notification) => notification.id !== notificationId
    );

    // Update the user's notifications
    const { error: updateError } = await supabase
      .from("users")
      .update({ notifications: updatedNotifications })
      .eq("username", username);

    if (updateError) {
      console.error("Error updating notifications:", updateError);
      return res.status(500).json({ error: "Failed to delete notification" });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error in delete-notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark a notification as read
app.post("/mark-notification-read", async (req, res) => {
  try {
    const { username, notificationId } = req.body;
    if (!username || !notificationId) {
      return res.status(400).json({ error: "Username and notificationId are required" });
    }

    // Fetch the current notifications for the user
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();
    if (fetchError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the notification's read status
    const updatedNotifications = (user.notifications || []).map(notification => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    });

    const { error: updateError } = await supabase
      .from("users")
      .update({ notifications: updatedNotifications })
      .eq("username", username);
    if (updateError) {
      return res.status(500).json({ error: "Failed to update notifications" });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error in mark-notification-read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create Post (multiple media via Cloudinary)
// Helper: Get all unique friends and followers for a username
async function getAllUserConnections(username) {
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('friends, followers')
    .eq('username', username)
    .single();
  if (userErr || !user) return [];
  const { friends = [], followers = [] } = user;
  return [...new Set([...friends, ...followers].filter(u => u !== username))];
}

// Helper: Notify all connections of a new post (in-app and email)
async function notifyConnectionsOnPost(username, postText, postId) {
  const connections = await getAllUserConnections(username);
  // Get poster's profile for better notification text (optional)
  const { data: user } = await supabase
    .from('users')
    .select('fullname')
    .eq('username', username)
    .single();

  for (const connection of connections) {
    // Get email for connection
    const { data: connUser } = await supabase
      .from('users')
      .select('email, fullname')
      .eq('username', connection)
      .single();

    // In-app notification
    await addNotification(connection, {
      id: Date.now() + Math.random(),
      message: `${user.fullname || username} just created a new post: "${postText.slice(0, 80)}..."`,
      read: false,
      link: `/post/${postId}`,
      timestamp: new Date().toISOString(),
    });

    // Email notification
    if (connUser && connUser.email) {
      await sendNotificationEmail(
        connUser.email,
        `${user.fullname || username} just posted on Textmob!`,
        `
        <p style="font-size:16px; line-height:1.6; color:#333;">
          <strong>${user.fullname || username}</strong> just shared something new on 
          <strong style="color:#1E90FF;">Textmob</strong> 🎉
        </p>
      
        <blockquote style="font-size:15px; line-height:1.6; color:#555; border-left:4px solid #1E90FF; padding-left:12px; margin:16px 0;">
          ${postText.length > 180 ? postText.slice(0, 180) + "..." : postText}
        </blockquote>
      
        <p style="font-size:16px; margin:20px 0; text-align:center;">
          <a href="https://textmob.web.app/post/${postId}" 
             style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                    text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
            👀 View Post
          </a>
        </p>
      
        <p style="font-size:14px; line-height:1.6; color:#777; margin-top:20px; text-align:center;">
          Stay connected — don’t miss updates from your friends and the people you follow on 
          <strong style="color:#1E90FF;">Textmob</strong>.
        </p>
        `
      );
    }

    // Real-time (Socket.io, optional)
    if (onlineUsers[connection]) {
      onlineUsers[connection].emit('new-notification', {
        message: `${user.fullname || username} just created a new post!`,
        link: `/post/${postId}`,
      });
    }
  }
}
app.post("/create-snap", upload.array("media", 6), async (req, res) => {
  try {
    const { username, text, visib } = req.body;

    if (!username || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate media size before upload
    for (const file of req.files) {
      if (file.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "Each file must be under 20MB" });
      }
    }

    // Upload media to Cloudinary
    const mediaUrls = await Promise.all(
      (req.files || []).map((file) =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "snaps", resource_type: "video" }, // or "auto" if mixed media
            (error, result) => (error ? reject(error) : resolve(result.secure_url))
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        })
      )
    );

    // Extract hashtags from caption
    const hashtags = text.match(/#\w+/g) || [];

    // Insert Snap into Supabase
    const { error: insertError, data } = await supabase2
      .from("Posts")
      .insert([
        {
          username,
          text, // Used as caption
          media: mediaUrls,
          likes: [],
          comments: [],
          hashtags,
          visib,
          type: "snap"
        }
      ])
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating snap:", insertError);
      return res.status(500).json({ error: "Failed to create snap" });
    }

    // Notify followers (same as post)
    await notifyConnectionsOnPost(username, text, data.id);
    await updateMobcoins(
      username.split("@").pop().trimEnd(),
      +15,
      true,
      `You Just Received 15 Mobcoins for creating a Snap on Textmob`
    );

    res.json({ message: "Snap created successfully!" });
  } catch (error) {
    console.error("Snap Creation Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const snapFeedCache = {
  snaps: [],
  lastUpdated: 0,
};
const userSnapSeenMap = new Map();
const snapFeedSessionMap = new Map();

// Unique ID generator for Snap Feed
function generateSnapSessionId() {
  return 'snap-xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Shuffle function specific to snaps
function shuffleSnapsArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Refresh only snaps into the snap cache
async function refreshSnapFeedCache() {
  const { data: snapPosts, error } = await supabase2
    .from("Posts")
    .select("*")
    .eq("type", "snap")
    .order("created_at", { ascending: false });

  if (!error) {
    snapFeedCache.snaps = snapPosts;
    snapFeedCache.lastUpdated = Date.now();
  } else {
    console.error("Snap Feed Cache Error:", error);
  }
}

// Refresh every 1 minute
setInterval(refreshSnapFeedCache, 60000);
refreshSnapFeedCache();
app.get("/snaps-feed", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    if (!snapFeedCache.snaps.length || Date.now() - snapFeedCache.lastUpdated > 60000) {
      await refreshSnapFeedCache();
    }

    if (!userSnapSeenMap.has(username)) userSnapSeenMap.set(username, new Set());
    const seen = userSnapSeenMap.get(username);

    const now = Date.now();
    const DAY = 86400000;

    const scored = snapFeedCache.snaps.map(snap => {
      const ageMs = now - new Date(snap.created_at).getTime();
      const ageDays = ageMs / DAY;
      const likes = (snap.likes || []).length;
      const comments = (snap.comments || []).length;

      // engagement score — likes weighted 2x, comments 3x
      const engagement = (likes * 2) + (comments * 3);

      // freshness decay — halves every 12 hours
      const freshness = Math.pow(0.5, ageDays * 2);

      // unseen bonus — strongly prefer content user hasn't watched
      const unseenBonus = seen.has(snap.id) ? 0 : 8;

      // own content penalty — don't surface your own snaps at the top
      const selfPenalty = snap.username === username ? -5 : 0;

      const score = (engagement * freshness) + unseenBonus + selfPenalty
        // add small random noise so feed feels different each open
        + (Math.random() * 1.5);

      return { ...snap, _score: score };
    });

    // sort by score descending
    scored.sort((a, b) => b._score - a._score);

    // mark all returned snaps as seen
    scored.forEach(s => {
      seen.add(s.id);
      if (seen.size > 500) {
        const arr = Array.from(seen);
        userSnapSeenMap.set(username, new Set(arr.slice(-400)));
      }
    });

    // strip internal score before sending
    const result = scored.map(({ _score, ...snap }) => snap);

    res.json({ snaps: result });
  } catch (err) {
    console.error("Snap Feed Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function cleanupExpiredSnaps() {
  // No more snap clean ups
}
function extractPublicIdFromUrl(url) {
  try {
    const parts = url.split("/");
    const folderAndFile = parts.slice(-2).join("/").split(".")[0]; // e.g., post-media/filename
    return folderAndFile;
  } catch (e) {
    console.error("[Cleaner] Failed to extract public_id from:", url);
    return null;
  }
}

setInterval(cleanupExpiredSnaps, 10 * 60 * 1000); // every 10 mins

// ============================================================
//  GET /search-suggest
//  Install: npm install natural
//
//  Returns: users + keywords (single words) + hashtags +
//           mentions + bigrams/trigrams (2-4 word phrases)
//  All from in-memory cache, refreshed every 3 minutes.
// ============================================================

const natural = require('natural');
const NGrams = natural.NGrams;

// ── stop words ────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'what', 'which', 'who', 'when', 'where', 'how', 'why', 'not', 'no', 'so', 'if',
  'just', 'like', 'get', 'got', 'can', 'am', 'up', 'out', 'go', 'im', 'rt', 'via',
  'from', 'by', 'as', 'into', 'about', 'also', 'than', 'then', 'some', 'all',
  'more', 'very', 'too', 'now', 'here', 'there', 'been', 'new', 'one', 'two',
  'lol', 'haha', 'ok', 'okay', 'yes', 'yeah', 'yep', 'nope', 'omg', 'wow',
  'said', 'says', 'going', 'come', 'came', 'let', 'put', 'see', 'know', 'think',
  'want', 'need', 'good', 'great', 'really', 'time', 'day', 'people', 'make',
  'made', 'still', 'even', 'back', 'way', 'since', 'well', 'also', 'just',
]);

// ── clean text into an array of tokens ────────────────────────
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')            // strip HTML
    .replace(/https?:\/\/\S+/g, ' ')     // strip URLs
    .replace(/[^a-z0-9#@'\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^[^a-z0-9#@]+|[^a-z0-9]+$/g, ''))
    .filter(w => w.length >= 2);
}

// ── determine token type ──────────────────────────────────────
function tokenType(w) {
  if (w.startsWith('#')) return 'hashtag';
  if (w.startsWith('@')) return 'mention';
  return 'keyword';
}

// ── is a plain word worth keeping ────────────────────────────
function isGoodWord(w) {
  if (w.length < 3) return false;
  if (/^\d+$/.test(w)) return false;
  if (STOP_WORDS.has(w)) return false;
  return true;
}

// ── is an ngram phrase worth keeping ─────────────────────────
function isGoodPhrase(tokens) {
  // must have at least one non-stop content word
  const hasContent = tokens.some(t => !STOP_WORDS.has(t) && t.length >= 3 && !/^\d+$/.test(t));
  // must not start or end with a stop word
  const badEdge = STOP_WORDS.has(tokens[0]) || STOP_WORDS.has(tokens[tokens.length - 1]);
  return hasContent && !badEdge;
}

// ─────────────────────────────────────────────────────────────
//  Cache state
// ─────────────────────────────────────────────────────────────
let _userCache = [];   // [{ username, fullname, profile_pic, profile_type }]
let _termCache = [];   // [{ query, count, type }]  — single words + special tokens
let _phraseCache = [];   // [{ query, count, type: 'phrase' }]  — bigrams + trigrams
let _lastUpdate = 0;
const TTL = 3 * 60 * 1000;

async function refreshSuggestCache() {
  try {
    // ── Users ────────────────────────────────────────────────
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('username, fullname, profile_pic, profile_type')
      .limit(2000);

    if (!uErr && users) _userCache = users;

    // ── Posts ────────────────────────────────────────────────
    const { data: posts, error: pErr } = await supabase2
      .from('Posts')
      .select('text')
      .not('text', 'is', null)
      .neq('text', '')
      .order('created_at', { ascending: false })
      .limit(800);

    if (pErr || !posts) return;

    const termCounts = {};  // single-token counts
    const termTypes = {};
    const phraseCounts = {};  // bigram/trigram counts

    posts.forEach(p => {
      const tokens = tokenize(p.text || '');
      const seen = new Set(); // dedupe within one post

      // ── Single tokens ───────────────────────────────────
      tokens.forEach(w => {
        if (seen.has(w)) return;
        seen.add(w);
        const type = tokenType(w);
        const bare = w.replace(/^[#@]/, '');
        if (type !== 'keyword' && bare.length < 2) return;
        if (type === 'keyword' && !isGoodWord(w)) return;
        termCounts[w] = (termCounts[w] || 0) + 1;
        termTypes[w] = type;
      });

      // ── Bigrams (2-word phrases) ──────────────────────
      const plainTokens = tokens.filter(w =>
        tokenType(w) === 'keyword' && isGoodWord(w)
      );

      if (plainTokens.length >= 2) {
        NGrams.bigrams(plainTokens).forEach(gram => {
          if (!isGoodPhrase(gram)) return;
          const phrase = gram.join(' ');
          if (seen.has('bi:' + phrase)) return;
          seen.add('bi:' + phrase);
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        });
      }

      // ── Trigrams (3-word phrases) ─────────────────────
      if (plainTokens.length >= 3) {
        NGrams.trigrams(plainTokens).forEach(gram => {
          if (!isGoodPhrase(gram)) return;
          const phrase = gram.join(' ');
          if (seen.has('tri:' + phrase)) return;
          seen.add('tri:' + phrase);
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        });
      }

      // ── 4-grams (4-word phrases) ──────────────────────
      if (plainTokens.length >= 4) {
        NGrams.ngrams(plainTokens, 4).forEach(gram => {
          if (!isGoodPhrase(gram)) return;
          const phrase = gram.join(' ');
          if (seen.has('4g:' + phrase)) return;
          seen.add('4g:' + phrase);
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        });
      }
    });

    // Build term cache — only terms appearing in 2+ posts
    _termCache = Object.entries(termCounts)
      .filter(([, c]) => c >= 2)
      .map(([word, count]) => ({ query: word, count, type: termTypes[word] || 'keyword' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 400);

    // Build phrase cache — only phrases appearing in 2+ posts
    _phraseCache = Object.entries(phraseCounts)
      .filter(([, c]) => c >= 2)
      .map(([phrase, count]) => ({ query: phrase, count, type: 'phrase' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 300);

    _lastUpdate = Date.now();

    console.log(`[suggest] cache: ${_userCache.length} users, ${_termCache.length} terms, ${_phraseCache.length} phrases`);
  } catch (err) {
    console.error('refreshSuggestCache error:', err);
  }
}

// Warm on startup, refresh every 3 minutes
refreshSuggestCache();
setInterval(refreshSuggestCache, TTL);

// ─────────────────────────────────────────────────────────────
//  Route
// ─────────────────────────────────────────────────────────────
app.get('/search-suggest', async (req, res) => {
  try {
    const { query, currentUsername } = req.query;
    const q = (query || '').trim().toLowerCase();
    if (!q || q.length < 1) return res.json([]);

    // If cache is stale or empty, await a fresh build
    if (_lastUpdate === 0 || Date.now() - _lastUpdate > TTL) {
      await refreshSuggestCache();
    }

    const results = [];
    const qClean = q.replace(/^[@#]/, '');
    const qNorm = qClean.replace(/\s+/g, ''); // "lex ai" → "lexai"

    // ── Users (max 4) ──────────────────────────────────────
    const users = _userCache
      .filter(u => {
        if (u.username === currentUsername) return false;
        const uname = (u.username || '').toLowerCase();
        const fname = (u.fullname || '').toLowerCase();
        const unameNorm = uname.replace(/\s+/g, '');
        const fnameNorm = fname.replace(/[\s_-]+/g, '');
        return (
          uname.includes(qClean) || fname.includes(qClean) ||
          unameNorm.includes(qNorm) || fnameNorm.includes(qNorm)
        );
      })
      .sort((a, b) => {
        const score = u => {
          const un = (u.username || '').toLowerCase();
          const fn = (u.fullname || '').toLowerCase();
          if (un.startsWith(qClean) || fn.startsWith(qClean)) return 0;
          if (un.replace(/\s+/g, '').startsWith(qNorm)) return 1;
          return 2;
        };
        return score(a) - score(b);
      })
      .slice(0, 4)
      .map(u => ({ type: 'user', ...u }));

    results.push(...users);

    // ── Single terms: hashtags, mentions, keywords (max 3) ──
    const remaining1 = 7 - results.length;
    if (remaining1 > 0) {
      const terms = _termCache
        .filter(k => {
          const kq = k.query.replace(/^[#@]/, '');
          return kq.startsWith(qClean) || kq.includes(qClean);
        })
        .sort((a, b) => {
          const aS = a.query.replace(/^[#@]/, '').startsWith(qClean) ? 0 : 1;
          const bS = b.query.replace(/^[#@]/, '').startsWith(qClean) ? 0 : 1;
          return aS - bS || b.count - a.count;
        })
        .slice(0, remaining1);
      results.push(...terms);
    }

    // ── Phrases: bigrams / trigrams / 4-grams (max 2) ────────
    const remaining2 = 9 - results.length;
    if (remaining2 > 0 && qClean.length >= 2) {
      const phrases = _phraseCache
        .filter(p => p.query.includes(qClean))
        .sort((a, b) => {
          const aS = a.query.startsWith(qClean) ? 0 : 1;
          const bS = b.query.startsWith(qClean) ? 0 : 1;
          return aS - bS || b.count - a.count;
        })
        .slice(0, remaining2);
      results.push(...phrases);
    }

    res.json(results.slice(0, 9));
  } catch (err) {
    console.error('/search-suggest error:', err);
    res.json([]); // never 500
  }
});
// --- AI Reply Helper ---
/**
 * triggerAIReply
 * - Robust error handling and logging
 * - No optional chaining
 * - Duplicate-reply protection (simple exact-text check)
 * - Sends in-app notification and email if available
 *
 * Returns: { ok: boolean, reason?: string, details?: any }
 */
async function triggerAIReply(content, mediaUrls, mediaTypes, postId, parentType, parentUser) {
  // parentType defaults to "post" when caller does not provide it
  if (!parentType) parentType = "post";
  try {
    // Basic validation
    if (!postId) {
      console.error("[triggerAIReply] invalid postId:", postId);
      return { ok: false, reason: "invalid_postId" };
    }

    // 1) Fetch post (text + media + comments + username)
    const { data: post, error: postFetchError } = await supabase2
      .from("Posts")
      .select("text, media, comments, username")
      .eq("id", postId)
      .single();

    if (postFetchError) {
      console.error("[triggerAIReply] failed fetching post:", postFetchError);
      return { ok: false, reason: "post_fetch_error", details: postFetchError };
    }
    if (!post) {
      console.error("[triggerAIReply] post not found:", postId);
      return { ok: false, reason: "post_not_found" };
    }

    // Normalize values
    var postText = "";
    if (post.text) postText = post.text;
    var postMedia = [];
    if (post.media && Array.isArray(post.media)) postMedia = post.media;
    var postOwner = "";
    if (post.username) postOwner = post.username;

    // 2) Build system prompt and message context
    var systemPrompt = (
      "You are TextmobAI — the official, trustworthy assistant inside Textmob.\n" +
      "When mentioned, ALWAYS:\n" +
      "- Read the post and any comment provided, then compose a short, useful reply (2-5 sentences).\n" +
      "- Start by referencing what you are replying to (quote a short excerpt, up to 30 words), then answer the user's intent.\n" +
      "- Mention the user who triggered you (prepend @username).\n" +
      "- Be helpful, friendly, and do not produce political, sexual, or harmful content.\n" +
      "- If the post contains an image, analyze it briefly and reference it if relevant.\n" +
      "Return just the reply text.\n" +
      "Current time (Africa/Lagos): " + new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }) + "\n"
    );

    var messages = [{ role: "system", content: systemPrompt }];

    // Build context block
    var contextBlock = "Post content: " + (postText || "— no text available") + "\n";
    if (postMedia && postMedia.length > 0) {
      contextBlock = contextBlock + "Post has media. First media URL: " + postMedia[0] + "\n";
    } else {
      contextBlock = contextBlock + "Post has no media.\n";
    }

    if (parentType === "comment" && content && typeof content === "string") {
      contextBlock = contextBlock + "Comment that mentioned TextmobAI: " + content + "\n";
    }

    if (parentUser) {
      contextBlock = contextBlock + "Mentioned by: @" + parentUser + "\n";
    }
    if (postOwner) {
      contextBlock = contextBlock + "Post owner: @" + postOwner + "\n";
    }

    contextBlock = contextBlock + "Instruction: Compose a concise reply that references the post/comment, and helps the user. Dont mention more that one peson on a row, if you need to reply to two people, make it paragraphic form. Do not answer with 'What can I help you with?' unless the post has no actionable content.\n";
    messages.push({ role: "user", content: contextBlock });

    // Add explicit trigger content if provided
    if (parentType === "comment" && content && typeof content === "string") {
      messages.push({ role: "user", content: "User message that triggered the mention: " + content });
    } else if (parentType === "post" && content && typeof content === "string") {
      messages.push({ role: "user", content: "User mentioned me in the post with: " + content });
    }

    // 3) Determine media to send to generateAIResponse (prefer passed mediaUrls, else post media)
    var mediaUrlToSend = null;
    var mediaTypeToSend = null;
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      mediaUrlToSend = mediaUrls[0];
      if (mediaTypes && Array.isArray(mediaTypes) && mediaTypes.length > 0) {
        mediaTypeToSend = mediaTypes[0];
      } else {
        mediaTypeToSend = "image";
      }
    } else if (postMedia && postMedia.length > 0) {
      mediaUrlToSend = postMedia[0];
      var ext = (postMedia[0] || "").split(".").pop().toLowerCase();
      if (ext === "mp4" || ext === "mov" || ext === "webm") {
        mediaTypeToSend = "video";
      } else {
        mediaTypeToSend = "image";
      }
    }

    // 4) Call generateAIResponse with robust try/catch
    var aiReplyRaw = null;
    try {
      aiReplyRaw = await generateAIResponse(messages, mediaUrlToSend, mediaTypeToSend);
    } catch (aiErr) {
      console.error("[triggerAIReply] generateAIResponse failed:", aiErr);
      return { ok: false, reason: "ai_failure", details: aiErr.message || aiErr };
    }

    if (!aiReplyRaw || typeof aiReplyRaw !== "string" || aiReplyRaw.trim().length === 0) {
      console.warn("[triggerAIReply] empty AI reply");
      return { ok: false, reason: "empty_ai_reply" };
    }

    var replyText = aiReplyRaw.trim();
    if (parentUser) {
      replyText = "@" + parentUser + " " + replyText;
    }

    // 5) Reload current comments to avoid race conditions
    var { data: currentPostData, error: curFetchErr } = await supabase2
      .from("Posts")
      .select("comments")
      .eq("id", postId)
      .single();

    if (curFetchErr) {
      console.error("[triggerAIReply] failed fetching current comments:", curFetchErr);
      return { ok: false, reason: "comments_fetch_error", details: curFetchErr };
    }
    if (!currentPostData) {
      console.error("[triggerAIReply] post disappeared while processing:", postId);
      return { ok: false, reason: "post_disappeared" };
    }

    var existingComments = [];
    if (currentPostData.comments && Array.isArray(currentPostData.comments)) {
      existingComments = currentPostData.comments;
    }

    // 6) Duplicate detection: do not insert if an identical textmobai reply exists already
    var alreadyExists = false;
    for (var i = 0; i < existingComments.length; i++) {
      var c = existingComments[i];
      if (c && c.username === "textmobai" && c.text === replyText) {
        alreadyExists = true;
        break;
      }
    }
    if (alreadyExists) {
      console.log("[triggerAIReply] duplicate reply detected; skipping insert.");
      return { ok: true, reason: "duplicate_skipped" };
    }

    // 7) Append the new comment
    var newComments = existingComments.slice(0); // shallow copy
    newComments.push({
      username: "textmobai",
      text: replyText,
      timestamp: new Date().toISOString()
    });

    var { error: updateErr } = await supabase2
      .from("Posts")
      .update({ comments: newComments })
      .eq("id", postId);

    if (updateErr) {
      console.error("[triggerAIReply] failed to update comments:", updateErr);
      return { ok: false, reason: "comments_update_error", details: updateErr };
    }

    // 8) Notify the user who mentioned (in-app)
    if (parentUser) {
      var notification = {
        id: Date.now(),
        message: "@textmobai replied to you: \"" + replyText + "\"",
        read: false,
        link: "/post/" + postId,
        timestamp: new Date().toISOString()
      };

      // addNotification may throw or return rejected promise; wrap in try/catch
      try {
        await addNotification(parentUser, notification);
      } catch (notifErr) {
        console.error("[triggerAIReply] addNotification failed for", parentUser, notifErr);
        // proceed: we don't fail the entire function because of notification problems
      }

      // 9) Send email if user has one
      var { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, fullname")
        .eq("username", parentUser)
        .single();

      if (userError) {
        console.warn("[triggerAIReply] could not fetch user email for", parentUser, userError);
      } else if (userData && userData.email) {
        try {
          var emailBody = `
          <p style="font-size:16px; line-height:1.6; color:#333;">
            Hi ${userData.fullname || parentUser},
          </p>
        
          <p style="font-size:15px; color:#333; margin-bottom:12px;">
            <strong style="color:#1E90FF;">@textmobai</strong> replied to your post:
          </p>
        
          <div style="background:#f3f4f6; padding:12px 16px; border-radius:16px; max-width:90%; margin:0 auto;">
            <div style="font-size:14px; font-weight:600; color:#111;">@textmobai</div>
            <div style="font-size:14px; color:#333; line-height:1.5; margin-top:4px;">
              ${replyText}
            </div>
          </div>
        
          <p style="font-size:15px; margin:20px 0; text-align:center;">
            <a href="https://textmob.web.app/post/${postId}" 
               style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                      text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
              💬 View Reply
            </a>
          </p>
        
          <p style="font-size:13px; line-height:1.6; color:#777; margin-top:20px; text-align:center;">
            Keep the conversation going on <strong style="color:#1E90FF;">Textmob</strong>.
          </p>
        `;

          await sendNotificationEmail(
            userData.email,
            "🤖 TextmobAI Replied to You!",
            emailBody
          );

        } catch (emailErr) {
          console.error("[triggerAIReply] sendNotificationEmail failed for", userData.email, emailErr);
          // Do not fail the whole flow
        }
      } else {
        console.log("[triggerAIReply] user has no email or userData missing for", parentUser);
      }
    }

    // Success
    console.log("[triggerAIReply] AI reply posted and notifications handled for postId:", postId);
    return { ok: true };
  } catch (err) {
    // Final catch-all to prevent unhandled exceptions
    console.error("[triggerAIReply] unexpected error:", err);
    return { ok: false, reason: "unexpected_error", details: err.message || err };
  }
}

// ================== triggerAskifyReply ==================
async function triggerAskifyReply(content, postId, parentType, parentUser) {
  // parentType defaults to "post" when caller does not provide it
  if (!parentType) parentType = "post";
  try {
    // Basic validation
    if (!postId) {
      console.error("[triggerAskifyReply] invalid postId:", postId);
      return { ok: false, reason: "invalid_postId" };
    }

    // 1) Fetch post (text + comments + username)
    const { data: post, error: postFetchError } = await supabase2
      .from("Posts")
      .select("text, comments, username")
      .eq("id", postId)
      .single();

    if (postFetchError) {
      console.error("[triggerAskifyReply] failed fetching post:", postFetchError);
      return { ok: false, reason: "post_fetch_error", details: postFetchError };
    }
    if (!post) {
      console.error("[triggerAskifyReply] post not found:", postId);
      return { ok: false, reason: "post_not_found" };
    }

    // Normalize values
    const postText = post.text || "";
    const postOwner = post.username || "";

    // 2) Build system prompt and message context
    const { full } = getLocalDateTime({ timeZone: "Africa/Lagos" });
    const systemPrompt = (
      "You are Askify — a helpful AI assistant inside Textmob that provides clear, accurate, and concise answers.\n" +
      "When mentioned, ALWAYS:\n" +
      "- Read the post and any comment provided, then compose a short, useful reply (2-5 sentences).\n" +
      "- Start by referencing what you are replying to (quote a short excerpt, up to 30 words), then answer the user's intent.\n" +
      "- Mention the user who triggered you (prepend @username).\n" +
      "- Be helpful, friendly, and do not produce political, sexual, or harmful content.\n" +
      "- Do not generate or reference images, focus only on text-based responses.\n" +
      "Return just the reply text.\n" +
      `Current time (Africa/Lagos): ${full}\n`
    );

    const messages = [{ role: "system", content: systemPrompt }];

    // Build context block
    let contextBlock = `Post content: ${postText || "— no text available"}\n`;
    contextBlock += `Post has no media.\n`; // Askify does not process media
    if (parentType === "comment" && content && typeof content === "string") {
      contextBlock += `Comment that mentioned Askify: ${content}\n`;
    }
    if (parentUser) {
      contextBlock += `Mentioned by: @${parentUser}\n`;
    }
    if (postOwner) {
      contextBlock += `Post owner: @${postOwner}\n`;
    }
    contextBlock += "Instruction: Compose a concise reply that references the post/comment, and helps the user. Do not mention more than one person in a row. If you need to reply to two people, use paragraph form. Do not answer with 'What can I help you with?' unless the post has no actionable content.\n";
    messages.push({ role: "user", content: contextBlock });

    // Add explicit trigger content if provided
    if (parentType === "comment" && content && typeof content === "string") {
      messages.push({ role: "user", content: `User message that triggered the mention: ${content}` });
    } else if (parentType === "post" && content && typeof content === "string") {
      messages.push({ role: "user", content: `User mentioned me in the post with: ${content}` });
    }

    // Fetch past messages for history
    const { data: pastMessages } = await supabase
      .from("Messages")
      .select("sender, receiver, message")
      .or(`and(sender.eq.${parentUser},receiver.eq.askify),and(sender.eq.askify,receiver.eq.${parentUser})`)
      .order("timestamp", { ascending: false })
      .limit(9);

    const formattedHistory = (pastMessages || []).reverse().map(m => ({
      role: m.sender === parentUser ? "user" : "assistant",
      content: m.message
    }));

    // Combine history with current messages
    const finalMessages = [...formattedHistory, ...messages];

    // 3) Call generateAskifyResponse
    let aiReplyRaw = null;
    try {
      aiReplyRaw = await generateAskifyResponse(finalMessages);
    } catch (aiErr) {
      console.error("[triggerAskifyReply] generateAskifyResponse failed:", aiErr);
      return { ok: false, reason: "ai_failure", details: aiErr.message || aiErr };
    }

    if (!aiReplyRaw || typeof aiReplyRaw !== "string" || aiReplyRaw.trim().length === 0) {
      console.warn("[triggerAskifyReply] empty AI reply");
      return { ok: false, reason: "empty_ai_reply" };
    }

    let replyText = aiReplyRaw.trim();
    if (parentUser) {
      replyText = `@${parentUser} ${replyText}`;
    }

    // 4) Reload current comments to avoid race conditions
    const { data: currentPostData, error: curFetchErr } = await supabase2
      .from("Posts")
      .select("comments")
      .eq("id", postId)
      .single();

    if (curFetchErr) {
      console.error("[triggerAskifyReply] failed fetching current comments:", curFetchErr);
      return { ok: false, reason: "comments_fetch_error", details: curFetchErr };
    }
    if (!currentPostData) {
      console.error("[triggerAskifyReply] post disappeared while processing:", postId);
      return { ok: false, reason: "post_disappeared" };
    }

    let existingComments = [];
    if (currentPostData.comments && Array.isArray(currentPostData.comments)) {
      existingComments = currentPostData.comments;
    }

    // 5) Duplicate detection
    const alreadyExists = existingComments.some(c => c && c.username === "askify" && c.text === replyText);
    if (alreadyExists) {
      console.log("[triggerAskifyReply] duplicate reply detected; skipping insert.");
      return { ok: true, reason: "duplicate_skipped" };
    }

    // 6) Append the new comment
    const newComments = [...existingComments, {
      username: "askify",
      text: replyText,
      timestamp: new Date().toISOString()
    }];

    const { error: updateErr } = await supabase2
      .from("Posts")
      .update({ comments: newComments })
      .eq("id", postId);

    if (updateErr) {
      console.error("[triggerAskifyReply] failed to update comments:", updateErr);
      return { ok: false, reason: "comments_update_error", details: updateErr };
    }

    // 7) Notify the user who mentioned (in-app)
    if (parentUser) {
      const notification = {
        id: Date.now(),
        message: `@askify replied to you: "${replyText}"`,
        read: false,
        link: `/post/${postId}`,
        timestamp: new Date().toISOString()
      };

      try {
        await addNotification(parentUser, notification);
      } catch (notifErr) {
        console.error("[triggerAskifyReply] addNotification failed for", parentUser, notifErr);
      }

      // 8) Send email if user has one
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, fullname")
        .eq("username", parentUser)
        .single();

      if (userError) {
        console.warn("[triggerAskifyReply] could not fetch user email for", parentUser, userError);
      } else if (userData && userData.email) {
        try {
          const emailBody = `
            <p style="font-size:16px; line-height:1.6; color:#333;">
              Hi ${userData.fullname || parentUser},
            </p>
            <p style="font-size:15px; color:#333; margin-bottom:12px;">
              <strong style="color:#1E90FF;">@askify</strong> replied to your post:
            </p>
            <div style="background:#f3f4f6; padding:12px 16px; border-radius:16px; max-width:90%; margin:0 auto;">
              <div style="font-size:14px; font-weight:600; color:#111;">@askify</div>
              <div style="font-size:14px; color:#333; line-height:1.5; margin-top:4px;">
                ${replyText}
              </div>
            </div>
            <p style="font-size:15px; margin:20px 0; text-align:center;">
              <a href="https://textmob.web.app/post/${postId}" 
                 style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                        text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                💬 View Reply
              </a>
            </p>
            <p style="font-size:13px; line-height:1.6; color:#777; margin-top:20px; text-align:center;">
              Keep the conversation going on <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
          `;
          await sendNotificationEmail(
            userData.email,
            "🤖 Askify Replied to You!",
            emailBody
          );
        } catch (emailErr) {
          console.error("[triggerAskifyReply] sendNotificationEmail failed for", userData.email, emailErr);
        }
      }
    }

    console.log("[triggerAskifyReply] AI reply posted and notifications handled for postId:", postId);
    return { ok: true };
  } catch (err) {
    console.error("[triggerAskifyReply] unexpected error:", err);
    return { ok: false, reason: "unexpected_error", details: err.message || err };
  }
}

// --- CREATE POST ---
app.post("/create-post", upload.array("media", 10), async (req, res) => {
  try {
    const { username, text, visib, activities } = req.body;
    let { options } = req.body;

    if (!username || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate media files: either up to 10 images or 1 video, but not both
    const filesArray = req.files ? req.files : [];
    if (filesArray.length > 0) {
      const hasVideo = filesArray.some(f => f.mimetype.startsWith("video"));
      const hasImage = filesArray.some(f => f.mimetype.startsWith("image"));
      if (hasVideo && hasImage) {
        return res.status(400).json({ error: "Cannot mix images and videos" });
      }
      if (hasVideo && filesArray.length > 1) {
        return res.status(400).json({ error: "Only one video is allowed" });
      }
      if (filesArray.length > 10) {
        return res.status(400).json({ error: "Maximum 10 images or 1 video allowed" });
      }
    }

    // Detect post type (poll vs post)
    let type = "post";
    if (options) {
      try {
        if (typeof options === "string") options = JSON.parse(options);
        if (Array.isArray(options) && options.length >= 2) {
          const validFormat = options.every(opt =>
            typeof opt.id === "number" &&
            typeof opt.text === "string" &&
            Array.isArray(opt.votes)
          );
          if (validFormat) type = "poll";
          else options = null;
        } else options = null;
      } catch (parseErr) {
        options = null;
      }
    }

    // Hashtags
    var hashtags = [];
    var rawHashtags = text.match(/#\w+/g);
    if (rawHashtags && Array.isArray(rawHashtags)) {
      hashtags = rawHashtags;
    }

    // Mentions (@username), sanitized
    var rawMentions = text.match(/@\w+/g) || [];
    var mentions = rawMentions.map(function (m) {
      return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    });

    // Upload media (Cloudinary)
    var mediaUrls = [];
    try {
      mediaUrls = await Promise.all(
        filesArray.map(function (file) {
          return new Promise(function (resolve, reject) {
            var uploadStream = cloudinary.uploader.upload_stream(
              { folder: "post-media", resource_type: "auto" },
              function (error, result) {
                if (error) return reject(error);
                if (result && result.secure_url) return resolve(result.secure_url);
                return reject(new Error("Cloudinary returned unexpected result"));
              }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          });
        })
      );
    } catch (uploadErr) {
      console.error("[create-post] media upload failed:", uploadErr);
      return res.status(500).json({ error: "Media upload failed" });
    }

    // Insert post into DB
    var { error: insertError, data } = await supabase2
      .from("Posts")
      .insert([{
        username: username,
        text: text,
        media: mediaUrls,
        likes: [],
        comments: [],
        hashtags: hashtags,
        visib: visib,
        type: type,
        options: options,
        activities: activities
      }])
      .select("*")
      .single();

    if (insertError) {
      console.error("[create-post] Error creating post:", insertError);
      return res.status(500).json({ error: "Failed to create post" });
    }

    // Award Mobcoins (best-effort)
    try {
      await updateMobcoins(
        username.split("@").pop().trimEnd(),
        +10,
        true,
        "You just received 10 Mobcoins for creating a " + type + " on Textmob"
      );
    } catch (mobErr) {
      console.error("[create-post] updateMobcoins failed:", mobErr);
    }

    // Immediately respond to client
    res.json({ message: (type === "poll" ? "Poll" : "Post") + " created successfully!" });

    // Background notifications & AI (non-blocking)
    (async function backgroundWork() {
      try {
        console.log("[create-post] starting backgroundWork for postId:", data.id);

        // EMIT REAL-TIME NEW POST TO ALL CONNECTED CLIENTS
        try {
          // get full authored post so clients can render without fetching
          const { data: authorData } = await supabase.from('users').select('fullname, profile_pic').eq('username', username).single();
          const realtimePost = { ...data };

          if (authorData) {
            // attach author data (optional depending on frontend layout but helpful)
            realtimePost._authorFullName = authorData.fullname;
            realtimePost._authorProfilePic = authorData.profile_pic;
          }

          // emit to everyone
          if (io) {
            io.emit('new-post', realtimePost);
            console.log(`[create-post] Emitted new-post event for ${data.id}`);
          }
        } catch (e) {
          console.error("[create-post] Error emitting new-post:", e);
        }

        // Notify connections (best-effort)
        try {
          await notifyConnectionsOnPost(username, text, data.id);
        } catch (nErr) {
          console.error("[create-post] notifyConnectionsOnPost failed:", nErr);
        }

        // Prepare safe mediaTypes array to pass to triggerAIReply
        var safeMediaTypes = [];
        if (filesArray.length > 0) {
          safeMediaTypes = filesArray.map(function (f) {
            try {
              return f.mimetype.split("/")[0];
            } catch (e) {
              return "image";
            }
          });
        }

        // Loop mentions and notify each
        for (var i = 0; i < mentions.length; i++) {
          var mentionedUser = mentions[i];
          try {
            var notification = {
              id: Date.now(),
              message: username + " mentioned you in a post",
              read: false,
              link: "/post/" + data.id,
              timestamp: new Date().toISOString()
            };
            await addNotification(mentionedUser, notification);
          } catch (addNotifErr) {
            console.error("[create-post] addNotification failed for", mentionedUser, addNotifErr);
          }

          // If textmobai or askify is mentioned, safely trigger AI reply
          try {
            if (mentionedUser && typeof mentionedUser === "string") {
              const lowerMentionedUser = mentionedUser.toLowerCase();
              if (lowerMentionedUser === "textmobai") {
                try {
                  await triggerAIReply(text, mediaUrls, safeMediaTypes, data.id, "post");
                } catch (aiErr) {
                  console.error("[create-post] triggerAIReply failed for textmobai:", aiErr);
                }
              } else if (lowerMentionedUser === "askify") {
                try {
                  await triggerAskifyReply(text, data.id, "post", username);
                } catch (aiErr) {
                  console.error("[create-post] triggerAskifyReply failed for askify:", aiErr);
                }
              }
            }
          } catch (detErr) {
            console.error("[create-post] error checking mentionedUser:", detErr);
          }
        }

        console.log("[create-post] backgroundWork completed for postId:", data.id);
      } catch (bgErr) {
        console.error("[create-post] unexpected backgroundWork error:", bgErr);
      }
    })();

  } catch (error) {
    console.error("[create-post] Post Creation Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ---------------------- LIVE HELPERS (create/update post) -------------------
async function createLivePostInDB(opts) {
  // opts: { username, text, visib, activities }
  try {
    const { username, text, visib, activities } = opts;

    if (!username) {
      throw new Error("Missing required field: username");
    }

    var hashtags = (text.match(/#\w+/g) || []);
    var rawMentions = (text.match(/@\w+/g) || []);
    var mentions = rawMentions.map(function (m) {
      return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    });

    var insertPayload = {
      username: String(username),
      text: String(text || (username + " is live now!")),
      media: [],
      likes: [],
      comments: [],
      hashtags: hashtags,
      visib: visib || "public",
      type: "live",
      options: null,
      activities: activities || null
    };

    var insertRes = await supabase2
      .from("Posts")
      .insert([insertPayload])
      .select("*")
      .single();

    if (insertRes.error) {
      console.error("createLivePostInDB insert error:", insertRes.error);
      throw insertRes.error;
    }

    var createdRow = insertRes.data;

    // Background tasks (non-blocking)
    setTimeout(async () => {
      // Award Mobcoins (best-effort)
      try {
        await updateMobcoins(
          username.split("@").pop().trimEnd(),
          10,
          true,
          "You just received 10 Mobcoins for starting a live on Textmob"
        );
      } catch (e) {
        console.error("createLivePostInDB mobcoin error:", e);
      }

      // Background notifications
      try {
        await notifyConnectionsOnPost(username, text, createdRow.id);
        for (var i = 0; i < mentions.length; i++) {
          var mentionedUser = mentions[i];
          var notification = {
            id: Date.now(),
            message: username + " mentioned you in a live post",
            read: false,
            link: "/post/" + createdRow.id
          };
          await addNotification(mentionedUser, notification);
        }
      } catch (e) {
        console.error("createLivePostInDB background notify error:", e);
      }
    }, 0);

    // Immediately return the created row to the caller so they get the ID
    return createdRow;
  } catch (e) {
    throw e;
  }
}

async function updatePostAfterLive(postId, savedUrl) {
  try {
    console.log("[updatePostAfterLive] Start", { postId, savedUrl });

    var updateObj = { type: "live_ended" };

    var updateObj = { type: "live_ended" };

    if (savedUrl) {
      updateObj.media = [savedUrl];
      console.log("[updatePostAfterLive] Adding savedUrl to media:", savedUrl);
    }

    console.log("[updatePostAfterLive] updateObj prepared:", updateObj);

    var updateRes = await supabase2
      .from("Posts")
      .update(updateObj)
      .eq("id", postId)
      .select("*")
      .single();

    if (updateRes.error) {
      console.error("[updatePostAfterLive] Supabase error:", updateRes.error);
      throw updateRes.error;
    }

    console.log("[updatePostAfterLive] Update successful:", updateRes.data);
    return updateRes.data;
  } catch (e) {
    console.error("[updatePostAfterLive] Exception caught:", e);
    throw e;
  }
}



// ---------------------------------------------------------------------------

// ---------------------- LIVE SOCKET.IO MANAGER ------------------------------
const TMP_DIR = path.join(process.cwd(), "tmp-live");

// in-memory sessions: postId -> session object
const liveSessions = new Map();
// socketId -> Set(postId)
const socketJoins = new Map();

async function ensureDir(p) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch (e) { }
}
async function appendChunk(filePath, chunkBuffer) {
  await fs.appendFile(filePath, chunkBuffer);
}
async function removeDirRecursive(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (e) { }
}
function joinIndexAdd(socketId, postId) {
  var set = socketJoins.get(socketId);
  if (!set) { set = new Set(); socketJoins.set(socketId, set); }
  set.add(postId);
}
function joinIndexDelete(socketId, postId) {
  var set = socketJoins.get(socketId);
  if (!set) return;
  set.delete(postId);
  if (set.size === 0) socketJoins.delete(socketId);
}

const userSockets = new Map(); // username -> Set(socketId)  (for targeted emits)

// username <-> socket helpers (for targeted push)
function addUserSocket(username, socketId) {
  if (!username) return;
  try {
    var set = userSockets.get(username);
    if (!set) { set = new Set(); userSockets.set(username, set); }
    set.add(socketId);
  } catch (e) { }
}
function removeUserSocket(username, socketId) {
  if (!username) return;
  try {
    var set = userSockets.get(username);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) userSockets.delete(username);
  } catch (e) { }
}

// MAIN Socket.IO handlers
io.on("connection", function (socket) {
  // ---------- Live health-monitor + cleanup helper ----------
  // Assumes these exist in your file: io, liveSessions (Map), joinIndexDelete, removeDirRecursive, updatePostAfterLive (optional)
  const LIVE_HEARTBEAT_TTL_MS = 30 * 1000; // consider session dead if no heartbeat within 30s
  const LIVE_MONITOR_INTERVAL_MS = 10 * 1000; // check every 10s

  // Helper: safely finish/cleanup a live session (idempotent)
  async function finishLiveSession(postId, opts = {}) {
    try {
      postId = String(postId);
      const s = liveSessions.get(postId);
      if (!s) {
        // already cleaned
        return { ok: true, reason: "not_found" };
      }

      const savedUrl = opts.savedUrl || null;
      const reason = opts.reason || "server-ended";

      // Notify room and global listeners (so feeds/watchers update)
      try { io.to(s.room).emit("liveEnded", { postId, savedUrl, reason }); } catch (e) { console.warn("emit room liveEnded failed", e); }
      try { io.emit("liveEnded", { postId, savedUrl, reason }); } catch (e) { console.warn("emit global liveEnded failed", e); }

      // cleanup join index entries for viewers and host
      try {
        if (s.viewers && s.viewers.size) {
          for (const viewerSocketId of Array.from(s.viewers)) {
            try { joinIndexDelete(viewerSocketId, postId); } catch (e) { }
          }
        }
        try { joinIndexDelete(s.host, postId); } catch (e) { }
      } catch (e) {
        console.warn("finishLiveSession joinIndex cleanup failed", e);
      }

      // attempt to remove recording dir if present (guarded)
      try {
        if (s.rec && s.rec.dir) {
          await removeDirRecursive(s.rec.dir).catch((e) => console.warn("removeDirRecursive failed", e));
        }
      } catch (e) {
        console.warn("finishLiveSession removeDirRecursive error", e);
      }

      // delete session
      liveSessions.delete(postId);

      // Optionally update DB with savedUrl (if you want server to be source of truth)
      if (opts.savedUrl && typeof updatePostAfterLive === "function") {
        try { await updatePostAfterLive(postId, opts.savedUrl); } catch (e) { console.warn("updatePostAfterLive failed", e); }
      }

      console.log(`Finished live session ${postId} (reason=${reason})`);
      return { ok: true, reason };
    } catch (e) {
      console.error("finishLiveSession error", e);
      return { ok: false, error: e && e.message ? e.message : e };
    }
  }

  // Heartbeat: host can emit periodically to mark session alive
  // Add handler inside your io.on("connection") block:
  // socket.on("livePulse", function(payload) { ... })
  //
  // We'll also add a guard here (if payload.postId exists & socket is the host)
  function attachLivePulseHandler(socket) {
    socket.on("livePulse", function (payload) {
      try {
        if (!payload || !payload.postId) return;
        const postId = String(payload.postId);
        const s = liveSessions.get(postId);
        // only accept pulse if this socket is the host recorded for the session
        if (!s || s.host !== socket.id) return;
        s.lastPulse = Date.now();
        // optional: also store some diagnostics (e.g., client-reported tracks)
        if (payload.tracks) s.lastTracks = payload.tracks;
      } catch (e) {
        console.warn("livePulse handler error", e);
      }
    });
  }

  // Call this after your io.on("connection") sets up other handlers:
  // inside io.on("connection", function(socket) { ... });
  // add: attachLivePulseHandler(socket);
  // (or simply paste the socket.on('livePulse') handler into your connection block)

  // Monitor: regularly inspect liveSessions and finish sessions that are stale
  setInterval(async () => {
    try {
      const now = Date.now();
      const checks = [];

      for (const [postId, s] of liveSessions.entries()) {
        // 1) If host socket is missing or not connected, end the live
        let hostAlive = false;
        try {
          // socket.io v3+: io.sockets.sockets.get(id)
          const hostSocket = (io.sockets && io.sockets.sockets && typeof io.sockets.sockets.get === "function")
            ? io.sockets.sockets.get(s.host)
            // fallback (older socket.io): io.sockets.connected[id]
            : (io.sockets && io.sockets.connected && io.sockets.connected[s.host]);

          if (hostSocket) {
            // newer versions have .connected or .disconnected flags
            hostAlive = !(hostSocket.disconnected === true);
          } else {
            hostAlive = false;
          }
        } catch (e) {
          hostAlive = false;
        }

        if (!hostAlive) {
          console.log(`Monitor: host socket missing for post ${postId} — finishing session`);
          checks.push(finishLiveSession(postId, { reason: "host-socket-gone" }));
          continue;
        }

        // 2) If heartbeat exists and expired -> finish
        if (s.lastPulse && (now - s.lastPulse) > LIVE_HEARTBEAT_TTL_MS) {
          console.log(`Monitor: heartbeat timeout for post ${postId} (lastPulse=${s.lastPulse})`);
          checks.push(finishLiveSession(postId, { reason: "heartbeat-timeout" }));
          continue;
        }

        // 3) (Optional) If you store any rec state indicating streaming stopped, check here:
        // e.g., if (s.streaming === false) finish...
      }

      if (checks.length) await Promise.all(checks);
    } catch (e) {
      console.error("live monitor error", e);
    }
  }, LIVE_MONITOR_INTERVAL_MS);

  // if clients pass username at handshake via { auth: { username } } capture it
  try {
    const hsUser = socket.handshake && socket.handshake.auth && socket.handshake.auth.username;
    if (hsUser) {
      socket.data.username = hsUser;
      addUserSocket(hsUser, socket.id);
    }
  } catch (e) { }

  // allow clients to identify themselves after connection
  socket.on("identify", function (username) {
    try {
      if (!username) return;
      socket.data.username = username;
      addUserSocket(username, socket.id);
    } catch (e) { }
  });

  // ---- startLive (replace existing) ----
  socket.on("startLive", async function (payload, ack) {
    try {
      if (!payload || !payload.username) {
        if (ack) ack({ ok: false, error: "Missing username" });
        return;
      }

      // If postId is provided, use it; otherwise create in DB
      let postId = payload.postId ? String(payload.postId) : null;
      if (!postId) {
        try {
          const created = await createLivePostInDB({
            username: payload.username,
            text: payload.text || `${payload.username} is live now!`,
            visib: payload.visib || "public",
            activities: payload.activities || null
          });
          postId = String(created.id);
        } catch (e) {
          console.error("startLive createLivePostInDB failed:", e);
          if (ack) ack({ ok: false, error: "Failed to create live post" });
          return;
        }
      }

      const room = "live:" + postId;

      // Create session metadata only
      liveSessions.set(postId, {
        host: socket.id,
        username: payload.username,
        room: room,
        viewers: new Set(),
        startedAt: Date.now()
      });

      socket.join(room);

      // Notify host & watchers:
      // 1) notify room (host is already in room) - for host-local handling
      io.to(room).emit("liveStarted", { postId, username: payload.username });
      // 2) notify everyone (so feeds / watch pages not already in the room can update lists)
      io.emit("liveStarted", { postId, username: payload.username });

      if (ack) ack({ ok: true, postId });
    } catch (e) {
      console.error("startLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });




  // ----------------- getLiveUrl -----------------
  socket.on("getLiveUrl", function (postId, ack) {
    try {
      postId = String(postId);
      var s = liveSessions.get(postId);
      if (!s) {
        if (ack) ack({ ok: true, postId: postId, url: null, count: 0 });
        return;
      }
      if (ack) ack({ ok: true, postId: postId, url: s.room, count: s.viewers.size });
    } catch (e) {
      console.error("getLiveUrl error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- joinLive (viewer) -----------------
  socket.on("joinLive", function (payload, ack) {
    try {
      if (!payload || !payload.postId) {
        if (ack) ack({ ok: false, error: "Missing postId" });
        return;
      }

      var postId = String(payload.postId);
      var s = liveSessions.get(postId);
      if (!s) {
        if (ack) ack({ ok: false, error: "Live not found" });
        return;
      }

      socket.join(s.room);
      s.viewers.add(socket.id);
      joinIndexAdd(socket.id, postId);

      io.to(s.room).emit("viewerCountUpdate", { postId: postId, count: s.viewers.size });

      io.emit("liveStatsUpdate", { postId: postId, count: s.viewers.size });


      try {
        if (s.host) {
          io.to(s.host).emit("viewer-wants-offer", { postId: postId, viewerSocketId: socket.id });
        }
      } catch (e) {
        console.warn("failed to notify host for offer:", e);
      }

      if (ack) ack({ ok: true, room: s.room, count: s.viewers.size });
    } catch (e) {
      console.error("joinLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- host-offer forward -> viewer -----------------
  socket.on("host-offer", function (payload) {
    try {
      if (!payload || !payload.to || !payload.sdp) return;
      var to = payload.to;
      var sdp = payload.sdp;
      var postId = payload.postId ? String(payload.postId) : null;
      io.to(to).emit("host-offer", { from: socket.id, sdp: sdp, postId: postId });
    } catch (e) {
      console.error("host-offer forward error:", e);
    }
  });

  // ----------------- viewer-answer forward -> host -----------------
  socket.on("viewer-answer", function (payload) {
    try {
      if (!payload || !payload.to || !payload.sdp) return;
      var to = payload.to;
      var sdp = payload.sdp;
      io.to(to).emit("viewer-answer", { from: socket.id, sdp: sdp });
    } catch (e) {
      console.error("viewer-answer forward error:", e);
    }
  });

  // ----------------- ice-candidate-live forwarding -----------------
  socket.on("ice-candidate-live", function (payload) {
    try {
      if (!payload || !payload.to || !payload.candidate) return;
      var to = payload.to;
      var candidate = payload.candidate;
      io.to(to).emit("ice-candidate-live", { from: socket.id, candidate: candidate });
    } catch (e) {
      console.error("ice-candidate-live forward error:", e);
    }
  });

  // ----------------- liveComment broadcast -----------------
  socket.on("liveComment", function (payload) {
    try {
      if (!payload || !payload.postId || !payload.comment) return;
      var postId = String(payload.postId);
      io.to("live:" + postId).emit("liveComment", { postId: postId, comment: payload.comment });
    } catch (e) {
      console.error("liveComment error:", e);
    }
  });
  // ================================================================
  //  ADD THESE BLOCKS inside your io.on("connection", ...) block
  //  Place them right after your existing liveComment handler.
  //
  //  Your existing server already handles everything else correctly.
  //  Your room name is "live:" + postId — confirmed from your code:
  //    const room = "live:" + postId;
  //    socket.join(room);
  //    io.to(s.room).emit(...) where s.room = "live:" + postId
  // ================================================================


  // ----------------- mobcoins-gift broadcast -----------------
  // THE MISSING HANDLER. Client emits after /t/send-mobcoins succeeds.
  // Without this the gift event is received by the server but never
  // relayed to the room, so nobody sees the celebration.
  //
  // Place this right after your liveComment socket.on block:

  socket.on("mobcoins-gift", function (payload) {
    try {
      if (!payload || !payload.postId || !payload.giftId) return;
      var postId = String(payload.postId);
      var room = "live:" + postId;

      // io.to() includes the sender — everyone in the room sees it
      io.to(room).emit("mobcoins-gift", {
        fromId: payload.fromId || null,
        toIds: payload.toIds || [],
        amount: payload.amount || 0,
        giftId: payload.giftId,
        postId: postId,
      });

      console.log(
        "[gift] " + (payload.fromId || "anon") +
        " → " + payload.giftId +
        " (" + (payload.amount || 0) + " coins) room=" + room
      );
    } catch (e) {
      console.error("mobcoins-gift handler error:", e);
    }
  });


  // ----------------- livePaused / liveResumed relay -----------------
  // Add these if not already in your server.
  // Host pauses/resumes → relay to viewers in the room.

  socket.on("livePaused", function (payload) {
    try {
      if (!payload || !payload.postId) return;
      // socket.to() excludes sender (host already knows they paused)
      socket.to("live:" + String(payload.postId)).emit("livePaused", payload);
    } catch (e) { console.error("livePaused relay error:", e); }
  });

  socket.on("liveResumed", function (payload) {
    try {
      if (!payload || !payload.postId) return;
      socket.to("live:" + String(payload.postId)).emit("liveResumed", payload);
    } catch (e) { console.error("liveResumed relay error:", e); }
  });
  // ----------------- leaveLive -----------------
  socket.on("leaveLive", function (payload, ack) {
    try {
      if (!payload || !payload.postId) {
        if (ack) ack({ ok: false, error: "Missing postId" });
        return;
      }
      var postId = String(payload.postId);
      var s = liveSessions.get(postId);
      if (s) {
        s.viewers.delete(socket.id);
        socket.leave(s.room);
        joinIndexDelete(socket.id, postId);
        io.to(s.room).emit("viewerCountUpdate", { postId: postId, count: s.viewers.size });
      }
      if (ack) ack({ ok: true });
    } catch (e) {
      console.error("leaveLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });

  // ----------------- endLive -----------------
  socket.on("endLive", async function (payload, ack) {
    try {
      if (!payload || !payload.postId) {
        if (ack) ack({ ok: false, error: "Missing postId" });
        return;
      }

      var postId = String(payload.postId);
      var savedUrl = payload.savedUrl || null;

      var s = liveSessions.get(postId);
      if (!s) {
        if (ack) ack({ ok: true, message: "Already ended" });
        return;
      }

      // Notify viewers that live ended
      io.to(s.room).emit("liveEnded", { postId, savedUrl });

      // Also broadcast globally in case watchers aren't in-room
      io.emit("liveEnded", { postId, savedUrl });

      await updatePostAfterLive(postId);

      // Cleanup session
      // Remove join index entries for all known viewers in the session
      try {
        for (const viewerSocketId of Array.from(s.viewers || [])) {
          joinIndexDelete(viewerSocketId, postId);
        }
        // also remove host join entry (if any)
        joinIndexDelete(s.host, postId);
      } catch (e) {
        console.warn("endLive: joinIndex cleanup failed", e);
      }

      // If there was a recording dir reference, try to remove it (guarded)
      try {
        if (s.rec && s.rec.dir) {
          await removeDirRecursive(s.rec.dir);
        }
      } catch (e) {
        console.warn("endLive: removeDirRecursive failed", e);
      }

      liveSessions.delete(postId);

      if (ack) ack({ ok: true, savedUrl });
    } catch (e) {
      console.error("endLive error:", e);
      if (ack) ack({ ok: false, error: "Internal error" });
    }
  });


  // ----------------- disconnect cleanup (single robust handler) -----------------
  socket.on("disconnect", async function () {
    try {
      // remove from username map if set
      try { if (socket.data && socket.data.username) removeUserSocket(socket.data.username, socket.id); } catch (e) { }

      var joined = socketJoins.get(socket.id);
      if (!joined) {
        // nothing to clean for this socket
        return;
      }

      var copy = Array.from(joined);
      for (var i = 0; i < copy.length; i++) {
        var postId = copy[i];
        var s = liveSessions.get(postId);
        if (!s) continue;

        if (s.host === socket.id) {
          // host disconnected: end live, notify viewers, delete recording (idempotent)
          try { io.to(s.room).emit("liveEnded", { postId: postId }); } catch (e) { }
          try { await removeDirRecursive(s.rec.dir); } catch (e) { }
          liveSessions.delete(postId);
        } else {
          // viewer disconnected
          s.viewers.delete(socket.id);
          try { io.to(s.room).emit("viewerCountUpdate", { postId: postId, count: s.viewers.size }); } catch (e) { }
        }

        joinIndexDelete(socket.id, postId);
      }

      socketJoins.delete(socket.id);
    } catch (e) {
      console.error("disconnect cleanup error:", e);
    }
  });

}); // end io.on("connection")

// ----------------- Live Recording Upload -----------------
const multe = require("multer");
const uploa = multe({ dest: path.join(TMP_DIR, "uploads") });


// ---------------------- FRONTEND EVENTS SUMMARY -----------------------------
// Broadcaster:
//   socket.emit("startLive", { postId?, username, text?, visib? }, ack)
//   // After MediaRecorder chunk: socket.emit("recChunk", { postId, seq?, chunk: arrayBuffer }, ack)
//   socket.emit("endLive", { postId, save: true|false }, ack)
//
// Viewer:
//   socket.emit("getLiveUrl", postId, ack) // returns { url: "live:postId", count }
//   socket.emit("joinLive", { postId }, ack)
//   socket.emit("leaveLive", { postId }, ack)
//
// Server -> Clients (broadcasts):
//   "liveStarted"  // { postId, username }
//   "viewerCountUpdate" // { postId, count }
//   "liveEnded" // { postId }
// ---------------------------------------------------------------------------



app.post("/vote-poll-option", async (req, res) => {
  const { postId, optionId, username } = req.body;

  if (!postId || !optionId || !username) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // Fetch post from Supabase
    const { data: post, error } = await supabase2
      .from("Posts")
      .select("id, type, options")
      .eq("id", postId)
      .single();

    if (error || !post || post.type !== "poll") {
      return res.status(404).json({ error: "Poll not found" });
    }

    const updatedOptions = post.options.map(option => {
      // Remove this user's vote from all options
      const newVotes = option.votes.filter(v => v !== username);

      // If this is the voted option, and user wasn't already there, add them
      if (option.id === optionId) {
        const alreadyVoted = option.votes.includes(username);
        if (!alreadyVoted) {
          newVotes.push(username);
        }
      }

      return { ...option, votes: newVotes };
    });

    // Update the post's options
    const { error: updateErr } = await supabase2
      .from("Posts")
      .update({ options: updatedOptions })
      .eq("id", postId);

    if (updateErr) {
      console.error("Poll update error:", updateErr);
      return res.status(500).json({ error: "Failed to update poll" });
    }

    res.json({ message: "Vote updated successfully", options: updatedOptions });
  } catch (e) {
    console.error("Vote Error:", e);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/posts-by-hashtag", async (req, res) => {
  try {
    const { hashtag } = req.query;
    if (!hashtag) {
      return res.status(400).json({ error: "Hashtag is required" });
    }
    // Step 1: Loosely match all posts containing any hashtag
    const { data, error } = await supabase2
      .from("Posts")
      .select("*")
      .ilike("text", `%#${hashtag}%`);

    if (error) {
      console.error("Error fetching posts by hashtag:", error);
      return res.status(500).json({ error: "Failed to fetch posts" });
    }

    // Step 2: Strict match using regex
    const regex = new RegExp(`(^|\\s)#${hashtag}(\\s|$|[^\\w])`, "i");
    const filtered = data.filter(post => regex.test(post.text));

    if (filtered.length === 0) {
      return res.json({ message: "No posts found for this exact hashtag" });
    }

    res.json({ posts: filtered });

  } catch (error) {
    console.error("Error in posts/hashtag endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/trending-hashtags", async (req, res) => {
  try {
    // Aggregate hashtags from recent posts (e.g., last 24 hours)
    const { data: posts, error } = await supabase2
      .from("Posts")
      .select("hashtags")

    if (error) {
      console.error("Error fetching trending hashtags:", error);
      return res.status(500).json({ error: "Failed to fetch trending hashtags" });
    }

    // Flatten all hashtags into a single array
    const allHashtags = posts.flatMap(post => post.hashtags || []);

    // Count occurrences of each hashtag
    const hashtagCounts = {};
    allHashtags.forEach(tag => {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
    });

    // Sort hashtags by frequency
    const trendingHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 trending hashtags
      .map(([tag]) => tag);

    res.json(trendingHashtags);
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use(express.static("public"));

app.post("/like-post", async (req, res) => {
  try {
    const { postId, username } = req.body;
    if (!postId || !username) {
      return res.status(400).json({ error: "Post ID and username are required" });
    }

    // Fetch the post (must contain the post owner's username)
    const { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("likes, username, type, title")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    let updatedLikes = post.likes || [];
    let action;

    if (updatedLikes.includes(username)) {
      updatedLikes = updatedLikes.filter(user => user !== username);
      action = "unliked";
    } else {
      updatedLikes.push(username);
      action = "liked";
    }

    const { error: updateError } = await supabase2
      .from("Posts")
      .update({ likes: updatedLikes })
      .eq("id", postId);

    if (updateError) {
      console.error("Error updating likes:", updateError);
      return res.status(500).json({ error: "Failed to update likes" });
    }

    // Send notification only if it's a like and not the post owner's own like
    if (username !== post.username && action === "liked") {
      // ✅ Fetch the post owner's user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, fullname")
        .eq("username", post.username)
        .single();

      if (!userError && userData && userData.email) {
        if (post.type === 'event') { // Add in-app notification
          await addNotification(post.username, {
            id: Date.now(),
            message: `${username} Is interested in Your Event : ${post.title}.`,
            read: false,
            link: `/post/${postId}`,
            timestamp: new Date().toISOString(),
          });
        } else {
          await addNotification(post.username, {
            id: Date.now(),
            message: `${username} Liked Your Post`,
            read: false,
            link: `/post/${postId}`,
            timestamp: new Date().toISOString(),
          });
        }

        if (post.type === 'event') {
          await sendNotificationEmail(
            userData.email,
            `🔔 Someone is Interested in Your Event: ${post.title} | Textmob`,
            `
            <p style="font-size:16px; line-height:1.6; color:#333;">
              Hi ${userData.fullName || post.username},
            </p>
        
            <p style="font-size:15px; color:#333; margin-bottom:12px;">
              <strong>${username}</strong> has just shown interest in your event on 
              <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
        
            <p style="font-size:15px; margin:20px 0; text-align:center;">
              <a href="https://textmob.web.app/post/${postId}" 
                 style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                        text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                🎉 View Event
              </a>
            </p>
        
            <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
              Keep building connections on <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
            `
          );
        } else {
          // Send email notification for likes
          await sendNotificationEmail(
            userData.email,
            "🔔 New Like on Your Post | Textmob",
            `
            <p style="font-size:16px; line-height:1.6; color:#333;">
              Hi ${userData.fullName || post.username},
            </p>
        
            <p style="font-size:15px; color:#333; margin-bottom:12px;">
              <strong>${username}</strong> just liked your post on 
              <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
        
            <p style="font-size:15px; margin:20px 0; text-align:center;">
              <a href="https://textmob.web.app/post/${postId}" 
                 style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                        text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                ❤️ View Post
              </a>
            </p>
        
            <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
              Stay active and keep engaging on <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
            `
          );
        }

      } else {
        console.warn(`Could not send email: User data not found for ${post.username}`, userError);
      }
    }
    res.json({ message: "Post likes updated successfully!", likes: updatedLikes });
  } catch (error) {
    console.error("Like Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/react-post", async (req, res) => {
  try {
    const { postId, username, reaction, etext } = req.body;

    if (!postId || !username || !reaction || !etext) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("reactions, username, title, type")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    let updatedReactions = post.reactions || [];
    let existing = updatedReactions.find(r => r.username === username);
    let action;

    // If user already reacted with the same emoji → remove it
    if (existing && existing.reaction === reaction) {
      updatedReactions = updatedReactions.filter(r => r.username !== username);
      action = "removed";
    } else {
      // If reacted with a different emoji → update
      if (existing) {
        existing.reaction = reaction;
        existing.etext = etext;
        action = "changed";
      } else {
        updatedReactions.push({
          username: username,
          type: "emoji",
          reaction: reaction,
          etext: etext
        });
        action = "added";
      }
    }

    const { error: updateError } = await supabase2
      .from("Posts")
      .update({ reactions: updatedReactions })
      .eq("id", postId);

    if (updateError) {
      console.error("Error updating reactions:", updateError);
      return res.status(500).json({ error: "Failed to update reactions" });
    }

    // Notifications (if not reacting to own post)
    if (username !== post.username && action === "added") {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, fullname")
        .eq("username", post.username)
        .single();

      if (!userError && userData && userData.email) {
        const message = `${username} reacted ${reaction} to your post`;
        await addNotification(post.username, {
          id: Date.now(),
          message: message,
          read: false,
          link: `/post/${postId}`,
          timestamp: new Date().toISOString()
        });

        await sendNotificationEmail(
          userData.email,
          "💬 New Reaction on Your Post | Textmob",
          `
            <p style="font-size:16px; line-height:1.6; color:#333;">
              Hi ${userData.fullname || post.username},
            </p>
            <p style="font-size:15px; color:#333;">
              <strong>${username}</strong> reacted <span style="font-size:20px;">${reaction}</span> to your post.
            </p>
            <p style="text-align:center; margin:20px 0;">
              <a href="https://textmob.web.app/post/${postId}"
                 style="background:#1E90FF; color:#fff; padding:10px 24px; border-radius:6px; text-decoration:none;">
                View Post
              </a>
            </p>
          `
        );
      }
    }

    res.json({
      message: "Reaction updated successfully",
      reactions: updatedReactions,
      action: action
    });
  } catch (error) {
    console.error("React Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'))
})
// Endpoint to get a single post by ID
app.get("/get-post", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    // Assuming posts are stored in your "Posts" table in Supabase
    const { data: post, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Optionally, fetch user profile info for the post owner if not included already
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("profile_pic")
      .eq("username", post.username)
      .single();

    if (!userError && user) {
      post.profile_pic = user.profile_pic;
    } else {
      post.profile_pic = "https://via.placeholder.com/40";
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/get-user-posts", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch posts sorted by created_at (most recent first)
    const { data: posts, error } = await supabase2
      .from("Posts")
      .select("*")
      .eq("username", username)
      .order("created_at", { ascending: false }); // <-- sort here

    if (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({ error: "Failed to fetch posts" });
    }

    res.json(posts);

  } catch (error) {
    console.error("Post Fetch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/edit-post", async (req, res) => {
  try {
    const { postId, content, comments, likes } = req.body;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Build update object. Only include fields that are provided.
    const updateFields = {};
    if (content !== undefined) {
      updateFields.text = content;
      updateFields.hashtags = content.match(/#\w+/g) || [];
    }
    if (comments !== undefined) updateFields.comments = comments;
    if (likes !== undefined) updateFields.likes = likes;

    const { data, error } = await supabase2
      .from("Posts")
      .update(updateFields)
      .eq("id", postId);

    if (error) {
      console.error("Error editing post:", error);
      return res.status(500).json({ error: "Failed to edit post" });
    }

    res.json({ message: "Post updated successfully", data });
  } catch (error) {
    console.error("Edit Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.delete("/delete-post", async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // fetch post to get public IDs
    const { data: post, error: fetchErr } = await supabase2
      .from("Posts")
      .select("media_public_ids")
      .eq("id", postId)
      .single();
    if (fetchErr) throw fetchErr;

    // delete each from Cloudinary
    (post.media_public_ids || []).forEach(async publicId => {
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    });

    // delete row
    const { error: deleteErr } = await supabase2
      .from("Posts")
      .delete()
      .eq("id", postId);
    if (deleteErr) throw deleteErr;

    res.json({ message: "Post deleted successfully" });

  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- ADD COMMENT ---
app.post("/add-comment", async (req, res) => {
  try {
    const { postId, username, comment } = req.body;

    if (!postId || !username || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch current comments + post owner's username
    var { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("comments, username")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      console.error("[add-comment] Error fetching post:", fetchError);
      return res.status(404).json({ error: "Post not found" });
    }

    var updatedComments = [
      ...(post.comments || []),
      {
        username: username,
        text: comment,
        timestamp: new Date().toISOString()
      }
    ];

    // Update post with new comment
    var { error: updateError } = await supabase2
      .from("Posts")
      .update({ comments: updatedComments })
      .eq("id", postId);

    if (updateError) {
      console.error("[add-comment] Error updating comments:", updateError);
      return res.status(500).json({ error: "Failed to add comment" });
    }

    // Award Mobcoins (best-effort)
    try {
      await updateMobcoins(post.username.split("@").pop().trimEnd(), +10, true, "You just received 10 Mobcoins from a comment on your post");
    } catch (mb1Err) {
      console.error("[add-comment] updateMobcoins (post owner) failed:", mb1Err);
    }
    try {
      await updateMobcoins(username.split("@").pop().trimEnd(), +5, true, "You just received 5 Mobcoins for commenting on a post");
    } catch (mb2Err) {
      console.error("[add-comment] updateMobcoins (commenter) failed:", mb2Err);
    }

    var postLink = "/post/" + postId;

    // Notify post owner (skip if commenting on your own post)
    if (username !== post.username) {
      try {
        var { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, fullname")
          .eq("username", post.username)
          .single();

        if (!userError && userData && userData.email) {
          try {
            await addNotification(post.username, {
              id: Date.now(),
              message: username + " commented on your post: \"" + comment + "\"",
              read: false,
              link: postLink,
              timestamp: new Date().toISOString()
            });
          } catch (notifErr) {
            console.error("[add-comment] addNotification for post owner failed:", notifErr);
          }

          try {
            await sendNotificationEmail(
              userData.email,
              "💬 New Comment on Your Post | Textmob",
              `
              <p style="font-size:16px; line-height:1.6; color:#333;">
                Hi ${userData.fullname || post.username},
              </p>
            
              <p style="font-size:15px; color:#333; margin-bottom:12px;">
                <strong>${username}</strong> just commented on your post:
              </p>
            
              <div style="margin:12px 0; max-width:520px; display:flex; align-items:flex-start; gap:12px;">
                <div style="background:#f3f4f6; padding:12px 16px; border-radius:16px; 
                            font-size:14px; color:#111; line-height:1.5; flex:1;">
                  <div style="font-weight:600; font-size:14px; color:#111;">${username}</div>
                  <div style="font-size:14px; color:#333; margin-top:4px;">${comment}</div>
                </div>
              </div>
            
              <p style="font-size:15px; margin:20px 0; text-align:center;">
                <a href="https://textmob.web.app${postLink}" 
                   style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                          text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                  💬 View Post
                </a>
              </p>
            
              <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
                Join the conversation on <strong style="color:#1E90FF;">Textmob</strong>.
              </p>
              `
            );
          } catch (emailErr) {
            console.error("[add-comment] sendNotificationEmail failed:", emailErr);
          }
        } else {
          console.warn("[add-comment] Could not send email: User data not found for", post.username, userError);
        }
      } catch (ownerFetchErr) {
        console.error("[add-comment] error fetching post owner userData:", ownerFetchErr);
      }
    }

    // Parse mentions in comment (@username)
    var rawMentions = comment.match(/@\w+/g) || [];
    var mentions = rawMentions.map(function (m) {
      return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
    });

    // Loop mentions and notify; if textmobai or askify mentioned -> trigger AI reply
    for (var i = 0; i < mentions.length; i++) {
      var mentionedUser = mentions[i];
      try {
        // Skip notifying the post owner or commenter here if it's their own mention
        if (mentionedUser !== post.username && mentionedUser !== username) {
          try {
            await addNotification(mentionedUser, {
              id: Date.now(),
              message: username + " mentioned you in a comment",
              read: false,
              link: postLink,
              timestamp: new Date().toISOString()
            });
          } catch (notifErr2) {
            console.error("[add-comment] addNotification failed for mentioned user", mentionedUser, notifErr2);
          }
        }

        // If textmobai or askify mentioned, trigger AI reply (do not let this crash)
        try {
          if (mentionedUser && typeof mentionedUser === "string") {
            const lowerMentionedUser = mentionedUser.toLowerCase();
            if (lowerMentionedUser === "textmobai") {
              await triggerAIReply(comment, null, null, postId, "comment", username);
            } else if (lowerMentionedUser === "askify") {
              await triggerAskifyReply(comment, postId, "comment", username);
            }
          }
        } catch (aiErr2) {
          console.error("[add-comment] triggerAI/AskifyReply failed for", mentionedUser, aiErr2);
        }
      } catch (loopErr) {
        console.error("[add-comment] error processing mention", mentionedUser, loopErr);
      }
    }

    // Final success response
    res.json({ message: "Comment added successfully!" });
  } catch (error) {
    console.error("[add-comment] Add Comment Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Inside your server.js (or wherever you set up routes)

app.get("/ai/daily-post", async (req, res) => {

  console.log("✅ TextmobAI daily post created!");
  return res.json({ success: true });
});



// In-memory cache
let cache = {
  users: [],
  posts: [],
  analytics: {
    signups: {
      hourLabels: [],
      hourCounts: [],
      dayLabels: [],
      dayCounts: [],
      weekLabels: [],
      weekCounts: [],
      monthLabels: [],
      monthCounts: []
    },
    postCreations: {
      hourLabels: [],
      hourCounts: [],
      dayLabels: [],
      dayCounts: [],
      weekLabels: [],
      weekCounts: [],
      monthLabels: [],
      monthCounts: []
    },
    posts: {
      totalPosts: 0,
      pollPosts: 0,
      normalPosts: 0,
      anonPosts: 0,
      eventPosts: 0,
      avgLikes: 0,
      avgComments: 0,
      totalLikes: 0,
      totalComments: 0,
      engagementRate: 0
    },
    topUsers: [],
    topUsers7d: [],
    topCoinHolders: [],
    postCountsPerUser: {},
    totalMobcoins: 0,
    userWeeklyGrowth: 'N/A',
    postWeeklyGrowth: 'N/A'
  }
};
let adminChatHistory = [];
let isCacheInitialized = false; // Track initial cache population
// Function to update cache
async function updateCache() {
  try {
    const now = new Date();

    // 1️⃣ Fetch USERS
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, profile_pic, username, fullname, mobcoins, followers, created_at, biography, phone, notifications, email, profile_type, disabled")
      .order('created_at', { ascending: false });
    if (userErr) throw new Error(`User fetch error: ${userErr.message}`);

    // 2️⃣ Fetch POSTS
    const { data: posts, error: postErr } = await supabase2
      .from("Posts")
      .select("id, username, type, likes, comments, created_at");
    if (postErr) throw new Error(`Post fetch error: ${postErr.message}`);

    // Filter posts from last 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPosts = posts.filter(p => p.created_at && new Date(p.created_at) >= sevenDaysAgo);

    // 📅 Signup analytics
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${23 - i} hours ago`);
    const hourCounts = Array(24).fill(0);
    const dayLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    });
    const dayCounts = Array(7).fill(0);
    const weekLabels = Array.from({ length: 4 }, (_, i) => i < 3 ? `${3 - i} weeks ago` : 'This Week');
    const weekCounts = Array(4).fill(0);
    const monthLabels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    });
    const monthCounts = Array(12).fill(0);

    users.forEach(u => {
      if (!u.created_at) return;
      const d = new Date(u.created_at);
      const diffMs = now - d;
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffH < 24) hourCounts[23 - diffH]++;
      const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffD < 7) dayCounts[6 - diffD]++;
      const diffW = Math.floor(diffD / 7);
      if (diffW < 4) weekCounts[3 - diffW]++;
      const diffM = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffM < 12) monthCounts[11 - diffM]++;
    });

    // 📅 Post creation analytics
    const postHourLabels = Array.from({ length: 24 }, (_, i) => `${23 - i} hours ago`);
    const postHourCounts = Array(24).fill(0);
    const postDayLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    });
    const postDayCounts = Array(7).fill(0);
    const postWeekLabels = Array.from({ length: 4 }, (_, i) => i < 3 ? `${3 - i} weeks ago` : 'This Week');
    const postWeekCounts = Array(4).fill(0);
    const postMonthLabels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    });
    const postMonthCounts = Array(12).fill(0);

    posts.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const diffMs = now - d;
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffH < 24) postHourCounts[23 - diffH]++;
      const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffD < 7) postDayCounts[6 - diffD]++;
      const diffW = Math.floor(diffD / 7);
      if (diffW < 4) postWeekCounts[3 - diffW]++;
      const diffM = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffM < 12) postMonthCounts[11 - diffM]++;
    });

    // 🧠 User post count (overall)
    const postMap = {};
    posts.forEach(p => {
      if (p.username) postMap[p.username] = (postMap[p.username] || 0) + 1;
    });

    // 🧠 7-day activity maps
    const posts7dMap = {};
    const likes7dMap = {};
    const comments7dMap = {};
    recentPosts.forEach(p => {
      if (p.username) {
        posts7dMap[p.username] = (posts7dMap[p.username] || 0) + 1;
        likes7dMap[p.username] = (likes7dMap[p.username] || 0) + (Array.isArray(p.likes) ? p.likes.length : 0);
        comments7dMap[p.username] = (comments7dMap[p.username] || 0) + (Array.isArray(p.comments) ? p.comments.length : 0);
      }
    });

    // 🏆 Top users by rank (overall)
    const excluded = ["textmobofficial", "ismailg", "IBG", "IbrahimG", "textmobai"];
    const rankedUsers = users
      .filter(u => !excluded.includes(u.username))
      .map(u => {
        const followers = Array.isArray(u.followers) ? u.followers.length : 0;
        const coins = u.mobcoins || 0;
        const postCount = postMap[u.username] || 0;
        const score = followers + postCount + Math.floor(coins / 50);
        return {
          id: u.id,
          username: u.username,
          fullname: u.fullname || '',
          avatar: u.profile_pic,
          created_at: u.created_at,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // --- UPDATED: Top users by 7-day activity using weighted normalized score ---
    // Build reactions map (if posts include a `reactions` array)
    const reactions7dMap = {};
    recentPosts.forEach(function (p) {
      if (!p || !p.created_at) return;
      var reactionCount = Array.isArray(p.reactions) ? p.reactions.length : 0;
      if (p.username) {
        reactions7dMap[p.username] = (reactions7dMap[p.username] || 0) + reactionCount;
      }
    });

    // prepare raw 7-day metrics per user (exclude special accounts)
    var users7dMetrics = users
      .filter(function (u) { return !excluded.includes(u.username); })
      .map(function (u) {
        var posts7d = posts7dMap[u.username] || 0;
        var likes7d = likes7dMap[u.username] || 0;
        var comments7d = comments7dMap[u.username] || 0;
        var reactions7d = reactions7dMap[u.username] || 0;
        var totalEngagement7d = posts7d + likes7d + comments7d;
        var mobcoins = u.mobcoins || 0;
        // fallback: if no separate reactions, use likes as proxy
        var totalReactions = reactions7d > 0 ? reactions7d : likes7d;
        return {
          username: u.username,
          fullname: u.fullname || '',
          posts7d: posts7d,
          likes7d: likes7d,
          comments7d: comments7d,
          reactions7d: reactions7d,
          totalEngagement7d: totalEngagement7d,
          mobcoins: mobcoins,
          totalReactions: totalReactions
        };
      });

    // helper to find max value for a key
    function maxOf(arr, key) {
      if (!arr || arr.length === 0) return 0;
      var m = 0;
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i][key] || 0;
        if (v > m) m = v;
      }
      return m;
    }
    var maxEng = maxOf(users7dMetrics, 'totalEngagement7d');
    var maxPosts7d = maxOf(users7dMetrics, 'posts7d');
    var maxMob = maxOf(users7dMetrics, 'mobcoins');
    var maxReac = maxOf(users7dMetrics, 'totalReactions');

    // normalizer
    function norm(val, max) {
      return (max > 0) ? (val / max) : 0;
    }

    // compute weighted score (20% engagement, 20% posts, 50% mobcoins, 10% reactions)
    var weighted7d = users7dMetrics.map(function (u) {
      var s = 0.6 * u.totalEngagement7d
        + 0.2 * u.posts7d
        + 0.2 * u.totalReactions;
      // convert to percent with one decimal (0.0 - 100.0)
      var scorePct = Math.round(s * 10) / 10;
      u.score7d = scorePct;
      return u;
    });


    // sort and take top 10 (preserve original slice default)
    weighted7d.sort(function (a, b) { return b.score7d - a.score7d; });
    const topUsers7d = weighted7d.filter(function (u) { return u.score7d > 0; }).slice(0, 10);

    // 🏆 Top coin holders
    const topCoinHolders = users
      .map(u => ({
        username: u.username,
        fullname: u.fullname || '',
        mobcoins: u.mobcoins || 0
      }))
      .sort((a, b) => b.mobcoins - a.mobcoins)
      .slice(0, 5);

    // 🧮 Post stats
    const totalPosts = posts.length;
    const pollPosts = posts.filter(p => p.type === "poll").length;
    const normalPosts = posts.filter(p => p.type === "post").length;
    const anonPosts = posts.filter(p => p.type === "").length;
    const eventPosts = posts.filter(p => p.type === "event").length;
    const totalLikes = posts.reduce((s, p) => s + (Array.isArray(p.likes) ? p.likes.length : 0), 0);
    const totalComments = posts.reduce((s, p) => s + (Array.isArray(p.comments) ? p.comments.length : 0), 0);
    const avgLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
    const avgComments = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;
    const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(2) : 0;

    // 💰 Mobcoins
    const totalMobcoins = users.reduce((s, u) => s + (u.mobcoins || 0), 0);

    // 📈 Growth percentages
    const prevWeekUsers = weekCounts[2] || 0;
    const currWeekUsers = weekCounts[3] || 0;
    const userWeeklyGrowth = prevWeekUsers > 0 ? ((currWeekUsers - prevWeekUsers) / prevWeekUsers * 100).toFixed(1) : 'N/A';

    const prevWeekPosts = postWeekCounts[2] || 0;
    const currWeekPosts = postWeekCounts[3] || 0;
    const postWeeklyGrowth = prevWeekPosts > 0 ? ((currWeekPosts - prevWeekPosts) / prevWeekPosts * 100).toFixed(1) : 'N/A';

    // Build new cache state
    const newCache = {
      users: users || [],
      posts: posts || [],
      analytics: {
        signups: {
          hourLabels,
          hourCounts,
          dayLabels,
          dayCounts,
          weekLabels,
          weekCounts,
          monthLabels,
          monthCounts
        },
        postCreations: {
          hourLabels: postHourLabels,
          hourCounts: postHourCounts,
          dayLabels: postDayLabels,
          dayCounts: postDayCounts,
          weekLabels: postWeekLabels,
          weekCounts: postWeekCounts,
          monthLabels: postMonthLabels,
          monthCounts: postMonthCounts
        },
        posts: {
          totalPosts,
          pollPosts,
          normalPosts,
          anonPosts,
          eventPosts,
          avgLikes,
          avgComments,
          totalLikes,
          totalComments,
          engagementRate
        },
        topUsers: rankedUsers,
        topUsers7d,
        topCoinHolders,
        postCountsPerUser: postMap,
        totalMobcoins,
        userWeeklyGrowth,
        postWeeklyGrowth
      }
    };

    // Update global cache atomically
    cache = newCache;
    isCacheInitialized = true;

    console.log('Cache updated at', now.toISOString());
  } catch (err) {
    console.error('Cache update error:', err.message);
    // Keep previous cache state to avoid serving empty data
  }
}
// Initialize cache before starting server
(async () => {
  console.log('Initializing cache...');
  await updateCache(); // Wait for initial cache population
  console.log('Initial cache populated.');
  setInterval(updateCache, 5000); // Update every 5 seconds
})();

// Endpoint using cached data
app.get("/asilfcismail", async (req, res) => {
  try {
    if (req.query.json === 'true') {
      return res.json(cache.analytics);
    }

    // Ensure cache is initialized before proceeding
    if (!isCacheInitialized) {
      console.log('Cache not initialized, forcing update...');
      await updateCache();
    }

    const now = new Date();

    // Use cached data with fallbacks
    const { users = [], posts = [], analytics = {} } = cache;
    const {
      signups: {
        hourLabels = [],
        hourCounts = [],
        dayLabels = [],
        dayCounts = [],
        weekLabels = [],
        weekCounts = [],
        monthLabels = [],
        monthCounts = []
      } = {},
      postCreations: {
        hourLabels: postHourLabels = [],
        hourCounts: postHourCounts = [],
        dayLabels: postDayLabels = [],
        dayCounts: postDayCounts = [],
        weekLabels: postWeekLabels = [],
        weekCounts: postWeekCounts = [],
        monthLabels: postMonthLabels = [],
        monthCounts: postMonthCounts = []
      } = {},
      posts: {
        totalPosts = 0,
        pollPosts = 0,
        normalPosts = 0,
        anonPosts = 0,
        eventPosts = 0,
        avgLikes = 0,
        avgComments = 0,
        totalLikes = 0,
        totalComments = 0,
        engagementRate = 0
      } = {},
      topUsers = [],
      topUsers7d = [],
      topCoinHolders = [],
      postCountsPerUser = {},
      totalMobcoins = 0,
      userWeeklyGrowth = 'N/A',
      postWeeklyGrowth = 'N/A'
    } = analytics;

    // Log cache state for debugging
    console.log('Cache state:', {
      usersCount: users.length,
      postsCount: posts.length,
      topUsersCount: topUsers.length
    });

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Textmob Admin Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f9fafb;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        .tab-btn {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: #4b5563;
          border-radius: 0.375rem 0.375rem 0 0;
          transition: all 0.3s ease;
          touch-action: manipulation;
          min-width: 120px;
          text-align: center;
          background-color: #f3f4f6;
        }
        .tab-btn:hover {
          color: #1f2937;
        }
        .active-tab {
          background-color: white;
          color: #1e40af;
          border-bottom: 2px solid #1e40af;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .card {
          background: white;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          padding: 1.5rem;
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          touch-action: manipulation;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        tr:last-child th, tr:last-child td {
          border-bottom: none;
        }
        @media (max-width: 768px) {
          .tab-btn {
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            min-width: auto;
          }
          .container {
            padding: 1rem;
          }
          th, td {
            padding: 0.75rem;
          }
        }
        .chart-container {
          height: 250px;
          position: relative;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Textmob Admin Dashboard</h1>
    
        <!-- Tabs -->
        <div class="flex flex-wrap gap-3 mb-8 bg-white rounded-t-lg p-0 border-b border-gray-200">
          <button class="tab-btn active-tab" data-tab="overview">Overview</button>
          <button class="tab-btn" data-tab="user-analytics">User Analytics</button>
          <button class="tab-btn" data-tab="posts">Post Analytics</button>
          <button class="tab-btn" data-tab="top-users">Top Users</button>
          <button class="tab-btn" data-tab="leaderboard2">Leaderboard (7 Days)</button>
          <button class="tab-btn" data-tab="mobcoins">Mobcoins</button>
          <button class="tab-btn" data-tab="users">User Explorer</button>
        </div>
    
        <!-- Overview -->
        <div id="overview" class="tab-content active">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Users</p><p class="text-2xl font-semibold text-gray-900">${users.length}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Posts</p><p class="text-2xl font-semibold text-gray-900">${totalPosts}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Engagement Rate</p><p class="text-2xl font-semibold text-gray-900">${engagementRate}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Mobcoins</p><p class="text-2xl font-semibold text-gray-900">${totalMobcoins}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">User Weekly Growth</p><p class="text-2xl font-semibold text-gray-900">${userWeeklyGrowth}%</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Posts Weekly Growth</p><p class="text-2xl font-semibold text-gray-900">${postWeeklyGrowth}%</p></div>
          </div>
        </div>
    
        <!-- User Analytics (Signups) -->
        <div id="user-analytics" class="tab-content">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Signups by Hour</h2>
              <div class="chart-container"><canvas id="hourChart"></canvas></div>
            </div>
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Signups by Day</h2>
              <div class="chart-container"><canvas id="dayChart"></canvas></div>
            </div>
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Signups by Week</h2>
              <div class="chart-container"><canvas id="weekChart"></canvas></div>
            </div>
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Signups by Month</h2>
              <div class="chart-container"><canvas id="monthChart"></canvas></div>
            </div>
          </div>
        </div>
    
        <!-- Post Analytics -->
        <div id="posts" class="tab-content">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Posts</p><p class="text-2xl font-semibold text-gray-900">${totalPosts}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Polls</p><p class="text-2xl font-semibold text-gray-900">${pollPosts}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Events</p><p class="text-2xl font-semibold text-gray-900">${eventPosts}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Normal Posts</p><p class="text-2xl font-semibold text-gray-900">${normalPosts}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Likes</p><p class="text-2xl font-semibold text-gray-900">${totalLikes}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Comments</p><p class="text-2xl font-semibold text-gray-900">${totalComments}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Average Likes/Post</p><p class="text-2xl font-semibold text-gray-900">${avgLikes}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Average Comments/Post</p><p class="text-2xl font-semibold text-gray-900">${avgComments}</p></div>
            <div class="card stat-card"><p class="text-sm text-gray-500">Engagement Rate</p><p class="text-2xl font-semibold text-gray-900">${engagementRate}</p></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Posts by Hour</h2>
              <div class="chart-container"><canvas id="postHourChart"></canvas></div>
            </div>
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Posts by Day</h2>
              <div class="chart-container"><canvas id="postDayChart"></canvas></div>
            </div>
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Posts by Week</h2>
              <div class="chart-container"><canvas id="postWeekChart"></canvas></div>
            </div>
            <div class="card">
              <h2 class="text-sm font-medium text-gray-500 mb-3">Posts by Month</h2>
              <div class="chart-container"><canvas id="postMonthChart"></canvas></div>
            </div>
          </div>
        </div>
    
        <!-- Top Users -->
        <div id="top-users" class="tab-content">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Top Users by Rank</h2>
          <div class="card overflow-auto">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Rank Score</th>
                </tr>
              </thead>
              <tbody>
                ${(topUsers || []).map(u => `
                  <tr>
                    <td>@${u.username}</td>
                    <td>${u.fullname || 'N/A'}</td>
                    <td class="font-semibold">${u.score}</td>
                  </tr>
                `).join("") || "<tr><td colspan='3' class='text-center text-gray-500'>No top users available</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Leaderboard 2 (7 Days) -->
        <div id="leaderboard2" class="tab-content">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Top Users by Activity (Last 7 Days)</h2>
          <div class="card overflow-auto">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Posts</th>
                  <th>Likes Received</th>
                  <th>Comments Received</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${(topUsers7d || []).map(u => `
                  <tr>
                    <td>@${u.username}</td>
                    <td>${u.fullname || 'N/A'}</td>
                    <td>${u.posts7d}</td>
                    <td>${u.likes7d}</td>
                    <td>${u.comments7d}</td>
                    <td class="font-semibold">${u.score7d}</td>
                  </tr>
                `).join("") || "<tr><td colspan='6' class='text-center text-gray-500'>No active users in last 7 days</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>
    
        <!-- Mobcoins -->
        <div id="mobcoins" class="tab-content">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div class="card stat-card"><p class="text-sm text-gray-500">Total Mobcoins</p><p class="text-2xl font-semibold text-gray-900">${totalMobcoins}</p></div>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mt-8 mb-4">Top Coin Holders</h2>
          <div class="card overflow-auto">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Mobcoins</th>
                </tr>
              </thead>
              <tbody>
                ${(topCoinHolders || []).map(h => `
                  <tr>
                    <td>@${h.username}</td>
                    <td>${h.fullname || 'N/A'}</td>
                    <td class="font-semibold">${h.mobcoins}</td>
                  </tr>
                `).join("") || "<tr><td colspan='3' class='text-center text-gray-500'>No top holders available</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>
    
        <!-- User Explorer -->
        <div id="users" class="tab-content">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Explore Users List</h2>
          <div class="card overflow-auto">
            <h3 class="text-sm text-gray-500 mb-3">${(users || []).length} Users</h3>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Followers</th>
                  <th>Mobcoins</th>
                  <th>Profile Type</th>
                  <th>Disabled</th>
                  <th>Signup Date</th>
                </tr>
              </thead>
              <tbody>
                ${(users || []).map(u => `
                  <tr>
                    <td>@${u.username}</td>
                    <td>${u.fullname || 'N/A'}</td>
                    <td>${u.email || 'N/A'}</td>
                    <td>${u.phone || 'N/A'}</td>
                    <td>${Array.isArray(u.followers) ? u.followers.length : 0}</td>
                    <td>${u.mobcoins || 0}</td>
                    <td>${u.profile_type || 'N/A'}</td>
                    <td>${u.disabled ? 'Yes' : 'No'}</td>
                    <td>${u.created_at ? new Date(u.created_at).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) : 'N/A'}</td>
                  </tr>
                `).join("") || "<tr><td colspan='9' class='text-center text-gray-500'>No users available</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    
      <script>
        const makeChart = (ctxId, labels, data, label) => {
          const ctx = document.getElementById(ctxId).getContext('2d');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label,
                data,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: '#1e40af',
                pointBackgroundColor: '#1e40af',
                pointRadius: 4,
                tension: 0.4
              }]
            },
            options: {
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#1f2937',
                  titleFont: { size: 14 },
                  bodyFont: { size: 12 },
                  padding: 10
                }
              },
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Count', font: { size: 14 } },
                  grid: { color: '#e5e7eb' }
                },
                x: {
                  title: { display: true, text: 'Time', font: { size: 14 } },
                  grid: { display: false }
                }
              }
            }
          });
        };
    
        makeChart('hourChart', ${JSON.stringify(hourLabels)}, ${JSON.stringify(hourCounts)}, 'Hourly Signups');
        makeChart('dayChart', ${JSON.stringify(dayLabels)}, ${JSON.stringify(dayCounts)}, 'Daily Signups');
        makeChart('weekChart', ${JSON.stringify(weekLabels)}, ${JSON.stringify(weekCounts)}, 'Weekly Signups');
        makeChart('monthChart', ${JSON.stringify(monthLabels)}, ${JSON.stringify(monthCounts)}, 'Monthly Signups');
    
        makeChart('postHourChart', ${JSON.stringify(postHourLabels)}, ${JSON.stringify(postHourCounts)}, 'Hourly Posts');
        makeChart('postDayChart', ${JSON.stringify(postDayLabels)}, ${JSON.stringify(postDayCounts)}, 'Daily Posts');
        makeChart('postWeekChart', ${JSON.stringify(postWeekLabels)}, ${JSON.stringify(postWeekCounts)}, 'Weekly Posts');
        makeChart('postMonthChart', ${JSON.stringify(postMonthLabels)}, ${JSON.stringify(postMonthCounts)}, 'Monthly Posts');
    
        // Tab logic
        document.querySelectorAll(".tab-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active-tab"));
            document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
            btn.classList.add("active-tab");
            document.getElementById(btn.dataset.tab).classList.add("active");
          });
        });
    
        // Prevent double-tap zoom
        document.addEventListener('touchstart', (e) => {
          if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
      </script>
    </body>
    </html>
    `)
  } catch (err) {
    console.error("Admin dashboard error:", err.message);
    res.status(500).send("Internal server error.");
  }
});

// 🚀 Leaderboard Endpoint (7-day ranking)
app.get("/leaderboard", async (req, res) => {
  try {
    // Ensure cache is ready
    if (!isCacheInitialized) {
      console.log("Cache not initialized, forcing update...");
      await updateCache();
    }

    const { users = [], analytics = {} } = cache;
    const { topUsers7d = [] } = analytics;

    // Map topUsers7d to include avatar and score like topUsers
    const leaderboard = topUsers7d
      .map(u => {
        const user = users.find(usr => usr.username === u.username) || {};
        return {
          username: u.username,
          fullname: u.fullname || '',
          avatar: user.profile_pic || '', // profile picture
          posts7d: u.posts7d || 0,
          likes7d: u.likes7d || 0,
          comments7d: u.comments7d || 0,
          score: u.score7d || 0 // 7-day score
        };
      })
      .slice(0, 5); // top 5

    res.json({
      success: true,
      leaderboard
    });
  } catch (err) {
    console.error("Leaderboard error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

app.post("/connect", async (req, res) => {
  try {
    const { currentUsername, targetUsername } = req.body;

    if (!currentUsername || !targetUsername) {
      return res.status(400).json({ error: "Both currentUsername and targetUsername are required" });
    }

    // Fetch both users
    const { data: currentUser, error: currError } = await supabase
      .from("users")
      .select("username, friends, following, profile_type")
      .eq("username", currentUsername)
      .single();

    if (currError || !currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("username, profile_type, followers, friends, email")
      .eq("username", targetUsername)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    currentUser.friends = currentUser.friends || [];
    currentUser.following = currentUser.following || [];
    targetUser.followers = targetUser.followers || [];
    targetUser.friends = targetUser.friends || [];

    const targetProfileType = targetUser.profile_type.toLowerCase();
    let action;

    if (targetProfileType === "organisation") {
      const alreadyFollowing = targetUser.followers.includes(currentUsername);

      if (alreadyFollowing) {
        // Unfollow
        targetUser.followers = targetUser.followers.filter(u => u !== currentUsername);
        currentUser.following = currentUser.following.filter(u => u !== targetUsername);
        action = "unfollowed";

        await addNotification(targetUsername, {
          id: Date.now(),
          message: `${currentUsername} unfollowed you.`,
          read: false,
          link: `/@${currentUsername}`,
          timestamp: new Date().toISOString(),
        });

      } else {
        // Follow
        targetUser.followers.push(currentUsername);
        currentUser.following.push(targetUsername);
        action = "followed";

        await addNotification(targetUsername, {
          id: Date.now(),
          message: `${currentUsername} followed you.`,
          read: false,
          link: `/@${currentUsername}`,
          timestamp: new Date().toISOString(),
        });

        // Email Notification
        if (targetUser.email) {
          await sendNotificationEmail(
            targetUser.email,
            `👥 ${currentUsername} Followed You on Textmob!`,
            `
            <p style="font-size:16px; line-height:1.6; color:#333;">
              Hi ${targetUser.fullname || targetUser.username},
            </p>
          
            <p style="font-size:15px; color:#333; margin-bottom:12px;">
              <strong>${currentUsername}</strong> just followed your company’s page on 
              <strong style="color:#1E90FF;">Textmob</strong>. 🎉
            </p>
          
            <p style="font-size:15px; margin:20px 0; text-align:center;">
              <a href="https://textmob.web.app/@${currentUsername}" 
                 style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                        text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                👀 View Profile
              </a>
            </p>
          
            <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
              Stay connected and grow your audience on <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
            `
          );

        }
      }

      await supabase.from("users").update({ followers: targetUser.followers }).eq("username", targetUsername);
      await supabase.from("users").update({ following: currentUser.following }).eq("username", currentUsername);

      res.json({ message: `Successfully ${action} the organisation.` });

    } else if (targetProfileType === "individual") {
      const alreadyFriends = currentUser.friends.includes(targetUsername);

      if (alreadyFriends) {
        // Unfriend
        currentUser.friends = currentUser.friends.filter(u => u !== targetUsername);
        targetUser.friends = targetUser.friends.filter(u => u !== currentUsername);
        action = "unfriended";

        await addNotification(targetUsername, {
          id: Date.now(),
          message: `${currentUsername} unfriended you.`,
          read: false,
          link: `/@${currentUsername}`,
          timestamp: new Date().toISOString(),
        });

      } else {
        // Friend
        currentUser.friends.push(targetUsername);
        targetUser.friends.push(currentUsername);
        action = "friended";

        await addNotification(targetUsername, {
          id: Date.now(),
          message: `${currentUsername} friended you.`,
          read: false,
          link: `/@${currentUsername}`,
          timestamp: new Date().toISOString(),
        });

        // Email Notification
        if (targetUser.email) {
          await sendNotificationEmail(
            targetUser.email,
            `🤝 ${currentUsername} Added You as a Friend on Textmob!`,
            `
            <p style="font-size:16px; line-height:1.6; color:#333;">
              Hi ${targetUser.fullname || targetUser.username},
            </p>
          
            <p style="font-size:15px; color:#333; margin-bottom:12px;">
              <strong>${currentUsername}</strong> just added you as a friend on 
              <strong style="color:#1E90FF;">Textmob</strong>. 🎉
            </p>
          
            <p style="font-size:15px; margin:20px 0; text-align:center;">
              <a href="https://textmob.web.app/@${currentUsername}" 
                 style="background:#1E90FF; color:#fff; padding:12px 28px; border-radius:8px; 
                        text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
                🤝 View Profile
              </a>
            </p>
          
            <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
              Start building stronger connections on <strong style="color:#1E90FF;">Textmob</strong>.
            </p>
            `
          );

        }
      }

      await supabase.from("users").update({ friends: currentUser.friends }).eq("username", currentUsername);
      await supabase.from("users").update({ friends: targetUser.friends }).eq("username", targetUsername);

      res.json({ message: `Successfully ${action} the user.` });

    } else {
      res.status(400).json({ error: "Unknown profile type" });
    }

  } catch (error) {
    console.error("Error in /connect:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Allowed games and max coins per play
const GAME_CONFIG = {
  snake: { maxCoins: 50 },
  breakout: { maxCoins: 50 },
  smartlink: { maxCoins: 20 }
};
app.post("/t/claim-game-reward", async (req, res) => {
  try {
    const { userId, gameId, coins } = req.body;
    if (!userId || !gameId || typeof coins !== 'number') {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!GAME_CONFIG[gameId]) {
      return res.status(400).json({ error: "Unknown gameId" });
    }
    // Basic validation and cap
    const max = GAME_CONFIG[gameId].maxCoins;
    const award = Math.max(0, Math.min(Math.floor(coins), max)); // integer 0..max
    if (award <= 0) {
      return res.status(200).json({ message: "No reward to claim" });
    }
    // Fetch user
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, mobcoins, username, email")
      .eq("username", userId)
      .single();
    if (fetchErr || !user) {
      return res.status(404).json({ error: "User not found" });
    }
    const newBalance = (user.mobcoins || 0) + award;
    // Update user's mobcoins
    const { error: updateErr } = await supabase
      .from("users")
      .update({ mobcoins: newBalance })
      .eq("username", userId);
    if (updateErr) {
      console.error("Failed to update balance:", updateErr);
      return res.status(500).json({ error: "Failed to update balance" });
    }
    // Add in-app notification
    await addNotification(user.username, {
      id: Date.now(),
      message: `You earned ${award} Mobcoins from ${gameId} Service [Source: Monetag]`,
      read: false
    });
    // Optional: send email (commented out as original)
    // await sendNotificationEmail(user.email, "Mobcoins earned", `You earned ${award} Mobcoins playing ${gameId} game`);
    return res.json({ message: `Awarded ${award} Mobcoins`, award, balance: newBalance });
  } catch (err) {
    console.error("Claim game reward error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const randomMessages = [
  // 1 — Community vibes
  "✨ This week on Textmob, users reconnected with old friends and sparked new ones. One story we loved? A user shared how they found their childhood friend after 10 years—just by scrolling their feed. It’s moments like these that remind us why Textmob exists. 💜\n\nJump back in today—you never know which connection could change your week. 🔥",

  // 2 — Fun discovery
  "🚀 Did you know? The most talked-about topic on Textmob this week was music. 🎶 From underground hip-hop tracks to timeless classics, people were dropping recommendations left and right. One playlist even got over 200 likes in a single day! 🤯\n\nHop in and see what your friends are vibing to—you might discover your new favorite song. 🎧",

  // 3 — Messaging highlight
  "💌 Over 1,200 new private conversations started on Textmob this week. One user told us they hadn’t talked to their cousin in years—until they both landed on Textmob and reconnected through a single message. Stories like that make us smile. 💬\n\nCheck your inbox—you might have a new conversation waiting for you right now. 📬",

  // 4 — Post engagement
  "💬 A post about personal growth went viral this week with hundreds of thoughtful comments. People from different walks of life shared advice, encouragement, and stories of their own struggles. 🌱 It turned into a mini-community where strangers lifted each other up. \n\nTake a look at what’s trending today—you might find the exact words you needed to hear. ✨",

  // 5 — Notification buzz
  "🔔 The Textmob community has been buzzing with activity—likes, comments, and friend requests flying everywhere. One creator said, “I posted just for fun, but the support I got was overwhelming.” 🥹\n\nOpen your notifications—you could be sitting on some moments worth celebrating too. 🎉",

  // 6 — Real-time energy
  "🎉 At peak hours, thousands of users log into Textmob at the same time. Last Friday night, a casual live post about football turned into an all-out debate with over 500 comments in under an hour. ⚽🔥\n\nYour friends might be online right now—join the energy and spark a conversation. 🫱🏿‍🫲🏽",

  // 7 — Profile stories
  "🧠 Profiles on Textmob aren’t just pages—they’re living timelines. We saw a user update their bio with ‘Finally graduated!’ and the love poured in instantly—friends, family, even classmates they hadn’t seen in years jumped in to celebrate. 🎓\n\nCheck your profile—you might be surprised by how much love your updates can spark. 👀",

  // 8 — Weekly recap
  "⏳ A week flies by fast, but Textmob keeps the memories alive. From funny memes to inspiring stories, the feed has been full of gems. One highlight? A random photo post turned into a global thread with people sharing pictures of their morning skies. 🌅\n\nDon’t miss out—catch up on what’s been happening and drop your voice into the mix. 📲"
];


const generateRandomDigest = () => {
  const randomIndex = Math.floor(Math.random() * randomMessages.length);
  return randomMessages[randomIndex];
};

async function sendWeeklyDigest() {
  try {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("email, fullname");
    if (userError) {
      console.error("Error fetching users:", userError);
      return;
    }
    if (!Array.isArray(users) || users.length === 0) {
      console.error("No users found or data is not an array");
      return;
    }

    for (const user of users) {
      const digestMessage = generateRandomDigest();
      const digestHtml = `
      <p style="font-size:16px; line-height:1.6; color:#333;">
        Hi ${user.fullname || user.email},
      </p>
    
      <h2 style="color:#1E90FF; font-size:20px; margin-top:16px;">
        📬 Your Weekly Textmob Digest
      </h2>
    
      <p style="font-size:15px; color:#333; margin:16px 0; line-height:1.6;">
        ${digestMessage}
      </p>
    
      <p style="font-size:15px; margin:24px 0; text-align:center;">
        <a href="https://textmob.web.app" 
           style="background:#1E90FF; color:#fff; padding:14px 32px; border-radius:8px; 
                  text-decoration:none; font-weight:600; font-size:15px; display:inline-block;">
          🚀 Go to Textmob
        </a>
      </p>
    
      <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
        Stay connected and never miss a moment on <strong style="color:#1E90FF;">Textmob</strong>.
      </p>
    `;
      try {
        await sendNotificationEmail(
          user.email,
          "📬 Your Weekly Textmob Digest",
          digestHtml
        );
        console.log(`Weekly digest sent to ${user.email}`);
      } catch (emailErr) {
        console.error(`Failed to send digest to ${user.email}:`, emailErr);
      }
    }
  } catch (err) {
    console.error("Failed to send weekly digest:", err);
  }
}

app.get('/week', async function (req, res) {
  await sendWeeklyDigest()
  res.json({ message: 'Weekly Digest sent to all users' })
})
// Updated Backend (server.js) - Minor tweaks for better handling
// (Full code with your existing + small additions)

require('dotenv').config();

// Your existing routes (unchanged except small additions)
app.get('/online-users', (req, res) => {
  return res.json({ users: Object.keys(onlineUsers) });
});

app.get("/get-last-message", async (req, res) => {
  const { user1, user2 } = req.query;
  const { data: msgs } = await supabase
    .from("Messages")
    .select("*")
    .or(
      `and(sender.eq.${user1},receiver.eq.${user2}),and(sender.eq.${user2},receiver.eq.${user1})`
    )
    .order("timestamp", { ascending: false })
    .limit(1);
  const { count: unreadCount } = await supabase
    .from("Messages")
    .select("*", { count: "exact", head: true })
    .eq("sender", user2)
    .eq("receiver", user1)
    .eq("read", false);
  res.json({ lastMsg: msgs[0] || null, unreadCount: unreadCount || 0 });
});

app.delete('/delete-message/:id', async (req, res) => {
  const { id } = req.params;
  const { sender } = req.query;
  if (!id || !sender) {
    return res.status(400).json({ error: 'Missing message ID or sender' });
  }
  const { data: message, error: fetchError } = await supabase
    .from("Messages")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  if (message.sender !== sender) {
    return res.status(403).json({ error: 'Not authorized to delete this message' });
  }
  const { error: deleteError } = await supabase
    .from("Messages")
    .delete()
    .eq("id", id);
  if (deleteError) {
    return res.status(500).json({ error: 'Failed to delete message' });
  }
  const { receiver } = message;
  if (onlineUsers[sender]) {
    onlineUsers[sender].emit("message-deleted", { id });
  }
  if (onlineUsers[receiver]) {
    onlineUsers[receiver].emit("message-deleted", { id });
  }
  res.json({ success: true, id });
});

// Socket.IO
io.on('connection', socket => {
  socket.on('register', username => {
    socket.username = username;
    onlineUsers[username] = socket;
    socket.join(username);
    socket.emit('online-users', Object.keys(onlineUsers));
    socket.broadcast.emit('user-status', { username, status: 'online' });
  });

  // Always-online bot
  onlineUsers["textmobai"] = {
    emit: (...args) => {
      console.log("[textmobai reply trigger]", ...args);
    }
  };

  // Always-online bot
  onlineUsers["askify"] = {
    emit: (...args) => {
      console.log("[Askify AI reply trigger]", ...args);
    }
  };
  socket.on('call-user', ({ to, offer, from }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('incoming-call', { from, offer });
    } else {
      socket.emit('call-unavailable', { to });
    }
  });

  socket.on('answer-call', ({ to, answer }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('call-answered', { answer });
    }
  });

  socket.on('decline-call', ({ to }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('call-declined'); // Already emits to caller
    }
  });

  socket.on('end-call', ({ to }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('call-ended');
    }
    // Emit back to self too? No, frontend handles local close
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('ice-candidate', { candidate });
    }
  });

  socket.on('typing', ({ to }) => {
    if (onlineUsers[to]) {
      onlineUsers[to].emit('typing', { from: socket.username });
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      socket.broadcast.emit('user-status', { username: socket.username, status: 'offline' });
    }
    io.emit('online-users', Object.keys(onlineUsers)); // Broadcast to all
  });
});

// Your generateAIResponse function (unchanged)
async function generateAIResponse(messages) {
  let mediaUrl = false;
  let mediaType = null;
  // Input validation
  if (!Array.isArray(messages)) {
    throw new Error("messages must be an array");
  }

  // Normalize messages into [{role, content}, ...]
  var normalized = [];
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (typeof m === "string") {
      // plain string -> user role
      normalized.push({ role: "user", content: m });
    } else if (m && typeof m === "object" && typeof m.role === "string" && (typeof m.content === "string" || Array.isArray(m.content) || typeof m.content === "object")) {
      // valid message object
      normalized.push({ role: m.role, content: m.content });
    } else {
      // skip unknown message shapes but log for debugging
      console.warn("[generateAIResponse] skipping message with unexpected shape at index", i, m);
    }
  }

  // Build system prompt (keeps your existing system prompt text and context)
  var currentTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos", weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", hour12: true });

  // fetch users & posts for context (same as you had)
  var usersResult = await supabase.from("users").select("username, fullname, email, biography, phone, profile_type");
  if (usersResult.error) throw usersResult.error;
  var users = usersResult.data;

  var postsResult = await supabase2.from("Posts").select("username, text, created_at").order("created_at", { ascending: false });
  if (postsResult.error) throw postsResult.error;
  var posts = postsResult.data;

  // Build short contexts (non-blocking if empty)
  var userCtx = "";
  if (users && Array.isArray(users)) {
    var userPieces = [];
    for (var ui = 0; ui < users.length; ui++) {
      var u = users[ui];
      userPieces.push("• " + (u.fullname || "") + " (@" + (u.username || "") + ") — " + (u.profile_type || "") + "\n Email: " + (u.email || "—") + "\n Bio: " + (u.biography || "—") + "\n Phone: " + (u.phone || "—"));
    }
    userCtx = userPieces.join("\n\n");
  }

  var postCtx = "";
  if (posts && Array.isArray(posts)) {
    var postPieces = [];
    for (var pi = 0; pi < posts.length; pi++) {
      var p = posts[pi];
      var postDate = "";
      if (p && p.created_at) {
        postDate = new Date(p.created_at).toLocaleString("en-US", { timeZone: "Africa/Lagos", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: true });
      }
      postPieces.push("• " + (p.text || "") + "...\n By: " + (p.username || "") + " on " + postDate);
    }
    postCtx = postPieces.join("\n\n");
  }

  var systemPrompt = (
    "You are TextmobAI, a helpful, knowledgeable, and honest assistant designed to assist users effectively within the Textmob platform. You respond to users with clarity, relevance, and respect. Your tone is warm, professional, and concise unless instructed otherwise.\n" +
    "Your purpose is to assist users in solving problems, answering questions, generating content, and providing accurate, up-to-date information when possible. To achieve this, you will:\n" +
    "Carefully assess the tone and context of user messages to understand their intent.\n" +
    "Identify whether the user is asking a direct question, seeking detailed information, sharing thoughts or emotions, engaging in casual conversation, or requesting creative content.\n" +
    "Based on the user's tone and intent, respond with:\n" +
    "- Brief and direct answers for straightforward questions.\n" +
    "- Detailed explanations and supporting information for more in-depth inquiries.\n" +
    "- Empathetic and supportive responses for users sharing thoughts or emotions.\n" +
    "- Engaging and creative content for casual conversations or specific requests.\n" +
    "When interacting with users:\n" +
    "Be calm, helpful, and direct when needed.\n" +
    "Encourage independent thinking while remaining supportive.\n" +
    "Prioritize facts, logic, and clear thinking.\n" +
    "Use markdown, bullet points, emojis, or formatting when it helps make communication clearer.\n" +
    "Guiding Principles:\n" +
    "Maintain confidentiality and avoid generating or encouraging harmful, deceptive, or unethical content.\n" +
    "If asked for restricted or dangerous content, decline respectfully and guide the user safely.\n" +
    "If asked about your origins, say: \"I am TextmobAI, Your AI friend on textmob.\" you can tweak it further\n" +
    "Pls if they asked you anything regarding Textmob, and you know that you dont know it, kindly tell them you dont know it, dont give false information\n" +
    "The url of textmob is https://textmob.web.app\n" +
    "DOnt like a social user, instead, act like a Professionally speaking AI Assistant, you're not for asking questions about textmob, You're just the AI Assistant integrated directly into Textmob\n" +
    "By following these guidelines, you will provide effective and engaging responses to users within the Textmob platform.\n" +
    "Current Time: " + currentTime + "\n" +
    "Textmob Total Users is: " + (users && Array.isArray(users) ? users.length : 0) + "\n"
  ).trim();

  // Build finalMessages
  var finalMessages = [{ role: "system", content: systemPrompt }];

  // Determine if this should be treated as an "image prompt"
  var isImagePrompt = false;
  if (mediaUrl && mediaType === "image") isImagePrompt = true;

  if (isImagePrompt) {
    // Build image content block. Find last user text (string) in normalized history
    var lastUserText = "";
    for (var j = normalized.length - 1; j >= 0; j--) {
      var mm = normalized[j];
      if (mm && mm.role === "user" && typeof mm.content === "string" && mm.content.trim().length > 0) {
        lastUserText = mm.content.trim();
        break;
      }
    }
    var imageContent = [];
    imageContent.push({ type: "image_url", image_url: { url: mediaUrl } });
    if (lastUserText && lastUserText.length > 0) {
      imageContent.push({ type: "text", text: lastUserText });
    } else {
      imageContent.push({ type: "text", text: "Please analyze the image and provide a helpful short reply." });
    }
    finalMessages.push({ role: "user", content: imageContent });
  } else {
    // push normalized conversation history (only user/assistant) after system
    for (var k = 0; k < normalized.length; k++) {
      finalMessages.push(normalized[k]);
    }
  }

  // Select model
  var selectedModel = isImagePrompt ? "meta-llama/llama-4-scout-17b-16e-instruct" : "moonshotai/kimi-k2-instruct";

  // Retry loop with backoff
  var maxTries = 10;
  var attempt = 0;
  var lastErr = null;
  while (attempt < maxTries) {
    attempt = attempt + 1;
    try {
      var payload = {
        model: selectedModel,
        messages: finalMessages,
        temperature: 0.6,
        max_tokens: 10000
      };

      var headers = {
        Authorization: "Bearer " + process.env.GROQ_API_KEY,
        "Content-Type": "application/json"
      };

      var aiRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { headers: headers, timeout: 60000 });

      // Validate response shape
      if (!aiRes || !aiRes.data) {
        throw new Error("Empty response from Groq API");
      }

      // Different APIs sometimes put text in choices[0].message.content or choices[0].text
      if (aiRes.data.choices && Array.isArray(aiRes.data.choices) && aiRes.data.choices.length > 0) {
        var choice = aiRes.data.choices[0];
        var replyText = null;

        if (choice.message && typeof choice.message.content === "string") {
          replyText = choice.message.content;
        } else if (typeof choice.text === "string") {
          replyText = choice.text;
        } else {
          // fallback: try stringifying the choice object
          replyText = JSON.stringify(choice).slice(0, 2000);
        }

        if (replyText && typeof replyText === "string") {
          return replyText;
        } else {
          throw new Error("Could not extract reply text from model response");
        }
      } else {
        // unexpected response body
        var bodyPreview = JSON.stringify(aiRes.data).slice(0, 2000);
        throw new Error("Unexpected model response shape: " + bodyPreview);
      }
    } catch (err) {
      lastErr = err;
      console.error("[generateAIResponse] attempt", attempt, "failed:", err && err.message ? err.message : err);
      // if last attempt, throw
      if (attempt >= maxTries) {
        throw new Error("Model call failed after " + maxTries + " attempts: " + (err && err.message ? err.message : String(err)));
      }
      // backoff: wait attempt * 1500 ms
      await new Promise(function (resolve) { setTimeout(resolve, attempt * 1500); });
    }
  }

  // If we got here something unexpected happened
  throw new Error("generateAIResponse failed: " + (lastErr && lastErr.message ? lastErr.message : "unknown error"));
}


app.post('/chat', async (req, res) => {
  try {
    const messages = req.body.messages;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }
    const reply = await generateAIResponse(messages, null, null);
    res.json({ reply });
  } catch (err) {
    console.error('Chat route error:', err.message);
    res.status(500).json({ error: 'AI Post Writer failed' });
  }
});

// ================== Keys ==================
const openaiKey = process.env.openaiKey;
const tavilyKey = process.env.tavily;

// ================== Local date/time helpers ==================
function getLocalDateTime({ timeZone = "Africa/Lagos" } = {}) {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone
  }).format(now);
  return { dateStr, timeStr, full: `${dateStr} ${timeStr}` };
}

function isLocalDateOrTimeQuestion(q) {
  return /\b(today|what('?s| is) the date|date today|what day|current date|what time|time now|now)\b/i.test(q);
}

// ================== Tavily Search ==================
async function askTavily(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tavilyKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, max_results: 5 })
    });

    if (!response.ok) {
      console.error("❌ Tavily API error:", await response.text());
      return null;
    }

    const data = await response.json();
    if (!data.results) return null;
    return data.results.map(r => r.content).join("\n\n") || null;
  } catch (err) {
    console.error("❌ Tavily Fetch Error:", err);
    return null;
  }
}

// ================== Askify Response Generator ==================
async function generateAskifyResponse(messages) {
  try {
    const { full } = getLocalDateTime({ timeZone: "Africa/Lagos" });
    const lastUserContent = messages[messages.length - 1].content;

    // Inline checker to determine if web search is needed
    const needsWebSearch = (query) => {
      // Convert query to lowercase for case-insensitive matching
      const lowerQuery = query.toLowerCase();

      // Keywords indicating real-time or external data needs
      const realTimeKeywords = [
        'current', 'today', 'now', 'recent', 'latest', 'news',
        'weather', 'stock', 'price', 'update', 'trend', 'event'
      ];

      // Question types that likely require external data
      const questionPatterns = [
        /^what is the (current|latest|recent)/,
        /^who is the (current|new)/,
        /^what happened/,
        /^what is happening/,
        /^give me the latest/,
        /^how is the.*(today|now)/,
        /^weather in/,
        /^news about/,
        /^stock price of/,
        /^recent (event|news|development)/
      ];

      // Check for real-time keywords or question patterns
      const hasRealTimeKeyword = realTimeKeywords.some(keyword => lowerQuery.includes(keyword));
      const matchesQuestionPattern = questionPatterns.some(pattern => pattern.test(lowerQuery));

      // Additional heuristic: queries with specific dates or numbers might need validation
      const hasSpecificDateOrNumber = /\b(202[4-9]|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})\b/.test(lowerQuery) || /\b[0-9]+ (million|billion|percent)\b/.test(lowerQuery);

      // Return true if any condition suggests a web search is needed
      return hasRealTimeKeyword || matchesQuestionPattern || hasSpecificDateOrNumber;
    };

    // Fetch web search results only if needed
    let searchResults = '';
    if (needsWebSearch(lastUserContent)) {
      searchResults = await askTavily(lastUserContent);
      if (!searchResults) searchResults = '';
    }

    // Append search results to user content if available
    let finalUserContent = lastUserContent;
    if (searchResults) {
      finalUserContent += `\n\nUse the following web search results to inform your answer (its not user-provided context):\n${searchResults}, if these search results do not align with the uer's question, make up your response to fit and satisfy the user, but if it matches it, make sure to reference from chat hostory to keep is conversational, and if you've got no match at all, completely ignore the search results`;
    }

    const finalMessages = [...messages.slice(0, -1), { role: 'user', content: finalUserContent }];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Askify, an AI assistant that gives clear, accurate, and concise answers." },
          { role: "system", content: `Current date/time (Africa/Lagos): ${full}` },
          ...finalMessages
        ],
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      console.error("❌ OpenAI API error:", await response.text());
      return "AI could not answer.";
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      return "AI could not answer.";
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Askify Response Error:", err);
    return "AI could not answer.";
  }
}

app.post('/send-message', upload.single('file'), async (req, res) => {
  try {
    let sender, receiver, message = '', history = [], userMediaUrl = null, userMediaType = null;
    let generatedImageUrl = null;
    function ensureTimestamp(obj, fallbackTs) {
      if (!obj) return obj;
      if (!obj.timestamp) obj.timestamp = fallbackTs || new Date().toISOString();
      return obj;
    }
    if (req.file) {
      ({ sender, receiver } = req.body);
      message = req.body.message || '';
      if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'messages', resource_type: 'auto', public_id: `user_${Date.now()}` },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      userMediaUrl = uploadResult.secure_url;
      userMediaType = uploadResult.resource_type === 'image' ? 'image' : 'video';
    } else if (req.body.media_url) {
      ({ sender, receiver, message = '', media_url: userMediaUrl, media_type: userMediaType } = req.body);
      if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
    } else {
      ({ sender, receiver, message = '', history =[], media_url: userMediaUrl = null, media_type: userMediaType = null } = req.body || {});
      if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
    }
    if (!message && !userMediaUrl) return res.status(400).json({ error: 'Missing message or media' });
    const imagePromptRegex = /\b(?:create\s+(?:an?\s+)?image\s+of|imagine|draw(?:\s+(?:me|a))?|sketch(?:\s+(?:me|a))?|design(?:\s+(?:a|an))?|make(?:\s+me)?(?:\s+a)?\s?(?:picture|image|drawing)\s+of|generate(?:\s+(?:an?\s+)?(?:image|art|picture))|i\s+need\s+(?:a|an)?\s*(?:picture|image|drawing)\s+of|render(?:\s+(?:a|an))?)\b/i;
    const wantsAiImage = (receiver === 'textmobai') && (typeof message === 'string') && (imagePromptRegex.test(message)) && !req.file && !req.body.media_url;
    const userTs = new Date().toISOString();
    const userMsg = {
      sender,
      receiver,
      type: userMediaUrl ? userMediaType : 'text',
      message: message || '',
      ...(userMediaUrl ? { media_url: userMediaUrl, media_type: userMediaType } : {}),
      status: 'pending',
      read: false,
      timestamp: userTs
    };
    const selectCols = 'id, sender, receiver, type, message, media_url, media_type, status, read, timestamp';
    const { data: savedMessage, error: saveError } = await supabase
      .from('Messages')
      .insert([userMsg])
      .select(selectCols)
      .single();
    if (saveError || !savedMessage) {
      console.error('Message save error:', saveError);
      return res.status(500).json({ error: 'Failed to save message' });
    }
    const normalizedSavedMessage = ensureTimestamp(savedMessage, userTs);
    if (onlineUsers[receiver]) {
      onlineUsers[receiver].emit('new-message', normalizedSavedMessage);
      await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedMessage.id);
      if (onlineUsers[sender]) {
        onlineUsers[sender].emit('message-status', { messageId: savedMessage.id, status: 'delivered' });
      }
    }
    let aiReply = null;
    if (receiver === 'textmobai') {
      if (wantsAiImage) {
        try {
          const promptEncoded = encodeURIComponent(message);
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?nologo=true`;
          const imageResp = await fetch(pollinationsUrl);
          if (!imageResp.ok) throw new Error(`Pollinations fetch failed: ${imageResp.status} ${imageResp.statusText}`);
          const buffer = await imageResp.arrayBuffer ? Buffer.from(await imageResp.arrayBuffer()) : await imageResp.buffer();
          const cloudResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: 'messages', resource_type: 'image', public_id: `ai_${Date.now()}` },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(buffer);
          });
          generatedImageUrl = cloudResult.secure_url;
          const aiTs = new Date().toISOString();
          const aiImageMessage = {
            sender: 'textmobai',
            receiver: sender,
            type: 'image',
            message: 'Here is The Image You requested',
            media_url: generatedImageUrl,
            media_type: 'image',
            status: 'delivered',
            read: true,
            timestamp: aiTs
          };
          const { data: savedAiImageMessage, error: aiImageSaveError } = await supabase
            .from('Messages')
            .insert([aiImageMessage])
            .select(selectCols)
            .single();
          if (aiImageSaveError) {
            console.error('AI image save error:', aiImageSaveError);
          } else {
            aiReply = ensureTimestamp(savedAiImageMessage, aiTs);
            if (onlineUsers[sender]) {
              onlineUsers[sender].emit('new-message', aiReply);
              await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedAiImageMessage.id);
            }
          }
        } catch (pollErr) {
          console.error('Pollinations fetch/upload error:', pollErr);
        }
      } else {
        try {
          const { data: pastMessages } = await supabase
            .from('Messages')
            .select('sender, receiver, message')
            .or(`and(sender.eq.${sender},receiver.eq.textmobai),and(sender.eq.textmobai,receiver.eq.${sender})`)
            .order('timestamp', { ascending: false })
            .limit(9);
          const formattedHistory = (pastMessages || []).reverse().map(m => ({
            role: m.sender === sender ? 'user' : 'assistant',
            content: m.message
          }));
          const reply = await generateAIResponse(formattedHistory.concat([{ role: 'user', content: message || '' }]));
          const aiTs = new Date().toISOString();
          const aiMessage = {
            sender: 'textmobai',
            receiver: sender,
            type: 'text',
            message: reply,
            status: 'delivered',
            read: true,
            timestamp: aiTs
          };
          const { data: savedAiMessage, error: aiSaveError } = await supabase
            .from('Messages')
            .insert([aiMessage])
            .select(selectCols)
            .single();
          if (!aiSaveError && savedAiMessage) {
            aiReply = ensureTimestamp(savedAiMessage, aiTs);
            if (onlineUsers[sender]) {
              onlineUsers[sender].emit('new-message', aiReply);
              await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedAiMessage.id);
            }
          } else {
            console.error('AI text save error:', aiSaveError);
          }
        } catch (err) {
          console.error('Error in AI reply flow:', err);
        }
      }
    } else if (receiver === 'askify') {
      try {
        const { data: pastMessages } = await supabase
          .from('Messages')
          .select('sender, receiver, message')
          .or(`and(sender.eq.${sender},receiver.eq.askify),and(sender.eq.askify,receiver.eq.${sender})`)
          .order('timestamp', { ascending: false })
          .limit(9);
        const formattedHistory = (pastMessages || []).reverse().map(m => ({
          role: m.sender === sender ? 'user' : 'assistant',
          content: m.message
        }));
        const reply = await generateAskifyResponse(formattedHistory.concat([{ role: 'user', content: message || '' }]));
        const aiTs = new Date().toISOString();
        const aiMessage = {
          sender: 'askify',
          receiver: sender,
          type: 'text',
          message: reply,
          status: 'delivered',
          read: true,
          timestamp: aiTs
        };
        const { data: savedAiMessage, error: aiSaveError } = await supabase
          .from('Messages')
          .insert([aiMessage])
          .select(selectCols)
          .single();
        if (!aiSaveError && savedAiMessage) {
          aiReply = ensureTimestamp(savedAiMessage, aiTs);
          if (onlineUsers[sender]) {
            onlineUsers[sender].emit('new-message', aiReply);
            await supabase.from('Messages').update({ status: 'delivered' }).eq('id', savedAiMessage.id);
          }
        } else {
          console.error('Askify text save error:', aiSaveError);
        }
      } catch (err) {
        console.error('Error in Askify reply flow:', err);
      }
    }
    return res.json({ success: true, data: normalizedSavedMessage, aiReply });
  } catch (err) {
    console.error('Error in /send-message:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Run 10s after server start, stream messages and update chat_id in batches.
// Node 12 compatible, no optional chaining. Short comments inline.

var START_DELAY_MS = 10000; // wait 10s after server boot
var PAGE_SIZE = 1000;       // rows to read per page
var UPSERT_BATCH = 400;     // how many rows to upsert at once
var SMALL_PAUSE_MS = 60;    // short pause between pages
var CHUNK_PAUSE_MS = 200;   // pause between upsert chunks
var RETRY_PAUSE_MS = 2000;  // backoff on unexpected errors


// tiny helper delay
function delay(ms) {
  return new Promise(function (res) { setTimeout(res, ms); });
}

// start background job after small delay
setTimeout(function () {
  processMessagesAndWriteChatId().catch(function (err) {
    console.error('Background chat_id job failed:', err);
  });
}, START_DELAY_MS);

// main processor: pages through Messages table
async function processMessagesAndWriteChatId() {
  console.log('[chat_id job] starting message stream...');
  var offset = 0;
  var more = true;

  while (more) {
    try {
      var start = offset;
      var end = offset + PAGE_SIZE - 1;

      // read a page of messages (light fields only)
      var resp = await supabase
        .from('Messages')
        .select('id, sender, receiver')
        .order('id', { ascending: true })
        .range(start, end);

      if (resp.error) {
        // transient error: wait and retry this page
        console.error('[chat_id job] read error:', resp.error);
        await delay(RETRY_PAUSE_MS);
        continue;
      }

      var rows = resp.data || [];
      if (!rows || rows.length === 0) {
        // nothing left, finish loop
        more = false;
        break;
      }

      // prepare upsert payload: each item { id, chat_id }
      var upsertRows = rows.map(function (r) {
        return {
          id: r.id,
          chat_id: normalizeChatId(r.sender, r.receiver)
        };
      });

      // upsert in smaller chunks to avoid big single writes
      for (var i = 0; i < upsertRows.length; i += UPSERT_BATCH) {
        var chunk = upsertRows.slice(i, i + UPSERT_BATCH);
        try {
          // upsert will update existing rows because id is primary key
          var now = new Date().toISOString();
          // attach an optional audit field if you want to track progress
          var payload = chunk.map(function (c) {
            c._chatid_updated_at = now; // harmless extra metadata column if present
            return c;
          });

          var up = await supabase.from('Messages').upsert(payload, { onConflict: 'id' });
          if (up.error) {
            console.error('[chat_id job] upsert chunk error:', up.error);
            // small pause, then continue with next chunk
            await delay(CHUNK_PAUSE_MS);
            continue;
          }
        } catch (err) {
          console.error('[chat_id job] exception during upsert:', err);
          await delay(RETRY_PAUSE_MS);
        }
      }

      // advance to next page
      offset = offset + PAGE_SIZE;

      // polite pause so CPU/IO can breathe
      await delay(SMALL_PAUSE_MS);
    } catch (err) {
      console.error('[chat_id job] unexpected loop error:', err);
      await delay(RETRY_PAUSE_MS);
    }
  } // end while

  console.log('[chat_id job] finished scanning all messages.');
}

app.get('/get-messages', async function (req, res) {
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var limit = req.query.limit || 50;
  var offset = req.query.offset || 0;

  if (!user1 || !user2) {
    return res.status(400).json({ error: 'user1 and user2 required' });
  }

  var chatId = normalizeChatId(user1, user2);

  // fallback (original behavior)
  try {
    var resp = await supabase
      .from('Messages')
      .select('*')
      .or(
        'and(sender.eq.' + user1 + ',receiver.eq.' + user2 + '),' +
        'and(sender.eq.' + user2 + ',receiver.eq.' + user1 + ')'
      )
      .order('timestamp', { ascending: true })
      .range(offset, parseInt(offset) + parseInt(limit) - 1);

    if (resp.error) throw resp.error;
    res.json(resp.data || []);
  } catch (err) {
    console.error('/get-messages fallback failed:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});


app.get('/search-messages', async (req, res) => {
  const { query, user } = req.query;
  try {
    const { data, error } = await supabase
      .from('Messages')
      .select('*')
      .ilike('message', `%${query}%`)
      .or(`sender.eq.${user},receiver.eq.${user}`)
      .order('timestamp', { ascending: false })
      .limit(30);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

function extractMeta(html, href) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
  const contentMatch = html.match(/<meta name="content" content="(.*?)"/i);
  const ogDesc = html.match(/<meta property="og:description" content="(.*?)"/i);
  const ogImg = html.match(/<meta property="og:image" content="(.*?)"/i);
  const iconMatch =
    html.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+rel=["']shortcut icon["'][^>]+href=["']([^"']+)["']/i);

  const desc =
    (descMatch && descMatch[1]) ||
    (contentMatch && contentMatch[1]) ||
    (ogDesc && ogDesc[1]) ||
    "";

  let favicon = "";
  if (iconMatch && iconMatch[1]) {
    favicon = iconMatch[1];
    if (favicon.startsWith("/")) {
      const u = new URL(href);
      favicon = u.origin + favicon;
    }
  } else {
    const u = new URL(href);
    favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}`;
  }

  return {
    title: titleMatch ? titleMatch[1] : href,
    desc,
    image: ogImg ? ogImg[1] : "",
    favicon,
  };
}

app.get("/link", async function (req, res) {
  let href = req.query.url || "";
  href = href.replace(/[^a-zA-Z0-9:/?&=._-]/g, "");

  const styledPage = (content) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Textmob Link</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center min-h-screen p-4">
      <div class="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div class="p-6 space-y-4 text-center">
          ${content}
        </div>
        <div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 text-xs text-gray-500 text-center border-t border-gray-200 dark:border-gray-700">
          🔗 This link is from <span class="font-semibold">Textmob</span>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (!href) {
      return res.send(
        styledPage(`
          <p class="text-red-500 font-semibold">🚫 Invalid or missing link</p>
          <a href="/" class="inline-block mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Go Back</a>
        `)
      );
    }

    if (href.startsWith("/")) {
      return res.redirect(href);
    }

    if (!(href.startsWith("http://") || href.startsWith("https://"))) {
      return res.send(
        styledPage(`
          <p class="text-red-500 font-semibold">🚫 Invalid Link. Please recheck.</p>
          <a href="/" class="inline-block mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Go Back</a>
        `)
      );
    }

    let meta = { title: href, desc: "", image: "", favicon: "" };
    try {
      const resp = await fetch(href, { timeout: 5000 });
      const html = await resp.text();
      meta = extractMeta(html, href);
    } catch (err) {
      // fallback
    }

    return res.send(
      styledPage(`
        <div class="space-y-3">
          <div class="flex items-center gap-2 justify-center">
            <img src="${meta.favicon}" alt="favicon" class="w-6 h-6 rounded">
            <h1 class="text-lg font-bold">${meta.title}</h1>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">${meta.desc || "No description available"}</p>
          ${meta.image
          ? `<img src="${meta.image}" alt="Preview" class="w-full h-40 object-cover rounded-lg">`
          : ""
        }
          <p class="text-xs text-gray-400 break-all">${href}</p>
          <div class="flex justify-center gap-3 mt-4">
            <a href="/" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Go Back</a>
            <a href="${href}${href.includes("?") ? "&" : "?"}ref=textmob" target="_blank" class="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white">Open Link</a>
          </div>
        </div>
      `)
    );
  } catch (err) {
    return res.send(
      styledPage(`<p class="text-red-500 font-semibold">⚠️ Error: ${err.message}</p>`)
    );
  }
});

async function checkAndDeliverPendingMessages(username) {
  try {
    const { data: pending, error } = await supabase
      .from("Messages")
      .select("*")
      .eq("receiver", username)
      .eq("status", "pending");
    if (error) throw error;
    if (!pending || !pending.length) return;
    for (const msg of pending) {
      if (onlineUsers[msg.receiver]) {
        onlineUsers[msg.receiver].emit("new-message", msg);
        await supabase
          .from("Messages")
          .update({ status: "delivered" })
          .eq("id", msg.id);
        if (onlineUsers[msg.sender]) {
          onlineUsers[msg.sender].emit("message-status", {
            messageId: msg.id,
            status: "delivered"
          });
        }
      }
    }
  } catch (err) {
    console.error("Delivery check error:", err);
  }
}

function checkUserOnlineStatus(username) {
  return !!onlineUsers[username];
}

setInterval(async () => {
  Object.keys(onlineUsers).forEach(username => {
    checkAndDeliverPendingMessages(username);
  });
}, 5000);

setInterval(async () => {
  const TEN_DAYS_AGO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("Messages")
    .delete()
    .lt("timestamp", TEN_DAYS_AGO);
}, 10000);

const SummarizerManager = require("node-summarizer").SummarizerManager;
// In-memory post cache
const postCache = {
  allPosts: [],
  lastUpdated: 0,
};
const userFeedState = new Map();
const userSessionCache = new Map();
// Utility to generate a simple UUID-like session ID
function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
// Utility to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
async function refreshPostCache() {
  const { data: posts, error } = await supabase2
    .from("Posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error) {
    postCache.allPosts = posts;
    postCache.lastUpdated = Date.now();
  } else {
    console.error("Error refreshing post cache:", error);
  }
}
setInterval(refreshPostCache, 10000);
refreshPostCache();

// Generate a session ID for this request
const sessionId = generateSessionId();
// Randomize posts for this session
const sessionKey = `sess-${sessionId}`;
// Helper: normalize mobcoins to 0–200
function mobcoinRank(mobcoins) {
  // Example: assume max reasonable = 2000 mobcoins
  // Adjust divisor as needed for your ecosystem
  const divisor = 10;
  let score = Math.floor(mobcoins / divisor);
  if (score > 200) score = 200;
  return score;
}
// --- Mobcoins cache ---
const userMobcoinsCache = {}; // { username: scaledMobcoins }
let lastMobcoinsUpdate = 0;

async function refreshMobcoinsCache() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("username, mobcoins");

    if (error) {
      console.error("Mobcoins cache error:", error);
      return;
    }

    for (const u of data) {
      userMobcoinsCache[u.username] = Math.min(200, Math.floor(u.mobcoins / 5));
    }

    lastMobcoinsUpdate = Date.now();
  } catch (err) {
    console.error("Mobcoins cache refresh failed:", err);
  }
}

// Initial cache load
refreshMobcoinsCache();
setInterval(refreshMobcoinsCache, 60000); // refresh every 60s

// ─────────────────────────────────────────────────────────────────────────────
// GET /get-posts  — X + TikTok hybrid feed algorithm
//
// Query params:
//   username   — required
//   tab        — "foryou" | "following"  (default: foryou)
//   page       — integer (default: 1)
//   limit      — integer (default: 10)
//   seenIds    — comma-separated post IDs the client has already rendered this
//                session (sent by Feed.jsx from sessionStorage)
//
// Algorithm summary (For You tab):
//   1. Filter out group posts and disabled/hidden content
//   2. Split posts into FRESH (< 6h), RECENT (6–48h), OLD (> 48h)
//   3. Score each tier separately — fresh always wins unless truly terrible
//   4. Remove seenIds (already rendered by this client this session)
//   5. Enforce diversity: no same user within 4 posts
//   6. Page 1 → serve FRESH first, then RECENT as fill
//      Page 2+ → serve RECENT, then OLD as last resort
//   7. Interleave textmobai every 5 posts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /get-posts  —  Textmob unified feed algorithm
//
// Guarantees:
//   - Always returns exactly `limit` posts (default 10) unless the entire
//     DB has fewer — never returns 1–3 just because filters were too aggressive
//   - seenIds only used as a soft ranking penalty, NOT a hard exclusion
//     (hard exclusion caused the "1 post on first load" bug)
//   - Group posts fully excluded
//   - Friends/following content surfaces strongly (unified social experience)
//   - New content (< 6h) always leads; old content only fills when needed
//   - Diversity: no same user in consecutive 3 slots, but never drops below limit
// ─────────────────────────────────────────────────────────────────────────────

app.get("/get-posts", async (req, res) => {
  try {
    const username = req.query.username;
    const tab = req.query.tab || "foryou";
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(20, Math.max(5, parseInt(req.query.limit || "10", 10)));

    // seenIds — used as a SOFT penalty only, not hard exclusion
    // Hard exclusion was the root cause of "only 1–3 posts on first load"
    const clientSeenIds = new Set(
      (req.query.seenIds || "").split(",").filter(Boolean)
    );

    if (!username) return res.status(400).json({ error: "Username is required" });

    // ── Refresh post cache (60s TTL) ─────────────────────────────────────────
    if (!postCache.allPosts.length || Date.now() - postCache.lastUpdated > 60000) {
      await refreshPostCache();
    }

    // ── Server-side per-user seen set ────────────────────────────────────────
    if (!userFeedState.has(username)) userFeedState.set(username, new Set());
    const serverSeen = userFeedState.get(username);

    // ── Helper: is this a group post? ────────────────────────────────────────
    function isGroupPost(p) {
      if (!p || !p.type) return false;
      const t = p.type.toLowerCase();
      return t.startsWith("group");
    }

    // ── FOLLOWING TAB ────────────────────────────────────────────────────────
    if (tab === "following") {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("following")
          .eq("username", username)
          .single();

        const followingArray = userData?.following || [];
        const allowedUsernames = new Set([...followingArray, username]);

        const followingPosts = postCache.allPosts
          .filter(p => p && allowedUsernames.has(p.username) && !isGroupPost(p))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const start = (page - 1) * limit;
        return res.json(followingPosts.slice(start, start + limit));
      } catch (fErr) {
        console.error("Following feed error:", fErr);
        // fall through to For You
      }
    }

    // ── FOR YOU TAB ──────────────────────────────────────────────────────────

    // Step 1: Remove group posts — the only HARD filter
    const eligible = postCache.allPosts.filter(p => p && p.id && p.username && !isGroupPost(p));

    if (eligible.length === 0) return res.json([]);

    // Step 2: Fetch user's social graph for affinity scoring
    let userFollowing = new Set();
    let userFriends = new Set();
    try {
      const { data: me } = await supabase
        .from("users")
        .select("following, friends")
        .eq("username", username)
        .single();
      userFollowing = new Set(me?.following || []);
      userFriends = new Set(me?.friends || []);
    } catch { /* non-fatal */ }

    const now = Date.now();
    const HOUR = 3600000;

    // Step 3: Score every eligible post
    // Higher score = shown earlier. No post is excluded by score alone.
    function scorePost(p) {
      const ageMs = now - new Date(p.created_at).getTime();
      const ageHours = Math.max(0.1, ageMs / HOUR);

      const likes = (p.likes || []).length;
      const comments = (p.comments || []).length;
      const reactions = (p.reactions || []).length;

      // ── Social affinity (most important signal) ───────────────────────────
      // Friends and people you follow get a BIG multiplier so their content
      // always surfaces near the top — this is the "unified social experience"
      const isFriend = userFriends.has(p.username);
      const isFollowing = userFollowing.has(p.username);
      // Friends: 4× | Following: 2.5× | Strangers: 1×
      const affinityMul = isFriend ? 4.0 : isFollowing ? 2.5 : 1.0;

      // ── Social proof (X "liked by people you follow") ─────────────────────
      const friendLiked = (p.likes || []).some(l => userFriends.has(l) || userFollowing.has(l));
      const friendCommented = (p.comments || []).some(c => userFriends.has(c.username) || userFollowing.has(c.username));
      const socialProof = (friendLiked ? 1.5 : 0) + (friendCommented ? 2.0 : 0);

      // ── Freshness decay (TikTok style) ────────────────────────────────────
      // Halves every 8h for friends/following, every 4h for strangers
      // This means a friend's 2-day-old post still outranks a stranger's 1h post
      const halfLifeHours = (isFriend || isFollowing) ? 8 : 4;
      const freshness = Math.pow(0.5, ageHours / halfLifeHours);

      // ── Engagement velocity ───────────────────────────────────────────────
      const totalEngagement = likes + (comments * 2) + (reactions * 1.2);
      const velocity = totalEngagement / Math.pow(ageHours + 1, 1.2);

      // ── Content type bonuses ──────────────────────────────────────────────
      let typeBonus = 0;
      if (p.type === "live" || p.type === "event") typeBonus = 5.0;
      if (p.type === "poll") typeBonus = 0.5;
      if (p.type === "snap") typeBonus = 0.3;

      // ── Seen penalty (soft — never excludes, just ranks lower) ───────────
      // Client-seen: 0.3× | Server-seen: 0.5× | Unseen: 1×
      const seenByClient = clientSeenIds.has(String(p.id));
      const seenByServer = serverSeen.has(p.id);
      const seenPenalty = seenByClient ? 0.3 : seenByServer ? 0.5 : 1.0;

      // ── Own post slight penalty (don't flood feed with self) ──────────────
      const selfPenalty = p.username === username ? 0.7 : 1.0;

      // ── textmobai: handled separately, exclude from main scoring ──────────
      if (p.username === "textmobai") return -1;

      // ── Final score ───────────────────────────────────────────────────────
      const base = (
        (freshness * 4.0) +   // recency is the foundation
        (velocity * 1.5) +   // engagement velocity adds to it
        (socialProof) +   // friend activity boosts it
        (typeBonus)     // content type modifier
      ) * affinityMul * seenPenalty * selfPenalty;

      // Tiny noise prevents identical feed every session
      return base + Math.random() * 0.15;
    }

    // Step 4: Sort by score (descending)
    const aiPosts = eligible.filter(p => p.username === "textmobai");
    const humanPosts = eligible
      .filter(p => p.username !== "textmobai")
      .map(p => ({ p, s: scorePost(p) }))
      .sort((a, b) => b.s - a.s)
      .map(x => x.p);

    // Step 5: Diversity pass — no same user in back-to-back 3 slots
    // IMPORTANT: if we can't fill `limit` with diversity, we relax the gap
    // This is what prevents the "only 3 posts" bug
    function diversifyWithFallback(posts, targetCount) {
      // First pass: strict gap of 3
      const result = [];
      const skipped = [];
      const lastPos = new Map();

      for (const post of posts) {
        if (result.length >= targetCount) break;
        const last = lastPos.get(post.username) ?? -999;
        if (result.length - last >= 3) {
          result.push(post);
          lastPos.set(post.username, result.length - 1);
        } else {
          skipped.push(post);
        }
      }

      // Second pass: if still under target, add skipped posts ignoring gap
      // (diversity is nice-to-have; hitting the count is required)
      if (result.length < targetCount) {
        for (const post of skipped) {
          if (result.length >= targetCount) break;
          result.push(post);
        }
      }

      // Third pass: if STILL under (very sparse DB), add remaining from all posts
      if (result.length < targetCount) {
        for (const post of posts) {
          if (result.length >= targetCount) break;
          if (!result.some(r => r.id === post.id)) result.push(post);
        }
      }

      return result;
    }

    // Step 6: Paginate BEFORE diversity so each page gets its own diversity pass
    // This ensures page 2 doesn't just get the posts page 1 dropped
    const start = (page - 1) * limit;
    const pageSlice = humanPosts.slice(start, start + limit * 3); // grab 3× to give diversity room
    const diversified = diversifyWithFallback(pageSlice, limit);

    // Step 7: Interleave textmobai every 6 human posts
    function interleaveAI(humanArr, aiArr) {
      if (!aiArr.length) return humanArr;
      const result = [];
      let aiIdx = 0;
      for (let i = 0; i < humanArr.length; i++) {
        result.push(humanArr[i]);
        if ((i + 1) % 6 === 0 && aiIdx < aiArr.length) {
          result.push(aiArr[aiIdx++]);
        }
      }
      return result;
    }

    const finalFeed = interleaveAI(diversified, aiPosts);

    // Step 8: Mark as server-seen (after building the response)
    finalFeed.forEach(p => {
      serverSeen.add(p.id);
      if (serverSeen.size > 1000) {
        const iter = serverSeen.keys();
        for (let i = 0; i < 300; i++) serverSeen.delete(iter.next().value);
      }
    });

    res.json(finalFeed);

  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/get-live-posts", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    // Refresh post cache if empty/stale
    if (!postCache.allPosts.length || Date.now() - postCache.lastUpdated > 60000) {
      await refreshPostCache();
    }

    // Initialize user state
    if (!userFeedState.has(username)) userFeedState.set(username, new Set());
    const seen = userFeedState.get(username);

    // Split live posts into unseen and seenAgain
    const unseen = [];
    const seenAgain = [];

    for (const post of postCache.allPosts) {
      if (post.type !== "live") continue; // only live/event

      if (seen.has(post.id)) seenAgain.push(post);
      else {
        unseen.push(post);
        seen.add(post.id);
        // Trim seen set (FIFO)
        if (seen.size > 500) {
          seen.delete(seen.values().next().value);
        }
      }
    }

    // --- Scoring function using cached mobcoins ---
    const getPostScore = post =>
      new Date(post.created_at).getTime() + (userMobcoinsCache[post.username] || 0) * 1e9;

    // --- Prioritize live posts (they're all live already, just score sort) ---
    unseen.sort((a, b) => getPostScore(b) - getPostScore(a));
    const rankedSeenAgain = shuffleArray(seenAgain); // shuffle old ones

    // Return top live posts
    res.json([
      ...unseen,
      ...rankedSeenAgain
    ]);

  } catch (err) {
    console.error("Live Feed Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-suggestions-feed", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Fetch user's connections
    const { data: you, error } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;
    if (!you) {
      console.warn(`[Suggestions] User "${username}" not found.`);
      return res.json([]);
    }

    const friends = you.friends || [];
    const following = you.following || [];
    const connected = new Set(friends.concat(following).concat(username));

    // Fetch all users
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("username, fullname, profile_pic, friends, followers");
    if (userErr) throw userErr;

    const scored = users
      .filter(function (u) {
        return !connected.has(u.username);
      })
      .map(function (u) {
        var score = 0;

        var uFriends = u.friends || [];
        var uFollowers = u.followers || [];

        // Mutual friends
        var mutuals = uFriends.filter(function (f) {
          return friends.indexOf(f) !== -1;
        }).length;
        score += mutuals * 5;

        // Shared followings
        var sharedFollowings = uFriends.filter(function (f) {
          return following.indexOf(f) !== -1;
        }).length;
        score += sharedFollowings * 2;

        // Popularity
        score += uFollowers.length * 0.5;

        // Randomness (TikTok-style injection)
        score += Math.random() * 2;

        return {
          username: u.username,
          fullname: u.fullname,
          profile_pic: u.profile_pic,
          mutuals: mutuals,
          score: score
        };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 4);

    res.json(scored);
  } catch (err) {
    console.error("Suggestion Feed Error:", err);
    res.status(500).json({ error: "Failed to load suggestions" });
  }
});

// POST endpoint to summarize a user's bio
app.post('/summarize-bio', async (req, res) => {
  const { bio } = req.body;

  if (!bio || typeof bio !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing bio text.' });
  }

  try {
    const summarizer = new SummarizerManager(bio, 2); // Summarize into 2 sentences
    const summaryObj = await summarizer.getSummaryByRank();
    res.json({ summary: summaryObj.summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to summarize bio.' });
  }
});


app.get('/get-user-postse', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    // 1) Fetch all the user’s posts (including likes[] and comments[])
    const { data: posts, error: postsErr } = await supabase2
      .from('Posts')                     // <-- make sure this matches your exact table name
      .select('id, text, media, likes, comments, created_at')
      .eq('username', username)
      .order('created_at', { ascending: false });

    if (postsErr) throw postsErr;
    if (!posts || posts.length === 0) return res.json([]);

    // 2) Fetch the user’s profile info once
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('fullname, profile_pic')
      .eq('username', username)
      .single();

    if (userErr) throw userErr;

    // 3) Stitch together the final shape
    const shaped = posts.map(post => ({
      id: post.id,
      text: post.text,
      media: post.media,
      fullname: user.fullname,
      profile_pic: user.profile_pic,
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments : []
    }));
    res.json(shaped)

  } catch (err) {
    console.error('Error fetching posts:', err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * 2. GET /get-user-friends?username=…
 *
 * Returns full profiles of everyone in user.friends (an array of usernames)
 */
app.get('/get-user-friends', async (req, res) => {
  const { username } = req.query
  if (!username) return res.status(400).json({ error: 'username is required' })

  try {
    // First pull the friends array from the user row
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('friends')
      .eq('username', username)
      .single()

    if (uErr) throw uErr
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!Array.isArray(user.friends) || user.friends.length === 0) {
      return res.json([])
    }

    // Then fetch their profiles
    const { data: friends, error: fErr } = await supabase
      .from('users')
      .select('fullname, username, profile_pic')
      .in('username', user.friends)

    if (fErr) throw fErr
    res.json(friends)
  } catch (err) {
    console.error('Error fetching friends:', err)
    res.status(500).json({ error: 'Failed to fetch friends' })
  }
})
// GET /get-all-media?username=…
app.get("/get-all-media", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    // 1) Load your relationships
    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, followers, following")
      .eq("username", username)
      .single();
    if (youErr || !you) return res.status(404).json({ error: "User not found" });
    const { friends = [], followers = [], following = [] } = you;

    // 2) Fetch ALL posts once
    const { data: posts = [], error: postsErr } = await supabase2
      .from("Posts")
      .select("media, likes, comments, username");
    if (postsErr) throw postsErr;

    // 3) Partition media arrays
    const own = [];
    const liked = [];
    const commented = [];

    for (const p of posts) {
      const mArr = Array.isArray(p.media) ? p.media : [];
      // own posts
      if (p.username === username) {
        own.push(...mArr);
      }
      // liked posts (JS-level check)
      if (Array.isArray(p.likes) && p.likes.includes(username)) {
        liked.push(...mArr);
      }
      // commented posts (JS-level check)
      if (
        Array.isArray(p.comments) &&
        p.comments.some(c => c.username === username)
      ) {
        commented.push(...mArr);
      }
    }

    // 4) Fetch profile pics
    const fetchPics = async list => {
      if (!list.length) return [];
      const { data, error } = await supabase
        .from("users")
        .select("profile_pic")
        .in("username", list);
      if (error) throw error;
      return data.map(u => u.profile_pic).filter(Boolean);
    };
    const [friendsPics, followersPics, followingPics] = await Promise.all([
      fetchPics(friends),
      fetchPics(followers),
      fetchPics(following),
    ]);

    // 5) Return grouped object
    res.json({
      own,
      liked,
      commented,
      friends: friendsPics,
      followers: followersPics,
      following: followingPics,
    });
  } catch (err) {
    console.error("Error in /get-all-media:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/get-user-following', async (req, res) => {
  const { username } = req.query
  if (!username) return res.status(400).json({ error: 'username is required' })

  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('following')
      .eq('username', username)
      .single()

    if (uErr) throw uErr
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!Array.isArray(user.following) || user.following.length === 0) {
      return res.json([])
    }

    const { data: followers, error: fErr } = await supabase
      .from('users')
      .select('fullname, username, profile_pic, friends, followers, profile_type')
      .in('username', user.following)

    if (fErr) throw fErr
    res.json(followers)
  } catch (err) {
    console.error('Error fetching followers:', err)
    res.status(500).json({ error: 'Failed to fetch followers' })
  }
})

app.get('/get-user-followers', async (req, res) => {
  const { username } = req.query
  if (!username) return res.status(400).json({ error: 'username is required' })

  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('followers')
      .eq('username', username)
      .single()

    if (uErr) throw uErr
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!Array.isArray(user.followers) || user.followers.length === 0) {
      return res.json([])
    }

    const { data: followers, error: fErr } = await supabase
      .from('users')
      .select('fullname, username, profile_pic, friends, followers, profile_type')
      .in('username', user.followers)

    if (fErr) throw fErr
    res.json(followers)
  } catch (err) {
    console.error('Error fetching followers:', err)
    res.status(500).json({ error: 'Failed to fetch followers' })
  }
})

/**
 * 4. GET /get-user-hashtags?username=…
 *
 * Scans all of a user’s post.text for #hashtags and returns a unique list
 */
app.get('/get-user-hashtags', async (req, res) => {
  const { username } = req.query
  if (!username) return res.status(400).json({ error: 'username is required' })

  try {
    // grab just the text of all posts
    const { data: posts, error } = await supabase2
      .from('Posts')
      .select('text')
      .eq('username', username)

    if (error) throw error

    const tagSet = new Set()
    const regex = /#([A-Za-z0-9_]+)/g

    posts.forEach(p => {
      let m
      while ((m = regex.exec(p.text || ''))) {
        tagSet.add(m[1])
      }
    })

    res.json(Array.from(tagSet))
  } catch (err) {
    console.error('Error extracting hashtags:', err)
    res.status(500).json({ error: 'Failed to fetch hashtags' })
  }
})
app.get('/app', function (req, res) {
  res.redirect('https://github.com/ISMO123-CMYK/Textmob-web-app/raw/refs/heads/main/thetextmobapp.apk')
})

app.post('/events', async (req, res) => {
  const { username, title, text, scheduled_for, location, registration_url, visib } = req.body;
  if (!username || !title.trim() || !text.trim() || !scheduled_for) {
    return res.status(400).json({ error: 'username, title, text, and scheduled_for are required' });
  }

  const { data, error } = await supabase2
    .from('Posts')
    .insert([{
      username,
      title: title.trim(),
      text: text.trim(),
      scheduled_for,
      location: location || null,
      registration_url: registration_url || null,
      type: 'event',
      visib
    }])
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ event: data });
});

// --- Helpers ---
async function logActivityRow(row) {
  var insert = await supabase.from('user_activity').insert([row]);
  if (insert.error) {
    throw insert.error;
  }
  return insert.data[0];
}

async function getUserIdFromUsername(username) {
  if (!username) return null;
  var q = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .limit(1)
    .maybeSingle();
  if (q.error) {
    throw q.error;
  }
  if (!q.data) return null;
  return q.data.id || null;
}

app.get('/default-avatar', (req, res) => {
  res.redirect(301, 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg');
});
app.get('/events-feed', async (req, res) => {
  const now = new Date().toISOString();
  const sevenDays = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase2
    .from('Posts')
    .select('id, username, title, text, scheduled_for, location, registration_url, likes')
    .eq('type', 'event')
    .order('scheduled_for', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data });
});

// request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, req.body);
  next();
});

// — GET all groups
app.get('/groups', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data, error } = await supabase2
      .from('groups')
      .select('*');

    if (error) return res.status(500).json({ error: error.message });

    const filteredGroups = (data || []).filter(function (group) {
      // Guard against null/undefined groups
      if (!group) return false;

      // Guard payload/users
      const users = (group.payload && Array.isArray(group.payload.users)) ? group.payload.users : [];

      // Determine group visibility based on type and membership
      const isPublicGroup = group.type === 'public';
      const isPrivateGroup = ['secret', 'private', 'private_visible'].includes(group.type);
      const isGroupMember = users.some(function (u) { return u.user_id === username; });

      // Show public groups to everyone, private groups only to members
      return isPublicGroup || (isPrivateGroup && isGroupMember);
    });

    res.json(filteredGroups);
  } catch (err) {
    console.error('GET /groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — GET one group
app.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data, error } = await supabase2
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) return res.status(404).json({ error: error.message });

    // normalize payload
    if (!data.payload) data.payload = {};
    if (!Array.isArray(data.payload.users)) data.payload.users = [];

    var accessDenied = false;
    if ((data.type === 'secret' || data.type === 'private_visible') && !data.payload.users.some(function (u) { return u.user_id === username; })) {
      accessDenied = true;
    }

    if (accessDenied) {
      return res.status(403).json({ error: 'Access denied to private group' });
    }

    res.json(data);
  } catch (err) {
    console.error(`GET /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/groups/:groupId/light', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;

    // If username is provided, we need to check membership for private groups
    const checkMembership = username !== undefined;

    const { data, error } = await supabase2
      .from('groups')
      .select('*') // Need full record to check payload.users
      .eq('id', groupId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: error && error.message || 'Group not found' });
    }

    // Normalize payload
    if (!data.payload) data.payload = {};
    if (!Array.isArray(data.payload.users)) data.payload.users = [];

    // Determine access based on group type and membership
    let hasAccess = false;

    if (data.type === 'public') {
      // Public groups are always accessible
      hasAccess = true;
    } else if (checkMembership && username) {
      // For private groups, check if user is a member
      hasAccess = data.payload.users.some(function (u) {
        return u.user_id === username;
      });
    } else {
      // If no username provided for private group, deny access
      hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return the light version
    res.json({
      id: groupId,
      name: data.name,
      profile_pic: data.profile_url || data.profile_pic // Handle both field names
    });

  } catch (err) {
    console.error(`GET /groups/${req.params.groupId}/light error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// — CREATE group
app.post('/groups', async (req, res) => {
  try {
    const {
      name,
      initialAdmins = [],
      members = [],
      username,
      type = 'public',
      description = '',
      settings = { post_approval: false, event_calendar: true }
    } = req.body;

    if (!name || !username) {
      return res.status(400).json({ error: 'Missing name or username' });
    }

    // validate type
    if (!['public', 'private_visible', 'secret'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type setting' });
    }

    const users = [
      { user_id: username, role: 'admin', joined_at: new Date().toISOString(), badges: { helpful: 0 } },
      ...initialAdmins.map(function (u) { return { user_id: u, role: 'admin', joined_at: new Date().toISOString(), badges: { helpful: 0 } }; }),
      ...members.map(function (u) { return { user_id: u, role: 'member', joined_at: new Date().toISOString(), badges: { helpful: 0 } }; })
    ];

    const { data, error } = await supabase2
      .from('groups')
      .insert([{
        name,
        created_by: username,
        type, // store as `type`
        payload: {
          users,
          messages: [],
          description,
          settings,
          chat_count: 0,
          badges: {}
        }
      }])
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // notify members for private/secret groups (if any were added on creation)
    if ((type === 'private_visible' || type === 'secret') && members.length > 0) {
      const notification = {
        id: Date.now(),
        message: `You were added to the ${type} group "${name}" by ${username}.`,
        read: false,
        created_at: new Date().toISOString()
      };
      for (var i = 0; i < members.length; i++) {
        const member = members[i];
        await addNotification(member, notification);

        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('username', member)
          .single();

        if (user && user.email) {
          await sendNotificationEmail(
            user.email,
            `🎉 You’ve been added to ${name}!`,
            `
              <h2>Welcome to ${name}</h2>
              <p><strong>${username}</strong> just added you to the ${type} group <em>"${name}"</em>.</p>
              <p>This is your space to share, connect, and be part of something exciting.</p>
              <p><a href="https://textmob.web.app/group/${encodeURIComponent(name)}" style="color:#4F46E5; text-decoration:none; font-weight:bold;">Go to Group →</a></p>
            `
          );

        }

        io.to(`user_${member}`).emit('notification', notification);
      }
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — JOIN group
app.post('/groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type, name')
      .eq('id', groupId)
      .single();

    if (grpErr) return res.status(500).json({ error: grpErr.message });

    // normalize payload
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (typeof grp.payload.chat_count !== 'number') grp.payload.chat_count = 0;

    if (grp.type === 'secret') {
      return res.status(403).json({ error: 'Cannot join secret group without invitation' });
    }
    if (grp.payload.users.some(function (u) { return u.user_id === username; })) {
      return res.status(400).json({ error: 'Already a member' });
    }

    const updated = {
      ...grp.payload,
      users: [...grp.payload.users, { user_id: username, role: 'member', joined_at: new Date().toISOString(), badges: { helpful: 0 } }],
      chat_count: (grp.payload.chat_count || 0) + 1
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);

    if (updErr) return res.status(500).json({ error: updErr.message });

    const admins = updated.users.filter(function (u) { return u.role === 'admin'; }).map(function (u) { return u.user_id; });
    const notif = {
      id: Date.now(),
      message: `${username} joined the group.`,
      read: false,
      created_at: new Date().toISOString()
    };

    for (var j = 0; j < admins.length; j++) {
      const admin = admins[j];
      if (admin !== username) {
        await addNotification(admin, notif);
        io.to(`user_${admin}`).emit('notification', notif);
      }
    }

    io.to(`group_${groupId}`).emit('group_member_added', { user_id: username });
    res.json({ success: true });
  } catch (err) {
    console.error(`POST /groups/${req.params.groupId}/join error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// New server routes needed by AccountsCenter.jsx
// Add these to your main Express server file
// ─────────────────────────────────────────────────────────────────────────────

app.get("/account-stats", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is actually required" });

    // ── Mobcoins — reuse your existing /t/wallet logic ──────────
    let mobcoins = 0;
    try {
      const { data: walletUser } = await supabase
        .from("users")
        .select("mobcoins, username")
        .eq("username", username)
        .single();
      mobcoins = walletUser?.mobcoins || 0;
    } catch { /* non-fatal */ }

    // ── Followers + streak ────────────────────────────────────────
    let followers = 0;
    let postingStreak = 0;
    try {
      const { data: user } = await supabase
        .from("users")
        .select("followers, posting_streak")
        .eq("username", username)
        .single();
      followers = user?.followers?.length ?? 0;
      postingStreak = user?.posting_streak ?? 0;
    } catch { /* non-fatal */ }

    // ── Post count ────────────────────────────────────────────────
    let postCount = 0;
    try {
      const { count } = await supabase2
        .from("Posts")
        .select("id", { count: "exact", head: true })
        .eq("username", username);
      postCount = count || 0;
    } catch { /* non-fatal */ }

    // ── Hall of Fame rank — reuse your leaderboard cache ─────────
    // The leaderboard route already has the cache built and sorted.
    // We just call the same logic here instead of duplicating it.
    let rank = null;
    try {
      // Ensure cache is ready (same guard your /leaderboard uses)
      if (!isCacheInitialized) await updateCache();

      const { analytics = {} } = cache;
      const { topUsers7d = [] } = analytics;

      // topUsers7d is already sorted by score descending
      // Check if this user appears anywhere in it (not just top 5)
      // For rank we look at the full sorted list, not just top 5
      const allUsers = (cache.users || [])
        .map(u => {
          const entry = topUsers7d.find(t => t.username === u.username);
          return { username: u.username, score: entry?.score7d || 0 };
        })
        .sort((a, b) => b.score - a.score);

      const idx = allUsers.findIndex(u => u.username === username);
      if (idx !== -1) rank = idx + 1;
    } catch { /* non-fatal — rank stays null */ }

    res.json({
      mobcoins,
      followers,
      streak: postingStreak,
      post_count: postCount,
      rank,
    });
  } catch (err) {
    console.error("/account-stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /profile/:username/update-type ──────────────────────────────────────
// Switches profile_type between Individual and Organisation
app.post("/profile/:username/update-type", async (req, res) => {
  try {
    const { username } = req.params;
    const { profile_type } = req.body;

    if (!username) return res.status(400).json({ error: "Username required" });
    if (!profile_type || !["Individual", "Organisation"].includes(profile_type)) {
      return res.status(400).json({ error: "profile_type must be Individual or Organisation" });
    }

    const { error } = await supabase
      .from("users")
      .update({ profile_type })
      .eq("username", username);

    if (error) {
      console.error("/update-type DB error:", error);
      return res.status(500).json({ error: "Failed to update profile type" });
    }

    res.json({ success: true, profile_type });
  } catch (err) {
    console.error("/update-type error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// — ADD member
app.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, newMember, role = 'member' } = req.body;
    if (!username || !newMember || !['admin', 'mod', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Missing/invalid fields' });
    }

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type, name')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (typeof grp.payload.chat_count !== 'number') grp.payload.chat_count = 0;

    const userRole = grp.payload.users.find(function (u) { return u.user_id === username; });
    const userRoleVal = userRole ? userRole.role : null;
    const isAdminOrMod = userRoleVal === 'admin' || userRoleVal === 'mod';

    if (!grp.payload.users.some(function (u) { return u.user_id === username; })) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    if (grp.type === 'secret' && !isAdminOrMod) {
      return res.status(403).json({ error: 'Only admins can add to secret groups' });
    }
    if (grp.payload.users.some(function (u) { return u.user_id === newMember; })) {
      return res.status(400).json({ error: 'User already in group' });
    }

    const updated = {
      ...grp.payload,
      users: [...grp.payload.users, { user_id: newMember, role, joined_at: new Date().toISOString(), badges: { helpful: 0 } }],
      chat_count: (grp.payload.chat_count || 0) + 1
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);

    if (updErr) throw updErr;

    const notification = {
      id: Date.now(),
      message: `You were added to the ${grp.type} group "${grp.name}" by ${username} as ${role}.`,
      read: false,
      created_at: new Date().toISOString()
    };
    await addNotification(newMember, notification);

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('username', newMember)
      .single();

    if (user && user.email) {
      await sendNotificationEmail(
        user.email,
        `🎉 You've Been Added to ${grp.name}!`,
        `
          <h2>Welcome to <span style="color:#3b82f6;">${grp.name}</span></h2>
          <p>Hi ${user.fullname || user.username},</p>
          <p>${notification.message}</p>
          <p style="margin-top: 16px;">
            <a href="https://textmob.web.app/group/${encodeURIComponent(grp.name)}" 
               style="background:#3b82f6;color:#fff;padding:10px 18px;border-radius:6px;
                      text-decoration:none;font-weight:500;display:inline-block;">
              Open Group →
            </a>
          </p>
          <p style="margin-top: 24px; font-size: 14px; color: #555;">
            You're receiving this email because you’re part of the Textmob community.  
            Stay connected, share moments, and enjoy meaningful conversations.  
          </p>
        `
      );

    }

    io.to(`user_${newMember}`).emit('notification', notification);
    io.to(`group_${groupId}`).emit('group_member_added', { user_id: newMember, role });
    res.json({ newMember, role });
  } catch (err) {
    console.error(`POST /groups/${req.params.groupId}/members error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — ASSIGN role
app.post('/groups/:groupId/roles', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, targetUser, role } = req.body;
    if (!username || !targetUser || !['admin', 'mod', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Missing/invalid fields' });
    }

    const { data: grp, error } = await supabase2
      .from('groups')
      .select('payload')
      .eq('id', groupId)
      .single();

    if (error) throw error;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    if (!grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; })) {
      return res.status(403).json({ error: 'Only admins can assign roles' });
    }
    if (!grp.payload.users.some(function (u) { return u.user_id === targetUser; })) {
      return res.status(404).json({ error: 'Target user not in group' });
    }

    const updated = {
      ...grp.payload,
      users: grp.payload.users.map(function (u) {
        return u.user_id === targetUser ? { ...u, role } : u;
      })
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);

    if (updErr) throw updErr;

    const notif = {
      id: Date.now(),
      message: `${username} assigned you ${role} role in the group.`,
      read: false,
      created_at: new Date().toISOString()
    };
    await addNotification(targetUser, notif);
    io.to(`user_${targetUser}`).emit('notification', notif);
    io.to(`group_${groupId}`).emit('group_role_updated', { user_id: targetUser, role });

    res.json({ success: true, role });
  } catch (err) {
    console.error(`POST /groups/${groupId}/roles error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — SEND message
app.post(
  '/groups/:groupId/messages',
  upload.single('media'),
  async (req, res) => {
    const { groupId } = req.params;
    console.log(`POST /groups/${groupId}/messages`, { body: req.body, file: !!req.file });
    try {
      const { username, type = 'message', content = '' } = req.body;
      if (!username) return res.status(400).json({ error: 'Missing username' });
      if (!content && !req.file) return res.status(400).json({ error: 'Message or media required' });

      let media_url = null, media_public_id = null;
      if (req.file) {
        try {
          const up = await new Promise(function (resolve, reject) {
            cloudinary.uploader.upload_stream(
              { resource_type: 'auto', folder: 'textmob/groups' },
              function (error, result) {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(req.file.buffer);
          });
          media_url = up.secure_url;
          media_public_id = up.public_id;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({ error: 'Failed to upload media to Cloudinary' });
        }
      }

      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload')
        .eq('id', groupId)
        .single();

      if (grpErr) throw grpErr;

      if (!grp.payload) grp.payload = {};
      if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
      if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
      if (typeof grp.payload.chat_count !== 'number') grp.payload.chat_count = 0;

      const userRoleObj = grp.payload.users.find(function (u) { return u.user_id === username; });
      const userRole = userRoleObj ? userRoleObj.role : null;
      if (!userRole) return res.status(403).json({ error: 'Not a member' });

      const newMsg = {
        id: Date.now(),
        sender: username,
        type: req.file ? (content ? type : 'image') : type,
        content,
        media_url,
        media_public_id,
        created_at: new Date().toISOString(),
        seen: []
      };

      const updatedPayload = {
        ...grp.payload,
        messages: [...grp.payload.messages, newMsg],
        chat_count: (grp.payload.chat_count || 0) + 1
      };

      const { error: updErr } = await supabase2
        .from('groups')
        .update({ payload: updatedPayload })
        .eq('id', groupId);

      if (updErr) throw updErr;

      // emit message
      io.to(`group_${groupId}`)
        .emit('new_group_message', { message: newMsg, groupId: groupId });

      res.status(201).json(newMsg);
    } catch (err) {
      console.error(`POST /groups/${groupId}/messages error:`, err);
      res.status(500).json({ error: err.message });
    }
  }
);

// — MARK message seen
app.post('/groups/:groupId/messages/:msgId/seen', async (req, res) => {
  try {
    const { groupId, msgId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error } = await supabase2
      .from('groups')
      .select('payload')
      .eq('id', groupId)
      .single();

    if (error) throw error;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];

    if (!grp.payload.users.some(function (u) { return u.user_id === username; })) {
      return res.status(403).json({ error: 'Not a member' });
    }

    const msgIndex = grp.payload.messages.findIndex(function (m) { return String(m.id) === String(msgId); });
    if (msgIndex === -1) return res.status(404).json({ error: 'Message not found' });

    const currentSeen = grp.payload.messages[msgIndex].seen || [];
    const updatedSeen = currentSeen.filter(function (s) { return s.user_id !== username; }).concat([{ user_id: username, seen_at: new Date().toISOString() }]);
    const updatedMsg = {
      ...grp.payload.messages[msgIndex],
      seen: updatedSeen
    };
    const updatedMessages = [...grp.payload.messages];
    updatedMessages[msgIndex] = updatedMsg;

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: { ...grp.payload, messages: updatedMessages } })
      .eq('id', groupId);

    if (updErr) throw updErr;

    io.to(`group_${groupId}`).emit('group_message_seen', { msgId: parseInt(msgId, 10), user_id: username });
    res.json({ success: true });
  } catch (err) {
    console.error(`POST /groups/${groupId}/messages/${req.params.msgId}/seen error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — UPDATE group settings
app.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    // accept 'type' directly from body
    const { username, name, type: newType, description, settings } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type, created_by')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    const isAdmin = grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; });
    if (grp.type === 'secret' && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can modify secret group settings' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (newType && ['public', 'private_visible', 'secret'].includes(newType)) updates.type = newType;

    const payloadUpdates = {};
    if (description !== undefined) payloadUpdates.description = description;
    if (settings) {
      var currentSettings = grp.payload.settings || {};
      payloadUpdates.settings = { ...currentSettings, ...settings };
    }

    const fullPayload = { ...grp.payload, ...payloadUpdates };
    updates.payload = fullPayload;

    const { error: updErr } = await supabase2
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (updErr) throw updErr;

    res.json({ success: true });
  } catch (err) {
    console.error(`PUT /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — UPDATE profile pic
app.post(
  '/groups/:groupId/profile',
  upload.single('profile'),
  async (req, res) => {
    const { groupId } = req.params;
    console.log(`POST /groups/${groupId}/profile`, { body: req.body, file: !!req.file });
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: 'Missing username' });
      if (!req.file) return res.status(400).json({ error: 'No profile file uploaded' });

      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload, profile_public_id, type')
        .eq('id', groupId)
        .single();

      if (grpErr) throw grpErr;

      if (!grp.payload) grp.payload = {};
      if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

      const isAdmin = grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; });
      if (grp.type === 'secret' && !isAdmin) {
        return res.status(403).json({ error: 'Only admins can update secret group profile' });
      }

      if (grp.profile_public_id) {
        await cloudinary.uploader.destroy(grp.profile_public_id);
      }

      const up = await new Promise(function (resolve, reject) {
        cloudinary.uploader.upload_stream(
          { folder: 'textmob/group_profiles' },
          function (error, result) {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      const { data, error: updateErr } = await supabase2
        .from('groups')
        .update({
          profile_url: up.secure_url,
          profile_public_id: up.public_id
        })
        .eq('id', groupId)
        .select('profile_url')
        .single();

      if (updateErr) throw updateErr;

      io.to(`group_${groupId}`).emit('group_profile_updated', up.secure_url);
      res.json({ profile_url: up.secure_url });
    } catch (err) {
      console.error(`POST /groups/${groupId}/profile error:`, err);
      res.status(500).json({ error: err.message });
    }
  }
);

// — DELETE message
app.delete('/groups/:groupId/messages/:msgId', async (req, res) => {
  try {
    const { groupId, msgId } = req.params;
    const { username } = req.body;

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    const msg = grp.payload.messages.find(function (m) { return String(m.id) === String(msgId); });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const adminOrModObj = grp.payload.users.find(function (u) { return u.user_id === username && (u.role === 'admin' || u.role === 'mod'); });
    const isAdminOrMod = !!adminOrModObj;
    const isSender = msg.sender === username;
    if (!isAdminOrMod && !isSender) {
      return res.status(403).json({ error: 'Only admins, mods, or the message sender can delete this message' });
    }

    if (msg.media_public_id) {
      await cloudinary.uploader.destroy(msg.media_public_id, { resource_type: 'image' });
    }

    const { error: updErr } = await supabase2
      .from('groups')
      .update({
        payload: {
          ...grp.payload,
          messages: grp.payload.messages.filter(function (m) { return String(m.id) !== String(msgId); })
        }
      })
      .eq('id', groupId);

    if (updErr) throw updErr;

    io.to(`group_${groupId}`)
      .emit('group_message_deleted', { id: parseInt(msgId, 10) });

    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /groups/${req.params.groupId}/messages/${req.params.msgId} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — DELETE group
app.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('created_by, profile_public_id')
      .eq('id', groupId)
      .single();

    if (grpErr) throw grpErr;

    if (grp.created_by !== username) {
      return res.status(403).json({ error: 'Only the group owner can delete the group' });
    }

    if (grp.profile_public_id) {
      await cloudinary.uploader.destroy(grp.profile_public_id);
    }

    const { error: delErr } = await supabase2
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (delErr) throw delErr;

    io.to(`group_${groupId}`).emit('group_deleted', { groupId });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// — GET discoverable groups
app.get('/groups/discover', async (req, res) => {
  try {
    const { username, query: search = '', limit = 20 } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    // Fetch all groups first, then filter with JavaScript
    const { data, error } = await supabase2
      .from('groups')
      .select('*')
      .ilike('name', `%${search}%`)
      .limit(parseInt(limit) * 2); // Get extra to account for filtering

    if (error) return res.status(500).json({ error: error.message });

    // Filter out private/secret groups with JavaScript
    const discoverableGroups = (data || []).filter(group => {
      const privateTypes = ['secret', 'private', 'private_visible'];
      return !privateTypes.includes(group.type);
    });

    // Apply the actual limit after filtering
    const limitedGroups = discoverableGroups

    res.json(limitedGroups);
  } catch (err) {
    console.error('GET /groups/discover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// — GET main feed
app.get('/feed', async (req, res) => {
  try {
    const { username, limit = 50 } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: groups, error: groupsErr } = await supabase2
      .from('groups')
      .select('id')
      .or(`created_by.eq.${username},payload.users.user_id.eq.${username}`);

    if (groupsErr) throw groupsErr;

    const { data: personalPosts, error: perErr } = await supabase2
      .from('Posts')
      .select('*')
      .not('type', 'ilike', 'group-post-%')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (perErr) throw perErr;

    var groupPosts = [];
    if (groups && groups.length > 0) {
      for (var k = 0; k < groups.length; k++) {
        const g = groups[k];
        const { data: gp, error: gpErr } = await supabase2
          .from('Posts')
          .select('*, groups(name)')
          .eq('type', `group-post-${g.id}`)
          .order('created_at', { ascending: false });

        if (gpErr) continue;
        groupPosts = groupPosts.concat(gp.map(function (p) { return { ...p, group_name: p.groups ? p.groups.name : null }; }));
      }
    }

    const allPosts = [].concat(personalPosts || [], groupPosts);
    const ranked = allPosts.sort(function (a, b) {
      if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      var aLikes = a.likes ? a.likes.length : 0;
      var bLikes = b.likes ? b.likes.length : 0;
      return bLikes - aLikes;
    }).slice(0, parseInt(limit));

    res.json(ranked);
  } catch (err) {
    console.error('GET /feed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — GET group feed
app.get('/groups/:groupId/feed', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload, type')
      .eq('id', groupId)
      .single();

    if (grpErr) return res.status(404).json({ error: grpErr.message });

    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

    var accessDenied = false;
    if ((grp.type === 'private_visible' || grp.type === 'secret') && !grp.payload.users.some(function (u) { return u.user_id === username; })) {
      accessDenied = true;
    }
    if (accessDenied) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: posts, error } = await supabase2
      .from('Posts')
      .select('*')
      .eq('type', `group-post-${groupId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const rankedPosts = posts.sort(function (a, b) {
      if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      var aLikes = a.likes ? a.likes.length : 0;
      var bLikes = b.likes ? b.likes.length : 0;
      return bLikes - aLikes;
    });

    res.json(rankedPosts);
  } catch (err) {
    console.error(`GET /groups/${req.params.groupId}/feed error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — CREATE group post (no group_id column, behaves like /create-post)
app.post(
  '/groups/:groupId/posts',
  upload.array("media", 6),
  async (req, res) => {
    try {
      var groupId = req.params.groupId;
      var username = req.body.username;
      var text = req.body.text;
      var visib = req.body.visib || 'group';
      var activities = req.body.activities;
      var options = req.body.options;

      if (!username || !text) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // load group
      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload, type, name')
        .eq('id', groupId)
        .single();

      if (grpErr) return res.status(404).json({ error: 'Group not found' });

      if (!grp.payload) grp.payload = {};
      if (!Array.isArray(grp.payload.users)) grp.payload.users = [];

      var userRoleObj = grp.payload.users.find(function (u) { return u.user_id === username; });
      var userRole = userRoleObj ? userRoleObj.role : null;
      if (!userRole) return res.status(403).json({ error: 'Not a member' });

      var currentSettings = grp.payload.settings || {};
      if (currentSettings.post_approval && userRole !== 'admin' && userRole !== 'mod') {
        return res.status(403).json({ error: 'Post approval required' });
      }

      if ((grp.type === 'private_visible' || grp.type === 'secret') && !userRole) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Detect post type (poll vs post)
      var type = "post";
      if (options) {
        try {
          if (typeof options === "string") options = JSON.parse(options);
          if (Array.isArray(options) && options.length >= 2) {
            var validFormat = options.every(function (opt) {
              return typeof opt.id === "number" &&
                typeof opt.text === "string" &&
                Array.isArray(opt.votes);
            });
            if (validFormat) type = "poll";
            else options = null;
          } else options = null;
        } catch (parseErr) {
          options = null;
        }
      }

      // Hashtags
      var hashtags = [];
      var rawHashtags = text.match(/#\w+/g);
      if (rawHashtags && Array.isArray(rawHashtags)) {
        hashtags = rawHashtags;
      }

      // Mentions (@username), sanitized
      var rawMentions = text.match(/@\w+/g) || [];
      var mentions = rawMentions.map(function (m) {
        return m.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
      });

      // Upload media (Cloudinary)
      var mediaUrls = [];
      try {
        var filesArray = req.files ? req.files : [];
        mediaUrls = await Promise.all(
          filesArray.map(function (file) {
            return new Promise(function (resolve, reject) {
              var uploadStream = cloudinary.uploader.upload_stream(
                { folder: "post-media", resource_type: "auto" },
                function (error, result) {
                  if (error) return reject(error);
                  if (result && result.secure_url) return resolve(result.secure_url);
                  return reject(new Error("Cloudinary returned unexpected result"));
                }
              );
              streamifier.createReadStream(file.buffer).pipe(uploadStream);
            });
          })
        );
      } catch (uploadErr) {
        console.error("[group-post] media upload failed:", uploadErr);
        return res.status(500).json({ error: "Media upload failed" });
      }

      // Set final type for DB: polls stay 'poll', everything else becomes group-post-<groupId>
      var finalType = "";
      finalType = 'group-post-' + groupId;

      // Insert post into DB (NO group_id column)
      var { error: insertError, data } = await supabase2
        .from("Posts")
        .insert([{
          username: username,
          text: text,
          media: mediaUrls,
          likes: [],
          comments: [],
          hashtags: hashtags,
          visib: visib,
          type: finalType,
          options: options,
          activities: activities
        }])
        .select("*")
        .single();

      if (insertError) {
        console.error("[group-post] Error creating post:", insertError);
        return res.status(500).json({ error: "Failed to create post" });
      }

      // Award Mobcoins (best-effort)
      try {
        await updateMobcoins(
          username.split("@").pop().trim(),
          +10,
          true,
          "You just received 10 Mobcoins for creating a " + (type === 'poll' ? 'poll' : 'group post') + " on Textmob"
        );
      } catch (mobErr) {
        console.error("[group-post] updateMobcoins failed:", mobErr);
      }

      // Immediately respond to client
      res.json({ message: (type === "poll" ? "Poll" : "Group post") + " created successfully!" });

      // Background notifications & AI (non-blocking)
      (async function backgroundWork() {
        try {
          console.log("[group-post] starting backgroundWork for postId:", data.id);

          // notify group members
          var groupMembers = [];
          if (grp.payload && Array.isArray(grp.payload.users)) {
            for (var ii = 0; ii < grp.payload.users.length; ii++) {
              var u = grp.payload.users[ii];
              if (u.user_id !== username) groupMembers.push(u.user_id);
            }
          }

          for (var m = 0; m < groupMembers.length; m++) {
            var member = groupMembers[m];
            var notif = {
              id: Date.now(),
              message: username + " posted in " + grp.name,
              read: false,
              link: "/post/" + data.id,
              timestamp: new Date().toISOString()
            };
            try {
              await addNotification(member, notif);
            } catch (addNotifErr) {
              console.error("[group-post] addNotification failed for", member, addNotifErr);
            }

            try {
              var { data: user } = await supabase.from('users').select('email, payload').eq('username', member).single();
              if (user && user.payload && user.payload.opt_email && user.email) {
                await sendNotificationEmail(
                  user.email,
                  `📝 New Post in ${grp.name}`,
                  `
                  <h2>New Activity in <span style="color:#3b82f6;">${grp.name}</span></h2>
                  <p>Hi ${user.fullname || user.username},</p>
                  <p>${notif.message}</p>
                  <p style="margin-top: 16px;">
                    <a href="https://textmob.web.app/group/${encodeURIComponent(grp.name)}" 
                       style="background:#3b82f6;color:#fff;padding:10px 18px;border-radius:6px;
                              text-decoration:none;font-weight:500;display:inline-block;">
                      View Group →
                    </a>
                  </p>
                  <p style="margin-top: 24px; font-size: 14px; color: #555;">
                    Stay in the loop with Textmob—where your community connects, shares, and grows together.  
                  </p>
                `
                );

              }
            } catch (emailErr) {
              console.error("[group-post] checking user/email failed for", member, emailErr);
            }

            try {
              io.to("user_" + member).emit('notification', notif);
            } catch (emitErr) {
              console.error("[group-post] io.emit failed for", member, emitErr);
            }
          }

          // Mentions notifications + TextmobAI trigger
          var safeMediaTypes = [];
          var filesForTypes = req.files ? req.files : [];
          if (filesForTypes.length > 0) {
            safeMediaTypes = filesForTypes.map(function (f) {
              try { return f.mimetype.split("/")[0]; } catch (e) { return "image"; }
            });
          }

          for (var j = 0; j < mentions.length; j++) {
            var mentionedUser = mentions[j];
            try {
              var notification = {
                id: Date.now(),
                message: username + " mentioned you in a post",
                read: false,
                link: "/post/" + data.id,
                timestamp: new Date().toISOString()
              };
              await addNotification(mentionedUser, notification);
            } catch (addNotifErr2) {
              console.error("[group-post] addNotification failed for", mentionedUser, addNotifErr2);
            }

            try {
              if (mentionedUser && typeof mentionedUser === "string" && mentionedUser.toLowerCase() === "textmobai") {
                try {
                  await triggerAIReply(text, mediaUrls, safeMediaTypes, data.id, "post");
                } catch (aiErr) {
                  console.error("[group-post] triggerAIReply failed:", aiErr);
                }
              }
            } catch (detErr) {
              console.error("[group-post] error checking mentionedUser:", detErr);
            }
          }

          // emit group new_group_post
          try {
            io.to("group_" + groupId).emit('new_group_post', data);
          } catch (emitGroupErr) {
            console.error("[group-post] io.emit group failed:", emitGroupErr);
          }

          // update badges for sender within group payload (best-effort)
          var senderIndex = -1;
          if (grp.payload && Array.isArray(grp.payload.users)) {
            for (var k = 0; k < grp.payload.users.length; k++) {
              if (grp.payload.users[k].user_id === username) { senderIndex = k; break; }
            }
          }
          if (senderIndex !== -1) {
            var currentBadges = grp.payload.users[senderIndex].badges || {};
            var updatedBadges = { ...currentBadges, helpful: (currentBadges.helpful || 0) + 1 };
            grp.payload.users[senderIndex].badges = updatedBadges;
            try {
              await supabase2.from('groups').update({ payload: grp.payload }).eq('id', groupId);
            } catch (updErr) {
              console.error("[group-post] failed updating group badges:", updErr);
            }
          }

          console.log("[group-post] backgroundWork completed for postId:", data.id);
        } catch (bgErr) {
          console.error("[group-post] unexpected backgroundWork error:", bgErr);
        }
      })();

    } catch (error) {
      console.error("[group-post] Post Creation Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// Socket.IO
io.on('connection', function (socket) {
  socket.on('join_group', function ({ groupId }) { socket.join(`group_${groupId}`); });
  socket.on('leave_group', function ({ groupId }) { socket.leave(`group_${groupId}`); });
  socket.on('join_user', function ({ username }) { socket.join(`user_${username}`); });
  socket.on('mark_message_seen', function ({ groupId, msgId, username }) {
    // Proxy to mark seen
    const body = { username };
    console.log('Mark seen:', { groupId, msgId, username });
    // If you want, you can call the seen endpoint here or do DB updates.
  });
});

// Route: POST /t/send-mobcoins
app.post("/t/send-mobcoins", async (req, res) => {
  const { fromId, toIds, amount } = req.body;

  if (!fromId || !toIds || !Array.isArray(toIds) || toIds.length === 0 || !amount || amount <= 0)
    return res.status(400).send("Invalid transfer data");

  try {
    // Fetch sender's balance
    const { data: sender, error: senderErr } = await supabase
      .from("users")
      .select("mobcoins")
      .eq("username", fromId)
      .single();

    if (senderErr || !sender) return res.status(404).send("Sender not found");

    const totalAmount = amount * toIds.length;
    if ((sender.mobcoins || 0) < totalAmount)
      return res.status(400).send("Insufficient balance for bulk transaction");

    // Verify all recipients exist
    const { data: recipients, error: recipErr } = await supabase
      .from("users")
      .select("username")
      .in("username", toIds);

    if (recipErr) return res.status(500).send("Error verifying recipients");
    const validRecipients = recipients.map(r => r.username);
    const invalidRecipients = toIds.filter(id => !validRecipients.includes(id));
    if (invalidRecipients.length > 0)
      return res.status(404).send(`Recipients not found: ${invalidRecipients.join(", ")}`);

    // Proceed with bulk transfer
    await updateMobcoins(fromId, -totalAmount, true, `You sent ${amount} to ${toIds.length} users`);
    for (const toId of toIds) {
      await updateMobcoins(toId, amount, true, `You received ${amount} from ${fromId}`);
    }

    return res.json({ success: true, message: `Mobcoins sent to ${toIds.length} recipients` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Route: GET /t/wallet?userId=abc
app.get("/t/wallet", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send("Missing userId");

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("mobcoins, fullname, username")
      .eq("username", userId)
      .single();

    if (error || !user) return res.status(404).send("User not found");

    return res.json({
      username: user.username,
      fullname: user.fullname,
      mobcoins: user.mobcoins,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

// Utility function to map organization to provider key
function getProviderKeyFromOrg(org) {
  if (!org) return 'unknown';
  const orgLower = org.toLowerCase();
  if (orgLower.includes('mtn')) return 'mtn';
  if (orgLower.includes('airtel')) return 'airtel';
  if (orgLower.includes('globacom') || orgLower.includes('glo')) return 'glo';
  if (orgLower.includes('9mobile') || orgLower.includes('etisalat')) return 'nine';
  return 'unknown';
}

app.get('/api/detect-operator', async (req, res) => {
  try {
    // Extract client IP
    let clientIp = 'unknown';
    if (req.headers['x-forwarded-for']) {
      clientIp = req.headers['x-forwarded-for'].split(',')[0].trim();
    } else if (req.headers['x-real-ip']) {
      clientIp = req.headers['x-real-ip'];
    } else if (req.connection && req.connection.remoteAddress) {
      clientIp = req.connection.remoteAddress;
    } else if (req.socket && req.socket.remoteAddress) {
      clientIp = req.socket.remoteAddress;
    }

    // Handle IPv6 localhost case
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
      clientIp = '197.210.0.1'; // Use a test Nigerian IP for local development
    }

    // Remove IPv6 prefix if present
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    // Query ipapi.co
    const ipapiResponse = await axios.get(`https://ipapi.co/${encodeURIComponent(clientIp)}/json/`, {
      timeout: 5000, // Add timeout to prevent hanging
    });
    const infoJson = ipapiResponse.data;

    // Handle ipapi.co error response
    if (infoJson.error) {
      throw new Error(infoJson.reason || 'ipapi.co API error');
    }

    // Extract organization (fallback to multiple fields)
    const org = infoJson.org || infoJson.isp || infoJson.asn || 'unknown';
    const key = getProviderKeyFromOrg(org);

    // Log for debugging
    console.log('IP:', clientIp, 'Org:', org, 'Provider Key:', key);

    // Return structured response
    res.json({
      key: key,
      org: org,
      ip: clientIp,
      raw: infoJson,
    });
  } catch (error) {
    console.error('Error detecting operator:', error.message);
    res.status(500).json({
      key: 'unknown',
      org: null,
      ip: null,
      raw: { error: error.message },
    });
  }
});

// Route: POST /t/reward-user (e.g. admin or system trigger)
app.post("/t/reward-user", async (req, res) => {
  const { userId, amount, reason } = req.body;
  if (!userId || !amount) return res.status(400).send("Missing userId or amount");

  try {
    const newBal = await updateMobcoins(userId, amount, true, reason || "Reward");
    return res.json({ success: true, newBalance: newBal });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'newindex.html'));
});

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

