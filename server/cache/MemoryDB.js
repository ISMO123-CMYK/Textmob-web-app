const CacheManager = require('./CacheManager');

class MemoryDB {
  constructor(supabaseInstance, supabase2Instance) {
    this.supabase = supabaseInstance;
    this.supabase2 = supabase2Instance;
    this.posts = [];
    this.users = [];
    this.userPostSeenMap = new Map();
    this.userSnapSeenMap = new Map();
    this.isReady = false;
    this.seenCache = new CacheManager(0, 1);
    this.negativeSignalMap = new Map();
  }

  async fetchAllPaginated(client, table) {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`[MemoryDB] Error fetching page ${page} from ${table}:`, error.message);
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < pageSize) break;
      page++;
    }
    return allData;
  }

  async initialize() {
    console.log('[MemoryDB] Bootstrapping database into memory...');
    try {
      const [usersData, postsData] = await Promise.all([
        this.fetchAllPaginated(this.supabase, 'users'),
        this.fetchAllPaginated(this.supabase2, 'Posts'),
      ]);

      if (usersData) this.users = usersData;
      if (postsData) this.posts = postsData;

      // Filter out posts from disabled users (disabled is TEXT: "true"/"false")
      const disabledUsernames = new Set(
        this.users.filter(u => String(u.disabled) === "true").map(u => u.username)
      );
      if (disabledUsernames.size > 0) {
        const before = this.posts.length;
        this.posts = this.posts.filter(p => !disabledUsernames.has(p.username));
        console.log(`[MemoryDB] Filtered out ${before - this.posts.length} posts from ${disabledUsernames.size} disabled users.`);
      }

      this.loadSeenMaps();

      this.isReady = true;
      console.log(`[MemoryDB] Loaded ${this.users.length} users, ${this.posts.length} posts into MemoryDB.`);
    } catch (error) {
      console.error('[MemoryDB] Failed to initialize:', error);
      throw error;
    }
  }

  // ─── User Methods ───

  async reload() {
    console.log('[MemoryDB] Reloading all data from Supabase...');
    try {
      const [usersData, postsData] = await Promise.all([
        this.fetchAllPaginated(this.supabase, 'users'),
        this.fetchAllPaginated(this.supabase2, 'Posts'),
      ]);
      if (usersData) this.users = usersData;
      if (postsData) this.posts = postsData;

      const disabledUsernames = new Set(
        this.users.filter(u => String(u.disabled) === "true").map(u => u.username)
      );
      if (disabledUsernames.size > 0) {
        this.posts = this.posts.filter(p => !disabledUsernames.has(p.username));
      }

      this.loadSeenMaps();
      console.log(`[MemoryDB] Reloaded ${this.users.length} users, ${this.posts.length} posts`);
    } catch (error) {
      console.error('[MemoryDB] Reload failed:', error);
    }
  }

  findUser(username) {
    return this.users.find(u => u.username === username);
  }

  // In-memory only — does NOT write back to Supabase (the endpoint already did that)
  async upsertUser(userObj) {
    const index = this.users.findIndex(u => u.username === userObj.username);
    if (index > -1) {
      Object.assign(this.users[index], userObj);
    } else {
      this.users.push(userObj);
    }
    return this.users.find(u => u.username === userObj.username);
  }

  // In-memory only — does NOT write back to Supabase (the endpoint already did that)
  async updateUser(username, updates) {
    const index = this.users.findIndex(u => u.username === username);
    if (index > -1) {
      Object.assign(this.users[index], updates);
      return this.users[index];
    }
    return null;
  }

  // ─── Post Methods ───

  findPost(id) {
    return this.posts.find(p => String(p.id) === String(id));
  }

  getPostsForFeed(username, tab, following, friends, blocked, limit = 100) {
    let pool = this.posts.filter(p =>
      p && p.id && p.username &&
      !p.disabled &&
      !(p.type && p.type.startsWith('group')) &&
      !blocked.has(p.username)
    );

    if (tab === 'following' && (following.size || friends.size)) {
      const connected = new Set([...following, ...friends]);
      pool = pool.filter(p => connected.has(p.username));
    }

    pool.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return pool.slice(0, limit);
  }

  // Remove all posts by a given username (e.g. when user gets disabled)
  removeUserPosts(username) {
    const before = this.posts.length;
    this.posts = this.posts.filter(p => p.username !== username);
    const removed = before - this.posts.length;
    if (removed > 0) console.log(`[MemoryDB] Removed ${removed} posts by @${username}`);
    return removed;
  }

  // In-memory only — does NOT write back to Supabase (the endpoint already did that)
  async upsertPost(postObj) {
    const index = this.posts.findIndex(p => String(p.id) === String(postObj.id));
    if (index > -1) {
      Object.assign(this.posts[index], postObj);
    } else {
      this.posts.push(postObj);
    }
    return this.posts.find(p => String(p.id) === String(postObj.id));
  }

  // ─── Seen Map Methods (persisted to JSON) ───

  getSeenPosts(username) {
    if (!this.userPostSeenMap.has(username)) {
      this.userPostSeenMap.set(username, new Set());
    }
    return this.userPostSeenMap.get(username);
  }

  getSeenSnaps(username) {
    if (!this.userSnapSeenMap.has(username)) {
      this.userSnapSeenMap.set(username, new Set());
    }
    return this.userSnapSeenMap.get(username);
  }

  markPostSeen(username, postId) {
    const set = this.getSeenPosts(username);
    set.add(String(postId));
    if (set.size > 2000) {
      const iter = set.keys();
      for (let i = 0; i < 500; i++) set.delete(iter.next().value);
    }
  }

  markSnapSeen(username, snapId) {
    const set = this.getSeenSnaps(username);
    set.add(String(snapId));
    if (set.size > 1000) {
      const iter = set.keys();
      for (let i = 0; i < 200; i++) set.delete(iter.next().value);
    }
  }

  saveSeenMaps() {
    const postData = {};
    for (const [user, set] of this.userPostSeenMap) {
      postData[user] = [...set];
    }
    this.seenCache.persistToFile('post-seen-map.json', postData);

    const snapData = {};
    for (const [user, set] of this.userSnapSeenMap) {
      snapData[user] = [...set];
    }
    this.seenCache.persistToFile('snap-seen-map.json', snapData);
  }

  loadSeenMaps() {
    const postData = this.seenCache.loadFromFile('post-seen-map.json');
    if (postData) {
      for (const [user, ids] of Object.entries(postData)) {
        this.userPostSeenMap.set(user, new Set(ids));
      }
      console.log(`[MemoryDB] Loaded post seen map for ${Object.keys(postData).length} users`);
    }

    const snapData = this.seenCache.loadFromFile('snap-seen-map.json');
    if (snapData) {
      for (const [user, ids] of Object.entries(snapData)) {
        this.userSnapSeenMap.set(user, new Set(ids));
      }
      console.log(`[MemoryDB] Loaded snap seen map for ${Object.keys(snapData).length} users`);
    }
  }

  // ─── Leaderboard Caching ───

  getCachedLeaderboard() {
    return this.seenCache.get('leaderboard');
  }

  setCachedLeaderboard(data) {
    this.seenCache.set('leaderboard', data, 300000);
  }

  // ─── Negative Signals ───

  addNegativeSignal(username, signal) {
    if (!this.negativeSignalMap.has(username)) {
      this.negativeSignalMap.set(username, new Map());
    }
    const userSignals = this.negativeSignalMap.get(username);
    // Group by author for easy lookup
    const authorKey = signal.contentType + '|' + signal.postId;
    if (!userSignals.has(authorKey)) {
      userSignals.set(authorKey, []);
    }
    userSignals.get(authorKey).push(signal);
    // Trim old signals (keep last 50 per author)
    const arr = userSignals.get(authorKey);
    if (arr.length > 50) arr.splice(0, arr.length - 50);
  }

  getNegativeSignals(username) {
    if (!this.negativeSignalMap.has(username)) {
      this.negativeSignalMap.set(username, new Map());
    }
    return this.negativeSignalMap.get(username);
  }

  // ─── Category Negative Signals ───

  addCategoryNegativeSignal(username, categories, signalType) {
    if (!this.categoryPenaltyMap) this.categoryPenaltyMap = new Map();
    if (!this.categoryPenaltyMap.has(username)) {
      this.categoryPenaltyMap.set(username, {});
    }
    const userCats = this.categoryPenaltyMap.get(username);
    const cats = Array.isArray(categories) ? categories : [categories];
    for (const cat of cats) {
      if (!userCats[cat]) userCats[cat] = { count: 0, types: {} };
      userCats[cat].count++;
      if (!userCats[cat].types[signalType]) userCats[cat].types[signalType] = 0;
      userCats[cat].types[signalType]++;
    }
  }

  // ─── Social Graph Helpers ───

  getUserSets(username) {
    const user = this.findUser(username);
    if (!user) return { following: new Set(), friends: new Set(), blocked: new Set() };
    return {
      following: new Set(user.following || []),
      friends: new Set(user.friends || []),
      blocked: new Set(user.blocked_users || []),
    };
  }

  getVerifiedMap(usernames) {
    const map = {};
    for (const u of this.users) {
      if (usernames.includes(u.username)) {
        map[u.username] = u.verified || false;
      }
    }
    return map;
  }
}

module.exports = MemoryDB;
