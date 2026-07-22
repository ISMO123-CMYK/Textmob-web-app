/**
 * USELESS ENDPOINTS
 * 
 * These endpoints are NOT called by any frontend (web or mobile).
 * They are moved here for reference but not loaded by the server.
 * 
 * Categories:
 *   A — Legacy chat (replaced by Louda)
 *   B — Admin pages (no frontend UI)
 *   C — Groups feature (no client UI)
 *   D — Unused utility endpoints
 *   E — Legacy/duplicate endpoints
 */

// ============================================================
// CATEGORY D: Unused utility endpoints
// ============================================================

// GET /api/turn-credentials
app.get("/api/turn-credentials", async (req, res) => {
  try {
    const METERED_SECRET = process.env.METERED_SECRET || "48g6aAx6fyU5JdRdhqkQgiBJ7zc";
    const METERED_ID = process.env.METERED_ID || "textmob";
    const url = `https://${METERED_ID}.metered.live/api/v1/turn/credentials?secret=${METERED_SECRET}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.json({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TURN credentials error:", error.message);
    res.json({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  }
});

// GET /users/check-milestone
app.get("/users/check-milestone", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, fullname, username, created_at")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch users" });
    const totalUsers = users.length;
    const milestone = totalUsers % 100 === 0 && totalUsers !== 0;
    res.json({ users, totalUsers, showCelebration: milestone, celebrationTimestamp: milestone ? new Date() : null });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, fullname, profile_pic, profile_type, friends, followers, biography");
    if (error) return res.status(500).json({ error: "Error fetching users" });
    return res.json(data);
  } catch (err) {
    console.error("Users route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /quick-profile/:username
app.get("/quick-profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { data: user, error } = await supabase
      .from("users")
      .select("fullname, username, profile_pic, verified")
      .eq("username", username)
      .single();
    if (error || !user) {
      return res.json({ profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg', notifications: [], error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /notifications (old, replaced by /get-notifications)
app.get("/notifications", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();
    if (fetchError) return res.status(500).json({ error: "Failed to fetch notifications" });
    const unread = (user.notifications || []);
    res.json({ unread });
  } catch (err) {
    console.error("Error in get-notifications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /notifications-count (old, replaced by client-side count)
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
    const unreadCount = (user.notifications || []).filter(n => !n.read).length;
    res.json({ count: unreadCount });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /feed-sparks (old, replaced by /get-sparks)
app.get("/feed-sparks", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("friends, following, followers")
      .eq("username", username)
      .single();
    if (userError || !user) return res.status(404).json({ error: "User not found" });
    const allTargets = [...([`${username}`]), ...(user.friends || []), ...(user.following || [])];
    if (allTargets.length === 0) return res.json([]);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("Sparks")
      .select("*")
      .in("username", allTargets)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to fetch sparks feed" });
    if (!data || data.length === 0) return res.json([]);
    res.json(data);
  } catch (error) {
    console.error("Feed Sparks Catch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /feed-contacts-with-meta (old chat contacts feed)
app.get("/feed-contacts-with-meta", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });
    let usernamesToFetch;
    if (["textmobai", "textmobofficial", "askify"].includes(username)) {
      usernamesToFetch = ["textmobofficial", "textmobai", "askify"];
      if (userCache.length > 0) {
        usernamesToFetch.push(...userCache.map(u => u.username));
      } else {
        const { data: allUsers, error: allError } = await supabase.from("users").select("username");
        if (allError) return res.status(500).json({ error: "Failed to fetch all users" });
        usernamesToFetch.push(...allUsers.map(u => u.username));
      }
    } else {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("friends,followers,following")
        .eq("username", username)
        .single();
      if (userError || !user) return res.status(404).json({ error: "User not found" });
      usernamesToFetch = [username, "textmobofficial", "textmobai", "askify", ...(user.friends || []), ...(user.followers || []), ...(user.following || [])];
    }
    const uniqueUsernames = [...new Set(usernamesToFetch)];
    let profiles;
    if (userCache.length > 0) {
      profiles = userCache.filter(user => uniqueUsernames.includes(user.username));
    } else {
      const { data: dbProfiles, error: profileError } = await supabase
        .from("users")
        .select("username,fullname,profile_pic")
        .in("username", uniqueUsernames);
      if (profileError) return res.status(500).json({ error: "Failed to fetch profiles" });
      profiles = dbProfiles;
    }
    const metadata = {};
    const chatIds = uniqueUsernames.filter(u => u !== username).map(u => normalizeChatId(username, u));
    const { data: lastMessages, error: msgError } = await supabase
      .from("Messages")
      .select("sender,receiver,chat_id,message,timestamp,type,media_url,media_type,status,read")
      .in("chat_id", chatIds)
      .order("timestamp", { ascending: false });
    if (msgError) console.error("Error fetching last messages:", msgError);
    const lastMsgByChat = {};
    if (lastMessages) {
      lastMessages.forEach(msg => { if (!lastMsgByChat[msg.chat_id]) lastMsgByChat[msg.chat_id] = msg; });
    }
    const { data: unreadMessages, error: unreadError } = await supabase
      .from("Messages")
      .select("receiver,chat_id")
      .eq("receiver", username)
      .eq("read", false)
      .in("chat_id", chatIds);
    if (unreadError) console.error("Error fetching unread counts:", unreadError);
    const unreadByChat = {};
    if (unreadMessages) {
      unreadMessages.forEach(msg => { unreadByChat[msg.chat_id] = (unreadByChat[msg.chat_id] || 0) + 1; });
    }
    uniqueUsernames.forEach(contactUsername => {
      if (contactUsername === username) return;
      const chatId = normalizeChatId(username, contactUsername);
      metadata[contactUsername] = { lastMsg: lastMsgByChat[chatId] || null, unreadCount: unreadByChat[chatId] || 0 };
    });
    return res.json({ contacts: profiles, metadata });
  } catch (error) {
    console.error("Feed Contacts With Meta Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /get-user-postse (typo version)
app.get('/get-user-postse', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const { data, error } = await supabase2
      .from('Posts')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /get-user-friends
app.get('/get-user-friends', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('friends')
      .eq('username', username)
      .single();
    if (uErr) throw uErr;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!Array.isArray(user.friends) || user.friends.length === 0) return res.json([]);
    const { data: friends, error: fErr } = await supabase
      .from('users')
      .select('fullname, username, profile_pic, friends, followers, profile_type')
      .in('username', user.friends);
    if (fErr) throw fErr;
    res.json(friends);
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// GET /get-all-media
app.get("/get-all-media", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });
    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, followers, following")
      .eq("username", username)
      .single();
    if (youErr || !you) return res.status(404).json({ error: "User not found" });
    const { friends = [], followers = [], following = [] } = you;
    const { data: posts = [], error: postsErr } = await supabase2
      .from("Posts")
      .select("media, likes, comments, username");
    if (postsErr) throw postsErr;
    const own = [], liked = [], commented = [];
    for (const p of posts) {
      const mArr = Array.isArray(p.media) ? p.media : [];
      if (p.username === username) own.push(...mArr);
      if (Array.isArray(p.likes) && p.likes.includes(username)) liked.push(...mArr);
      if (Array.isArray(p.comments) && p.comments.some(c => c.username === username)) commented.push(...mArr);
    }
    const fetchPics = async list => {
      if (!list.length) return [];
      const { data, error } = await supabase.from("users").select("profile_pic").in("username", list);
      if (error) throw error;
      return data.map(u => u.profile_pic).filter(Boolean);
    };
    const [friendsPics, followersPics, followingPics] = await Promise.all([
      fetchPics(friends), fetchPics(followers), fetchPics(following),
    ]);
    res.json({ own, liked, commented, friends: friendsPics, followers: followersPics, following: followingPics });
  } catch (err) {
    console.error("Error in /get-all-media:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /get-user-following
app.get('/get-user-following', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const { data: user, error: uErr } = await supabase
      .from('users').select('following').eq('username', username).single();
    if (uErr) throw uErr;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!Array.isArray(user.following) || user.following.length === 0) return res.json([]);
    const { data: followers, error: fErr } = await supabase
      .from('users').select('fullname, username, profile_pic, friends, followers, profile_type')
      .in('username', user.following);
    if (fErr) throw fErr;
    res.json(followers);
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /get-user-followers
app.get('/get-user-followers', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const { data: user, error: uErr } = await supabase
      .from('users').select('followers').eq('username', username).single();
    if (uErr) throw uErr;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!Array.isArray(user.followers) || user.followers.length === 0) return res.json([]);
    const { data: followers, error: fErr } = await supabase
      .from('users').select('fullname, username, profile_pic, friends, followers, profile_type')
      .in('username', user.followers);
    if (fErr) throw fErr;
    res.json(followers);
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /get-user-hashtags
app.get('/get-user-hashtags', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const { data: posts, error } = await supabase2
      .from('Posts').select('text').eq('username', username);
    if (error) throw error;
    const tagSet = new Set();
    const regex = /#([A-Za-z0-9_]+)/g;
    posts.forEach(p => {
      let m;
      while ((m = regex.exec(p.text || ''))) tagSet.add(m[1]);
    });
    res.json(Array.from(tagSet));
  } catch (err) {
    console.error('Error extracting hashtags:', err);
    res.status(500).json({ error: 'Failed to fetch hashtags' });
  }
});

// GET /app (redirect to APK)
app.get('/app', function (req, res) {
  res.redirect('https://github.com/ISMO123-CMYK/Textmob-web-app/raw/refs/heads/main/thetextmobapp.apk');
});

// GET /default-avatar
app.get('/default-avatar', (req, res) => {
  res.redirect(301, 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg');
});

// GET /about
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

// GET /ai/daily-post
app.get("/ai/daily-post", async (req, res) => {
  console.log("TextmobAI daily post created!");
  return res.json({ success: true });
});

// POST /summarize-bio
app.post('/summarize-bio', async (req, res) => {
  // ... (AI bio summarization - unused)
  res.json({ summary: '' });
});

// GET /posts-by-hashtag
app.get("/posts-by-hashtag", async (req, res) => {
  try {
    const { hashtag } = req.query;
    if (!hashtag) return res.status(400).json({ error: "Hashtag is required" });
    const { data, error } = await supabase2.from("Posts").select("*").ilike("text", `%#${hashtag}%`);
    if (error) return res.status(500).json({ error: "Failed to fetch posts" });
    const regex = new RegExp(`(^|\\s)#${hashtag}(\\s|$|[^\\w])`, "i");
    const filtered = data.filter(post => regex.test(post.text));
    if (filtered.length === 0) return res.json({ message: "No posts found for this exact hashtag" });
    res.json({ posts: filtered });
  } catch (error) {
    console.error("Error in posts/hashtag endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /generate-image (AI image generation)
app.post("/generate-image", async (req, res) => {
  const prompt = req.body?.prompt?.trim();
  if (!prompt) return res.status(400).json({ error: "prompt is required" });
  const apiKey = 'AIzaSyAiGxu2rodailKd-6BgaK7qTUsqMfu2kkg';
  if (!apiKey) return res.status(500).json({ error: "Server misconfigured" });
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
    });
    res.json({ image: response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null });
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// ============================================================
// CATEGORY B: Admin endpoints (no frontend UI)
// ============================================================

// GET /admin-dashboard
app.get('/admin-dashboard', async (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== 'secret_admin_key') return res.status(403).send('Unauthorized');
  let userCount, postCount, groupCount, onlineCount, cloudinaryUsage;
  try { userCount = await getUserCount(); } catch { userCount = 'N/A'; }
  try { postCount = await getPostCount(); } catch { postCount = 'N/A'; }
  try { groupCount = await getGroupCount(); } catch { groupCount = 'N/A'; }
  onlineCount = 0;
  try { cloudinaryUsage = await getCloudinaryUsage(); } catch { cloudinaryUsage = { storage: 'N/A', assets: 'N/A' }; }
  const lastUpdated = new Date().toISOString();
  const html = `<!DOCTYPE html><html><head><title>Admin Dashboard</title></head><body><h1>Admin Dashboard</h1>
    <p><b>Total Users:</b> ${userCount}</p><p><b>Total Posts:</b> ${postCount}</p>
    <p><b>Total Groups:</b> ${groupCount}</p><p><b>Online Users:</b> ${onlineCount}</p>
    <p><b>Cloudinary Storage Used:</b> ${cloudinaryUsage.storage} GB</p>
    <p><b>Cloudinary Assets:</b> ${cloudinaryUsage.assets}</p>
    <p><b>Last Updated:</b> ${lastUpdated}</p>
    <p><a href="/admin-dashboard?key=${adminKey}">Refresh</a></p></body></html>`;
  res.set('Cache-Control', 'no-store');
  res.send(html);
});

// GET /api/admin/payouts
app.get("/api/admin/payouts", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('redemption_queue')
      .select('*, users(username, fullname, profile_pic)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Admin payouts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/payout/update
app.post("/api/admin/payout/update", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: "ID and status required" });
    const { data: payout, error: fetchError } = await supabase
      .from('redemption_queue')
      .select('*, users(username, email, fullname)')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    const { error: updateError } = await supabase
      .from('redemption_queue')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;
    const user = payout.users;
    if (user && user.username) {
      const msg = status === 'COMPLETED'
        ? `Your redemption of ${payout.coin_amount} Mobcoins was processed!`
        : `Your redemption request has been rejected.`;
      const subject = status === 'COMPLETED' ? "Redemption Successful" : "Redemption Update";
      await triggerNotification(user.username, 'mobcoins', { msg, subject, html: msg, link: "/wallet" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update payout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/verification-requests
app.get("/api/admin/verification-requests", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('id, created_at, users(username)')
      .eq('status', 'PENDING');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/verification-update
app.post("/api/admin/verification-update", async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !['ACCEPTED', 'REJECTED'].includes(status)) return res.status(400).json({ error: "Invalid request" });
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'ACCEPTED') {
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      updates.verified_until = oneMonthFromNow.toISOString();
    }
    const { data: request, error: updateError } = await supabase
      .from('verification_requests')
      .update(updates)
      .eq('id', id)
      .select('user_id, users(username)')
      .single();
    if (updateError) throw updateError;
    if (status === 'ACCEPTED') {
      await triggerNotification(request.users.username, 'verification', { msg: "You have been verified!", subject: "Verification Accepted!", html: `Hi @${request.users.username},<br><br>You are now verified!`, link: "/accountscenter" });
    } else {
      await triggerNotification(request.users.username, 'verification', { msg: "Your verification was rejected.", subject: "Verification Update", html: `Hi @${request.users.username},<br><br>Please ensure you meet all criteria.`, link: "/accountscenter" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/admin/user/toggle-status
app.post("/api/admin/user/toggle-status", async (req, res) => {
  try {
    const { userId, disabled } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const { error } = await supabase.from('users').update({ disabled: !!disabled }).eq('id', userId);
    if (error) throw error;
    res.json({ success: true, disabled: !!disabled });
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/user/update-coins
app.post("/api/admin/user/update-coins", async (req, res) => {
  try {
    const { userId, mobcoins } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const { error } = await supabase.from('users').update({ mobcoins: parseInt(mobcoins) || 0 }).eq('id', userId);
    if (error) throw error;
    res.json({ success: true, mobcoins });
  } catch (err) {
    console.error('Update coins error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/trigger-weekly-recap
app.post("/admin/trigger-weekly-recap", express.json(), async (req, res) => {
  try {
    const { key, username } = req.body || {};
    if (key !== 'secret_admin_key') return res.status(403).json({ error: 'Unauthorized' });
    if (username) {
      await sendWeeklyRecapEmail(username);
      return res.json({ ok: true, message: `Recap sent to ${username}` });
    }
    processAllWeeklyRecaps();
    res.json({ ok: true, message: 'Weekly recap cycle started for all users' });
  } catch (err) {
    res.status(500).json({ error: err?.message });
  }
});

// GET /api/weekly-recap-status
app.get("/api/weekly-recap-status", (req, res) => {
  res.json({ weekKey: getWeekKey(), usersSent: recapWeekSent.size });
});

// ============================================================
// CATEGORY E: Legacy/duplicate endpoints
// ============================================================

// POST /connect (legacy, replaced by /follow + /friend)
app.post("/connect", async (req, res) => {
  try {
    const { currentUsername, targetUsername } = req.body;
    if (!currentUsername || !targetUsername) return res.status(400).json({ error: "Both currentUsername and targetUsername are required" });
    const { data: currentUser, error: currError } = await supabase
      .from("users").select("username, friends, following, profile_type").eq("username", currentUsername).single();
    if (currError || !currentUser) return res.status(404).json({ error: "Current user not found" });
    const { data: targetUser, error: targetError } = await supabase
      .from("users").select("username, profile_type, followers, friends, email").eq("username", targetUsername).single();
    if (targetError || !targetUser) return res.status(404).json({ error: "Target user not found" });
    currentUser.friends = currentUser.friends || [];
    currentUser.following = currentUser.following || [];
    targetUser.followers = targetUser.followers || [];
    targetUser.friends = targetUser.friends || [];
    const targetProfileType = targetUser.profile_type.toLowerCase();
    let action;
    if (targetProfileType === "organisation") {
      const alreadyFollowing = targetUser.followers.includes(currentUsername);
      if (alreadyFollowing) {
        targetUser.followers = targetUser.followers.filter(u => u !== currentUsername);
        currentUser.following = currentUser.following.filter(u => u !== targetUsername);
        action = "unfollowed";
        await addNotification(targetUsername, { id: Date.now(), message: `${currentUsername} unfollowed you.`, read: false, link: `/@${currentUsername}`, timestamp: new Date().toISOString(), type: 'follow', sender: currentUsername });
      } else {
        targetUser.followers.push(currentUsername);
        currentUser.following.push(targetUsername);
        action = "followed";
        await addNotification(targetUsername, { id: Date.now(), message: `${currentUsername} followed you.`, read: false, link: `/@${currentUsername}`, timestamp: new Date().toISOString(), type: 'follow', sender: currentUsername });
        if (targetUser.email) {
          await sendNotificationEmail(targetUser.email, `${currentUsername} followed your page`, `<p>${currentUsername} just followed your page on Textmob.</p>`);
        }
      }
      await supabase.from("users").update({ followers: targetUser.followers }).eq("username", targetUsername);
      await supabase.from("users").update({ following: currentUser.following }).eq("username", currentUsername);
      res.json({ message: `Successfully ${action} the organisation.` });
    } else if (targetProfileType === "individual") {
      const alreadyFriends = currentUser.friends.includes(targetUsername);
      if (alreadyFriends) {
        currentUser.friends = currentUser.friends.filter(u => u !== targetUsername);
        targetUser.friends = targetUser.friends.filter(u => u !== currentUsername);
        action = "unfriended";
        await addNotification(targetUsername, { id: Date.now(), message: `${currentUsername} unfriended you.`, read: false, link: `/@${currentUsername}`, timestamp: new Date().toISOString(), type: 'connection', sender: currentUsername });
      } else {
        currentUser.friends.push(targetUsername);
        targetUser.friends.push(currentUsername);
        action = "friended";
        await addNotification(targetUsername, { id: Date.now(), message: `${currentUsername} friended you.`, read: false, link: `/@${currentUsername}`, timestamp: new Date().toISOString(), type: 'connection', sender: currentUsername });
        if (targetUser.email) {
          await sendNotificationEmail(targetUser.email, `${currentUsername} added you as a friend`, `<p>${currentUsername} added you as a friend on Textmob.</p>`);
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

// GET /week
app.get('/week', async function (req, res) {
  res.json({ week: getWeekKey() });
});

// GET /online-users
app.get('/online-users', (req, res) => {
  res.json({ online: Object.keys(onlineUsers).length });
});

// POST /t/reward-user
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

// GET /api/detect-operator
app.get('/api/detect-operator', async (req, res) => {
  try {
    let clientIp = 'unknown';
    if (req.headers['x-forwarded-for']) clientIp = req.headers['x-forwarded-for'].split(',')[0].trim();
    else if (req.headers['x-real-ip']) clientIp = req.headers['x-real-ip'];
    else if (req.connection && req.connection.remoteAddress) clientIp = req.connection.remoteAddress;
    if (clientIp === '::1' || clientIp === '127.0.0.1') clientIp = '197.210.0.1';
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');
    const ipapiResponse = await axios.get(`https://ipapi.co/${encodeURIComponent(clientIp)}/json/`, { timeout: 5000 });
    const infoJson = ipapiResponse.data;
    if (infoJson.error) throw new Error(infoJson.reason || 'ipapi.co API error');
    const org = infoJson.org || infoJson.isp || infoJson.asn || 'unknown';
    const key = getProviderKeyFromOrg(org);
    res.json({ key, org, ip: clientIp, raw: infoJson });
  } catch (error) {
    res.status(500).json({ key: 'unknown', org: null, ip: null, raw: { error: error.message } });
  }
});

// ============================================================
// CATEGORY A: Legacy chat (replaced by Louda)
// ============================================================

// GET /get-last-message
app.get("/get-last-message", async (req, res) => {
  try {
    const { username, contact } = req.query;
    if (!username || !contact) return res.status(400).json({ error: "Missing username or contact" });
    const chatId = normalizeChatId(username, contact);
    const { data, error } = await supabase
      .from("Messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("timestamp", { ascending: false })
      .limit(1);
    if (error) throw error;
    res.json(data && data.length > 0 ? data[0] : null);
  } catch (err) {
    res.status(500).json({ error: "Failed to get last message" });
  }
});

// DELETE /delete-message/:id
app.delete('/delete-message/:id', async (req, res) => {
  try {
    const messageId = req.params.id;
    const { username } = req.body;
    if (!messageId || !username) return res.status(400).json({ error: "Message ID and username required" });
    const { data: msg, error: fetchErr } = await supabase
      .from('Messages')
      .select('*')
      .eq('id', messageId)
      .single();
    if (fetchErr || !msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender !== username) return res.status(403).json({ error: 'Not authorized to delete this message' });
    const { error: deleteErr } = await supabase.from('Messages').delete().eq('id', messageId);
    if (deleteErr) throw deleteErr;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /chat
app.post('/chat', async (req, res) => {
  try {
    const { username, contact } = req.body;
    if (!username || !contact) return res.status(400).json({ error: 'Missing username or contact' });
    const { data: messages, error } = await supabase
      .from('Messages')
      .select('*')
      .or(`and(sender.eq.${username},receiver.eq.${contact}),and(sender.eq.${contact},receiver.eq.${username})`)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    res.json(messages || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /send-message
app.post('/send-message', upload.single('file'), async (req, res) => {
  try {
    const { sender, receiver, message, type } = req.body;
    if (!sender || !receiver) return res.status(400).json({ error: 'Missing sender or receiver' });
    const chatId = normalizeChatId(sender, receiver);
    let media_url = null;
    if (req.file) {
      const up = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: 'textmob/chat' }, (error, result) => {
          if (error) reject(error); else resolve(result);
        }).end(req.file.buffer);
      });
      media_url = up.secure_url;
    }
    const newMsg = { sender, receiver, chat_id: chatId, message, type: type || 'text', media_url, timestamp: new Date().toISOString(), read: false };
    const { error } = await supabase.from('Messages').insert([newMsg]);
    if (error) throw error;
    io.to(`user_${receiver}`).emit('new_message', newMsg);
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /get-messages
app.get('/get-messages', async function (req, res) {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data, error } = await supabase
      .from('Messages')
      .select('*')
      .or(`sender.eq.${username},receiver.eq.${username}`)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /search-messages
app.get('/search-messages', async (req, res) => {
  try {
    const { username, query } = req.query;
    if (!username || !query) return res.status(400).json({ error: 'Missing username or query' });
    const { data, error } = await supabase
      .from('Messages')
      .select('*')
      .or(`sender.eq.${username},receiver.eq.${username}`)
      .ilike('message', `%${query}%`)
      .limit(50);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /link (link metadata fetcher)
app.get("/link", async function (req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });
    const response = await axios.get(url, { timeout: 5000, responseType: 'text' });
    const html = response.data;
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    const description = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
    const image = (html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
    res.json({ title, description, image });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch link metadata" });
  }
});

// ============================================================
// CATEGORY C: Groups feature (no client UI)
// ============================================================

// GET /groups
app.get('/groups', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data, error } = await supabase2.from('groups').select('*');
    if (error) return res.status(500).json({ error: error.message });
    const filteredGroups = (data || []).filter(function (group) {
      if (!group) return false;
      const users = (group.payload && Array.isArray(group.payload.users)) ? group.payload.users : [];
      const isPublicGroup = group.type === 'public';
      const isPrivateGroup = ['secret', 'private', 'private_visible'].includes(group.type);
      const isGroupMember = users.some(function (u) { return u.user_id === username; });
      return isPublicGroup || (isPrivateGroup && isGroupMember);
    });
    res.json(filteredGroups);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /groups/:groupId
app.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data, error } = await supabase2.from('groups').select('*').eq('id', groupId).single();
    if (error) return res.status(404).json({ error: error.message });
    if (!data.payload) data.payload = {};
    if (!Array.isArray(data.payload.users)) data.payload.users = [];
    var accessDenied = false;
    if ((data.type === 'secret' || data.type === 'private_visible') && !data.payload.users.some(function (u) { return u.user_id === username; })) {
      accessDenied = true;
    }
    if (accessDenied) return res.status(403).json({ error: 'Access denied to private group' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /groups (CREATE group)
app.post('/groups', async (req, res) => {
  try {
    const { name, initialAdmins = [], members = [], username, type = 'public', description = '', settings = { post_approval: false, event_calendar: true } } = req.body;
    if (!name || !username) return res.status(400).json({ error: 'Missing name or username' });
    if (!['public', 'private_visible', 'secret'].includes(type)) return res.status(400).json({ error: 'Invalid type setting' });
    const users = [
      { user_id: username, role: 'admin', joined_at: new Date().toISOString(), badges: { helpful: 0 } },
      ...initialAdmins.map(function (u) { return { user_id: u, role: 'admin', joined_at: new Date().toISOString(), badges: { helpful: 0 } }; }),
      ...members.map(function (u) { return { user_id: u, role: 'member', joined_at: new Date().toISOString(), badges: { helpful: 0 } }; })
    ];
    const { data, error } = await supabase2.from('groups').insert([{ name, created_by: username, type, payload: { users, messages: [], description, settings, chat_count: 0, badges: {} } }]).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    // Notifications for members...
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /groups/:groupId/join
app.post('/groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, type, name').eq('id', groupId).single();
    if (grpErr) return res.status(500).json({ error: grpErr.message });
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (grp.type === 'secret') return res.status(403).json({ error: 'Cannot join secret group without invitation' });
    if (grp.payload.users.some(function (u) { return u.user_id === username; })) return res.status(400).json({ error: 'Already a member' });
    const updated = { ...grp.payload, users: [...grp.payload.users, { user_id: username, role: 'member', joined_at: new Date().toISOString(), badges: { helpful: 0 } }], chat_count: (grp.payload.chat_count || 0) + 1 };
    const { error: updErr } = await supabase2.from('groups').update({ payload: updated }).eq('id', groupId);
    if (updErr) return res.status(500).json({ error: updErr.message });
    const admins = updated.users.filter(function (u) { return u.role === 'admin'; }).map(function (u) { return u.user_id; });
    const notif = { id: Date.now(), message: `${username} joined the group.`, read: false, created_at: new Date().toISOString(), type: 'group', sender: username };
    for (var j = 0; j < admins.length; j++) { if (admins[j] !== username) { await addNotification(admins[j], notif); io.to(`user_${admins[j]}`).emit('notification', notif); } }
    io.to(`group_${groupId}`).emit('group_member_added', { user_id: username });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /groups/:groupId/members
app.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, newMember, role = 'member' } = req.body;
    if (!username || !newMember || !['admin', 'mod', 'member'].includes(role)) return res.status(400).json({ error: 'Missing/invalid fields' });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, type, name').eq('id', groupId).single();
    if (grpErr) throw grpErr;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    const userRole = grp.payload.users.find(function (u) { return u.user_id === username; });
    const userRoleVal = userRole ? userRole.role : null;
    const isAdminOrMod = userRoleVal === 'admin' || userRoleVal === 'mod';
    if (!grp.payload.users.some(function (u) { return u.user_id === username; })) return res.status(403).json({ error: 'Not a group member' });
    if (grp.type === 'secret' && !isAdminOrMod) return res.status(403).json({ error: 'Only admins can add to secret groups' });
    if (grp.payload.users.some(function (u) { return u.user_id === newMember; })) return res.status(400).json({ error: 'User already in group' });
    const updated = { ...grp.payload, users: [...grp.payload.users, { user_id: newMember, role, joined_at: new Date().toISOString(), badges: { helpful: 0 } }], chat_count: (grp.payload.chat_count || 0) + 1 };
    const { error: updErr } = await supabase2.from('groups').update({ payload: updated }).eq('id', groupId);
    if (updErr) throw updErr;
    const notification = { id: Date.now(), message: `You were added to the ${grp.type} group "${grp.name}" by ${username} as ${role}.`, read: false, created_at: new Date().toISOString(), type: 'group', sender: username };
    await addNotification(newMember, notification);
    io.to(`user_${newMember}`).emit('notification', notification);
    io.to(`group_${groupId}`).emit('group_member_added', { user_id: newMember, role });
    res.json({ newMember, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/roles
app.post('/groups/:groupId/roles', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, targetUser, role } = req.body;
    if (!username || !targetUser || !['admin', 'mod', 'member'].includes(role)) return res.status(400).json({ error: 'Missing/invalid fields' });
    const { data: grp, error } = await supabase2.from('groups').select('payload').eq('id', groupId).single();
    if (error) throw error;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (!grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; })) return res.status(403).json({ error: 'Only admins can assign roles' });
    if (!grp.payload.users.some(function (u) { return u.user_id === targetUser; })) return res.status(404).json({ error: 'Target user not in group' });
    const updated = { ...grp.payload, users: grp.payload.users.map(function (u) { return u.user_id === targetUser ? { ...u, role } : u; }) };
    const { error: updErr } = await supabase2.from('groups').update({ payload: updated }).eq('id', groupId);
    if (updErr) throw updErr;
    const notif = { id: Date.now(), message: `${username} assigned you ${role} role in the group.`, read: false, created_at: new Date().toISOString(), type: 'group', sender: username };
    await addNotification(targetUser, notif);
    io.to(`user_${targetUser}`).emit('notification', notif);
    io.to(`group_${groupId}`).emit('group_role_updated', { user_id: targetUser, role });
    res.json({ success: true, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/messages
app.post('/groups/:groupId/messages', upload.single('media'), async (req, res) => {
  const { groupId } = req.params;
  try {
    const { username, type = 'message', content = '' } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    let media_url = null, media_public_id = null;
    if (req.file) {
      const up = await new Promise(function (resolve, reject) {
        cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: 'textmob/groups' }, function (error, result) { if (error) reject(error); else resolve(result); }).end(req.file.buffer);
      });
      media_url = up.secure_url; media_public_id = up.public_id;
    }
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload').eq('id', groupId).single();
    if (grpErr) throw grpErr;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
    const userRoleObj = grp.payload.users.find(function (u) { return u.user_id === username; });
    const userRole = userRoleObj ? userRoleObj.role : null;
    if (!userRole) return res.status(403).json({ error: 'Not a member' });
    const newMsg = { id: Date.now(), sender: username, type: req.file ? (content ? type : 'image') : type, content, media_url, media_public_id, created_at: new Date().toISOString(), seen: [] };
    const updatedPayload = { ...grp.payload, messages: [...grp.payload.messages, newMsg], chat_count: (grp.payload.chat_count || 0) + 1 };
    const { error: updErr } = await supabase2.from('groups').update({ payload: updatedPayload }).eq('id', groupId);
    if (updErr) throw updErr;
    io.to(`group_${groupId}`).emit('new_group_message', { message: newMsg, groupId });
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/messages/:msgId/seen
app.post('/groups/:groupId/messages/:msgId/seen', async (req, res) => {
  try {
    const { groupId, msgId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data: grp, error } = await supabase2.from('groups').select('payload').eq('id', groupId).single();
    if (error) throw error;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
    if (!grp.payload.users.some(function (u) { return u.user_id === username; })) return res.status(403).json({ error: 'Not a member' });
    const msgIndex = grp.payload.messages.findIndex(function (m) { return String(m.id) === String(msgId); });
    if (msgIndex === -1) return res.status(404).json({ error: 'Message not found' });
    const currentSeen = grp.payload.messages[msgIndex].seen || [];
    const updatedSeen = currentSeen.filter(function (s) { return s.user_id !== username; }).concat([{ user_id: username, seen_at: new Date().toISOString() }]);
    const updatedMsg = { ...grp.payload.messages[msgIndex], seen: updatedSeen };
    const updatedMessages = [...grp.payload.messages]; updatedMessages[msgIndex] = updatedMsg;
    await supabase2.from('groups').update({ payload: { ...grp.payload, messages: updatedMessages } }).eq('id', groupId);
    io.to(`group_${groupId}`).emit('group_message_seen', { msgId: parseInt(msgId, 10), user_id: username });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /groups/:groupId
app.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, name, type: newType, description, settings } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, type, created_by').eq('id', groupId).single();
    if (grpErr) throw grpErr;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    const isAdmin = grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; });
    if (grp.type === 'secret' && !isAdmin) return res.status(403).json({ error: 'Only admins can modify secret group settings' });
    const updates = {};
    if (name) updates.name = name;
    if (newType && ['public', 'private_visible', 'secret'].includes(newType)) updates.type = newType;
    const payloadUpdates = {};
    if (description !== undefined) payloadUpdates.description = description;
    if (settings) { var currentSettings = grp.payload.settings || {}; payloadUpdates.settings = { ...currentSettings, ...settings }; }
    updates.payload = { ...grp.payload, ...payloadUpdates };
    const { error: updErr } = await supabase2.from('groups').update(updates).eq('id', groupId);
    if (updErr) throw updErr;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/profile
app.post('/groups/:groupId/profile', upload.single('profile'), async (req, res) => {
  const { groupId } = req.params;
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    if (!req.file) return res.status(400).json({ error: 'No profile file uploaded' });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, profile_public_id, type').eq('id', groupId).single();
    if (grpErr) throw grpErr;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    const isAdmin = grp.payload.users.some(function (u) { return u.user_id === username && u.role === 'admin'; });
    if (grp.type === 'secret' && !isAdmin) return res.status(403).json({ error: 'Only admins can update secret group profile' });
    if (grp.profile_public_id) await cloudinary.uploader.destroy(grp.profile_public_id);
    const up = await new Promise(function (resolve, reject) {
      cloudinary.uploader.upload_stream({ folder: 'textmob/group_profiles' }, function (error, result) { if (error) reject(error); else resolve(result); }).end(req.file.buffer);
    });
    const { data, error: updateErr } = await supabase2.from('groups').update({ profile_url: up.secure_url, profile_public_id: up.public_id }).eq('id', groupId).select('profile_url').single();
    if (updateErr) throw updateErr;
    io.to(`group_${groupId}`).emit('group_profile_updated', up.secure_url);
    res.json({ profile_url: up.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /groups/:groupId/messages/:msgId
app.delete('/groups/:groupId/messages/:msgId', async (req, res) => {
  try {
    const { groupId, msgId } = req.params;
    const { username } = req.body;
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, type').eq('id', groupId).single();
    if (grpErr) throw grpErr;
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.messages)) grp.payload.messages = [];
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    const msg = grp.payload.messages.find(function (m) { return String(m.id) === String(msgId); });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const adminOrModObj = grp.payload.users.find(function (u) { return u.user_id === username && (u.role === 'admin' || u.role === 'mod'); });
    const isAdminOrMod = !!adminOrModObj;
    const isSender = msg.sender === username;
    if (!isAdminOrMod && !isSender) return res.status(403).json({ error: 'Only admins, mods, or the sender can delete' });
    if (msg.media_public_id) await cloudinary.uploader.destroy(msg.media_public_id, { resource_type: 'image' });
    await supabase2.from('groups').update({ payload: { ...grp.payload, messages: grp.payload.messages.filter(function (m) { return String(m.id) !== String(msgId); }) } }).eq('id', groupId);
    io.to(`group_${groupId}`).emit('group_message_deleted', { id: parseInt(msgId, 10) });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /groups/:groupId
app.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('created_by, profile_public_id').eq('id', groupId).single();
    if (grpErr) throw grpErr;
    if (grp.created_by !== username) return res.status(403).json({ error: 'Only the group owner can delete the group' });
    if (grp.profile_public_id) await cloudinary.uploader.destroy(grp.profile_public_id);
    await supabase2.from('groups').delete().eq('id', groupId);
    io.to(`group_${groupId}`).emit('group_deleted', { groupId });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /groups/discover
app.get('/groups/discover', async (req, res) => {
  try {
    const { username, query: search = '', limit = 20 } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data, error } = await supabase2.from('groups').select('*').ilike('name', `%${search}%`).limit(parseInt(limit) * 2);
    if (error) return res.status(500).json({ error: error.message });
    const discoverableGroups = (data || []).filter(group => { const privateTypes = ['secret', 'private', 'private_visible']; return !privateTypes.includes(group.type); });
    res.json(discoverableGroups);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /feed (legacy group feed)
app.get('/feed', async (req, res) => {
  try {
    const { username, limit = 50 } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data: groups, error: groupsErr } = await supabase2.from('groups').select('id').or(`created_by.eq.${username},payload.users.user_id.eq.${username}`);
    if (groupsErr) throw groupsErr;
    const { data: personalPosts, error: perErr } = await supabase2.from('Posts').select('*').not('type', 'ilike', 'group-post-%').order('created_at', { ascending: false }).limit(parseInt(limit));
    if (perErr) throw perErr;
    var groupPosts = [];
    if (groups && groups.length > 0) {
      for (var k = 0; k < groups.length; k++) {
        const g = groups[k];
        const { data: gp, error: gpErr } = await supabase2.from('Posts').select('*, groups(name)').eq('type', `group-post-${g.id}`).order('created_at', { ascending: false });
        if (gpErr) continue;
        groupPosts = groupPosts.concat(gp.map(function (p) { return { ...p, group_name: p.groups ? p.groups.name : null }; }));
      }
    }
    const allPosts = [].concat(personalPosts || [], groupPosts);
    const ranked = allPosts.sort(function (a, b) { if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at); var aLikes = a.likes ? a.likes.length : 0; var bLikes = b.likes ? b.likes.length : 0; return bLikes - aLikes; }).slice(0, parseInt(limit));
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /groups/:groupId/feed
app.get('/groups/:groupId/feed', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, type').eq('id', groupId).single();
    if (grpErr) return res.status(404).json({ error: grpErr.message });
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    var accessDenied = false;
    if ((grp.type === 'private_visible' || grp.type === 'secret') && !grp.payload.users.some(function (u) { return u.user_id === username; })) accessDenied = true;
    if (accessDenied) return res.status(403).json({ error: 'Access denied' });
    const { data: posts, error } = await supabase2.from('Posts').select('*').eq('type', `group-post-${groupId}`).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const rankedPosts = posts.sort(function (a, b) { if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at); var aLikes = a.likes ? a.likes.length : 0; var bLikes = b.likes ? b.likes.length : 0; return bLikes - aLikes; });
    res.json(rankedPosts);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /groups/:groupId/posts (CREATE group post)
app.post('/groups/:groupId/posts', upload.array("media", 6), async (req, res) => {
  try {
    var groupId = req.params.groupId;
    var username = req.body.username;
    var text = req.body.text;
    var visib = req.body.visib || 'group';
    var activities = req.body.activities;
    var options = req.body.options;
    if (!username || !text) return res.status(400).json({ error: "Missing required fields" });
    const { data: grp, error: grpErr } = await supabase2.from('groups').select('payload, type, name').eq('id', groupId).single();
    if (grpErr) return res.status(404).json({ error: 'Group not found' });
    if (!grp.payload) grp.payload = {};
    if (!Array.isArray(grp.payload.users)) grp.payload.users = [];
    var userRoleObj = grp.payload.users.find(function (u) { return u.user_id === username; });
    var userRole = userRoleObj ? userRoleObj.role : null;
    if (!userRole) return res.status(403).json({ error: 'Not a member' });
    var type = "post";
    if (options) {
      try {
        if (typeof options === "string") options = JSON.parse(options);
        if (Array.isArray(options) && options.length >= 2) {
          var validFormat = options.every(function (opt) { return typeof opt.id === "number" && typeof opt.text === "string" && Array.isArray(opt.votes); });
          if (validFormat) type = "poll"; else options = null;
        } else options = null;
      } catch (parseErr) { options = null; }
    }
    var hashtags = [];
    var rawHashtags = text.match(/#[\w-]+/g);
    if (rawHashtags && Array.isArray(rawHashtags)) hashtags = rawHashtags;
    var rawMentions = text.match(/@\w+/g) || [];
    var mentions = rawMentions.map(function (m) { return m.slice(1).replace(/[^a-zA-Z0-9_]/g, ""); });
    var mediaUrls = [];
    try {
      var filesArray = req.files ? req.files : [];
      mediaUrls = await Promise.all(filesArray.map(function (file) {
        return new Promise(function (resolve, reject) {
          var uploadStream = cloudinary.uploader.upload_stream({ folder: "post-media", resource_type: "auto" }, function (error, result) { if (error) return reject(error); if (result && result.secure_url) return resolve(result.secure_url); return reject(new Error("Cloudinary returned unexpected result")); });
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
      }));
    } catch (uploadErr) { return res.status(500).json({ error: "Media upload failed" }); }
    var finalType = 'group-post-' + groupId;
    var { error: insertError, data } = await supabase2.from("Posts").insert([{ username, text, media: mediaUrls, likes: [], comments: [], hashtags: hashtags, visib: visib, type: finalType, options: options, activities: activities }]).select("*").single();
    if (insertError) return res.status(500).json({ error: "Failed to create post" });
    try { await updateMobcoins(username.split("@").pop().trim(), +7, true, "You just received 7 Mobcoins for creating a " + (type === 'poll' ? 'poll' : 'group post') + " on Textmob"); } catch (mobErr) { console.error("[group-post] updateMobcoins failed:", mobErr); }
    res.json({ message: (type === "poll" ? "Poll" : "Group post") + " created successfully!" });
    (async function backgroundWork() {
      // Background notifications, email, AI reply, etc.
    })();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = {}; // Not loaded by server
