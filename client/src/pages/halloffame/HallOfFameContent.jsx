import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import GiftIcon from '../../components/ui/GiftIcon';

function formatStat(num) {
  const n = Number(num) || 0;
  if (n >= 1000000) {
    const formatted = (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2);
    return `${formatted.replace(/\.?0+$/, '')}M`;
  }
  if (n >= 1000) {
    const formatted = (n / 1000).toFixed(n % 1000 === 0 ? 0 : 2);
    return `${formatted.replace(/\.?0+$/, '')}K`;
  }
  return n.toLocaleString();
}

function SkeletonCard() {
  return (
    <div className="bg-[#0b101e] border border-gray-800/60 rounded-2xl p-4 md:p-5 flex items-center gap-4 animate-pulse">
      <div className="w-11 h-12 rounded-xl bg-gray-800/60 flex-shrink-0" />
      <div className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-gray-800/60 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-800/60 rounded w-2/5" />
        <div className="h-3 bg-gray-800/40 rounded w-1/4" />
      </div>
      <div className="flex items-center gap-6">
        <div className="w-12 h-8 bg-gray-800/40 rounded" />
        <div className="w-12 h-8 bg-gray-800/40 rounded" />
      </div>
    </div>
  );
}

export default function HallOfFameContent() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRankTips, setShowRankTips] = useState(false);
  const [giftTarget, setGiftTarget] = useState(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [giftSending, setGiftSending] = useState(false);
  const [giftStatus, setGiftStatus] = useState(null);
  const [menuIdx, setMenuIdx] = useState(null);

  const menuRefs = useRef({});

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowRankTips(false);
        setMenuIdx(null);
        if (giftTarget) {
          setGiftTarget(null);
          setGiftAmount('');
          setGiftStatus(null);
        }
      }
    }
    function handleClickOutside(e) {
      if (menuIdx !== null) {
        const ref = menuRefs.current[menuIdx];
        if (ref && !ref.contains(e.target)) {
          setMenuIdx(null);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showRankTips, giftTarget, menuIdx]);

  async function fetchLeaderboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/leaderboard');
      const data = await res.json();
      if (data?.success) {
        setLeaders(data.leaderboard || []);
      } else {
        setErrorMessage("Couldn't load leaderboard.");
      }
    } catch {
      setErrorMessage("Network error.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  function getAvatarInitials(fullname, username) {
    const fallback = username || '?';
    if (!fullname) return fallback[0].toUpperCase();
    const parts = fullname.trim().split(' ');
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
  }

  async function handleGiftTransfer() {
    setGiftStatus(null);
    const amount = parseInt(giftAmount, 10);
    const currentUsername = localStorage.currentUser || localStorage.getItem('currentUser');

    if (!giftTarget?.username) return setGiftStatus({ error: 'Invalid recipient.' });
    if (!amount || amount <= 0) return setGiftStatus({ error: 'Enter a valid amount.' });
    if (!currentUsername) return setGiftStatus({ error: 'Sign in to send.' });

    setGiftSending(true);
    try {
      const res = await apiFetch(`/t/send-mobcoins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: currentUsername,
          toIds: [giftTarget.username],
          amount
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        return setGiftStatus({ error: data?.error || 'Failed.' });
      }
      setGiftStatus({ success: data.message || 'Sent!' });
      fetchLeaderboard(true);
    } catch {
      setGiftStatus({ error: 'Network error.' });
    } finally {
      setGiftSending(false);
    }
  }

  const rankTips = [
    {
      d: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
      c: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
      t: 'Quality Content',
      b: 'Create high-value posts that resonate with the community. Posts with media and substantial discussions attract genuine likes and followers.'
    },
    {
      d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
      c: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
      t: 'Community Engagement',
      b: 'Every like on your posts and every new follower strengthens your rank in the Hall of Fame. Interacting actively drives authentic growth.'
    },
    {
      d: 'M3 3h18v18H3zM21 9H3M12 15l3-3M9 12l3 3',
      c: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
      t: 'Consistent Presence',
      b: 'Regular posting and active participation across discussions build long-term momentum on the leaderboard.'
    },
  ];

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 pb-24 md:pb-12 selection:bg-blue-600 selection:text-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 md:pt-10">

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-400/30 flex items-center justify-center text-white shadow-[0_0_25px_-5px_rgba(37,99,235,0.4)] flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-white" strokeWidth="0">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.77-.41 3.22-1.6 3.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Hall of Fame</h1>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5 font-medium">Top 5 • by likes + followers • all time</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              title="Refresh"
              className="w-10 h-10 rounded-full bg-[#101524] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-700 transition-all active:scale-95 disabled:opacity-40 shadow-sm"
            >
              <svg viewBox="0 0 24 24" className={cn("w-4 h-4 fill-none stroke-current", refreshing && "animate-spin")} strokeWidth="2.2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              onClick={() => setShowRankTips(true)}
              className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#101524] border border-blue-900/60 text-xs font-bold text-blue-400 hover:bg-blue-950/40 hover:border-blue-700/60 active:scale-95 transition-all shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              How to rank
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="space-y-3.5">
            {[0, 1, 2, 3, 4].map(idx => <SkeletonCard key={idx} />)}
          </div>
        ) : errorMessage ? (
          <div className="bg-[#0b101e] border border-red-900/40 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-400 font-semibold">{errorMessage}</p>
            <button
              onClick={() => fetchLeaderboard(true)}
              className="mt-3 px-4 py-1.5 rounded-full bg-red-950/40 text-red-300 border border-red-800/50 text-xs font-bold hover:bg-red-900/40 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : leaders.length === 0 ? (
          <div className="bg-[#0b101e] border border-gray-800/60 rounded-2xl px-4 py-20 text-center">
            <p className="text-sm font-medium text-gray-400">No entries recorded yet. Be the first to claim the top spot!</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {leaders.map((user, idx) => {
              const rank = idx + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;
              const isMenuOpen = menuIdx === idx;

              return (
                <div
                  key={user.id || user.username || idx}
                  className={cn(
                    "rounded-2xl p-3.5 md:p-4.5 flex items-center justify-between gap-3 md:gap-4 transition-all duration-200 relative",
                    isGold
                      ? "bg-[#0b101e] border border-amber-500/40 shadow-[0_0_30px_-8px_rgba(245,158,11,0.18)] hover:border-amber-500/60"
                      : isSilver
                      ? "bg-[#0b101e] border border-slate-700/60 shadow-[0_0_20px_-10px_rgba(148,163,184,0.12)] hover:border-slate-600"
                      : isBronze
                      ? "bg-[#0b101e] border border-amber-800/40 shadow-[0_0_20px_-10px_rgba(217,119,6,0.12)] hover:border-amber-700/60"
                      : "bg-[#0b101e] border border-gray-800/60 hover:border-gray-700/80"
                  )}
                >
                  {/* Left: Rank Badge + Avatar + User Info */}
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      {isGold ? (
                        <div className="w-10 h-13 md:w-11 md:h-14 rounded-xl bg-gradient-to-b from-amber-500/25 via-amber-600/15 to-amber-900/40 border border-amber-500/50 text-amber-300 flex flex-col items-center justify-center shadow-inner">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-amber-400 drop-shadow-sm">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                          </svg>
                          <span className="text-sm font-black leading-none mt-1">1</span>
                        </div>
                      ) : isSilver ? (
                        <div className="w-10 h-11 md:w-11 md:h-12 rounded-xl bg-gradient-to-b from-slate-400/20 via-slate-500/10 to-slate-700/30 border border-slate-400/40 text-slate-200 flex items-center justify-center font-black text-sm md:text-base shadow-inner">
                          2
                        </div>
                      ) : isBronze ? (
                        <div className="w-10 h-11 md:w-11 md:h-12 rounded-xl bg-gradient-to-b from-orange-600/20 via-amber-700/10 to-amber-900/30 border border-orange-500/40 text-orange-200 flex items-center justify-center font-black text-sm md:text-base shadow-inner">
                          3
                        </div>
                      ) : (
                        <div className="w-10 h-11 md:w-11 md:h-12 rounded-xl bg-[#131929] border border-gray-800 text-gray-300 flex items-center justify-center font-black text-sm md:text-base">
                          {rank}
                        </div>
                      )}
                    </div>

                    {/* Avatar */}
                    <a
                      href={`/@${user.username}`}
                      data-lexum={true}
                      className={cn(
                        "relative w-12 h-12 md:w-13 md:h-13 rounded-full flex-shrink-0 transition-transform duration-200 hover:scale-105 block",
                        isGold ? "ring-2 ring-amber-500/70" : isSilver ? "ring-2 ring-slate-400/50" : isBronze ? "ring-2 ring-orange-500/50" : "ring-1 ring-gray-700/50"
                      )}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-sm md:text-base font-bold">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.fullname || user.username} className="w-full h-full object-cover" />
                        ) : (
                          getAvatarInitials(user.fullname, user.username)
                        )}
                      </div>
                    </a>

                    {/* Identifiers */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/@${user.username}`}
                          data-lexum={true}
                          className="text-sm md:text-base font-bold text-white truncate hover:underline hover:text-blue-400 transition-colors"
                        >
                          {user.fullname || user.username}
                        </a>
                        {isGold && (
                          <span className="inline-flex text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                            GOLD
                          </span>
                        )}
                        {isSilver && (
                          <span className="inline-flex text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-slate-400/20 text-slate-300 border border-slate-400/40 uppercase">
                            SILVER
                          </span>
                        )}
                        {isBronze && (
                          <span className="inline-flex text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 uppercase">
                            BRONZE
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-400 truncate mt-0.5 font-mono">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  {/* Right: Likes, Followers, Menu */}
                  <div className="flex items-center gap-3.5 md:gap-6 flex-shrink-0">
                    {/* Likes Stat */}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <div>
                        <div className="text-xs md:text-sm font-bold text-white leading-tight">
                          {formatStat(user.totalLikes)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">
                          Likes
                        </div>
                      </div>
                    </div>

                    {/* Followers Stat */}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div>
                        <div className="text-xs md:text-sm font-bold text-white leading-tight">
                          {formatStat(user.followersCount)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">
                          Followers
                        </div>
                      </div>
                    </div>

                    {/* 3-dots Menu Button */}
                    <div className="relative" ref={el => menuRefs.current[idx] = el}>
                      <button
                        onClick={() => setMenuIdx(isMenuOpen ? null : idx)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        aria-label="Options"
                      >
                        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                          <circle cx="10" cy="4" r="1.5" />
                          <circle cx="10" cy="10" r="1.5" />
                          <circle cx="10" cy="16" r="1.5" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-9 z-30 w-44 bg-[#0c101d] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-100" role="menu">
                          <a
                            href={`/@${user.username}`}
                            data-lexum={true}
                            onClick={() => setMenuIdx(null)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-300 hover:bg-white/5 font-semibold border-b border-gray-800/80 transition-colors"
                          >
                            View Profile
                          </a>
                          <button
                            onClick={() => {
                              setMenuIdx(null);
                              setGiftTarget(user);
                              setGiftAmount('');
                              setGiftStatus(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-blue-400 font-bold hover:bg-blue-500/10 transition-colors text-left"
                          >
                            Gift Mobcoins
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Banner Section */}
        <div className="mt-5 bg-gradient-to-r from-blue-950/40 via-[#0a1224] to-blue-950/20 border border-blue-900/40 rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div>
              <p className="text-xs md:text-sm font-bold text-blue-400">
                Ranking is based on total likes and followers.
              </p>
              <p className="text-[11px] md:text-xs text-gray-400 mt-0.5">
                Consistent engagement. Quality content. Real impact.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowRankTips(true)}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-blue-400/80 hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            <span>Top 5 by likes + followers • all time</span>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* How to Rank Strategy Modal */}
      {showRankTips && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity" onClick={() => setShowRankTips(false)} />
          <div role="dialog" aria-modal="true" className="fixed z-50 bottom-0 left-0 right-0 bg-[#0c101d] text-gray-100 rounded-t-3xl md:inset-0 md:m-auto md:rounded-2xl md:max-w-md md:h-fit border-t border-gray-800 md:border md:border-gray-800 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1.5 rounded-full bg-gray-700" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/80">
              <div>
                <h3 className="text-sm font-black text-white">How to Rank in Hall of Fame</h3>
                <p className="text-xs text-gray-400 mt-0.5">Top 5 by Total Likes & Followers</p>
              </div>
              <button
                onClick={() => setShowRankTips(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-3 py-2 space-y-2">
              {rankTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3.5 px-3 py-3 rounded-xl bg-white/[0.02] border border-gray-800/50">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold", tip.c)}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tip.d} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white">{tip.t}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{tip.b}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-8 md:pb-4 pt-3 border-t border-gray-800/80">
              <button
                onClick={() => setShowRankTips(false)}
                className="w-full h-11 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </>
      )}

      {/* Gift Transfer Overlay Panel */}
      {giftTarget && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40" onClick={() => setGiftTarget(null)} />
          <div role="dialog" aria-modal="true" className="fixed z-50 bottom-0 left-0 right-0 bg-[#0c101d] text-gray-100 rounded-t-3xl md:inset-0 md:m-auto md:rounded-2xl md:max-w-sm md:h-fit border-t border-gray-800 md:border md:border-gray-800 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1.5 rounded-full bg-gray-700" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/80">
              <h3 className="text-sm font-black text-white">Honor with Mobcoins</h3>
              <button
                onClick={() => setGiftTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60 bg-white/[0.02]">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-inner">
                {giftTarget.avatar ? (
                  <img src={giftTarget.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  getAvatarInitials(giftTarget.fullname, giftTarget.username)
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{giftTarget.fullname || giftTarget.username}</p>
                <p className="text-[11px] font-mono text-gray-400 mt-0.5">@{giftTarget.username}</p>
              </div>
            </div>

            <div className="px-5 py-5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Amount to Transfer</label>
              <div className="flex items-center gap-2.5 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-[#111625]">
                <GiftIcon id="diamond" size={15} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={giftAmount}
                  onChange={e => setGiftAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-sm bg-transparent outline-none text-white placeholder-gray-500 font-bold"
                  autoFocus
                />
                <span className="text-xs font-bold text-gray-400">Mobcoins</span>
              </div>
              <p className="text-[10px] font-medium text-gray-500 mt-2">In-app asset status · Non-fiat circulation</p>
            </div>

            {giftStatus?.error && (
              <div className="mx-5 mb-4 text-xs font-semibold text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl px-3.5 py-2.5">
                {giftStatus.error}
              </div>
            )}
            {giftStatus?.success && (
              <div className="mx-5 mb-4 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-3.5 py-2.5">
                {giftStatus.success}
              </div>
            )}

            <div className="px-5 pb-8 md:pb-4 flex gap-2 border-t border-gray-800/80 pt-3">
              <button
                onClick={() => setGiftTarget(null)}
                className="flex-1 h-11 rounded-xl border border-gray-700 text-xs font-bold text-gray-300 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGiftTransfer}
                disabled={giftSending || !!giftStatus?.success}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm"
              >
                {giftSending ? 'Processing…' : giftStatus?.success ? 'Dispatched' : 'Confirm Gift'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}