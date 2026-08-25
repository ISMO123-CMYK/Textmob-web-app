const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import NavIcons from '../../utils/navIcons';
import Ye from '../../components/ui/BottomSheet';
import AutocompleteDropdown from '../../components/layout/AutocompleteDropdown';
import { CATEGORIES as CATEGORY_LIST, CATEGORY_IDS } from '../../data/categories';

// Import fabric.js from CDN or global fabric variable

export default function MakePostContent(props) {
 useEffect(() => { if (!localStorage.currentUser) { window.Lexum ? window.Lexum.navigate('/auth') : window.location.href = '/auth'; } }, []);
 const onToggle = props?.onToggle;

 let [e, t] = useState(false);
 let [n, r] = useState(``);
 let [i, a] = useState([]);
 let [o, s] = useState([]);
 let [c, l] = useState(false);
 let [u, d] = useState(``);
 let [f, p] = useState(``);
 let g = useRef(null);
 let [D, O] = useState(null);
 let [k, A] = useState(false);
 let [j, M] = useState([
 { id: 1, text: ``, votes: [] },
 { id: 2, text: ``, votes: [] }
 ]);
 let [N, P] = useState(null);
 let [ee, F] = useState(false);
 let [I, te] = useState(false);
 let [L, ne] = useState(null);
 let [re, ie] = useState(``);
 let [ae, oe] = useState(`none`);
 let [R, se] = useState(`#ffffff`);
 let [z, B] = useState(`Arial`);
 let [ce, le] = useState(24);
 let [ue, de] = useState(0);
 let [fe, pe] = useState(false);
 let [me, he] = useState(false);
 let ge = useRef(null);
 let _e = useRef(null);
 let ve = useRef(null);
 let ye = useRef(null);
 let [be, xe] = useState([]);
 let [Se, Ce] = useState(0);
 let [we, Te] = useState(null);
 let [quotedPostId, setQuotedPostId] = useState(props.quoteId || null);
 let [quotedPostData, setQuotedPostData] = useState(null);
 let [postCategories, setPostCategories] = useState([]);
 const CATEGORIES = CATEGORY_LIST;

 useEffect(() => {
 if (quotedPostId) {
 fetchQuotedPost(quotedPostId);
 }
 }, [quotedPostId]);

 const fetchQuotedPost = async (id) => {
 try {
 const res = await apiFetch(`/get-post?postId=${id}`);
 if (res.ok) {
 setQuotedPostData(await res.json());
 }
 } catch (err) {
 console.error('Failed to fetch quoted post:', err);
 }
 };

 let Ee = i.length > 0;

 if (k) {
 j.every((e) => e.text.trim() !== ``);
 }

 let De = k;
 let Oe = Ee;
 let ke = k || i.length >= 10;

 let Ae = (e) => {
 let t = e.currentTarget.innerHTML;
 r(t);

 let n = window.getSelection();
 if (!n || !n.focusNode || !n.rangeCount) {
 return;
 }

 let range = n.getRangeAt(0);
 let preCaretRange = range.cloneRange();
 preCaretRange.selectNodeContents(e.currentTarget);
 preCaretRange.setEnd(range.endContainer, range.endOffset);
 let absOffset = preCaretRange.toString().length;

 let fullText = e.currentTarget.textContent || ``;
 let before = fullText.slice(0, absOffset);
 let mentionMatch = before.match(/@([\w.]*)$/);
 let hashMatch = before.match(/#([\w-]*)$/);

 if (mentionMatch && mentionMatch[1].length >= 1) {
 let q = mentionMatch[0];
 let start = absOffset - q.length;
 Te({ symbol: '@', start, end: absOffset, query: q });
 (async () => {
 try {
 let res = await apiFetch(`/search-users?q=${encodeURIComponent(mentionMatch[1])}&currentUsername=${localStorage.currentUser || ''}`);
 if (res.ok) {
 let data = await res.json();
 xe((Array.isArray(data) ? data : []).map(u => ({ type: 'user', ...u })));
 Ce(0);
 }
 } catch { }
 })();
 } else if (hashMatch && hashMatch[1].length >= 1) {
 let q = hashMatch[0];
 let start = absOffset - q.length;
 Te({ symbol: '#', start, end: absOffset, query: q });
 (async () => {
 try {
 let res = await apiFetch(`/search-suggest?query=${encodeURIComponent(q)}&currentUsername=${localStorage.currentUser || ''}`);
 if (res.ok) {
 xe((await res.json()) || []);
 Ce(0);
 }
 } catch { }
 })();
 } else {
 xe([]);
 Te(null);
 }
 };

 let je = (e) => {
 if (!we) {
 return;
 }

 let t = e.type === `user` ? `@${e.username}` : e.query;
 let { start: i, end: a } = we;
 let el = ge.current;
 if (!el) return;

 let sel = window.getSelection();
 let fullText = el.textContent || ``;
 let newText = `${fullText.slice(0, i)}${t} ${fullText.slice(a)}`;

 // Replace content while preserving cursor
 let childTextNodes = [];
 let walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
 while (walker.nextNode()) childTextNodes.push(walker.currentNode);

 el.textContent = newText;

 if (ge.current) {
 r(ge.current.innerHTML);
 }

 // Place cursor after inserted text
 let cursorPos = i + t.length + 1;
 let firstTextNode = el.firstChild;
 if (firstTextNode && firstTextNode.nodeType === 3) {
 try {
 let range = document.createRange();
 range.setStart(firstTextNode, Math.min(cursorPos, (firstTextNode.textContent || ``).length));
 range.collapse(true);
 sel.removeAllRanges();
 sel.addRange(range);
 } catch (err) {
 console.warn(`Failed reset range`, err);
 }
 }

 xe([]);
 Te(null);
 };

 let Me = (e) => {
 if (be.length > 0) {
 if (e.key === `ArrowDown`) {
 e.preventDefault();
 Ce((e) => (e + 1) % be.length);
 } else if (e.key === `ArrowUp`) {
 e.preventDefault();
 Ce((e) => (e - 1 + be.length) % be.length);
 } else if (e.key === `Enter` || e.key === `Tab`) {
 e.preventDefault();
 je(be[Se]);
 } else if (e.key === `Escape`) {
 e.preventDefault();
 xe([]);
 Te(null);
 }
 }
 };

 let Ne = [
 { name: `Happy`, emoji: `😊` },
 { name: `Sad`, emoji: `😢` },
 { name: `Excited`, emoji: `🎉` },
 { name: `Angry`, emoji: `😣` },
 { name: `Loved`, emoji: `🥰` },
 { name: `Grateful`, emoji: `🙏` },
 { name: `Tired`, emoji: `😴` },
 { name: `Confused`, emoji: `😕` },
 { name: `Nervous`, emoji: `😬` },
 { name: `Hopeful`, emoji: `🌟` },
 { name: `Proud`, emoji: `🏆` },
 { name: `Inspired`, emoji: `✨` },
 { name: `Lonely`, emoji: `😔` },
 { name: `Stressed`, emoji: `😓` },
 { name: `Relaxed`, emoji: `😌` }
 ];

 let Pe = [`Arial`, `Helvetica`, `Times New Roman`, `Courier New`, `Verdana`, `Georgia`];

 let Fe = [
 { id: `none`, label: `Original` },
 { id: `grayscale`, label: `B&W` },
 { id: `sepia`, label: `Sepia` },
 { id: `contrast`, label: `Vivid` },
 { id: `warm`, label: `Warm` },
 { id: `cool`, label: `Cool` }
 ];

 let Ie = {
 none: `none`,
 grayscale: `grayscale(100%)`,
 sepia: `sepia(80%)`,
 contrast: `contrast(130%) saturate(130%)`,
 warm: `sepia(40%) saturate(150%) hue-rotate(-20deg)`,
 cool: `hue-rotate(30deg) saturate(90%)`
 };

 useEffect(() => {
 let n = (n) => {
 if (n.key === `Escape`) {
 if (I) {
 te(false);
 return;
 }
 if (ee) {
 F(false);
 return;
 }
 if (e) {
 t(false);
 }
 }
 };

 window.addEventListener(`keydown`, n);
 return () => window.removeEventListener(`keydown`, n);
 }, [e, ee, I]);

 useEffect(() => {
 if (typeof onToggle === `function`) {
 onToggle(e);
 }
 }, [e, onToggle]);

 useEffect(() => {
 if (e && ge.current) {
 setTimeout(() => ge.current?.focus(), 100);
 }
 }, [e]);

 useEffect(() => {
 if (!I || !_e.current || L === null || !o[L]) {
 return;
 }

 let e = _e.current.parentElement;
 let t = Math.min(e?.offsetWidth || 500, e?.offsetHeight || 500, 600);
 let n = new fabric.Canvas(_e.current, {
 width: t,
 height: t,
 backgroundColor: `#000`
 });

 ve.current = n;

 let r = new Image();
 r.crossOrigin = `anonymous`;
 r.src = o[L].url;

 r.onload = () => {
 let e = Math.min(t / r.width, t / r.height);
 let i = new fabric.Image(r, {
 left: (t - r.width * e) / 2,
 top: (t - r.height * e) / 2,
 scaleX: e,
 scaleY: e,
 selectable: false
 });

 n.add(i);

 if (re) {
 n.add(
 new fabric.Text(re, {
 left: t / 2,
 top: t / 2,
 originX: `center`,
 originY: `center`,
 fontSize: ce,
 fill: R,
 fontFamily: z,
 angle: ue,
 fontWeight: me ? `bold` : `normal`,
 shadow: fe ? `rgba(0,0,0,0.6) 3px 3px 6px` : null
 })
 );
 }

 n.renderAll();
 };

 r.onerror = () => {
 d(`Failed to load image`);
 te(false);
 };

 return () => {
 ve.current &&= (ve.current.dispose(), null);
 };
 }, [I, L, re, R, z, ce, ue, fe, me, ae]);

 useEffect(() => () => o.forEach((e) => URL.revokeObjectURL(e.url)), []);

 let Le = (e) => {
 e.preventDefault();
 let t = e.clipboardData.getData(`text/plain`);
 document.execCommand(`insertText`, false, t);
 if (ge.current) {
 r(ge.current.innerHTML);
 }
 };

 let Re = (e, t = null) => {
 if (ge.current) {
 document.execCommand(e, false, t);
 r(ge.current.innerHTML);
 ge.current.focus();
 }
 };

 let ze = (e) => {
 if (!e?.length || De) {
 return;
 }

 let t = i.some((e) => e.type.startsWith(`image`));
 let n = i.some((e) => e.type.startsWith(`video`));

 let r = Array.from(e)
 .filter((e) => {
 let r = e.type.startsWith(`video`);
 let a = e.type.startsWith(`image`);

 if ((!a && !r) || e.size > 104857600 || (n && a) || (t && r)) {
 return false;
 } else if (r) {
 return i.length === 0;
 } else {
 return i.length < 10;
 }
 })
 .slice(0, n ? 0 : 10 - i.length);

 if (!r.length) {
 d(`Max 10 images or 1 video, 100MB limit.`);
 return;
 }

 let o = r.map((e) => ({
 file: e,
 url: URL.createObjectURL(e),
 type: e.type.startsWith(`video`) ? `video` : `image`,
 filter: `none`,
 text: ``,
 textColor: `#ffffff`,
 textFont: `Arial`,
 textSize: 24,
 textRotation: 0,
 textShadow: false
 }));

 a((e) => [...e, ...r]);
 s((e) => [...e, ...o]);
 d(``);
 };

 let Be = (e) => {
 URL.revokeObjectURL(o[e].url);
 s((t) => t.filter((t, n) => n !== e));
 a((t) => t.filter((t, n) => n !== e));
 };

 let Ve = () => {
 if (!Oe) {
 if (k) {
 A(false);
 M([
 { id: 1, text: ``, votes: [] },
 { id: 2, text: ``, votes: [] }
 ]);
 } else {
 A(true);
 }
 }
 };

 let He = () => {
 // AI Image Gen removed
 };

 let Ge = () => {
 if (ve.current) {
 apiFetch(
 ve.current.toDataURL({
 format: `png`
 })
 )
 .then((e) => e.blob())
 .then((e) => {
 let t = new File([e], `edited-${Date.now()}.png`, {
 type: `image/png`
 });

 a((e) => {
 let n = [...e];
 n[L] = t;
 return n;
 });

 s((e) => {
 let n = [...e];
 n[L] = {
 ...n[L],
 url: URL.createObjectURL(t),
 filter: ae,
 text: re,
 textColor: R,
 textFont: z,
 textSize: ce,
 textRotation: ue,
 textShadow: fe
 };
 return n;
 });

 te(false);
 ie(``);
 oe(`none`);
 se(`#ffffff`);
 B(`Arial`);
 le(24);
 de(0);
 pe(false);
 he(false);
 })
 .catch(() => d(`Failed to save edited image`));
 }
 };

 let Ke = async (e) => {
 // Write with AI removed
 };

 let qe = async (e) => {
 e?.stopPropagation();

 if (!n.trim() && i.length === 0) {
 d(`Write something or add media.`);
 return;
 }

 l(true);
 d(``);

 let c = ge.current
 ? (() => {
 let e = document.createElement(`div`);
 e.innerHTML = ge.current.innerHTML;
 e.querySelectorAll(`img.emoji`).forEach((e) => e.replaceWith(e.alt || ``));
 return window.DOMPurify ? window.DOMPurify.sanitize(e.innerHTML) : e.innerHTML;
 })()
 : ``;

 let u = window.twemoji
 ? window.twemoji.parse(c, {
 folder: `svg`,
 ext: `.svg`,
 base: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/`
 })
 : c;

 let f = new FormData();
 f.append(`username`, localStorage.currentUser || `Guest`);
 f.append(`text`, c);
 f.append(`parsed`, u);
 f.append(`visib`, `public`);

 if (quotedPostId) {
 f.append(`quoted_post_id`, quotedPostId);
 }

 if (N) {
 f.append(`activities`, `${N.name} ${N.emoji}`);
 }

 i.forEach((e) => f.append(`media`, e));

 if (k) {
 let e = j.filter((e) => e.text.trim());
 if (e.length < 2) {
 d(`At least 2 poll options required.`);
 l(false);
 return;
 }
 f.append(`options`, JSON.stringify(e));
 }

 if (postCategories.length > 0) {
 f.append(`categories`, JSON.stringify(postCategories));
 }

 try {
 let e = await apiFetch(`/create-post`, {
 method: `POST`,
 body: f
 });
 let n = await e.json();

 if (!e.ok) {
 throw Error(n.error || `Upload failed`);
 }

 p(`Post is live ✦`);
 r(``);
 a([]);
 o.forEach((e) => URL.revokeObjectURL(e.url));
 s([]);
 P(null);
 A(false);
 M([
 { id: 1, text: ``, votes: [] },
 { id: 2, text: ``, votes: [] }
 ]);

 if (ge.current) {
 ge.current.innerHTML = ``;
 }

 setTimeout(() => {
 t(false);
 p(``);
 }, 800);

 if (window.Lexum) {
 window.Lexum.navigate(`/`);
 } else {
 window.location.hash = `/`;
 }
 } catch (e) {
 d(e.message);
 } finally {
 l(false);
 }
 };

 let Je = n.replace(/<[^>]+>/g, ``).length;

 return (
 <Fragment>
 <div className={`relative flex items-center justify-center w-full py-4`}>
 <button
 onClick={() => window.history.back()}
 className={`absolute left-4 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors`}
 aria-label={`Go back`}
 >
 <svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M15 19l-7-7 7-7`} />
 </svg>
 </button>

 <button
 onClick={() => t(true)}
 className={`w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center active:scale-90 hover:bg-blue-700 transition-all`}
 aria-label={`Create post`}
 >
 <svg className={`w-7 h-7 text-white`} fill={`none`} stroke={`currentColor`} viewBox={`0 0 24 24`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} strokeWidth={`2.5`} d={`M12 4v16m8-8H4`} />
 </svg>
 </button>
 </div>

 {e && (
 <div className={`fixed inset-0 z-50 bg-white flex flex-col md:bg-black/40 md:items-center md:justify-center`}>
 <div
 className={`flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl md:border border-gray-100 bg-white overflow-hidden`}
 onClick={(e) => e.stopPropagation()}
 >
 <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0`}>
 <button
 onClick={() => t(false)}
 className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors`}
 >
 <svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} />
 </svg>
 </button>

 <p className={`text-sm font-bold text-gray-900 `}>{`Create post`}</p>

 <button
 onClick={qe}
 disabled={c || (!n.trim() && i.length === 0)}
 className={cn(
 `px-4 py-1.5 rounded-full text-xs font-bold transition-colors`,
 c ? `bg-gray-100 text-gray-400 cursor-not-allowed` : `bg-blue-600 text-white hover:opacity-90`
 )}
 >
 {c ? `Posting…` : `Post`}
 </button>
 </div>

 <div className={`flex-1 overflow-y-auto px-4 py-4`}>
 <div className={`flex items-start gap-3`}>
 <img
 src={localStorage.cached_profile_pic || `${DEFAULT_PIC}`}
 className={`w-10 h-10 rounded-full object-cover`}
 alt={`Profile`}
 />

 <div className={`flex-1 min-w-0`}>
 <div
 ref={ge}
 onPaste={Le}
 onInput={(e) => {
 r(e.currentTarget.innerHTML);
 Ae(e);
 }}
 onKeyDown={Me}
 contentEditable={true}
 onDragOver={(e) => e.preventDefault()}
 data-placeholder={`What's on your mind?`}
 className={`min-h-[140px] text-sm leading-relaxed text-gray-800 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 `}
 style={{
 wordBreak: `break-word`,
 overflowWrap: `break-word`,
 whiteSpace: `pre-wrap`
 }}
 />

 <AutocompleteDropdown items={be} onSelect={je} activeIndex={Se} />

 {quotedPostData && (
 <div className={`mt-3 p-3 rounded-xl border border-gray-100 bg-gray-50 relative`}>
 <button
 onClick={() => {
 setQuotedPostId(null);
 setQuotedPostData(null);
 }}
 className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors`}
 >
 <svg viewBox={`0 0 24 24`} className={`w-3.5 h-3.5 fill-none stroke-current`} strokeWidth={`2.5`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} />
 </svg>
 </button>

 <div className={`flex items-center gap-2 mb-1`}>
 <span className={`text-xs font-bold text-gray-900 `}>{`@${quotedPostData.username}`}</span>
 </div>

 <p className={`text-xs text-gray-600 line-clamp-2`}>{quotedPostData.text}</p>
 </div>
 )}
 </div>
 </div>

 {k && (
 <div className={`space-y-2 p-3 rounded-2xl bg-gray-50 border border-gray-100 `}>
 <div className={`flex items-center justify-between mb-1`}>
 <p className={`text-xs font-bold text-gray-500 uppercase tracking-wider`}>{`Poll`}</p>
 <button onClick={Ve} className={`text-xs font-semibold text-red-400 hover:text-red-500 transition-colors`}>
 {`Cancel poll`}
 </button>
 </div>

 {j.map((e, t) => (
 <input
 value={e.text}
 onChange={(e) => {
 let n = [...j];
 n[t].text = e.target.value;
 M(n);
 }}
 placeholder={`Option ${t + 1}`}
 className={`w-full px-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all`}
 key={e.id}
 />
 ))}

 <div className={`flex items-center gap-3 pt-1`}>
 {j.length < 6 && (
 <button
 onClick={() =>
 M((e) => [
 ...e,
 {
 id: e.length + 1,
 text: ``,
 votes: []
 }
 ])
 }
 className={`text-xs font-semibold text-blue-600 hover:underline`}
 >
 {`+ Add option`}
 </button>
 )}

 {j.length > 2 && (
 <button onClick={() => M((e) => e.slice(0, -1))} className={`text-xs font-semibold text-red-400 hover:underline`}>
 {`Remove last`}
 </button>
 )}
 </div>
 </div>
 )}

 {o.length > 0 && (
 <div className={cn(`grid gap-2`, o.length === 1 ? `grid-cols-1` : o.length === 2 ? `grid-cols-2` : `grid-cols-3`)}>
 {o.map((e, t) => (
 <div
 className={cn(`relative rounded-xl overflow-hidden bg-gray-100 group`, o.length === 1 ? `aspect-video` : `aspect-square`)}
 key={t}
 >
 {e.type === `image` ? (
 <img
 src={e.url}
 alt={``}
 className={`w-full h-full object-cover`}
 style={{
 filter: Ie[e.filter] || `none`
 }}
 />
 ) : (
 <video src={e.url} className={`w-full h-full object-cover`} />
 )}

 <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2`}>
 {e.type === `image` && (
 <button
 onClick={() => {
 ne(t);
 ie(e.text || ``);
 oe(e.filter || `none`);
 se(e.textColor || `#ffffff`);
 B(e.textFont || `Arial`);
 le(e.textSize || 24);
 de(e.textRotation || 0);
 pe(e.textShadow || false);
 he(false);
 te(true);
 }}
 className={`w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-gray-700`}
 >
 <svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2`}>
 <path
 strokeLinecap={`round`}
 strokeLinejoin={`round`}
 d={`M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z`}
 />
 </svg>
 </button>
 )}

 <button
 onClick={() => Be(t)}
 className={`w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-red-500`}
 >
 <svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} />
 </svg>
 </button>
 </div>

 {o.length > 1 && (
 <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold text-white bg-black/50 rounded-full px-1.5 leading-5`}>
 {t + 1}
 </span>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {!k && (
 <div className={`flex-shrink-0 px-4 pb-1`}>
 <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide`}>
 <span className={`text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0`}>Categories:</span>
 {CATEGORIES.map(cat => (
 <button key={cat.id} onClick={() => setPostCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
 className={cn(`text-[11px] font-semibold px-2.5 py-1 rounded-full transition whitespace-nowrap`,
 postCategories.includes(cat.id) ? `bg-blue-100 text-blue-600 ` : `bg-gray-100 text-gray-500 hover:bg-gray-200 `
 )}>
 {cat.name}
 </button>
 ))}
 </div>
 </div>
 )}
 <div className={`flex-shrink-0 px-4 py-3 border-t border-gray-100 `}>
 <div className={`flex items-center gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide`}>
 <label
 title={De ? `Remove poll to add media` : `Add photo or video`}
 className={cn(
 `flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer`,
 De
 ? `text-gray-200 cursor-not-allowed`
 : `text-gray-400 hover:bg-gray-100 hover:text-blue-600`
 )}
 >
 <input
 ref={ye}
 type={`file`}
 multiple={true}
 accept={`image/*,video/*`}
 className={`sr-only`}
 disabled={De || i.length >= 10}
 onChange={(e) => ze(e.target.files)}
 />
 <svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}>
 <rect x={`3`} y={`3`} width={`18`} height={`18`} rx={`2`} />
 <circle cx={`8.5`} cy={`8.5`} r={`1.5`} />
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M21 15l-5-5L5 21`} />
 </svg>
 <span className={`text-[9px] font-semibold leading-none`}>{`Media`}</span>
 </label>

 <button
 onClick={() => F(true)}
 title={`Add feeling`}
 className={cn(
 `flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors`,
 N ? `bg-blue-50 text-blue-600 ` : `text-gray-400 hover:bg-gray-100 `
 )}
 >
 <span className={`text-base leading-none`}>
 {N ? (
 N.emoji
 ) : (
 <svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}>
 <circle cx={`12`} cy={`12`} r={`10`} />
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01`} />
 </svg>
 )}
 </span>
 <span className={`text-[9px] font-semibold leading-none`}>{N ? N.name : `Feeling`}</span>
 </button>

 <button
 onClick={Ve}
 title={Oe ? `Remove media to add poll` : `Add poll`}
 className={cn(
 `flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors`,
 Oe
 ? `text-gray-200 cursor-not-allowed`
 : k
 ? `bg-blue-50 text-blue-600 `
 : `text-gray-400 hover:bg-gray-100 `
 )}
 >
 <svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}>
 <path
 strokeLinecap={`round`}
 strokeLinejoin={`round`}
 d={`M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4`}
 />
 </svg>
 <span className={`text-[9px] font-semibold leading-none`}>{`Poll`}</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {ee && (
 <ComposerSheet onClose={() => F(false)} title={`How are you feeling?`}>
 <div className={`px-4 pb-6 pt-3`}>
 <div className={`grid grid-cols-3 gap-2`}>
 {Ne.map((item) => (
 <button
 key={item.name}
 onClick={() => {
 P(item);
 F(false);
 }}
 className={cn(
 `flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-colors`,
 N?.name === item.name
 ? `bg-blue-50 text-blue-600 `
 : `bg-gray-50 text-gray-600 hover:bg-gray-100 `
 )}
 >
 <span className={`text-2xl leading-none`}>{item.emoji}</span>
 <span>{item.name}</span>
 </button>
 ))}
 </div>
 </div>
 </ComposerSheet>
 )}
 </Fragment>
 );
}

const ComposerSheet = ({ onClose: e, title: t, children: n }) => (
 <div className={`fixed inset-0 z-[70] flex flex-col justify-end md:items-center md:justify-center`}>
 <div className={`absolute inset-0 bg-black/40`} onClick={e} />
 <div className={`relative bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl border-t md:border border-gray-100 max-h-[85vh] overflow-y-auto`}>
 <div className={`flex justify-center pt-3 pb-1 md:hidden`}>
 <div className={`w-9 h-1 rounded-full bg-gray-200 `} />
 </div>

 {t && (
 <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 `}>
 <p className={`text-sm font-bold text-gray-900 `}>{t}</p>
 <button onClick={e} className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors`}>
 <svg viewBox={`0 0 24 24`} className={`w-3.5 h-3.5 fill-none stroke-current`} strokeWidth={`2.5`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} />
 </svg>
 </button>
 </div>
 )}

 {n}
 </div>
 </div>
);

const ComposerBtn = ({ onClick: e, title: t, active: n, disabled: r, children: i }) => (
 <button
 onClick={e}
 disabled={r}
 title={t}
 className={cn(
 `w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors`,
 r ? `text-gray-200 cursor-not-allowed` : n ? `bg-blue-50 text-blue-600 ` : `text-gray-500 hover:bg-gray-100 `
 )}
 >
 {i}
 </button>
);