const express = require("express");
const http = require("http");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const socketIo = require("socket.io");
const Fuse = require("fuse.js");
const path = require("path");

const app = express();
const server = http.createServer(app); // attach raw HTTP server
const io = socketIo(server);           // attach Socket.IO to the HTTP server
const PORT = process.env.PORT || 5000;
// Initialize Supabase client
const supabaseUrl = "https://apnnyqmsyxuyapamnrqg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbm55cW1zeXh1eWFwYW1ucnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjA2ODgsImV4cCI6MjA1ODkzNjY4OH0.aVHtygox6NbLAvgGElkBcEFXG1QKIB8JeYNHBwBtU7Y";
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseUr = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKe = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUr, supabaseKe);

const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
// ── INSERT UNDER YOUR OTHER const … = require(...) LINES ──

// ── Paste this under your imports in app.js ──

const fetch = require('node-fetch');

const pingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
const url = 'https://textmob-provider-api.onrender.com'; // Replace with your app URL
const nodemailer = require("nodemailer")
// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sharpbrainspublishers@gmail.com',
    pass: 'vgbp mkny nruf xtfs'
  }
});

async function sendNotificationEmail(to, subject, message) {
  await transporter.sendMail({
    from: '"Textmob" sharpbrainspublishers@gmail.com',
    to,
    subject,
    html: message
  });
  console.log("Email sent Successfully to", to)
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
  api_key:    '145943618557148',
  api_secret: '48g6aAx6fyU5JdRdhqkQgiBJ7zc',
});

app.use(express.json());

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
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'newindex.html'))
})

// Login Endpoint (Without Auth)
app.post("/login", async (req, res) => {
  try {
      const { identifier, password } = req.body; // identifier = email or username

      // Check if user exists
      const { data: user, error: userError } = await supabase
          .from("users")
          .select("*")
          .or(`username.eq.${identifier.trimEnd()},fullname.eq.${identifier.trimEnd()}`)
          .single();

      if (userError && userError.code !== "PGRST116") {
          console.error("Error fetching user:", userError);
          return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
          return res.status(400).json({ error: "Invalid email/username or password" });
      }

      // Check password
      if (user.password !== password) {
          return res.status(400).json({ error: "Invalid email/username or password" });
      }

      sendNotificationEmail(
      user.email,
      "🔔 Login Detected on Textmob",
      `<p>New Login Detected, Hi ${user.fullname}, We've detected An new Login Activity on Your Textmob Account, If This wasn't You, Report to gidadoismail24@gmail.com</p>`
      );

      res.json({ message: "Login successful", user });
  } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});
app.get('/auth', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'))
})

app.get('/foryou', function(req, res) {
  res.redirect('/')
})
app.get('/messages', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'chat-ui.html'))
})
app.get('/accountscenter', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'accountscenter.html'))
})
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

    if (!fullName || !username || !email || !password || !profile_type) {
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
          fullname:    fullName.trimEnd(),
          username: username.split('@').pop().trimEnd(),
          email: email.trimEnd(),
          phone: phone.trimEnd(),
          password,
          profile_pic: profilePicUrl,
          followers:   [],
          following:   [],
          friends:     [],
          notifications: [],
          biography,
          profile_type,
          disabled,
        },
      ]);
sendNotificationEmail(
        email,
        "🔔 New Notification on Textmob",
        `<p>Hi, ${fullName}, You are Welcome to textmob, A Place to Connect with Friends and Families, Your Email would serve as a central for Your Notifications. If This Wasn't You, Please Report to gidadoismail24@gmail.com</p>`
      );
    if (insertError) {
      console.error("Error inserting user:", insertError);
      return res.status(500).json({ error: "Failed to create account" });
    }

    res.json({ message: "Signup successful! You can now log in." });
  } catch (error) {
    console.error("Signup Error:", error);
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
      this.index[token].push(docId);
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
      return this.docs.find(doc => doc.id === result.docId);
    });
  }
}
// Create an instance of the custom search engine
const searchEngine = new InvertedIndex();

// Pre-populate the search engine with user data (this could be done on app initialization)
async function indexUsers() {
  // Fetch all users from the database
  const { data, error } = await supabase
    .from('users')
    .select('id, fullname, username, biography, profile_pic');

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  // Index each user document in the inverted index search engine
  data.forEach(user => {
    const docText = `${user.username} ${user.fullname} ${user.biography} ${user.profile_pic}`; // Concatenate fields to search
    searchEngine.indexDocument(user.id, docText);
  });
}

// Initialize the search engine with user data on app start
indexUsers();

app.get("/search", async (req, res) => {
  try {
    const { query, currentUsername } = req.query;

    if (!query || !currentUsername) {
      return res
        .status(400)
        .json({ error: "Both `query` and `currentUsername` are required" });
    }

    // 1. Fetch your own relationships (friends + following)
    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", currentUsername)
      .single();

    if (youErr || !you) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const yourFriends    = you.friends    || [];
    const yourFollowing  = you.following  || [];

    // 2. Fetch all users (or you can filter server‑side with ilike to pre‑narrow)
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

    // 3. Run Fuse.js fuzzy search on the full set
    const fuse = new Fuse(data, {
      keys: ["username", "fullname"], 
      threshold: 0.3,
    });
    const rawResults = fuse.search(query);

    if (rawResults.length === 0) {
      return res.status(200).json([]);  // no matches
    }

    // 4. Map each match to the minimal shape your frontend needs
    const results = rawResults.map(r => {
      const u = r.item;
      const isOrg  = u.profile_type.toLowerCase() === "organisation";
      let relation;

      if (isOrg) {
        // for orgs, check yourFollowing vs their followers
        relation = yourFollowing.includes(u.username)
          ? "following"
          : "not_following";
      } else {
        // for individuals, check yourFriends
        relation = yourFriends.includes(u.username)
          ? "friended"
          : "not_friended";
      }

      return {
        username:     u.username,
        fullname:     u.fullname,
        profile_pic:  u.profile_pic,
        profile_type: isOrg ? "organisation" : "individual",
        relation, 
      };
    });

    return res.json(results);

  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Profile Update (delete old, upload new)
app.post(
  "/profile/:username/update",
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const { username } = req.params;
      const { fullName, phone, email, biography, userType } = req.body;

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, profile_pic_public_id, fullname, phone, email, biography, userType")
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
        fullname: fullName   || user.fullname,
        phone:    phone      || user.phone,
        email:    email      || user.email,
        biography:biography  || user.biography,
        userType: userType   || user.userType,
        profile_pic:          newProfilePicUrl,
        profile_pic_public_id:newProfilePicPublicId
      };

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



app.get("/get-notifications", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });
    
    // Fetch the notifications array for the user from the "users" table
    const { data: user, error } = await supabase
      .from("users")
      .select("notifications")
      .eq("username", username)
      .single();
    
    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
    
    res.json(user.notifications || []);
  } catch (error) {
    console.error("Error in get-notifications:", error);
    res.status(500).json({ error: "Internal server error" });
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
app.get("/feed-contacts", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("friends, followers, following")
      .eq("username", username)
      .single();

    if (userError || !user) {
      console.error("User not found or error fetching user:", userError);
      return res.status(404).json({ error: "User not found" });
    }

    const allUsernames = [username, 'textmobofficial', ...(user.friends || []), ...(user.followers || []), ...(user.following || [])];

    // Deduplicate usernames
    const uniqueUsernames = [...new Set(allUsernames)];

    // Fetch their info in one query
    const { data: profiles, error: profileError } = await supabase
      .from("users")
      .select("username, fullname, profile_pic")
      .in("username", uniqueUsernames);

    if (profileError) {
      console.error("Error fetching user profiles:", profileError);
      return res.status(500).json({ error: "Failed to fetch contact profiles" });
    }

    return res.json(profiles);
  } catch (error) {
    console.error("Feed Contacts Catch Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


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
app.post("/create-post", upload.array("media", 6), async (req, res) => {
  try {
    const { username, text, visib } = req.body;
    if (!username || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashtags = text.match(/#\w+/g) || [];
    const mediaUrls = await Promise.all(
      (req.files || []).map((file) =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "post-media", resource_type: "auto" },
            (error, result) => (error ? reject(error) : resolve(result.secure_url))
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        })
      )
    );

    const { error: insertError } = await supabase2
      .from("Posts")
      .insert([{ username, text, media: mediaUrls, likes: [], comments: [], hashtags, visib }]);

    if (insertError) {
      console.error("Error creating post:", insertError);
      return res.status(500).json({ error: "Failed to create post" });
    }

    res.json({ message: "Post created successfully!" });
  } catch (error) {
    console.error("Post Creation Error:", error);
    res.status(500).json({ error: "Internal server error" });
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
      const { data: userData, error: userError } = await supabase2
        .from("Users")
        .select("email, fullName")
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
            message: `${username} Like Your Post`,
            read: false,
            link: `/post/${postId}`,
            timestamp: new Date().toISOString(),
          });
        }

        if (post.type === 'event') {// Send email notification
        await sendNotificationEmail(
          userData.email,
          "🔔 New Like on Your Post!",
          `<p>Hi ${userData.fullName || post.username},</p>
           <p><strong>${username}</strong> just liked your post on Textmob.</p>
           <p><a href="https://textmob.web.app/post/${postId}">View post</a></p>`
        );
        } else {
          // Send email notification
        await sendNotificationEmail(
          userData.email,
          `🔔 Someone is Interested in Your Event (${post.title})! on Textmob`,
          `<p>Hi ${userData.fullName || post.username},</p>
           <p><strong>${username}</strong> just Is Interested in Your Event On Textmob.</p>
           <p><a href="https://textmob.web.app/post/${postId}">View Event</a></p>`
        );
        }
      } else {
        console.warn(`Could not send email: User data not found for ${post.username}`);
      }
    }

    res.json({ message: "Post likes updated successfully!", likes: updatedLikes });
  } catch (error) {
    console.error("Like Post Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

app.post("/add-comment", async (req, res) => {
  try {
    const { postId, username, comment } = req.body;

    if (!postId || !username || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch current comments + post owner's username
    const { data: post, error: fetchError } = await supabase2
      .from("Posts")
      .select("comments, username")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      console.error("Error fetching post:", fetchError);
      return res.status(404).json({ error: "Post not found" });
    }

    const updatedComments = [
      ...(post.comments || []),
      {
        username,
        text: comment,
        timestamp: new Date().toISOString(),
      },
    ];

    const { error: updateError } = await supabase2
      .from("Posts")
      .update({ comments: updatedComments })
      .eq("id", postId);

    if (updateError) {
      console.error("Error updating comments:", updateError);
      return res.status(500).json({ error: "Failed to add comment" });
    }

    // Don't send notification if commenting on your own post
    if (username !== post.username) {
      // ✅ Fetch post owner's email + full name
      const { data: userData, error: userError } = await supabase2
        .from("Users")
        .select("email, fullName")
        .eq("username", post.username)
        .single();

      if (!userError && userData.email) {
        // Add in-app notification
        await addNotification(post.username, {
          id: Date.now(),
          message: `${username} commented on your post: "${comment}"`,
          read: false,
          link: `/post/${postId}`,
          timestamp: new Date().toISOString(),
        });

        // Send email notification
        await sendNotificationEmail(
          userData.email,
          "💬 New Comment on Your Post!",
          `<p>Hi ${userData.fullName || post.username},</p>
           <p><strong>${username}</strong> just commented on your post:</p>
           <blockquote>${comment}</blockquote>
           <p><a href="https://textmob.web.app/post/${postId}">View post</a></p>`
        );
      } else {
        console.warn(`Could not send email: User data not found for ${post.username}`);
      }
    }

    res.json({ message: "Comment added successfully!" });
  } catch (error) {
    console.error("Add Comment Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Fetch User Profile by Username
app.get("/profile/:username", async (req, res) => {
    try {
        const { username } = req.params;

        // Fetch user from database
        const { data: user, error } = await supabase
            .from("users")
            .select("fullname, username, email, phone, userType, profile_pic, biography, friends, followers, following, notifications, profile_type")
            .eq("username", username)
            .single();

        if (error) {
            console.error("Error fetching user:", error);
            return res.json({ userType: 'Individual', phone: 'Unavailable', biography: 'Unavailable', friends: [], followers: [], following: [], profile_type: 'Unavailable', notifications: [], profile_pic: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQoy4MjmRpX6zsJ4aEKdQtBoYh3bWDqc74BQ&s', username: 'textmobuser', fullname: 'Textmob User', email: 'invalidemail@textmob', error: "Failed to fetch user profile" });
        }

        if (!user) {
            return res.json({ userType: 'Individual', phone: 'Unavailable', biography: 'Unavailable', friends: [], followers: [], following: [], profile_type: 'Unavailable', notifications: [], profile_pic: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQoy4MjmRpX6zsJ4aEKdQtBoYh3bWDqc74BQ&s', username: 'textmobuser', fullname: 'Textmob User', email: 'invalidemail@textmob', error: "Failed to fetch user profile" });
        }
        res.json(user);
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

async function addNotification(recipientUsername, notification) {
  // Fetch current notifications for the recipient
  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("notifications")
    .eq("username", recipientUsername)
    .single();
  if (fetchError || !user) {
    console.error("User not found for notifications:", fetchError);
    return;
  }
  
  // Append the new notification (make sure notification has a unique "id", a "message", and a "read" property)
  const updatedNotifications = [...(user.notifications || []), notification];
  
  // Update the user's notifications in the database
  const { error: updateError } = await supabase
    .from("users")
    .update({ notifications: updatedNotifications })
    .eq("username", recipientUsername);
  if (updateError) {
    console.error("Error updating notifications:", updateError);
  }
}

app.get("/asilfcismail", async (req, res) => {
  try {
    // fetch public profile fields
    const { data: users, error } = await supabase
      .from("users")
      .select("username, fullname, profile_pic, profile_type, biography, followers, following, friends")
    
    if (error) {
      console.error("Error fetching users:", error)
      return res.status(500).send("Failed to fetch users")
    }

    // count
    const count = users.length

    // build & send HTML
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <!-- reload page every 60 seconds -->
        <meta http-equiv="refresh" content="60">
        <title>Admin Dashboard</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { display: flex; font-family: sans-serif; height: 100vh; }
          /* left bar for total count */
          .count-bar {
            width: 200px;
            background: #f5f5f5;
            padding: 20px;
            border-right: 1px solid #ddd;
          }
          .count-bar h2 { margin-bottom: 10px; font-size: 1.2em; }
          .count-bar p { font-size: 2em; color: #333; }
          
          /* right sidebar for user list */
          .sidebar {
            flex: 1;
            background: #fafafa;
            padding: 20px;
            overflow-y: auto;
          }
          .sidebar h2 { margin-bottom: 15px; font-size: 1.2em; }
          .user {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
          }
          .user img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 12px;
            background: #ddd;
          }
          .user .info {
            line-height: 1.2;
          }
          .user .info .name { font-weight: bold; }
          .user .info .type { font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="count-bar">
          <h2>Total Users</h2>
          <p>${count}</p>
        </div>
        <div class="sidebar">
          <h2>User List</h2>
          ${users.map(u => `
            <div class="user">
              <img src="${u.profile_pic || 'https://via.placeholder.com/40'}" alt="${u.username}">
              <div class="info">
                <div class="name">${u.fullname}</div>
                <div class="type">@${u.username}</div>
                <div class="type">${u.profile_type}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `)

  } catch (err) {
    console.error("Error in /users:", err)
    res.status(500).send("Internal server error")
  }
})

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
            `${currentUsername} followed you on Textmob!`,
            `
              <h2>New Follower Alert!</h2>
              <p><strong>${currentUsername}</strong> just followed your Company's Page on Textmob.</p>
              <p><a href="https://textmob.web.app/@${currentUsername}">View their profile →</a></p>
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
            `${currentUsername} added you as a friend on Textmob!`,
            `
              <h2>New Friend Request</h2>
              <p><strong>${currentUsername}</strong> just added you as a friend.</p>
              <p><a href="https://textmob.web.app/@${currentUsername}">View their profile →</a></p>
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
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const randomMessages = [
  "Hey, don't forget to check out new posts in your feed!",
  "There are some cool new updates on your favorite topics!",
  "You have new messages waiting for you!",
  "Some users have commented on your posts. Check them out!",
  "New notifications are waiting for you. Don't miss out!",
  "Your friends are active! Catch up with them on Textmob.",
  "Check your profile for updates and activity.",
  "It's been a week! Time to check what's new on Textmob!"
];

// Function to generate a random digest message
const generateRandomDigest = () => {
  const randomIndex = Math.floor(Math.random() * randomMessages.length);
  return randomMessages[randomIndex];
};

// Function to send weekly digest
setInterval(async () => {
  console.log("Sending weekly digest emails...");

  try {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, fullname");

    if (userError) {
      console.error("Error fetching users:", userError);
      return;
    }

    for (const user of users) {
      // Generate a random digest message
      const digestMessage = generateRandomDigest();

      const digestHtml = `
        <h2>Hello ${user.full_name || user.email}, here's your Weekly Digest!</h2>
        <p>${digestMessage}</p>
        <p><a href="https://textmob.web.app">Go to Textmob</a></p>
      `;

      // Send email to the user
      sendNotificationEmail(
        user.email,
        "📬 Your Weekly Textmob Digest",
        digestHtml
      );

      console.log(`Weekly digest sent to ${user.email}`);
    }
  } catch (err) {
    console.error("Failed to send weekly digest:", err);
  }

}, WEEK_IN_MS); // Runs once every 7 days (1 week)

const onlineUsers = {};
app.get('/week', function(req, res) {
  sendWeeklyDigest()
  res.send('Sent')
})
 const sendWeeklyDigest = async () => {
  try {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("email, fullname");

    if (userError) {
      console.error("Error fetching users:", userError);
      return;
    }

    // Ensure users is iterable and not empty
    if (!Array.isArray(users) || users.length === 0) {
      console.error("No users found or data is not an array");
      return;
    }

    // Gather all user emails
    const emails = users.map(user => user.email);
    const digestMessage = generateRandomDigest();

    // HTML content for the digest
    const digestHtml = `
      <h2>Hello! Here's your Weekly Digest from Textmob</h2>
      <p>${digestMessage}</p>
      <p><a href="https://textmob.web.app">Go to Textmob</a></p>
    `;

    // Send the email to all users at once
    await sendNotificationEmail(
      emails.join(','), // Join all emails with commas
      "📬 Your Weekly Textmob Digest",
      digestHtml
    );

    console.log("Weekly digest sent to all users!");
  } catch (err) {
    console.error("Failed to send weekly digest:", err);
  }
};

sendWeeklyDigest()
// —— Polling endpoint for presence —— 
app.get('/online-users', (req, res) => {
  return res.json({ users: Object.keys(onlineUsers) });
});

// —— Socket.IO for real‑time presence & calls —— 
io.on('connection', socket => {
  socket.on('register', username => {
    socket.username = username;
    onlineUsers[username] = socket;
    socket.join(username);
    // send initial list
    socket.emit('online-users', Object.keys(onlineUsers));
    // notify others
    socket.broadcast.emit('user-status', { username, status:'online' });
  });

  socket.on('call-user', ({to, offer, from}) => {
    if (onlineUsers[to]) onlineUsers[to].emit('incoming-call', { from, offer });
    else                socket.emit('call-unavailable', { to });
  });

  socket.on('answer-call', ({to, answer}) => {
    if (onlineUsers[to]) onlineUsers[to].emit('call-answered', { answer });
  });

  socket.on('decline-call', ({to}) => {
    if (onlineUsers[to]) onlineUsers[to].emit('call-declined');
  });

  socket.on('end-call', ({to}) => {
    if (onlineUsers[to]) onlineUsers[to].emit('call-ended');
  });

  socket.on('ice-candidate', ({to, candidate}) => {
    if (onlineUsers[to]) onlineUsers[to].emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      socket.broadcast.emit('user-status', { username: socket.username, status:'offline' });
    }
  });
});

// —— Message endpoint (unchanged) —— 
app.post(
  "/send-message",
  upload.single("file"),
  async (req, res) => {
    try {
      const { sender, receiver, message, type } = req.body;
      let secureUrl=null, publicId=null;

      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder:"messages", resource_type:"auto" },
            (err,r)=> err?reject(err):resolve(r)
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
        secureUrl = result.secure_url;
        publicId  = result.public_id;
      }

      const msgData = {
        sender, receiver, type, message,
        mediaUrl: secureUrl, media_public_id: publicId,
        timestamp: new Date().toISOString(), status:"pending"
      };

      const { data, error } = await supabase
        .from("Messages")
        .insert(msgData)
        .select()
        .single();
      if (error) throw error;

      io.to(receiver).emit("new-message", data);
      if (onlineUsers[receiver]) {
        await supabase
          .from("Messages")
          .update({ status:"delivered" })
          .eq("id", data.id);
        io.to(sender).emit("message-status", { messageId:data.id, status:"delivered" });
      }

      return res.json({ status:"success", data });
    } catch (err) {
      console.error("Send Message Error:", err);
      return res.status(500).json({ error: err.message || "Message delivery failed" });
    }
  }
)

// Get Messages Endpoint (for conversation between two users)
app.get("/get-messages", async (req, res) => {
  const { user1, user2 } = req.query;
  try {
    const { data: messages, error } = await supabase
      .from("Messages")
      .select("*")
      .or(
        `and(sender.eq.${user1},receiver.eq.${user2}),and(sender.eq.${user2},receiver.eq.${user1})`
      )
      .order("timestamp", { ascending: true });

    if (error) throw error;

    // Mark unread messages as read and notify senders
    const unread = messages.filter(msg => msg.receiver === user1 && !msg.read);
    if (unread.length) {
      const ids = unread.map(msg => msg.id);
      await supabase
        .from("Messages")
        .update({ read: true })
        .in("id", ids);

      unread.forEach(msg => {
        if (onlineUsers[msg.sender]) {
          onlineUsers[msg.sender].emit("message-read", {
            messageId: msg.id,
            receiver: user1
          });
        }
      });
    }
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});
app.get('/link', function(req, res) {
  const { href } = req.query;
  if (href.startsWith('/')) {
    res.redirect(href)
  } else if (href.startsWith("http://")) {
    res.send(`This link May not be Secure`)
  } else if (href.startsWith("https://")) {
    res.redirect(href)
  } else {
    res.send('Invalid Link')
  }
})
// Helper: Check and deliver pending messages for a user
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
      if (checkUserOnlineStatus(msg.receiver)) {
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

// Simple helper function to check if a user is online
function checkUserOnlineStatus(username) {
  return !!onlineUsers[username];
}

// Periodic check every 5 seconds for each online user
setInterval(async () => {
    // Run as a cron job (daily)
const TEN_DAYS_AGO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
await supabase
  .from("Messages")
  .delete()
  .lt("timestamp", TEN_DAYS_AGO);

  Object.keys(onlineUsers).forEach(username => {
    checkAndDeliverPendingMessages(username);
  });
}, 5000);
const SummarizerManager = require("node-summarizer").SummarizerManager;

app.get("/get-posts", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // 1. Fetch the user’s friends & following
    const { data: you, error: youErr } = await supabase
      .from("users")
      .select("friends, following")
      .eq("username", username)
      .single();
    if (youErr || !you) {
      return res.status(404).json({ error: "User not found" });
    }
    const friends = you.friends || [];
    const following = you.following || [];
    const baseConnections = new Set([...friends, ...following, username]);

    // 2. Load all posts
    const { data: allPosts, error: postsErr } = await supabase2
      .from("Posts")
      .select("*");
    if (postsErr) throw postsErr;

    // 3. Build set of authors the user has engaged with
    const engagedAuthors = new Set();
    allPosts.forEach(post => {
      if (Array.isArray(post.likes) && post.likes.includes(username)) {
        engagedAuthors.add(post.username);
      }
      if (Array.isArray(post.comments)) {
        post.comments.forEach(c => {
          if (c.username === username) {
            engagedAuthors.add(post.username);
          }
        });
      }
    });

    // 4. Second‑degree connections (who your followings follow)
    const { data: followees, error: fErr } = await supabase
      .from("users")
      .select("username, following")
      .in("username", following);
    if (fErr) throw fErr;
    const secondDegree = new Set();
    followees.forEach(u =>
      (u.following || []).forEach(f => {
        if (f !== username && !following.includes(f)) secondDegree.add(f);
      })
    );

    // 5. Friends’ followings
    const { data: friendsData, error: frErr } = await supabase
      .from("users")
      .select("following")
      .in("username", friends);
    if (frErr) throw frErr;
    const friendsFollowings = new Set();
    friendsData.forEach(u =>
      (u.following || []).forEach(f => {
        if (f !== username) friendsFollowings.add(f);
      })
    );

    // 6. Filter, score, randomize & sort
    const now = Date.now();
    const scored = allPosts
      .filter(post => {
        // only allow private posts from direct connections
        if (post.visib === "private") {
          return baseConnections.has(post.username);
        }
        // show all public posts
        return true;
      })
      .map(post => {
        let score = 0;
        // strong social signals
        if (friends.includes(post.username))     score += 5;
        if (following.includes(post.username))   score += 5;
        if (engagedAuthors.has(post.username))   score += 3;
        // weaker network signals
        if (secondDegree.has(post.username))     score += 2;
        if (friendsFollowings.has(post.username))score += 2;
        // small boost for completely new public authors
        if (
          post.visib === "public" &&
          !baseConnections.has(post.username) &&
          !engagedAuthors.has(post.username)
        ) {
          score += 1;
        }
        // heavier recency boost
        const ageMs = now - new Date(post.created_at).getTime();
        score += 2 * (1 / (ageMs + 1) * 1e7);
        
        // add random jitter so each load differs
        score += Math.random() * new Date().getTime();
        return { post, score };
      })
      // highest score first
      .sort((a, b) => b.score - a.score)
      .map(item => item.post);
// Sort by score descending
const scoredSorted = scored.sort((a, b) => b.score - a.score);

// Take top 50 (or however many you want)
const topPosts = scoredSorted.slice(0, 50);

// Shuffle top posts randomly
const shuffled = topPosts.sort(() => Math.random() - 0.5);

// Send shuffled top posts to client
res.json(shuffled);

  } catch (err) {
    console.error("Unified Feed Error:", err);
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
      .single();
    if (error || !you) throw error || new Error("User not found");

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
      .slice(0, 10);

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
      id:          post.id,
      text:        post.text,
      media:       post.media,
      fullname:    user.fullname,
      profile_pic: user.profile_pic,
      likes:       Array.isArray(post.likes)    ? post.likes    : [],
      comments:    Array.isArray(post.comments) ? post.comments : []
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
    const own      = [];
    const liked    = [];
    const commented= [];

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
app.get('/app', function(req, res) {
  res.redirect('https://apnnyqmsyxuyapamnrqg.supabase.co/storage/v1/object/public/profile-pictures//Textmob%20DOWNLOAD%20FREE.apk')
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
app.get('/events-feed', async (req, res) => {
  const now = new Date().toISOString();
  const sevenDays = new Date(Date.now() + 7 * 24*3600*1000).toISOString();

  const { data, error } = await supabase2
    .from('Posts')
    .select('id, username, title, text, scheduled_for, location, registration_url, likes')
    .eq('type', 'event')
    .gte('scheduled_for', now)
    .lte('scheduled_for', sevenDays)
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
    const { data, error } = await supabase2
      .from('groups')
      .select('*');
    if (error) {
      console.error('GET /groups supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    console.error('GET /groups server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — GET one group
app.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { data, error } = await supabase2
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (error) {
      console.error(`GET /groups/${groupId} supabase error:`, error);
      return res.status(404).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    console.error(`GET /groups/${req.params.groupId} server error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — Create group
app.post('/groups', async (req, res) => {
  try {
    const { name, initialAdmins = [], members = [], username } = req.body;

    if (!name || !username) {
      console.warn('POST /groups missing name or username');
      return res.status(400).json({ error: 'Missing name or username' });
    }

    const users = [
      { user_id: username, role: 'admin' },
      ...initialAdmins.map(u => ({ user_id: u, role: 'admin' })),
      ...members.map(u => ({ user_id: u, role: 'member' }))
    ];

    const { data, error } = await supabase2
      .from('groups')
      .insert([{
        name,
        created_by: username,
        payload: { users, messages: [] }
      }])
      .select('*')
      .single();

    if (error) {
      console.error('POST /groups supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /groups server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — Send message
// — GET all groups
app.get('/groups', async (req, res) => {
  try {
    const { data, error } = await supabase2
      .from('groups')
      .select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('GET /groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — GET one group
app.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { data, error } = await supabase2
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(`GET /groups/${req.params.groupId} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — CREATE group
app.post('/groups', async (req, res) => {
  try {
    const { name, initialAdmins = [], members = [], username } = req.body;
    if (!name || !username) {
      return res.status(400).json({ error: 'Missing name or username' });
    }
    const users = [
      { user_id: username, role: 'admin' },
      ...initialAdmins.map(u => ({ user_id: u, role: 'admin' })),
      ...members.map(u => ({ user_id: u, role: 'member' }))
    ];

    const { data, error } = await supabase2
      .from('groups')
      .insert([{
        name,
        created_by: username,
        payload: { users, messages: [] }
      }])
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
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
      .select('payload')
      .eq('id', groupId)
      .single();
    if (grpErr) return res.status(500).json({ error: grpErr.message });

    if (grp.payload.users.some(u => u.user_id === username)) {
      return res.status(400).json({ error: 'Already a member' });
    }

    const updated = {
      ...grp.payload,
      users: [...grp.payload.users, { user_id: username, role: 'member' }]
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);
    if (updErr) return res.status(500).json({ error: updErr.message });

    io.to(`group_${groupId}`).emit('group_member_added', { user_id: username });
    res.json({ success: true });
  } catch (err) {
    console.error(`POST /groups/${req.params.groupId}/join error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// — ADD member
app.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username, newMember, role = 'member' } = req.body;
    if (!username || !newMember) {
      return res.status(400).json({ error: 'Missing username or newMember' });
    }

    const { data: grp, error: grpErr } = await supabase2
      .from('groups')
      .select('payload')
      .eq('id', groupId)
      .single();
    if (grpErr) throw grpErr;

    if (!grp.payload.users.some(u => u.user_id === username)) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    if (grp.payload.users.some(u => u.user_id === newMember)) {
      return res.status(400).json({ error: 'User already in group' });
    }

    const updated = {
      ...grp.payload,
      users: [...grp.payload.users, { user_id: newMember, role }]
    };

    const { error: updErr } = await supabase2
      .from('groups')
      .update({ payload: updated })
      .eq('id', groupId);
    if (updErr) throw updErr;

    io.to(`group_${groupId}`).emit('group_member_added', { user_id: newMember });
    res.json({ newMember, role });
  } catch (err) {
    console.error(`POST /groups/${req.params.groupId}/members error:`, err);
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

      let media_url = null, media_public_id = null;
      if (req.file) {
        const up = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: 'textmob/groups'
        });
        media_url = up.secure_url;
        media_public_id = up.public_id;
      }

      const { data: grp, error: grpErr } = await supabase2
        .from('groups')
        .select('payload')
        .eq('id', groupId)
        .single();
      if (grpErr) throw grpErr;

      const newMsg = {
        id: Date.now(),
        sender_id: username,
        type,
        content,
        media_url,
        media_public_id,
        created_at: new Date().toISOString()
      };

      const { error: updErr } = await supabase2
        .from('groups')
        .update({
          payload: {
            ...grp.payload,
            messages: [...grp.payload.messages, newMsg]
          }
        })
        .eq('id', groupId);
      if (updErr) throw updErr;

      io.to(`group_${groupId}`)
        .emit('new_group_message', { ...newMsg, group_id: groupId });

      res.status(201).json(newMsg);
    } catch (err) {
      console.error(`POST /groups/${groupId}/messages error:`, err);
      res.status(500).json({ error: err.message });
    }
  }
);
app.get('/mygroups', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'groups.html'))
})
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
        .select('payload, profile_public_id')
        .eq('id', groupId)
        .single();
      if (grpErr) throw grpErr;

      if (!grp.payload.users.some(u => u.user_id === username)) {
        return res.status(403).json({ error: 'Not a group member' });
      }

      if (grp.profile_public_id) {
        await cloudinary.uploader.destroy(grp.profile_public_id);
      }
      const up = await cloudinary.uploader.upload_stream(
        { folder: 'textmob/group_profiles' },
        async (error, result) => {
          if (error) throw error;
      
          // Save to database
          const { data, error: updateErr } = await supabase2
            .from('groups')
            .update({
              profile_url: result.secure_url,
              profile_public_id: result.public_id
            })
            .eq('id', groupId)
            .select('profile_url')
            .single();
      
          if (updateErr) throw updateErr;
      
          io.to(`group_${groupId}`).emit('group_profile_updated', result.secure_url);
          res.json({ profile_url: result.secure_url });
        }
      ).end(req.file.buffer);
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
      .select('payload')
      .eq('id', groupId)
      .single();
    if (grpErr) throw grpErr;

    const me = grp.payload.users.find(u => u.user_id === username);
    if (!me || me.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only' });
    }

    const msg = grp.payload.messages.find(m => String(m.id) === String(msgId));
    if (msg && msg.media_public_id) {
      await cloudinary.uploader.destroy(msg.media_public_id, { resource_type: 'auto' });
    }

    const { error: updErr } = await supabase2
      .from('groups')
      .update({
        payload: {
          ...grp.payload,
          messages: grp.payload.messages.filter(m => String(m.id) !== String(msgId))
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

// socket.io
io.on('connection', socket => {
  socket.on('join_group', ({ groupId }) => socket.join(`group_${groupId}`));
  socket.on('leave_group', ({ groupId }) => socket.leave(`group_${groupId}`));
});

// app.get('/@:username', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'profilepage.html'))
// })

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'newindex.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
