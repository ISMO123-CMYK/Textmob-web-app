import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import HomeFeed from './HomeFeed';
import NavIcons from '../../utils/navIcons';

const SAVED_KEY = 'textmob_saved_posts';

function getSavedIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return Array.isArray(saved) ? saved.map(String) : [];
  } catch { return []; }
}

export default function SavedPostsFeed() {
  const [posts, setPosts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getSavedIds();
    if (ids.length === 0) { setPosts([]); setLoading(false); return; }
    apiFetch('/get-posts-by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPosts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setPosts([]); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <NavIcons.Saved className="w-12 h-12 text-gray-300" />
        <p className="text-sm text-gray-400 font-semibold">No saved posts yet</p>
        <p className="text-xs text-gray-300">Tap the bookmark icon on any post to save it here</p>
      </div>
    );
  }

  return <HomeFeed propPosts={posts} />;
}
