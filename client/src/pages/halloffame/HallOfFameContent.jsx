import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import GiftIcon from '../../components/ui/GiftIcon';

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-4 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
        </div>
        <div className="w-16 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl" />
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
  const [mobileMenuIdx, setMobileMenuIdx] = useState(null);

  // Track which creator's evidence breakdown drawer is expanded
  const [expandedRank, setExpandedRank] = useState(null);

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

  const medals = [
    { label: 'Gold Tier', lc: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', fill: '#F59E0B', banner: 'bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-950/10' },
    { label: 'Silver Tier', lc: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', fill: '#9CA3AF', banner: 'bg-gradient-to-b from-slate-50/60 to-transparent dark:from-slate-800/10' },
    { label: 'Bronze Tier', lc: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', fill: '#C2855B', banner: 'bg-gradient-to-b from-orange-50/40 to-transparent dark:from-orange-950/10' }
  ];

  const rankTips = [
    { d: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z', c: 'text-blue-600 bg-blue-50', t: 'Quality over quantity', b: 'Every post earns points: +1 base, +1 with media, +1 per 5 words of text. The more substance, the more points.' },
    { d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', c: 'text-green-600 bg-green-50', t: 'Engage the community', b: 'Every comment on your post = +3. Every reaction = +0.5. The more people interact, the higher your Engagement Score (60% of total).' },
    { d: 'M3 3h18v18H3zM21 9H3M12 15l3-3M9 12l3 3', c: 'text-purple-600 bg-purple-50', t: 'Show up consistently', b: 'Posting across multiple days gives you a consistency bonus. Only your best 20 posts count — every post contributes.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-24 md:pb-8 selection:bg-blue-500 selection:text-white">
      <div className="max-w-2xl mx-auto">

        {/* Header Section */}
        <div className="px-4 pt-8 pb-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Hall of Fame</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className={cn("w-4 h-4 fill-none stroke-current", refreshing && "animate-spin")} strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              onClick={() => setShowRankTips(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 hover:opacity-90 active:scale-[0.97] transition-all shadow-sm"
            >
              How to Rank
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[0, 1, 2, 3].map(idx => <SkeletonRow key={idx} />)}
          </div>
        ) : errorMessage ? (
          <p className="px-4 py-6 text-sm text-red-500 font-semibold">{errorMessage}</p>
        ) : leaders.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <p className="text-sm font-medium text-gray-400">No elite entries captured yet. Stake your claim!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {leaders.map((user, idx) => {
              const medal = medals[idx] || null;
              const isMenuOpen = mobileMenuIdx === idx;
              const isExpanded = expandedRank === idx;

              // Fallbacks if the backend hasn't populated reason or highlights fields yet
              const evidenceReason = user.evidence?.why || "Maintained high authentic traction across discussions.";
              const topPost = user.evidence?.topPost || null;
              const milestones = user.evidence?.metrics || [];

              return (
                <div
                  key={user.id || user.username}
                  className={cn(
                    "transition-all duration-200",
                    medal?.banner,
                    isExpanded && "bg-gray-50/50 dark:bg-gray-800/20"
                  )}
                >
                  {/* Row Entry Layout */}
                  <div className="flex items-center gap-4 px-4 py-4">
                    {/* Rank Indicator */}
                    <div className="w-6 flex flex-shrink-0 justify-center items-center font-black text-sm tabular-nums">
                      {idx < 3 ? (
                        <span className={cn("text-base", medal?.lc)}>#{idx + 1}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar Display */}
                    <div className={cn("relative w-12 h-12 rounded-full flex-shrink-0 transition-transform duration-300", medal && "ring-2 ring-offset-2 dark:ring-offset-gray-900", idx === 0 ? "ring-amber-500" : idx === 1 ? "ring-slate-400" : idx === 2 ? "ring-orange-400" : "")}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-base font-bold shadow-inner">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getAvatarInitials(user.fullname, user.username)
                        )}
                      </div>
                    </div>

                    {/* Meta Identifiers */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate tracking-tight">
                          {user.fullname || user.username || '—'}
                        </h2>
                        {medal && (
                          <span className={cn("inline-flex text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md border transform scale-95", medal.lc, medal.bg, medal.border)}>
                            {medal.label.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 mt-0.5 text-xs text-gray-400">
                        <span className="font-mono">@{user.username}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{user.score7d ?? 0} pts</span>
                      </div>
                    </div>

                    {/* Right Interactions Frame */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedRank(isExpanded ? null : idx)}
                        className={cn(
                          "h-8 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1",
                          isExpanded
                            ? "bg-gray-900 text-white border-transparent dark:bg-gray-100 dark:text-gray-900"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        Evidence
                        <svg viewBox="0 0 24 24" className={cn("w-3.5 h-3.5 stroke-current fill-none transition-transform duration-200", isExpanded && "rotate-180")} strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Options Trigger (Desktop layout splits profiles, mobile cascades down) */}
                      <div className="relative" ref={el => menuRefs.current[idx] = el}>
                        <button
                          onClick={() => setMobileMenuIdx(isMenuOpen ? null : idx)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-9 z-30 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-100" role="menu">
                            <button
                              onClick={() => {
                                setMobileMenuIdx(null);
                                if (window.Lexum) window.Lexum.navigate(`/@${user.username}`);
                                else window.location.href = `/@${user.username}`;
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold border-b border-gray-100 dark:border-gray-800 transition-colors"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => {
                                setMobileMenuIdx(null);
                                setGiftTarget(user);
                                setGiftAmount('');
                                setGiftStatus(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-xs text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                            >
                              Gift Mobcoins
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expansion Evidence Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pl-14 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-4">

                        {/* Summary Block */}
                        <div>
                          <h3 className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase">Why They Ranked</h3>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed font-medium">
                            {evidenceReason}
                          </p>
                        </div>

                        {/* Metric Highlights */}
                        {milestones.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {milestones.map((metric, mIdx) => (
                              <div key={mIdx} className="bg-gray-50 dark:bg-gray-900/60 rounded-xl px-3 py-2 border border-gray-100/50 dark:border-gray-800/40">
                                <span className="text-[10px] font-semibold text-gray-400 block">{metric.label}</span>
                                <span className="text-xs font-black text-gray-900 dark:text-gray-100 mt-0.5 block tabular-nums">{metric.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Spotlight Contribution */}
                        {topPost && (
                          <div className="border-t border-gray-50 dark:border-gray-900 pt-3">
                            <h4 className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">Featured Impact Post</h4>
                            <div
                              onClick={() => topPost.id && window.Lexum?.navigate(`/post/${topPost.id}`)}
                              className="bg-gray-50/50 dark:bg-gray-900/30 rounded-xl p-3 border border-dashed border-gray-200 dark:border-gray-800 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 group transition-all"
                            >
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 italic group-hover:text-gray-900 dark:group-hover:text-gray-200 leading-relaxed">
                                "{topPost.text}"
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                <span>✦ {topPost.engagement || 'High Engagement'}</span>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className="group-hover:underline">Study pattern →</span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && !errorMessage && leaders.length > 0 && (
          <p className="px-4 py-8 text-[10px] font-bold text-gray-400 dark:text-gray-500 text-center tracking-wide uppercase">
            Resets weekly · Authentic analytics processed strictly
          </p>
        )}
      </div>

      {/* Strategy Overlay Dialog */}
      {showRankTips && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity" onClick={() => setShowRankTips(false)} />
          <div role="dialog" aria-modal="true" className="fixed z-50 bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl md:inset-0 md:m-auto md:rounded-2xl md:max-w-sm md:h-fit border-t border-gray-100 dark:border-gray-800 md:border flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">How to Rank</h3>
                <p className="text-xs text-gray-400 mt-0.5">Quality Score (40%) + Engagement Score (60%)</p>
              </div>
              <button
                onClick={() => setShowRankTips(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-2 py-2 divide-y divide-gray-50 dark:divide-gray-800">
              {rankTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3.5 px-3 py-3.5">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold", tip.c)}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tip.d} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{tip.t}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{tip.b}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-8 md:pb-4 pt-3 border-t border-gray-50 dark:border-gray-800">
              <button
                onClick={() => setShowRankTips(false)}
                className="w-full h-11 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm"
              >
                Acknowledge Blueprint
              </button>
            </div>
          </div>
        </>
      )}

      {/* Gift Transfer Overlay Panel */}
      {giftTarget && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40" onClick={() => setGiftTarget(null)} />
          <div role="dialog" aria-modal="true" className="fixed z-50 bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl md:inset-0 md:m-auto md:rounded-2xl md:max-w-sm md:h-fit border-t border-gray-100 dark:border-gray-800 md:border flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Honor with Mobcoins</h3>
              <button
                onClick={() => setGiftTarget(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-inner">
                {giftTarget.avatar ? (
                  <img src={giftTarget.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  getAvatarInitials(giftTarget.fullname, giftTarget.username)
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{giftTarget.fullname || giftTarget.username}</p>
                <p className="text-[11px] font-mono text-gray-400 mt-0.5">@{giftTarget.username}</p>
              </div>
            </div>

            <div className="px-5 py-5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Amount to Transfer</label>
              <div className="flex items-center gap-2.5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-transparent">
                <GiftIcon id="diamond" size={15} />
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={giftAmount}
                  onChange={e => setGiftAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-300 font-bold"
                  autoFocus
                />
                <span className="text-xs font-bold text-gray-400">Mobcoins</span>
              </div>
              <p className="text-[10px] font-medium text-gray-400 mt-2">In-app asset status · Non-fiat circulation</p>
            </div>

            {giftStatus?.error && (
              <div className="mx-5 mb-4 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 rounded-xl px-3.5 py-2.5">
                {giftStatus.error}
              </div>
            )}
            {giftStatus?.success && (
              <div className="mx-5 mb-4 text-xs font-semibold text-green-700 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/20 rounded-xl px-3.5 py-2.5">
                {giftStatus.success}
              </div>
            )}

            <div className="px-5 pb-8 md:pb-4 flex gap-2 border-t border-gray-50 dark:border-gray-800 pt-3">
              <button
                onClick={() => setGiftTarget(null)}
                className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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