import { DEFAULT_AVATAR } from '../../utils/defaultAvatar.js';
const DEFAULT_PIC = DEFAULT_AVATAR;

'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import NavIcons from '../../utils/navIcons';
import Ye from '../../components/ui/BottomSheet';
import AutocompleteDropdown from '../../components/layout/AutocompleteDropdown';
import { CATEGORIES as CATEGORY_LIST, CATEGORY_IDS } from '../../data/categories';
import { replaceTokenAt } from '../../utils/autocomplete';
import MobUIBuilder from '../../components/ui/MobUIBuilder';
import MobUIRenderer from '../../components/ui/MobUIRenderer';

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
 let suggestionRequestRef = useRef(0);
 let [quotedPostId, setQuotedPostId] = useState(props.quoteId || null);
 let [quotedPostData, setQuotedPostData] = useState(null);
 let [postCategories, setPostCategories] = useState([]);
 const [isDragActive, setIsDragActive] = useState(false);
 const CATEGORIES = CATEGORY_LIST;
 const isPlus = !!props.isPlus;
 const [mobuiOpen, setMobuiOpen] = useState(false);
 const [previewOpen, setPreviewOpen] = useState(false);
 const [aiOpen, setAiOpen] = useState(false);
 const [aiPrompt, setAiPrompt] = useState('');
 const [aiTone, setAiTone] = useState('natural');
 const [aiMode, setAiMode] = useState('mobui');
 const [aiBusy, setAiBusy] = useState(false);

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

 let Ae = (event) => {
  const requestId = ++suggestionRequestRef.current;
  const value = String(event.currentTarget.value || '');
  const cursor = typeof event.currentTarget.selectionStart === 'number' ? event.currentTarget.selectionStart : value.length;
  r(value); xe([]);
  const before = value.slice(0,cursor);
  const mention = before.match(/@([\w.]*)$/);
  const hashtag = before.match(/#([\w-]*)$/);
  if (mention && mention[1].length >= 1) {
   const token=mention[0];Te({symbol:'@',start:cursor-token.length,end:cursor,query:token});
   (async function(){try{const response=await apiFetch('/search-users?q='+encodeURIComponent(mention[1])+'&currentUsername='+encodeURIComponent(localStorage.currentUser||''));const data=response.ok?await response.json():[];if(requestId===suggestionRequestRef.current){xe((Array.isArray(data)?data:[]).map(user=>Object.assign({type:'user'},user)));Ce(0);}}catch(_){}})();
  } else if (hashtag && hashtag[1].length >= 1) {
   const token=hashtag[0];const cleanTag=token.replace(/^#+/,'').toLowerCase();Te({symbol:'#',start:cursor-token.length,end:cursor,query:token});xe([{type:'hashtag',query:'#'+cleanTag,count:0,isNew:true}]);
   (async function(){try{const response=await apiFetch('/search-suggest?query='+encodeURIComponent(token)+'&currentUsername='+encodeURIComponent(localStorage.currentUser||''));const data=response.ok?await response.json():[];if(requestId!==suggestionRequestRef.current)return;const items=Array.isArray(data)?data:[];const exists=items.some(item=>String(item.query||'').replace(/^#+/,'').toLowerCase()===cleanTag);if(!exists&&cleanTag)items.push({type:'hashtag',query:'#'+cleanTag,count:0,isNew:true});xe(items.slice(0,9));Ce(0);}catch(_){}})();
  } else { xe([]); Te(null); }
 };
  let je = (item) => {
  if(!we)return;
  suggestionRequestRef.current+=1;
  let token=item.type==='user'?'@'+item.username:String(item.query||'');
  if(we.symbol==='#')token='#'+token.replace(/^#+/,'');
  if(we.symbol==='@')token='@'+token.replace(/^@+/,'');
  const element=ge.current;if(!element)return;
  const next=replaceTokenAt(String(element.value||''),we.start,token);
  r(next);xe([]);Te(null);
  const cursor=we.start+token.length;
  window.setTimeout(function(){if(!ge.current)return;ge.current.focus();ge.current.setSelectionRange(cursor,cursor);},0);
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

 function insertAtCursor(value) {
  const element=ge.current;const source=String(n||'');
  const start=element&&typeof element.selectionStart==='number'?element.selectionStart:source.length;
  const end=element&&typeof element.selectionEnd==='number'?element.selectionEnd:start;
  r(source.slice(0,start)+value+source.slice(end));
  const cursor=start+value.length;
  window.setTimeout(function(){if(!ge.current)return;ge.current.focus();ge.current.setSelectionRange(cursor,cursor);},0);
 }

 function insertMarkdown(before,after) {
  const element=ge.current;const source=String(n||'');
  const start=element&&typeof element.selectionStart==='number'?element.selectionStart:source.length;
  const end=element&&typeof element.selectionEnd==='number'?element.selectionEnd:start;
  const selected=source.slice(start,end)||'text';const replacement=before+selected+after;
  r(source.slice(0,start)+replacement+source.slice(end));
  const cursor=start+replacement.length;
  window.setTimeout(function(){if(!ge.current)return;ge.current.focus();ge.current.setSelectionRange(cursor,cursor);},0);
 }

 function openMobUI() {
  if(!isPlus){if(typeof props.onPlusClick==='function')props.onPlusClick();else if(window.Lexum)window.Lexum.navigate('/accountscenter');else window.location.href='/accountscenter';return;}
  setMobuiOpen(value=>!value);
 }

 async function handleAiWrite() {
  if(!isPlus){openMobUI();return;}
  if(!aiPrompt.trim()&&!String(n||'').trim()){d('Add a topic or draft first.');return;}
  setAiBusy(true);d('');
  try{
   const response=await apiFetch('/api/plus/ai-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:localStorage.currentUser||'',prompt:aiPrompt,draft:n,tone:aiTone,mode:aiMode})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'AI writing failed.');
   if(result.text)r(result.text);setMobuiOpen(false);setPreviewOpen(true);setAiOpen(false);
  }catch(error){d(error.message||'AI writing is unavailable.');}
  finally{setAiBusy(false);}
 }
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

 let ze = (files) => {
 const incoming = Array.from(files || []);
 if (!incoming.length || De) return;

 const images = incoming.filter((file) => file.type && file.type.startsWith(`image/`));
 const videos = incoming.filter((file) => file.type && file.type.startsWith(`video/`));
 const unsupportedCount = incoming.length - images.length - videos.length;
 const notices = [];

 if (unsupportedCount > 0) notices.push(`Only photos and videos can be added. Unsupported items were skipped.`);
 if (!images.length && !videos.length) { d(notices.join(` `)); return; }
 if (images.length && videos.length) { d(`Add photos or one video at a time.`); return; }

 const hasExistingVideo = i.some((file) => file.type.startsWith(`video/`));
 const hasExistingImages = i.some((file) => file.type.startsWith(`image/`));
 if (videos.length && (hasExistingVideo || hasExistingImages || videos.length > 1)) {
 d(`A post can contain one video, without other media.`); return;
 }
 if (images.length && hasExistingVideo) { d(`Remove the video before adding photos.`); return; }

 const remainingImages = Math.max(0, 10 - i.length);
 const candidates = videos.length ? videos.slice(0, 1) : images.slice(0, remainingImages);
 if (!candidates.length) { d(`A post can contain up to 10 photos or one video.`); return; }

 const oversized = candidates.filter((file) => file.size > 104857600);
 const accepted = candidates.filter((file) => file.size <= 104857600);
 if (oversized.length) notices.push(`Each photo or video must be 100MB or smaller.`);
 if (images.length > remainingImages) notices.push(`A post can contain up to 10 photos.`);
 if (!accepted.length) { d(notices.join(` `)); return; }

 const previews = accepted.map((file) => ({
 file, url: URL.createObjectURL(file),
 type: file.type.startsWith(`video/`) ? `video` : `image`,
 filter: `none`, text: ``, textColor: `#ffffff`, textFont: `Arial`,
 textSize: 24, textRotation: 0, textShadow: false
 }));
 a((previous) => [...previous, ...accepted]);
 s((previous) => [...previous, ...previews]);
 d(notices.join(` `));
 };

 const hasFileDrag = (event) => {
 const types = event.dataTransfer && event.dataTransfer.types ? Array.from(event.dataTransfer.types) : [];
 return types.includes(`Files`);
 };
 const handleComposerDragEnter = (event) => {
 if (!hasFileDrag(event)) return;
 event.preventDefault();
 setIsDragActive(true);
 };
 const handleComposerDragOver = (event) => {
 if (!hasFileDrag(event)) return;
 event.preventDefault();
 if (event.dataTransfer) event.dataTransfer.dropEffect = `copy`;
 };
 const handleComposerDragLeave = (event) => {
 const nextTarget = event.relatedTarget;
 if (nextTarget && event.currentTarget.contains(nextTarget)) return;
 setIsDragActive(false);
 };
 const handleComposerDrop = (event) => {
 const droppedFiles = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : [];
 if (!droppedFiles.length && !hasFileDrag(event)) return;
 event.preventDefault();
 event.stopPropagation();
 setIsDragActive(false);
 ze(droppedFiles);
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

 let Ke = async () => { await handleAiWrite(); };

 let qe = async (e) => {
 e?.stopPropagation();

 if (!n.trim() && i.length === 0) {
 d(`Write something or add media.`);
 return;
 }

 l(true);
 d(``);

 let c = String(n || '').trim();
let f = new FormData();
f.append(`username`, localStorage.currentUser || `Guest`);
f.append(`text`, c);
f.append(`content_format`, `markdown`);
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

 r(``);

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

 let Je = n.length;

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
 className={`w-14 h-14 bg-brand-600 rounded-lg flex items-center justify-center active:scale-90 hover:bg-brand-700 transition-all`}
 aria-label={`Create post`}
 >
 <svg className={`w-7 h-7 text-white`} fill={`none`} stroke={`currentColor`} viewBox={`0 0 24 24`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} strokeWidth={`2.5`} d={`M12 4v16m8-8H4`} />
 </svg>
 </button>
 </div>

 {e && (
 <div className={`fixed inset-0 z-50 bg-white flex flex-col md:bg-slate-950/40 md:backdrop-blur-sm md:items-center md:justify-center`}>
 <div
 className={`flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-3xl md:border border-gray-100 md:border-[#E7EAF2] bg-white overflow-hidden md:shadow-2xl`}
 onClick={(e) => e.stopPropagation()}
 >
 <div className={`flex items-center justify-between px-4 py-3 md:px-7 md:py-5 border-b border-gray-100 flex-shrink-0`}>
 <button
 onClick={() => t(false)}
 className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors`}
 >
 <svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} />
 </svg>
 </button>

 <p className={`text-sm md:text-lg font-extrabold text-gray-900 tracking-tight`}>{`Create post`}</p>

 <button
 onClick={qe}
 disabled={c || (!n.trim() && i.length === 0)}
 className={cn(
 `px-4 py-1.5 md:px-5 md:py-2.5 rounded-full md:rounded-xl text-xs md:text-sm font-bold transition-colors`,
 c ? `bg-gray-100 text-gray-400 cursor-not-allowed` : `bg-brand-600 text-white hover:opacity-90`
 )}
 >
 {c ? `Posting…` : `Post`}
 </button>
 </div>

 <div
 className={`relative flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-7`}
 onDragEnter={handleComposerDragEnter}
 onDragOver={handleComposerDragOver}
 onDragLeave={handleComposerDragLeave}
 onDrop={handleComposerDrop}
 >
 {isDragActive && (
 <div className={`absolute inset-3 md:inset-5 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-500 bg-brand-50/95 backdrop-blur-sm pointer-events-none`}>
 <div className={`px-6 py-8 text-center`}>
 <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm`}>
 <svg viewBox={`0 0 24 24`} className={`h-7 w-7 fill-none stroke-current`} strokeWidth={`1.8`}>
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M12 16V4m0 0L7 9m5-5 5 5`} />
 <path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4`} />
 </svg>
 </div>
 <p className={`text-sm md:text-base font-bold text-brand-700`}>Drop photos or videos here</p>
 <p className={`mt-1 text-xs text-brand-600`}>Up to 10 photos or one video · 100MB maximum</p>
 </div>
 </div>
 )}
 <div className={`flex items-start gap-3`}>
 <img
 src={localStorage.cached_profile_pic || `${DEFAULT_PIC}`}
 className={`w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-gray-100`}
 alt={`Profile`}
 />

 <div className={`flex-1 min-w-0`}>
 <textarea
 ref={ge}
 value={n}
 onChange={Ae}
 onKeyDown={Me}
 rows={6}
 maxLength={10000}
 placeholder="Write your post. Use the B button for basic formatting."
 className="w-full min-h-[150px] md:min-h-[180px] resize-y bg-transparent text-sm md:text-base leading-6 text-gray-800 placeholder:text-gray-300 focus:outline-none"
/>
  <AutocompleteDropdown items={be} onSelect={je} activeIndex={Se} />
  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
   <div className="flex flex-wrap items-center gap-1">
    <button type="button" onClick={() => insertMarkdown("**","**")} className="h-7 rounded-md border border-gray-200 px-2 text-xs font-bold text-gray-600 hover:bg-gray-50">B</button>
    {isPlus && <>
      <button type="button" onClick={() => insertMarkdown("*","*")} className="h-7 rounded-md border border-gray-200 px-2 text-xs italic text-gray-600 hover:bg-gray-50">I</button>
      <button type="button" onClick={() => insertMarkdown("~~","~~")} className="h-7 rounded-md border border-gray-200 px-2 text-xs line-through text-gray-600 hover:bg-gray-50">S</button>
      <button type="button" onClick={() => insertMarkdown(String.fromCharCode(96),String.fromCharCode(96))} className="h-7 rounded-md border border-gray-200 px-2 text-xs font-mono text-gray-600 hover:bg-gray-50">Code</button>
      <button type="button" onClick={() => insertMarkdown("- ","")} className="h-7 rounded-md border border-gray-200 px-2 text-xs text-gray-600 hover:bg-gray-50">List</button>
      <button type="button" onClick={() => insertMarkdown("> ","")} className="h-7 rounded-md border border-gray-200 px-2 text-xs text-gray-600 hover:bg-gray-50">Quote</button>
    </>}
   </div>
   <div className="flex items-center gap-1">
    <button type="button" onClick={() => setPreviewOpen(value=>!value)} className="h-7 rounded-md bg-gray-100 px-2.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-200">{previewOpen ? "Edit" : "Preview"}</button>
    <button type="button" onClick={openMobUI} className="h-7 rounded-md border border-brand-200 bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-100">{isPlus ? "Use MobUI" : "MobUI · Plus"}</button>
    <button type="button" onClick={() => { if (!isPlus) { openMobUI(); return; } setAiOpen(value=>!value); }} className="h-7 rounded-md bg-brand-600 px-2.5 text-[11px] font-semibold text-white hover:bg-brand-700">AI helper</button>
   </div>
  </div>
  {previewOpen && <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3"><p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-gray-400">Post preview</p><MobUIRenderer content={n}/></div>}
  {mobuiOpen && isPlus && <div className="mt-3"><MobUIBuilder onClose={() => setMobuiOpen(false)} onInsert={value => { insertAtCursor(value); setMobuiOpen(false); setPreviewOpen(true); }}/></div>}
  {aiOpen && isPlus && <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/60 p-3 space-y-2">
   <div className="flex items-center justify-between"><p className="text-xs font-bold text-gray-900">Textmob Plus AI writer</p><span className="text-[10px] text-brand-700">Markdown + MobUI</span></div>
   <textarea value={aiPrompt} onChange={event=>setAiPrompt(event.target.value)} rows={2} placeholder="Describe the post you want, for example an interactive water cycle lesson with a quiz." className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs outline-none focus:border-brand-400"/>
   <div className="flex flex-wrap items-center gap-2"><select value={aiMode} onChange={event=>setAiMode(event.target.value)} className="h-8 flex-1 rounded-md border border-gray-200 bg-white px-2 text-xs"><option value="mobui">Interactive MobUI post</option><option value="markdown">Normal Markdown post</option></select><select value={aiTone} onChange={event=>setAiTone(event.target.value)} className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs"><option value="natural">Natural</option><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="thoughtful">Thoughtful</option><option value="playful">Playful</option></select><button type="button" onClick={Ke} disabled={aiBusy} className="h-8 rounded-md bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-50">{aiBusy ? "Writing…" : "Generate"}</button></div>
  </div>}


 {quotedPostData && (
 <div className={`mt-3 p-3 rounded-lg border border-gray-100 bg-gray-50 relative`}>
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
 <div className={`space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-100 `}>
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
 className={`w-full px-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all`}
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
 className={`text-xs font-semibold text-brand-600 hover:underline`}
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
 className={cn(`relative rounded-lg overflow-hidden bg-gray-100 group`, o.length === 1 ? `aspect-video` : `aspect-square`)}
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
 postCategories.includes(cat.id) ? `bg-brand-100 text-brand-600 ` : `bg-gray-100 text-gray-500 hover:bg-gray-200 `
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
 `flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer`,
 De
 ? `text-gray-200 cursor-not-allowed`
 : `text-gray-400 hover:bg-gray-100 hover:text-brand-600`
 )}
 >
 <input
 ref={ye}
 type={`file`}
 multiple={true}
 accept={`image/*,video/*`}
 className={`sr-only`}
 disabled={De || i.length >= 10}
 onChange={(e) => { ze(e.target.files); e.target.value = ``; }}
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
 `flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-colors`,
 N ? `bg-brand-50 text-brand-600 ` : `text-gray-400 hover:bg-gray-100 `
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
 `flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-colors`,
 Oe
 ? `text-gray-200 cursor-not-allowed`
 : k
 ? `bg-brand-50 text-brand-600 `
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
 `flex flex-col items-center gap-1.5 py-3 rounded-lg text-xs font-semibold transition-colors`,
 N?.name === item.name
 ? `bg-brand-50 text-brand-600 `
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
 <div className={`relative bg-white w-full md:max-w-md rounded-t-lg md:rounded-lg border-t md:border border-gray-100 max-h-[85vh] overflow-y-auto`}>
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
 r ? `text-gray-200 cursor-not-allowed` : n ? `bg-brand-50 text-brand-600 ` : `text-gray-500 hover:bg-gray-100 `
 )}
 >
 {i}
 </button>
);