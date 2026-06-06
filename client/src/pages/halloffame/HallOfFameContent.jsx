import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import GiftIcon from '../../components/ui/GiftIcon';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="w-5 h-3 bg-gray-100 dark:bg-gray-800 rounded-full flex-shrink-0" />
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-2/5" />
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-1/4" />
      </div>
      <div className="w-16 h-7 bg-gray-100 dark:bg-gray-800 rounded-full" />
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
  const [giftStatus, setGiftStatus] = useState(null); // { error?: string, success?: string }
  const [mobileMenuIdx, setMobileMenuIdx] = useState(null);

  const menuRefs = useRef({});

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowRankTips(false);
        setMobileMenuIdx(null);
        if (giftTarget) {
          setGiftTarget(null);
          setGiftAmount('');
          setGiftStatus(null);
        }
      }
    }
    function handleClickOutside(e) {
      if (mobileMenuIdx !== null) {
        const ref = menuRefs.current[mobileMenuIdx];
        if (ref && !ref.contains(e.target)) {
          setMobileMenuIdx(null);
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
  }, [showRankTips, giftTarget, mobileMenuIdx]);

  async function fetchLeaderboard(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
    if (!fullname) {
      return fallback[0].toUpperCase();
    }
    const parts = fullname.trim().split(' ');
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
  }

  async function handleGiftTransfer() {
    setGiftStatus(null);
    const amount = parseInt(giftAmount, 10);
    const currentUsername = localStorage.currentUser || localStorage.getItem('currentUser');

    if (!giftTarget?.username) {
      return setGiftStatus({ error: 'Invalid recipient.' });
    }
    if (!amount || amount <= 0) {
      return setGiftStatus({ error: 'Enter a valid amount.' });
    }
    if (!currentUsername) {
      return setGiftStatus({ error: 'Sign in to send.' });
    }

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
      // Refresh list to update scores/coins
      fetchLeaderboard(true);
    } catch {
      setGiftStatus({ error: 'Network error.' });
    } finally {
      setGiftSending(false);
    }
  }

  const medals = [
    { label: 'Gold', lc: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', ring: 'ring-yellow-400', fill: '#F59E0B' },
    { label: 'Silver', lc: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', ring: 'ring-gray-300', fill: '#9CA3AF' },
    { label: 'Bronze', lc: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-300', fill: '#C2855B' }
  ];

  const rankTips = [
    { d: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z', c: 'text-blue-600 bg-blue-50', t: 'Post with purpose', b: 'Quality beats quantity. Substance gets rewarded.' },
    { d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', c: 'text-green-600 bg-green-50', t: 'Be the reply they needed', b: 'Thoughtful comments do more than likes.' },
    { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75', c: 'text-purple-600 bg-purple-50', t: 'Grow your circle', b: 'Every connection boosts your network score.' },
    { d: 'M22 12h-4l-3 9L9 3l-3 9H2', c: 'text-amber-600 bg-amber-50', t: 'Stay consistent', b: 'Daily activity compounds. Streaks beat viral days.' },
    { d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2', c: 'text-pink-600 bg-pink-50', t: 'Polls and events', b: 'Pull engagement from your whole network.' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="px-4 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Hall of Fame</h1>
            <p className="text-xs text-gray-400 mt-0.5">Top Textmobbers this week</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className={cn("w-4 h-4 fill-none stroke-current", refreshing && "animate-spin")} strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              onClick={() => setShowRankTips(true)}
              className="h-8 px-3 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97] transition-colors"
            >
              How to rank
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4].map(idx => (
              <SkeletonRow key={idx} />
            ))}
          </div>
        ) : errorMessage ? (
          <p className="px-4 py-6 text-sm text-red-500">{errorMessage}</p>
        ) : leaders.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-gray-400">No top users yet — be the first!</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {leaders.map((user, idx) => {
              const medal = medals[idx] || null;
              const isMenuOpen = mobileMenuIdx === idx;
              return (
                <li
                  key={user.id || user.username}
                  className="relative flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Position number */}
                  <span className="w-5 text-center text-[11px] font-bold text-gray-300 dark:text-gray-600 flex-shrink-0 tabular-nums">
                    {idx + 1}
                  </span>

                  {/* Avatar wrapper */}
                  <div className={cn("relative w-10 h-10 rounded-full flex-shrink-0", medal ? `ring-2 ${medal.ring}` : '')}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getAvatarInitials(user.fullname, user.username)
                      )}
                    </div>
                    {medal && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-100 dark:border-gray-800">
                        <svg viewBox="0 0 24 24" style={{ width: 11, height: 11 }} fill={medal.fill}>
                          <path d="M2 20h20v2H2v-2zM4 18l3-10 5 6 5-6 3 10H4z" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Member Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-snug">
                        {user.fullname || user.username || '—'}
                      </p>
                      {/* Verified blue badge */}
                      <svg viewBox="0 0 22 22" className="w-3.5 h-3.5 flex-shrink-0">
                        <circle cx="11" cy="11" r="11" fill="#2563EB" />
                        <path d="M9.5 15.5l-3.5-3.5 1.4-1.4L9.5 12.7l5.1-5.1 1.4 1.4z" fill="white" />
                      </svg>
                      {medal && (
                        <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-full border flex-shrink-0", medal.lc, medal.bg, medal.border)}>
                          {medal.label.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                      <span className="text-[11px] font-semibold text-gray-400">{user.score ?? '—'} pts</span>
                    </div>
                  </div>

                  {/* Action buttons (Desktop visible) */}
                  <div className="hidden md:flex items-center gap-1.5">
                    <button
                      onClick={() => window.Lexum ? window.Lexum.navigate(`/@${user.username}`) : (window.location.href = `/@${user.username}`)}
                      className="h-8 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97] transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setGiftTarget(user);
                        setGiftAmount('');
                        setGiftStatus(null);
                      }}
                      className="h-8 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.97] transition-colors"
                    >
                      Gift
                    </button>
                  </div>

                  {/* Action menu (Mobile dropdown triggers) */}
                  <div className="md:hidden relative" ref={el => menuRefs.current[idx] = el}>
                    <button
                      onClick={() => setMobileMenuIdx(isMenuOpen ? null : idx)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                        <circle cx="4" cy="10" r="1.5" />
                        <circle cx="10" cy="10" r="1.5" />
                        <circle cx="16" cy="10" r="1.5" />
                      </svg>
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-10 z-30 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xl" role="menu">
                        <button
                          onClick={() => {
                            setMobileMenuIdx(null);
                            if (window.Lexum) window.Lexum.navigate(`/@${user.username}`);
                            else window.location.href = `/@${user.username}`;
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                        >
                          <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                          </div>
                          <span className="font-semibold text-left">View Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setMobileMenuIdx(null);
                            setGiftTarget(user);
                            setGiftAmount('');
                            setGiftStatus(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <GiftIcon id="crown" size={16} />
                          </div>
                          <span className="font-semibold text-left">Gift Mobcoins</span>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && !errorMessage && leaders.length > 0 && (
          <p className="px-4 py-4 text-[11px] text-gray-400 text-center">
            Leaderboard resets weekly · stay active to keep your spot
          </p>
        )}
      </div>

      {/* Info rank dialog tips */}
      {showRankTips && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowRankTips(false)} />
          <div role="dialog" aria-modal="true" className="fixed z-50 bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl md:inset-0 md:m-auto md:rounded-2xl md:max-w-sm md:h-fit border-t border-gray-100 dark:border-gray-800 md:border flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">How to reach the top</h3>
                <p className="text-xs text-gray-400 mt-0.5">5 moves that work</p>
              </div>
              <button
                onClick={() => setShowRankTips(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] pb-2 divide-y divide-gray-50 dark:divide-gray-800">
              {rankTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", tip.c)}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tip.d} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{tip.t}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{tip.b}</p>
                  </div>
                  <span className="text-[11px] font-bold text-gray-300 dark:text-gray-700 flex-shrink-0 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-8 md:pb-4 pt-3">
              <button
                onClick={() => setShowRankTips(false)}
                className="w-full h-11 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-colors"
              >
                Let's get it
              </button>
            </div>
          </div>
        </>
      )}

      {/* Gift send dialog panel */}
      {giftTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setGiftTarget(null)} />
          <div role="dialog" aria-modal="true" className="fixed z-50 bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl md:inset-0 md:m-auto md:rounded-2xl md:max-w-sm md:h-fit border-t border-gray-100 dark:border-gray-800 md:border flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Gift Mobcoins</h3>
              <button
                onClick={() => setGiftTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Target profile preview */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {giftTarget.avatar ? (
                  <img src={giftTarget.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  getAvatarInitials(giftTarget.fullname, giftTarget.username)
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{giftTarget.fullname || giftTarget.username}</p>
                <p className="text-xs text-gray-400">@{giftTarget.username}</p>
              </div>
            </div>

            {/* Input fields */}
            <div className="px-4 py-4">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Amount</label>
              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors">
                <GiftIcon id="diamond" size={16} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={giftAmount}
                  onChange={e => setGiftAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-300"
                  autoFocus
                />
                <span className="text-xs text-gray-400">coins</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">In-app currency · not real money</p>
            </div>

            {/* Status alerts */}
            {giftStatus?.error && (
              <div className="mx-4 mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl px-3 py-2">
                {giftStatus.error}
              </div>
            )}
            {giftStatus?.success && (
              <div className="mx-4 mb-3 text-xs text-green-700 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl px-3 py-2">
                {giftStatus.success}
              </div>
            )}

            {/* Trigger buttons */}
            <div className="px-4 pb-8 md:pb-4 flex gap-2">
              <button
                onClick={() => setGiftTarget(null)}
                className="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGiftTransfer}
                disabled={giftSending || !!giftStatus?.success}
                className="flex-1 h-11 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-colors disabled:opacity-40"
              >
                {giftSending ? 'Sending…' : giftStatus?.success ? 'Sent' : 'Send Gift'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
