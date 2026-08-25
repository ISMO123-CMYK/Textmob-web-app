import * as v from 'react';
import * as W from 'react';
import { apiFetch } from '../../config/api';
import HomeFeed from '../home/HomeFeed';

const J = apiFetch;
const X = (...e) => e.filter(Boolean).join(' ');
const _Component28 = HomeFeed;
const PROFILE_POST_LIMIT = 24;
const normalizeProfilePosts = e => (Array.isArray(e) ? e : []).map(e => e?.type ? e : { ...e, type: `post` });

function _Component15({
 targetUsername: e,
 currentUsername: t,
 onUpdate: n
}) {
 let [r, i] = v.useState(`loading`);
 let [a, o] = v.useState(`individual`);
 let [s, c] = v.useState(false);
 v.useEffect(() => {
 if (!e || !t) {
 if (!t) { window.showAuthPrompt?.('Log in to follow users'); }
 return;
 }
 let n = true;
 i(`loading`);
 J(`/follow-status?from=${encodeURIComponent(t)}&to=${encodeURIComponent(e)}`).then(e => e.json()).then(e => {
 if (n) {
 i(e.status || `not_friended`);
 o((e.profileType || `individual`).toLowerCase());
 }
 }).catch(() => n && i(`not_friended`)).finally(() => {});
 return () => {
 n = false;
 };
 }, [e, t]);
 async function l() {
 if (!s && r !== `loading`) {
 c(true);
 try {
 let o = a !== `individual`;
 let s = o ? `/follow` : `/friend`;
 let c = o ? r === `following` ? `unfollow` : `follow` : r === `friended` ? `unfriend` : `friend`;
 let l = await J(s, {
 method: `POST`,
 headers: {
 "Content-Type": `application/json`
 },
 body: JSON.stringify({
 username: e,
 currentUsername: t,
 action: c
 })
 });
 let u = await l.json();
 if (!l.ok) {
 throw Error(u.error || `Failed`);
 }
 i(u.status);
 n?.(u.status);
 } catch (e) {
 console.error(`FollowButton:`, e);
 } finally {
 c(false);
 }
 }
 }
 let u = r === `loading` ? `â€¦` : r === `friended` ? `Friends` : r === `following` ? `Following` : r === `not_following` ? `Follow` : `Add Friend`;
 const Component2053 = `button`;
 return <Component2053 onClick={l} disabled={s || r === `loading`} className={X(`text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95`, s || r === `loading` ? `bg-gray-100 text-gray-400 cursor-wait` : r === `friended` || r === `following` ? `bg-gray-100 text-gray-700 ` : `bg-blue-600 text-white hover:bg-blue-700`)}>{s ? `Wait...` : u}</Component2053>;
}

function _Component38({
 username: e
}) {
 let [t, n] = v.useState(null);
 let [r, i] = v.useState([]);
 let [a, o] = v.useState([]);
 let [s, c] = v.useState([]);
 let [l, u] = v.useState({});
 let [d, f] = v.useState({});
 let [p, m] = v.useState(true);
 let [h, g] = v.useState(false);
 let [_, y] = v.useState(false);
 let [b, x] = v.useState(``);
 let [S, C] = v.useState(`posts`);
 let [w, T] = v.useState(false);
 let [E, D] = v.useState(`grid`);
 let [postPage, setPostPage] = v.useState(1);
 let [hasMorePosts, setHasMorePosts] = v.useState(false);
 let [loadingMorePosts, setLoadingMorePosts] = v.useState(false);
 let O = localStorage.currentUser;
 let k = e => {
 let t = Number(e) || 0;
 if (t >= 1000000) {
 return `${(t / 1000000).toFixed(t % 1000000 == 0 ? 0 : 1)}M`;
 } else if (t >= 1000) {
 return `${(t / 1000).toFixed(t % 1000 == 0 ? 0 : 1)}K`;
 } else {
 return String(t);
 }
 };
 v.useEffect(() => {
 let t = true;
 m(true);
 x(``);
 n(null);
 i([]);
 setPostPage(1);
 setHasMorePosts(false);
 async function r() {
 try {
 let [r, a] = await Promise.all([J(`/profile/${encodeURIComponent(e)}`), J(`/get-user-posts?username=${encodeURIComponent(e)}&page=1&limit=${PROFILE_POST_LIMIT}`)]);
 if (!r.ok) {
 throw Error(`Profile not found`);
 }
 let s = await r.json();
 let l = a.ok ? await a.json() : [];
 if (!t) {
 return;
 }
 n(s);
 let u = normalizeProfilePosts(l);
 i(u.slice(0, PROFILE_POST_LIMIT));
 setHasMorePosts(u.length > PROFILE_POST_LIMIT);
 o((s.profile_type || ``).toLowerCase() === `organisation` ? Array.isArray(s.followers) ? s.followers : [] : Array.isArray(s.friends) ? s.friends : []);
 c(Array.isArray(s.following) ? s.following : []);
 } catch (e) {
 if (t) {
 x(e.message || `Failed to load`);
 }
 } finally {
 if (t) {
 m(false);
 }
 }
 }
 r();
 return () => {
 t = false;
 };
 }, [e]);
 async function loadMorePosts() {
 if (loadingMorePosts || !hasMorePosts) {
 return;
 }
 setLoadingMorePosts(true);
 try {
 let nextPage = postPage + 1;
 let res = await J(`/get-user-posts?username=${encodeURIComponent(e)}&page=${nextPage}&limit=${PROFILE_POST_LIMIT}`);
 if (!res.ok) {
 throw Error(`Failed to load more posts`);
 }
 let data = await res.json();
 let batch = normalizeProfilePosts(data);
 i(prev => [...prev, ...batch.slice(0, PROFILE_POST_LIMIT)]);
 setPostPage(nextPage);
 setHasMorePosts(batch.length > PROFILE_POST_LIMIT);
 } catch (e) {
 console.error(`Profile posts:`, e);
 } finally {
 setLoadingMorePosts(false);
 }
 }
 if (p) {
 const Component2054 = `div`;
 const Component2055 = `div`;
 const Component2056 = `div`;
 const Component2057 = `div`;
 const Component2058 = `div`;
 const Component2059 = `div`;
 const Component2060 = `div`;
 const Component2061 = `div`;
 const Component2062 = `div`;
 const Component2063 = `div`;
 return <Component2063 className={`min-h-screen bg-white `}><Component2054 className={`h-36 md:h-48 bg-gray-100 animate-pulse`} /><Component2062 className={`max-w-2xl mx-auto px-4`}><Component2057 className={`flex items-end justify-between -mt-10 mb-4`}><Component2055 className={`w-20 h-20 rounded-full bg-gray-200 animate-pulse border-4 border-white `} /><Component2056 className={`w-24 h-8 rounded-full bg-gray-100 animate-pulse`} /></Component2057><Component2061 className={`space-y-2`}><Component2058 className={`h-5 bg-gray-100 rounded-full w-1/3 animate-pulse`} /><Component2059 className={`h-3 bg-gray-100 rounded-full w-1/4 animate-pulse`} /><Component2060 className={`h-3 bg-gray-100 rounded-full w-2/3 animate-pulse mt-3`} /></Component2061></Component2062></Component2063>;
 }
 if (b) {
 const Component2064 = `p`;
 const Component2065 = `button`;
 const Component2066 = `div`;
 const Component2067 = `div`;
 return <Component2067 className={`min-h-screen bg-white flex items-center justify-center`}><Component2066 className={`text-center px-6`}><Component2064 className={`text-sm text-red-500 mb-2`}>{b}</Component2064><Component2065 onClick={() => window.history.back()} className={`text-xs font-semibold text-blue-600 hover:underline`}>{`Go back`}</Component2065></Component2066></Component2067>;
 }
 if (!t) {
 return null;
 }
 let A = (t.profile_type || ``).toLowerCase() === `organisation`;
 let j = O === t.username;
 let M = a.map(e => l[e]).filter(Boolean);
 let N = s.map(e => d[e]).filter(Boolean);
 let P = t.biography || ``;
 let ee = P.split(`
`);
 let F = P.length > 120 || ee.length > 3;
 let I = F ? `${P.slice(0, 120).trimEnd()}â€¦` : P;
 let te = [{
 id: `posts`,
 label: `Posts`,
 count: t?.post_count ?? r.length
 }, {
 id: `connections`,
 label: A ? `Followers` : `Friends`,
 count: a.length
 }, {
 id: `following`,
 label: `Following`,
 count: s.length
 }];
 const Component2068 = `img`;
 const Component2069 = `path`;
 const Component2070 = `pattern`;
 const Component2071 = `defs`;
 const Component2072 = `rect`;
 const Component2073 = `svg`;
 const Component2074 = `div`;
 const Component2075 = `path`;
 const Component2076 = `svg`;
 const Component2077 = `button`;
 const Component2078 = `div`;
 const Component2079 = `img`;
 const Component2080 = `path`;
 const Component2081 = `svg`;
 const Component2082 = `div`;
 const Component2083 = `div`;
 const Component2084 = `a`;
 const Component2085 = `a`;
 const Component2086 = `div`;
 const Component2087 = `div`;
 const Component2088 = `h1`;
 const Component2089 = `span`;
 const Component2090 = `div`;
 const Component2091 = `p`;
 const Component2092 = `div`;
 const Component2093 = `p`;
 const Component2094 = `button`;
 const Component2095 = `div`;
 const Component2096 = `path`;
 const Component2097 = `svg`;
 const Component2098 = `div`;
 const Component2099 = `path`;
 const Component2100 = `svg`;
 const Component2101 = `a`;
 const Component2102 = `rect`;
 const Component2103 = `line`;
 const Component2104 = `line`;
 const Component2105 = `line`;
 const Component2106 = `svg`;
 const Component2107 = `div`;
 const Component2108 = `div`;
 const Component2109 = `span`;
 const Component2110 = `span`;
 const Component2111 = `button`;
 const Component2112 = `span`;
 const Component2113 = `span`;
 const Component2114 = `button`;
 const Component2115 = `span`;
 const Component2116 = `span`;
 const Component2117 = `div`;
 const Component2118 = `div`;
 const Component2119 = `div`;
 const Component2120 = `span`;
 const Component2121 = `span`;
 const Component2122 = `button`;
 const Component2123 = `div`;
 const Component2124 = `div`;
 const Component2125 = `rect`;
 const Component2126 = `rect`;
 const Component2127 = `rect`;
 const Component2128 = `rect`;
 const Component2129 = `svg`;
 const Component2130 = `button`;
 const Component2131 = `path`;
 const Component2132 = `svg`;
 const Component2133 = `button`;
 const Component2134 = `div`;
 const Component2135 = `div`;
 const Component2136 = `div`;
 const Component2137 = `div`;
 const Component2138 = `div`;
 const Component2139 = `div`;
 const Component2140 = `div`;
 return <Component2140 className={`min-h-screen bg-white pb-24 md:pb-8`}><Component2078 className={`relative h-36 md:h-48 bg-gray-100 overflow-hidden`}>{t.cover_photo ? <Component2068 src={t.cover_photo} alt={`Cover`} className={`w-full h-full object-cover`} /> : <Component2074 className={`w-full h-full`} style={{
 background: `linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f0f4ff 100%)`
 }}><Component2073 width={`100%`} height={`100%`} xmlns={`http://www.w3.org/2000/svg`} className={`opacity-30`}><Component2071><Component2070 id={`grid`} width={`40`} height={`40`} patternUnits={`userSpaceOnUse`}><Component2069 d={`M 40 0 L 0 0 0 40`} fill={`none`} stroke={`#3b82f6`} strokeWidth={`0.5`} /></Component2070></Component2071><Component2072 width={`100%`} height={`100%`} fill={`url(#grid)`} /></Component2073></Component2074>}<Component2077 onClick={() => window.history.back()} className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors`} aria-label={`Go back`}><Component2076 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}><Component2075 strokeLinecap={`round`} strokeLinejoin={`round`} d={`M15 19l-7-7 7-7`} /></Component2076></Component2077></Component2078><Component2119 className={`max-w-2xl mx-auto px-4`}><Component2087 className={`flex items-start justify-between -mt-10 md:-mt-12 mb-3`}><Component2083 className={`relative flex-shrink-0`}><Component2079 src={t.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.fullname || t.username)}&background=e2e8f0&color=1e293b&size=128`} alt={t.fullname || t.username} className={`w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white `} />
 </Component2083>
 <Component2086 className={`flex items-center gap-2 mt-12 md:mt-14`}>{j ? <Component2084 href={`/accountscenter`} data-lexum={true} className={`px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors`}>{`Edit profile`}</Component2084> : O ? <_Component15 targetUsername={t.username} currentUsername={O} onUpdate={() => {}} /> : <><Component2084 href={`/auth`} data-lexum={true} className={`px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-colors`}>{`Log in`}</Component2084><Component2084 href={`/auth`} data-lexum={true} className={`px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors`}>{`Sign up`}</Component2084></>}{!j && O && <Component2085 href={`/chats?with=${t.username}`} data-lexum={true} className={`px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-colors`}>{`Message`}</Component2085>}</Component2086></Component2087><Component2092 className={`mb-3`}><Component2090 className={`flex items-center gap-2 flex-wrap`}><Component2088 className={`text-xl font-bold text-gray-900 leading-tight`}>
 {t.fullname || t.username}
 {t.verified && (
 <span className="inline-flex items-center gap-1 ml-1.5 text-white font-bold text-[10px] bg-blue-600 px-1.5 py-0.5 rounded-full shadow-sm">
 <Component2081 viewBox={`0 0 24 24`} className={`w-3 h-3 fill-current text-white`}>
 <Component2080 d={`M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z`} />
 </Component2081>
 Verified
 </span>
 )}
 </Component2088>
 {A && <Component2089 className={`text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 `}>{`Organisation`}</Component2089>}</Component2090><Component2091 className={`text-sm text-gray-400 `}>{`@`}{t.username}</Component2091></Component2092>{P && <Component2095 className={`mb-4`}><Component2093 className={`text-sm text-gray-700 leading-relaxed whitespace-pre-line`}>{w ? P : I}</Component2093>{F && <Component2094 onClick={() => T(e => !e)} className={`text-xs font-semibold text-blue-600 hover:underline mt-1`}>{w ? `Show less` : `Show more`}</Component2094>}</Component2095>}<Component2108 className={`flex flex-wrap items-center gap-x-4 gap-y-1 mb-4`}>{t.location && <Component2098 className={`flex items-center gap-1 text-xs text-gray-400 `}><Component2097 viewBox={`0 0 24 24`} className={`w-3.5 h-3.5 fill-none stroke-current`} strokeWidth={`2`}><Component2096 strokeLinecap={`round`} strokeLinejoin={`round`} d={`M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z`} /></Component2097>{t.location}</Component2098>}{t.website && <Component2101 href={t.website} target={`_blank`} rel={`noreferrer`} className={`flex items-center gap-1 text-xs text-blue-600 hover:underline`}><Component2100 viewBox={`0 0 24 24`} className={`w-3.5 h-3.5 fill-none stroke-current`} strokeWidth={`2`}><Component2109 strokeLinecap={`round`} strokeLinejoin={`round`} d={`M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m.758-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1`} /></Component2100>{t.website.replace(/^https?:\/\//, ``)}</Component2101>}{t.created_at && (
 <span className="flex items-center gap-1 text-xs text-gray-500 ">
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 Joined {new Date(t.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
 </span>
)}</Component2108><Component2118 className={`flex items-center gap-6 mb-1 pb-4 border-b border-gray-100 `}><Component2111 onClick={() => C(`connections`)} className={`flex items-baseline gap-1.5 hover:underline`}><Component2109 className={`text-sm font-bold text-gray-900 `}>{k(a.length)}</Component2109><Component2110 className={`text-xs text-gray-400 `}>{A ? `Followers` : `Friends`}</Component2110></Component2111><Component2114 onClick={() => C(`following`)} className={`flex items-baseline gap-1.5 hover:underline`}><Component2112 className={`text-sm font-bold text-gray-900 `}>{k(s.length)}</Component2112><Component2113 className={`text-xs text-gray-400 `}>{`Following`}</Component2113></Component2114><Component2117 className={`flex items-baseline gap-1.5`}><Component2115 className={`text-sm font-bold text-gray-900 `}>{k(t?.post_count ?? r.length)}</Component2115><Component2116 className={`text-xs text-gray-400 `}>{`Posts`}</Component2116></Component2117></Component2118></Component2119><Component2124 className={`max-w-2xl mx-auto sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 `}><Component2123 className={`flex px-4`}>{te.map(e => <Component2122 onClick={() => C(e.id)} className={X(`flex-1 py-3.5 text-sm font-semibold relative transition-colors`, S === e.id ? `text-gray-900 ` : `text-gray-400 hover:text-gray-600 `)} key={e.id}>{e.label}{e.count > 0 && <Component2120 className={X(`ml-1.5 text-[11px] font-bold`, S === e.id ? `text-blue-600 ` : `text-gray-300 `)}>{k(e.count)}</Component2120>}{S === e.id && <Component2121 className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full`} />}</Component2122>)}</Component2123></Component2124><Component2139 className={`max-w-2xl mx-auto`}>{S === `posts` && <Component2138><Component2135 className={`flex items-center justify-end px-4 py-3 border-b border-gray-100 `}><Component2134 className={`flex items-center gap-1 bg-gray-100 rounded-full p-1`}><Component2130 onClick={() => D(`grid`)} className={X(`w-8 h-7 rounded-full flex items-center justify-center transition-colors`, E === `grid` ? `bg-white text-blue-600 ` : `text-gray-400 `)} aria-label={`Grid view`}><Component2129 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2`}><Component2125 x={`3`} y={`3`} width={`7`} height={`7`} rx={`1`} /><Component2126 x={`14`} y={`3`} width={`7`} height={`7`} rx={`1`} /><Component2127 x={`14`} y={`14`} width={`7`} height={`7`} rx={`1`} /><Component2128 x={`3`} y={`14`} width={`7`} height={`7`} rx={`1`} /></Component2129></Component2130><Component2133 onClick={() => D(`feed`)} className={X(`w-8 h-7 rounded-full flex items-center justify-center transition-colors`, E === `feed` ? `bg-white text-blue-600 ` : `text-gray-400 `)} aria-label={`Feed view`}><Component2132 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2`}><Component2131 strokeLinecap={`round`} strokeLinejoin={`round`} d={`M4 6h16M4 12h8m-8 6h16`} /></Component2132></Component2133></Component2134></Component2135>{r.length === 0 ? <Component2136 className={`py-16 text-center text-sm text-gray-400 `}>{`No posts yet.`}</Component2136> : E === `grid` ? <_Component36 posts={r} /> : _Component28 === undefined ? <Component2137 className={`p-4 text-sm text-gray-400`}>{`Feed unavailable`}</Component2137> : <_Component28 propPosts={r} />}{hasMorePosts && <button onClick={loadMorePosts} disabled={loadingMorePosts} className={`mx-auto my-6 block px-5 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-wait transition-colors`}>{loadingMorePosts ? `Loading...` : `Load more`}</button>}</Component2138>}{S === `connections` && <_Component37 users={M} loading={h} empty={`Not visible to you`} currentUser={O} />}{S === `following` && <_Component37 users={N} loading={_} empty={`This content is not visible to you`} currentUser={O} />}</Component2139></Component2140>;
}

function _Component36({
 posts: e
}) {
 const Component2159 = `div`;
 return <Component2159 className={`grid grid-cols-3 gap-px bg-gray-100 `}>{e.map((e, t) => {
 let n = Array.isArray(e.media) && e.media.length ? e.media[0] : null;
 let r = n && /\.(mp4|webm|ogg)$/i.test(n);
 let i = e.text || e.content || ``;
 const Component2141 = `video`;
 const Component2142 = `img`;
 const Component2143 = `path`;
 const Component2144 = `svg`;
 const Component2145 = `div`;
 const Component2146 = `p`;
 const Component2147 = `div`;
 const Component2148 = `path`;
 const Component2149 = `svg`;
 const Component2150 = `div`;
 const Component2151 = `path`;
 const Component2152 = `svg`;
 const Component2153 = `div`;
 const Component2154 = `div`;
 const Component2155 = `path`;
 const Component2156 = `svg`;
 const Component2157 = `div`;
 const Component2158 = `a`;
 return <Component2158 href={`/post/${e.id}`} data-lexum={true} className={`relative aspect-square bg-white overflow-hidden group block`} key={e.id || t}>{n ? <W.Fragment>{r ? <Component2141 src={n} muted={true} preload={`metadata`} className={`w-full h-full object-cover`} /> : <Component2142 src={n} alt={``} loading={`lazy`} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105`} />}{r && <Component2145 className={`absolute top-2 right-2`}><Component2144 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-white drop-shadow`}><Component2143 d={`M8 5v14l11-7z`} /></Component2144></Component2145>}</W.Fragment> : <Component2147 className={`w-full h-full flex items-center justify-center p-3 bg-gray-50 `}><Component2146 className={`text-xs text-gray-600 line-clamp-4 text-center leading-relaxed`}>{i || `â€”`}</Component2146></Component2147>}<Component2154 className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4`}><Component2150 className={`flex items-center gap-1 text-white text-xs font-bold`}><Component2149 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-white`}><Component2148 d={`M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z`} /></Component2149>{Array.isArray(e.likes) ? e.likes.length : 0}</Component2150><Component2153 className={`flex items-center gap-1 text-white text-xs font-bold`}><Component2152 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-white`}><Component2151 d={`M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z`} /></Component2152>{Array.isArray(e.comments) ? e.comments.length : 0}</Component2153></Component2154>{Array.isArray(e.media) && e.media.length > 1 && <Component2157 className={`absolute top-2 right-2`}><Component2156 viewBox={`0 0 24 24`} className={`w-4 h-4 fill-white drop-shadow`}><Component2155 d={`M2 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm14-2H8v12h8V4z`} /></Component2156></Component2157>}</Component2158>;
 })}</Component2159>;
}

function _Component37({
 users: e,
 loading: t,
 empty: n,
 currentUser: r
}) {
 if (t) {
 const Component2160 = `div`;
 const Component2161 = `div`;
 const Component2162 = `div`;
 const Component2163 = `div`;
 const Component2164 = `div`;
 const Component2165 = `div`;
 return <Component2165 className={`divide-y divide-gray-100 `}>{[,,,,,].fill(0).map((e, t) => <Component2164 className={`flex items-center gap-3 px-4 py-3`} key={t}><Component2160 className={`w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0`} /><Component2163 className={`flex-1 space-y-2`}><Component2161 className={`h-3 bg-gray-100 rounded-full w-1/3 animate-pulse`} /><Component2162 className={`h-2.5 bg-gray-100 rounded-full w-1/4 animate-pulse`} /></Component2163></Component2164>)}</Component2165>;
 } else if (e.length) {
 const Component2166 = `img`;
 const Component2167 = `a`;
 const Component2168 = `p`;
 const Component2169 = `p`;
 const Component2170 = `a`;
 const Component2171 = `p`;
 const Component2172 = `div`;
 const Component2173 = `div`;
 const Component2174 = `div`;
 return <Component2174 className={`divide-y divide-gray-100 `}>{e.map(e => <Component2173 className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors`} key={e.username}><Component2167 href={`/@${e.username}`} data-lexum={true} className={`flex-shrink-0`}><Component2166 src={e.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.fullname || e.username)}&background=e2e8f0&color=1e293b&size=80`} alt={e.fullname || e.username} className={`w-10 h-10 rounded-full object-cover`} loading={`lazy`} /></Component2167><Component2172 className={`flex-1 min-w-0`}><Component2170 href={`/@${e.username}`} data-lexum={true} className={`block`}><Component2168 className={`text-sm font-bold text-gray-900 truncate leading-snug`}>{e.fullname || e.username}</Component2168><Component2169 className={`text-xs text-gray-400 truncate`}>{`@`}{e.username}</Component2169></Component2170>{e.biography && <Component2171 className={`text-xs text-gray-500 truncate mt-0.5`}>{e.biography.slice(0, 60)}{e.biography.length > 60 ? `â€¦` : ``}</Component2171>}</Component2172>{e.username !== r && <_Component15 targetUsername={e.username} currentUsername={r} onUpdate={() => {}} />}</Component2173>)}</Component2174>;
 } else {
 const Component2175 = `div`;
 return <Component2175 className={`py-16 text-center text-sm text-gray-400 `}>{n}</Component2175>;
 }
}

export default function ProfileContent() {
 const currentUser = localStorage.getItem('currentUser') || localStorage.currentUser || '';
 const path = window.location.pathname;
 let target = currentUser;
 if (path.startsWith('/@')) {
 const raw = path.slice(2);
 try {
 target = decodeURIComponent(raw);
 } catch {
 target = raw;
 }
 }

 return <_Component38 username={target} />;
}
