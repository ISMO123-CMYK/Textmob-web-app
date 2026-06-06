import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../config/api';
import HomeFeed from '../home/HomeFeed';
import TrendingTopics from '../../components/layout/TrendingTopics';

const HISTORY_KEY = 'textmob_search_history';
const MAX_HISTORY = 12;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSearchHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { }
}

function addToSearchHistory(q) {
  if (!q?.trim()) return;
  const clean = q.trim();
  const current = getSearchHistory();
  const updated = [clean, ...current.filter(item => item !== clean)].slice(0, MAX_HISTORY);
  saveSearchHistory(updated);
}

function removeFromSearchHistory(q) {
  const current = getSearchHistory();
  const updated = current.filter(item => item !== q);
  saveSearchHistory(updated);
}

function clearSearchHistory() {
  saveSearchHistory([]);
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

function HighlightMatch({ text, query }) {
  const strText = String(text || '');
  const strQuery = String(query || '');
  if (!strQuery.trim() || !strText) {
    return <span>{strText}</span>;
  }
  const idx = strText.toLowerCase().indexOf(strQuery.toLowerCase());
  if (idx === -1) {
    return <span>{strText}</span>;
  }
  return (
    <span>
      {strText.slice(0, idx)}
      <span className="text-blue-600 font-bold">{strText.slice(idx, idx + strQuery.length)}</span>
      {strText.slice(idx + strQuery.length)}
    </span>
  );
}

export default function SearchContent() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [history, setHistory] = useState(getSearchHistory);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  const [exploreSuggestions, setExploreSuggestions] = useState([]);
  const [loadingExploreSug, setLoadingExploreSug] = useState(false);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const currentUser = localStorage.currentUser || '';
  const debouncedQuery = useDebounce(query, 260);

  useEffect(() => {
    if (searched || query.trim()) return;
    setLoadingExploreSug(true);
    let active = true;
    apiFetch(`/get-suggestions-feed?username=${encodeURIComponent(currentUser)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (active) {
          setExploreSuggestions(Array.isArray(data) ? data.slice(0, 4) : []);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLoadingExploreSug(false);
      });
    return () => {
      active = false;
    };
  }, [searched, query, currentUser]);

  async function handleExploreRelationChange(targetUsername, action, profileType) {
    try {
      const isOrg = (profileType || '').toLowerCase() === 'organisation';
      const endpoint = isOrg ? '/follow' : '/friend';
      await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername,
          currentUsername: currentUser,
          action: action
        })
      });
      setExploreSuggestions(prev => prev.map(item => {
        if (item.username === targetUsername) {
          let nextRelation = 'not_friended';
          if (isOrg) {
            nextRelation = action === 'follow' ? 'following' : 'not_following';
          } else {
            nextRelation = action === 'friend' ? 'friended' : 'not_friended';
          }
          return { ...item, relation: nextRelation };
        }
        return item;
      }));
    } catch (e) {
      console.error('Explore relation change failed', e);
    }
  }

  // Suggestions search on input change
  useEffect(() => {
    const clean = debouncedQuery.trim();
    if (!clean) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    let active = true;
    apiFetch(`/search-suggest?query=${encodeURIComponent(clean)}&currentUsername=${encodeURIComponent(currentUser)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (active) {
          setSuggestions(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (active) setSuggestions([]);
      })
      .finally(() => {
        if (active) setLoadingSuggestions(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, currentUser]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions, history]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      const inInput = inputRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inInput && !inDropdown) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-load search query from URL parameter 'q'
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      setQuery(q);
      runSearch(q);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  function handleKeyDown(e) {
    const items = query.trim() ? suggestions : history;
    if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (!focused || items.length === 0) {
      if (e.key === 'Enter') {
        runSearch(query);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        const selected = items[selectedIndex];
        const val = typeof selected === 'string' ? selected : selected.username || selected.query || selected.fullname || '';
        handleSuggestionClick(val);
      } else {
        runSearch(query);
      }
    }
  }

  async function runSearch(searchVal) {
    const clean = (searchVal || query).trim();
    if (clean) {
      setFocused(false);
      setQuery(clean);
      setLoadingResults(true);
      setError('');
      setSearched(true);
      addToSearchHistory(clean);
      setHistory(getSearchHistory());
      try {
        const res = await apiFetch(`/general/search?query=${encodeURIComponent(clean)}&currentUsername=${encodeURIComponent(currentUser)}`);
        if (!res.ok) {
          throw new Error('Search failed');
        }
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingResults(false);
      }
    }
  }

  function handleSuggestionClick(val) {
    if (val) {
      setQuery(val);
      setFocused(false);
      runSearch(val);
    }
  }

  function handleRemoveFromHistory(val, e) {
    e.stopPropagation();
    removeFromSearchHistory(val);
    setHistory(getSearchHistory());
  }

  function handleClearAllHistory(e) {
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  }

  async function handleRelationChange(targetUsername, action, profileType) {
    try {
      const isOrg = (profileType || '').toLowerCase() === 'organisation';
      const endpoint = isOrg ? '/follow' : '/friend';
      await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername,
          currentUsername: currentUser,
          action: action
        })
      });
      setSearchResults(prev => prev.map(item => {
        if (item.type === 'user' && item.username === targetUsername) {
          let nextRelation = 'not_friended';
          if (isOrg) {
            nextRelation = action === 'follow' ? 'following' : 'not_following';
          } else {
            nextRelation = action === 'friend' ? 'friended' : 'not_friended';
          }
          return { ...item, relation: nextRelation };
        }
        return item;
      }));
    } catch (e) {
      console.error('Relation change failed', e);
    }
  }

  const usersResults = searchResults.filter(e => e.type === 'user');
  const postsResults = searchResults.filter(e => e.type === 'post' || e.type === 'snap' || e.type === 'event' || e.type === 'live' || e.type === 'live_ended');
  const suggestionItems = query.trim() ? suggestions : history;
  const isDropdownVisible = focused && ((query.trim() && (suggestions.length > 0 || loadingSuggestions)) || (!query.trim() && history.length > 0));

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="pt-6 pb-4">
          <h1 className="text-lg font-bold text-gray-900">Search</h1>
        </div>
        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-0">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-colors ${focused ? 'border-blue-500 bg-white' : 'border-gray-200 bg-gray-50'}`}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 flex-shrink-0 fill-none stroke-current" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setFocused(true); }}
                onFocus={() => setFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search people, posts, topics…"
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Search"
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
                  className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500 hover:bg-gray-300 transition-colors"
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {isDropdownVisible && (
              <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-gray-200 overflow-y-auto max-h-[70vh] scrollbar-thin" role="listbox">
                {!query.trim() && history.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Recent</span>
                    <button onClick={handleClearAllHistory} className="text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors">Clear all</button>
                  </div>
                )}
                {query.trim() && loadingSuggestions && (
                  <div className="px-4 py-3 space-y-3">
                    {[0, 1, 2].map(e => (
                      <div className="flex items-center gap-3" key={e}>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 bg-gray-100 rounded-full w-2/5" />
                          <div className="h-2 bg-gray-100 rounded-full w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!loadingSuggestions && suggestionItems.map((n, r) => {
                  let isStr = typeof n === 'string';
                  let isSelected = r === selectedIndex;
                  let suggestionText = isStr ? n : n.type === 'user' ? n.username || n.fullname || '' : n.query || n.text || '';
                  let highlightText = isStr ? n : n.username || n.query || n.fullname || '';

                  return (
                    <div
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSuggestionClick(suggestionText)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      key={isStr ? n : n.username || String(r)}
                    >
                      {isStr ? (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                      ) : n.type === 'user' ? (
                        n.profile_pic ? <img src={n.profile_pic} alt={n.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" loading="lazy" /> : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                          </div>
                        )
                      ) : n.type === 'hashtag' ? (
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-500 font-black text-sm leading-none">#</span>
                        </div>
                      ) : n.type === 'mention' ? (
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-500 font-black text-sm leading-none">@</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400 fill-none stroke-current" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {isStr ? (
                          <p className="text-sm text-gray-700 truncate">{n}</p>
                        ) : n.type === 'user' ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                              <HighlightMatch text={String(n.fullname || n.username || '')} query={query} />
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              @{<HighlightMatch text={String(n.username || '')} query={query} />}
                            </p>
                          </>
                        ) : n.type === 'hashtag' ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              <HighlightMatch text={String(n.query || '')} query={query} />
                            </p>
                            <p className="text-xs text-gray-400">{n.count > 0 ? `${n.count} posts` : 'Hashtag'}</p>
                          </>
                        ) : n.type === 'mention' ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              <HighlightMatch text={String(n.query || '')} query={query} />
                            </p>
                            <p className="text-xs text-gray-400">{n.count > 0 ? `${n.count} mentions` : 'Mentioned user'}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              <HighlightMatch text={String(n.query || '')} query={query} />
                            </p>
                            <p className="text-xs text-gray-400">{n.count > 0 ? `${n.count} posts` : 'Topic'}</p>
                          </>
                        )}
                      </div>
                      {isStr ? (
                        <button onClick={e => handleRemoveFromHistory(n, e)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" aria-label={`Remove ${n} from history`}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {n.type === 'user' && n.profile_type && (
                            <span className="text-[10px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full">{(n.profile_type || '').toLowerCase() === 'organisation' ? 'Org' : 'Person'}</span>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setQuery(highlightText);
                              setFocused(true);
                              inputRef.current?.focus();
                            }}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Fill input with this suggestion"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => runSearch(query)}
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.96] transition-colors flex items-center justify-center"
            aria-label="Run search"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
          </button>
        </div>

        {/* Empty Search State: Explore Page */}
        {!searched && !query.trim() && (
          <div className="space-y-6 py-2">

            {/* Recent Searches */}
            {history.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Recent Searches</span>
                  <button onClick={handleClearAllHistory} className="text-xs font-bold text-red-400 hover:text-red-500 transition-colors">Clear All</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSuggestionClick(item)}
                      className="group flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl cursor-pointer text-xs font-semibold text-gray-700 active:scale-95 transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400 fill-none stroke-current" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
                      <span className="truncate max-w-[120px]">{item}</span>
                      <button
                        onClick={(e) => handleRemoveFromHistory(item, e)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-gray-200 transition-all flex-shrink-0"
                      >
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-none stroke-current" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* Suggested Creators */}
            {exploreSuggestions.length > 0 && (
              <div className="bg-gray-50 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4 px-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Creators to Follow</span>
                  <button onClick={() => window.Lexum?.navigate('/connections')} className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">See all</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {exploreSuggestions.map((user) => {
                    const isOrg = (user.profile_type || '').toLowerCase() === 'organisation';
                    const isConnected = user.relation === 'following' || user.relation === 'friended';
                    const btnText = isOrg ? (isConnected ? 'Following' : 'Follow') : (isConnected ? 'Friends' : 'Add Friend');
                    const actName = isOrg ? (isConnected ? 'unfollow' : 'follow') : (isConnected ? 'unfriend' : 'friend');

                    return (
                      <div
                        key={user.username}
                        onClick={() => window.Lexum?.navigate(`/@${user.username}`)}
                        className="flex items-center gap-3 p-3 bg-white hover:bg-gray-100 border border-gray-100 rounded-2xl cursor-pointer transition-colors"
                      >
                        <img
                          src={user.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg'}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate leading-snug">{user.fullname}</p>
                          <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
                          {user.mutuals > 0 && (
                            <p className="text-[9px] text-blue-500 font-semibold mt-0.5">{user.mutuals} mutual friend{user.mutuals > 1 ? 's' : ''}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExploreRelationChange(user.username, actName, user.profile_type);
                          }}
                          className={`flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full transition-all active:scale-95 ${isConnected
                              ? 'bg-gray-200 text-gray-600'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                          {btnText}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Skeletons */}
        {loadingResults && (
          <div className="rounded-2xl overflow-hidden">
            {[0, 1, 2, 3, 4].map(e => (
              <div className="flex items-center gap-3 px-4 py-3" key={e}>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/4" />
                </div>
                <div className="w-20 h-7 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400 fill-none stroke-current flex-shrink-0" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Results Filters tabs */}
        {searched && !loadingResults && searchResults.length > 0 && (
          <div className="flex gap-1 mb-5">
            {[
              { key: 'users', label: 'People', count: usersResults.length },
              { key: 'posts', label: 'Posts', count: postsResults.length }
            ].map(tab => (
              <button
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                key={tab.key}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-full block" />}
              </button>
            ))}
          </div>
        )}

        {/* No Results State */}
        {searched && !loadingResults && !error && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-gray-400 fill-none stroke-current" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">No results for "{query}"</p>
            <p className="text-xs text-gray-400">Try different keywords or check the spelling</p>
          </div>
        )}

        {/* Users Results list tab */}
        {!loadingResults && activeTab === 'users' && usersResults.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-gray-50">
            {usersResults.map((t, idx) => {
              let isOrg = (t.profile_type || '').toLowerCase() === 'organisation';
              let isConnected = t.relation === 'following' || t.relation === 'friended';
              let buttonText = isOrg ? (t.relation === 'following' ? 'Following' : 'Follow') : (t.relation === 'friended' ? 'Friends' : 'Add Friend');
              let actionName = isOrg ? (t.relation === 'following' ? 'unfollow' : 'follow') : (t.relation === 'friended' ? 'unfriend' : 'friend');

              return (
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => window.Lexum ? window.Lexum.navigate(`/@${t.username}`) : (window.location.hash = `/@${t.username}`)}
                  key={t.username}
                >
                  <img src={t.profile_pic || '/assets/default-avatar.jpg'} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt={t.username} loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate leading-snug">
                        <HighlightMatch text={t.fullname || t.username} query={query} />
                      </p>
                      {isOrg && <span className="text-[9px] font-bold text-blue-500 border border-blue-200 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">ORG</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">@{<HighlightMatch text={t.username} query={query} />}</p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRelationChange(t.username, actionName, t.profile_type);
                    }}
                    className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isConnected ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Posts Results list tab */}
        {!loadingResults && activeTab === 'posts' && postsResults.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-gray-50">
            <HomeFeed propPosts={postsResults} />
          </div>
        )}
      </div>
    </div>
  );
}
