import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import HomeFeed from '../home/HomeFeed';

export default function HashtagContent({ tag }) {
  let [posts, setPosts] = useState([]);
  let [loading, setLoading] = useState(true);
  let [page, setPage] = useState(1);
  let [hasMore, setHasMore] = useState(true);
  let [error, setError] = useState('');

  useEffect(() => {
    if (!tag) return;
    setLoading(true);
    setError('');
    apiFetch(`/tag/${encodeURIComponent(tag)}?page=1&limit=20`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => {
        setPosts(data.posts || []);
        setHasMore(data.hasMore || false);
        setPage(1);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [tag]);

  async function loadMore() {
    if (!hasMore || loading) return;
    let next = page + 1;
    try {
      let r = await apiFetch(`/tag/${encodeURIComponent(tag)}?page=${next}&limit=20`);
      let data = await r.json();
      setPosts(prev => [...prev, ...(data.posts || [])]);
      setHasMore(data.hasMore || false);
      setPage(next);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-gray-600" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">#{tag}</h1>
            {!loading && <p className="text-xs text-gray-400">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>}
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-16">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-2xl text-gray-400 font-black">#</span>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">No posts with #{tag} yet</p>
            <p className="text-xs text-gray-400">Be the first to use this hashtag</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <>
            <HomeFeed propPosts={posts} />
            {hasMore && (
              <div className="flex justify-center py-6">
                <button onClick={loadMore} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold text-gray-600 transition-colors">
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
