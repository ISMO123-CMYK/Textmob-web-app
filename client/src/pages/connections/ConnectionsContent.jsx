import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';

function ConnectionRow({ item, name, full, following, handleFollow }) {
 const [profilePic, setProfilePic] = useState(item.profile_pic || null);

 useEffect(() => {
 if (typeof item === 'string') {
 apiFetch(`/profile-pic/${encodeURIComponent(item)}`)
 .then(r => r.ok ? r.json() : null)
 .then(data => {
 if (data && data.profile_pic) {
 setProfilePic(data.profile_pic);
 }
 })
 .catch(err => console.error("Error fetching pic", err));
 }
 }, [item]);

 return (
 <div className="flex items-center gap-3 p-4 lg:p-5 rounded-2xl border border-[#E7EAF2] bg-white shadow-sm hover:shadow-md hover:border-brand-200 transition-all">
 {profilePic ? (
 <img src={profilePic} alt={name} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-100 " />
 ) : (
 <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
 {(name || '?')[0].toUpperCase()}
 </div>
 )}
 <div className="flex-1 min-w-0">
 <a href={`/@${name}`} className="text-sm font-bold text-gray-900 hover:text-brand-600 truncate block">{full}</a>
 <p className="text-xs text-gray-400 truncate">@{name}</p>
 </div>
 <button onClick={() => handleFollow(name)} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${following.includes(name) ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
 {following.includes(name) ? 'Following' : 'Follow'}
 </button>
 </div>
 );
}

export default function ConnectionsContent() {
 useEffect(() => { if (!localStorage.currentUser) { window.Lexum ? window.Lexum.navigate('/auth') : window.location.href = '/auth'; } }, []);
 const [tab, setTab] = useState('followers');
 const [followers, setFollowers] = useState([]);
 const [following, setFollowing] = useState([]);
 const [suggestions, setSuggestions] = useState([]);
 const [loading, setLoading] = useState(true);
 const username = localStorage.getItem('currentUser') || '';

 useEffect(() => {
 Promise.allSettled([
 apiFetch(`/profile/${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : null),
 apiFetch(`/get-suggestions-feed?username=${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : []),
 ]).then(([prof, sugg]) => {
 const p = prof.status === 'fulfilled' ? prof.value : null;
 setFollowers(Array.isArray(p?.followers) ? p.followers : []);
 setFollowing(Array.isArray(p?.following) ? p.following : []);
 setSuggestions(sugg.status === 'fulfilled' && Array.isArray(sugg.value) ? sugg.value : []);
 setLoading(false);
 });
 }, [username]);

 async function handleFollow(target) {
 try {
 const res = await apiFetch(`/follow-status?from=${encodeURIComponent(username)}&to=${encodeURIComponent(target)}`);
 if (!res.ok) return;
 const data = await res.json();
 const isOrg = data.profileType !== 'individual';
 const isConnected = data.status === 'following' || data.status === 'friended';

 if (isConnected) {
 const endpoint = isOrg ? '/follow' : '/friend';
 const action = isOrg ? 'unfollow' : 'unfriend';
 await apiFetch(endpoint, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ username: target, currentUsername: username, action }),
 });
 setFollowing(prev => prev.filter(u => u !== target));
 } else {
 const endpoint = isOrg ? '/follow' : '/friend';
 const action = isOrg ? 'follow' : 'friend';
 await apiFetch(endpoint, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ username: target, currentUsername: username, action }),
 });
 setFollowing(prev => [...prev, target]);
 }
 } catch (err) {
 console.error("handleFollow error:", err);
 }
 }

 const tabs = [
 { key: 'followers', label: 'Followers', count: followers.length },
 { key: 'following', label: 'Following', count: following.length },
 { key: 'suggestions', label: 'Discover', count: suggestions.length },
 ];
 const list = tab === 'followers' ? followers : tab === 'following' ? following : suggestions;

 if (loading) return <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}</div>;

 return (
 <div>
 <div className="hidden md:flex sticky top-0 z-30 bg-white/95 border-b border-[#E7EAF2] px-8 h-20 items-center">
 <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Connections</h1>
 </div>
 <div className="border-b border-[#E7EAF2] bg-white flex px-3 md:px-8">
 {tabs.map(t => (
 <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-3 text-sm font-bold text-center transition-colors relative ${tab === t.key ? 'text-brand-600' : 'text-gray-400 hover:text-gray-700'}`}>
 {t.label} <span className="text-xs ml-1 opacity-60">{t.count}</span>
 {tab === t.key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-600 rounded-full" />}
 </button>
 ))}
 </div>
 <div className="max-w-5xl mx-auto p-4 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
 {list.length === 0 ? (
 <div className="md:col-span-2 rounded-2xl border border-dashed border-[#D9DEEA] bg-white text-center py-20"><p className="text-sm font-bold text-gray-900">No {tab} yet</p><p className="text-xs text-gray-400 mt-1">Start connecting with people</p></div>
 ) : list.map((item, i) => {
 const name = typeof item === 'string' ? item : (item.username || '');
 const full = typeof item === 'object' ? (item.fullname || name) : name;
 return (
 <ConnectionRow
 key={name || i}
 item={item}
 name={name}
 full={full}
 following={following}
 handleFollow={handleFollow}
 />
 );
 })}
 </div>
 </div>
 );
}

