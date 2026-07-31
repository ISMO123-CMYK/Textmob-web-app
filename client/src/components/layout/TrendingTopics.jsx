import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';

export default function TrendingTopics({ dark }) {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch('/trending-hashtags')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (active) {
          const list = (
            Array.isArray(data) ? data :
            Array.isArray(data?.data) ? data.data :
            Array.isArray(data?.hashtags) ? data.hashtags :
            Array.isArray(data?.trending) ? data.trending :
            Array.isArray(data?.results) ? data.results :
            Array.isArray(data?.topics) ? data.topics : []
          ).map(item => {
            if (!item) return null;
            if (typeof item === 'string') {
              const tag = item.replace(/^#/, '').trim().toLowerCase();
              return tag ? { tag, count: 0 } : null;
            }
            if (typeof item !== 'object') return null;
            const tag = String(item.tag ?? item.hashtag ?? item.name ?? item.topic ?? item.keyword ?? item.label ?? '').replace(/^#/, '').trim().toLowerCase();
            const countVal = item.count ?? item.posts ?? item.post_count ?? item.postCount ?? item.uses ?? item.usage_count ?? item.usageCount ?? item.mentions ?? item.volume ?? 0;
            const count = Number(countVal);
            return tag ? { tag, count: Number.isFinite(count) ? count : 0 } : null;
          }).filter(Boolean);
          setHashtags(list);
        }
      })
      .catch(() => {
        if (active) setHashtags([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const skeletonBg = dark ? 'bg-white/10' : 'bg-gray-100';
  const titleColor = dark ? 'text-white/50' : 'text-gray-400';
  const tagColor = dark ? 'text-white' : 'text-gray-900';
  const countColor = dark ? 'text-white/40' : 'text-gray-400';
  const hoverBg = dark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const emptyIconBg = dark ? 'bg-white/10' : 'bg-gray-50';
  const emptyIconColor = dark ? 'text-white/30' : 'text-gray-300';
  const emptyTextColor = dark ? 'text-white/40' : 'text-gray-400';
  const emptySubColor = dark ? 'text-white/25' : 'text-gray-300';
  const chevronColor = dark ? 'text-white/20' : 'text-gray-300';

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className={`h-2.5 ${skeletonBg} rounded-full w-1/3 mb-5`} />
        {[0, 1, 2, 3, 4].map(idx => (
          <div className="flex items-start gap-3 py-2.5" key={idx}>
            <div className={`w-3 h-2.5 ${skeletonBg} rounded-full flex-shrink-0 mt-1`} />
            <div className="flex-1 space-y-1.5">
              <div className={`h-3 ${skeletonBg} rounded-full w-3/5`} />
              <div className={`h-2 ${skeletonBg} rounded-full w-1/4`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className="px-4 py-5">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${titleColor} mb-4`}>Trending Topics</p>
        <div className="flex flex-col items-center py-6 text-center gap-2">
          <div className={`w-10 h-10 rounded-2xl ${emptyIconBg} flex items-center justify-center mb-1`}>
            <svg viewBox="0 0 24 24" className={`w-5 h-5 ${emptyIconColor} fill-none stroke-current`} strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className={`text-xs font-semibold ${emptyTextColor}`}>No trending topics yet</p>
          <p className={`text-[11px] ${emptySubColor}`}>Check back soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className={`text-[11px] font-bold uppercase tracking-widest ${titleColor} mb-3 px-0.5`}>Trending Topics</p>
      <div>
        {hashtags.map((item, idx) => (
          <button
            onClick={() => window.Lexum?.navigate(`/tag/${encodeURIComponent(item.tag)}`)}
            className={`w-full flex items-center gap-3 py-2.5 ${hoverBg} active:scale-[0.98] transition-colors rounded-xl px-1 -mx-1 text-left`}
            key={`${item.tag}-${idx}`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${tagColor} truncate leading-snug`}>#{item.tag}</p>
              {item.count > 0 && (
                <p className={`text-xs ${countColor} mt-0.5`}>
                  {item.count.toLocaleString()} post{item.count === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${chevronColor} flex-shrink-0 fill-none stroke-current`} strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
