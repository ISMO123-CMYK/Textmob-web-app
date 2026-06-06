import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import NavIcons from '../../utils/navIcons';
import Ye from '../../components/ui/BottomSheet'; // bottom drawer overlay
import AutocompleteDropdown from '../../components/layout/AutocompleteDropdown';
// Import fabric.js from CDN or global fabric variable

export default function MakePostContent() {
  let [e, t] = useState(false);
  let [n, r] = useState(``);
  let [i, a] = useState([]);
  let [o, s] = useState([]);
  let [c, l] = useState(false);
  let [u, d] = useState(``);
  let [f, p] = useState(``);
  let [m, h] = useState(false);
  let g = useRef(null);
  let [_, y] = useState(false);
  let [b, x] = useState(false);
  let S = useRef(null);
  let [C, w] = useState(false);
  let [T, E] = useState(false);
  let [D, O] = useState(null);
  let [k, A] = useState(false);
  let [j, M] = useState([{
    id: 1,
    text: ``,
    votes: []
  }, {
    id: 2,
    text: ``,
    votes: []
  }]);
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
  let Ee = i.length > 0;
  if (k) {
    j.every(e => e.text.trim() !== ``);
  }
  let De = k;
  let Oe = Ee;
  let ke = k || i.length >= 10;
  let Ae = e => {
    let t = e.currentTarget.innerHTML;
    r(t);
    let n = window.getSelection();
    if (!n || !n.focusNode) {
      return;
    }
    let i = n.focusNode.textContent || ``;
    let a = n.focusOffset;
    let o = i.lastIndexOf(`@`, a - 1);
    let s = i.lastIndexOf(`#`, a - 1);
    let c = Math.max(o, s);
    if (c === -1) {
      xe([]);
      Te(null);
      return;
    }
    let l = i.slice(c, a);
    if (/\s/.test(l) || c > 0 && !/\s/.test(i[c - 1])) {
      xe([]);
      Te(null);
      return;
    }
    Te({
      symbol: i[c],
      start: c,
      end: a,
      node: n.focusNode,
      query: l
    });
    (async () => {
      try {
        let e = await apiFetch(`/search-suggest?query=${encodeURIComponent(l)}&currentUsername=${localStorage.currentUser || ``}`);
        if (e.ok) {
          xe((await e.json()) || []);
          Ce(0);
        }
      } catch { }
    })();
  };
  let je = e => {
    if (!we) {
      return;
    }
    let t = e.type === `user` ? `@${e.username}` : e.query;
    let {
      node: n,
      start: i,
      end: a
    } = we;
    let o = n.textContent;
    n.textContent = `${o.slice(0, i) + t} ${o.slice(a)}`;
    let s = document.createRange();
    let c = window.getSelection();
    let l = Math.min(i + t.length + 1, n.textContent.length);
    try {
      s.setStart(n, l);
      s.collapse(true);
      c.removeAllRanges();
      c.addRange(s);
    } catch (e) {
      console.warn(`Failed reset range`, e);
    }
    if (ge.current) {
      r(ge.current.innerHTML);
    }
    xe([]);
    Te(null);
  };
  let Me = e => {
    if (be.length > 0) {
      if (e.key === `ArrowDown`) {
        e.preventDefault();
        Ce(e => (e + 1) % be.length);
      } else if (e.key === `ArrowUp`) {
        e.preventDefault();
        Ce(e => (e - 1 + be.length) % be.length);
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
  let Ne = [{
    name: `Happy`,
    emoji: `😊`
  }, {
    name: `Sad`,
    emoji: `😢`
  }, {
    name: `Excited`,
    emoji: `🎉`
  }, {
    name: `Angry`,
    emoji: `😣`
  }, {
    name: `Loved`,
    emoji: `🥰`
  }, {
    name: `Grateful`,
    emoji: `🙏`
  }, {
    name: `Tired`,
    emoji: `😴`
  }, {
    name: `Confused`,
    emoji: `😕`
  }, {
    name: `Nervous`,
    emoji: `😬`
  }, {
    name: `Hopeful`,
    emoji: `🌟`
  }, {
    name: `Proud`,
    emoji: `🏆`
  }, {
    name: `Inspired`,
    emoji: `✨`
  }, {
    name: `Lonely`,
    emoji: `😔`
  }, {
    name: `Stressed`,
    emoji: `😓`
  }, {
    name: `Relaxed`,
    emoji: `😌`
  }];
  let Pe = [`Arial`, `Helvetica`, `Times New Roman`, `Courier New`, `Verdana`, `Georgia`];
  let Fe = [{
    id: `none`,
    label: `Original`
  }, {
    id: `grayscale`,
    label: `B&W`
  }, {
    id: `sepia`,
    label: `Sepia`
  }, {
    id: `contrast`,
    label: `Vivid`
  }, {
    id: `warm`,
    label: `Warm`
  }, {
    id: `cool`,
    label: `Cool`
  }];
  let Ie = {
    none: `none`,
    grayscale: `grayscale(100%)`,
    sepia: `sepia(80%)`,
    contrast: `contrast(130%) saturate(130%)`,
    warm: `sepia(40%) saturate(150%) hue-rotate(-20deg)`,
    cool: `hue-rotate(30deg) saturate(90%)`
  };
  useEffect(() => {
    let n = n => {
      if (n.key === `Escape`) {
        if (I) {
          te(false);
          return;
        }
        if (ee) {
          F(false);
          return;
        }
        if (m) {
          h(false);
          return;
        }
        if (b) {
          x(false);
          return;
        }
        if (e) {
          t(false);
        }
      }
    };
    window.addEventListener(`keydown`, n);
    return () => window.removeEventListener(`keydown`, n);
  }, [e, ee, m, b, I]);
  useEffect(() => {
    if (typeof onToggle == `function`) {
      onToggle(e);
    }
  }, [e]);
  useEffect(() => {
    if (e && ge.current) {
      setTimeout(() => ge.current?.focus(), 100);
    }
  }, [e]);
  useEffect(() => {
    if (m && g.current) {
      setTimeout(() => g.current?.focus(), 80);
    }
  }, [m]);
  useEffect(() => {
    if (b && S.current) {
      setTimeout(() => S.current?.focus(), 80);
    }
  }, [b]);
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
        n.add(new fabric.Text(re, {
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
        }));
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
  useEffect(() => () => o.forEach(e => URL.revokeObjectURL(e.url)), []);
  let Le = e => {
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
  let ze = e => {
    if (!e?.length || De) {
      return;
    }
    let t = i.some(e => e.type.startsWith(`image`));
    let n = i.some(e => e.type.startsWith(`video`));
    let r = Array.from(e).filter(e => {
      let r = e.type.startsWith(`video`);
      let a = e.type.startsWith(`image`);
      if (!a && !r || e.size > 104857600 || n && a || t && r) {
        return false;
      } else if (r) {
        return i.length === 0;
      } else {
        return i.length < 10;
      }
    }).slice(0, n ? 0 : 10 - i.length);
    if (!r.length) {
      d(`Max 10 images or 1 video, 100MB limit.`);
      return;
    }
    let o = r.map(e => ({
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
    a(e => [...e, ...r]);
    s(e => [...e, ...o]);
    d(``);
  };
  let Be = e => {
    URL.revokeObjectURL(o[e].url);
    s(t => t.filter((t, n) => n !== e));
    a(t => t.filter((t, n) => n !== e));
  };
  let Ve = () => {
    if (!Oe) {
      if (k) {
        A(false);
        M([{
          id: 1,
          text: ``,
          votes: []
        }, {
          id: 2,
          text: ``,
          votes: []
        }]);
      } else {
        A(true);
      }
    }
  };
  let He = () => {
    if (!ke) {
      O(null);
      w(false);
      x(true);
    }
  };
  let Ue = async () => {
    let e = S.current?.value?.trim();
    if (e) {
      E(true);
      d(``);
      O(null);
      try {
        let t = await apiFetch(`/generate-image`, {
          method: `POST`,
          headers: {
            "Content-Type": `application/json`
          },
          body: JSON.stringify({
            prompt: e
          })
        });
        if (!t.ok) {
          let e = await t.json();
          throw Error(e.error || `Image generation failed`);
        }
        let n = await t.blob();
        O({
          url: URL.createObjectURL(n),
          blob: n
        });
      } catch (e) {
        d(e.message);
      } finally {
        E(false);
      }
    }
  };
  let We = () => {
    if (!D) {
      return;
    }
    let e = new File([D.blob], `ai-${Date.now()}.png`, {
      type: `image/png`
    });
    a([e]);
    s([{
      file: e,
      url: D.url,
      type: `image`,
      filter: `none`,
      text: ``,
      textColor: `#ffffff`,
      textFont: `Arial`,
      textSize: 24,
      textRotation: 0,
      textShadow: false
    }]);
    x(false);
    O(null);
    if (S.current) {
      S.current.value = ``;
    }
    w(false);
    p(`AI image added ✦`);
    setTimeout(() => p(``), 3000);
  };
  let Ge = () => {
    if (ve.current) {
      apiFetch(ve.current.toDataURL({
        format: `png`
      })).then(e => e.blob()).then(e => {
        let t = new File([e], `edited-${Date.now()}.png`, {
          type: `image/png`
        });
        a(e => {
          let n = [...e];
          n[L] = t;
          return n;
        });
        s(e => {
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
      }).catch(() => d(`Failed to save edited image`));
    }
  };
  let Ke = async e => {
    e?.stopPropagation();
    let t = g.current?.value?.trim();
    if (!t) {
      d(`Describe your post first.`);
      return;
    }
    l(true);
    d(``);
    try {
      let e = await apiFetch(`/chat`, {
        method: `POST`,
        headers: {
          "Content-Type": `application/json`
        },
        body: JSON.stringify({
          messages: [{
            role: `user`,
            content: `You are a human social media writer — not a bot, not a brand, just a real person who writes genuinely well. Rewrite the summary below into a natural, compelling post for Textmob (a social platform like Twitter/Facebook).

Rules:
- Match the writer's tone EXACTLY — if they're casual and slangy, stay that way; if they're hype, stay hype; if formal, stay formal
- Sound like a real human wrote this, not AI. No "In today's fast-paced world", no "It's important to", no robotic openers
- No corporate language, no buzzwords, no filler phrases
- No hashtags unless the user's summary already used them
- No emojis unless the summary already had them  
- Fix spelling and grammar silently — don't change the voice or personality
- Keep it punchy and direct — cut every filler word
- Don't add a call to action unless the summary had one
- NEVER start with "I" if the original didn't
- Return ONLY the final post text. No intro. No explanation. No quotes around it.

Summary: "${t}"`
          }]
        })
      });
      let n = await e.json();
      if (!e.ok) {
        throw Error(n.error || `Enhancement failed`);
      }
      if (ge.current) {
        ge.current.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize : (val => val)(n.reply);
        r(ge.current.innerHTML);
      }
      if (g.current) {
        g.current.value = ``;
      }
      y(false);
      h(false);
    } catch (e) {
      d(e.message);
    } finally {
      l(false);
    }
  };
  let qe = async e => {
    e?.stopPropagation();
    if (!n.trim() && i.length === 0) {
      d(`Write something or add media.`);
      return;
    }
    l(true);
    d(``);
    let c = ge.current ? (() => {
      let e = document.createElement(`div`);
      e.innerHTML = ge.current.innerHTML;
      e.querySelectorAll(`img.emoji`).forEach(e => e.replaceWith(e.alt || ``));
      return window.DOMPurify ? window.DOMPurify.sanitize(e.innerHTML) : e.innerHTML;
    })() : ``;
    let u = window.twemoji ? window.twemoji.parse(c, {
      folder: `svg`,
      ext: `.svg`,
      base: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/`
    }) : c;
    let f = new FormData();
    f.append(`username`, localStorage.currentUser || `Guest`);
    f.append(`text`, c);
    f.append(`parsed`, u);
    f.append(`visib`, `public`);
    if (N) {
      f.append(`activities`, `${N.name} ${N.emoji}`);
    }
    i.forEach(e => f.append(`media`, e));
    if (k) {
      let e = j.filter(e => e.text.trim());
      if (e.length < 2) {
        d(`At least 2 poll options required.`);
        l(false);
        return;
      }
      f.append(`options`, JSON.stringify(e));
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
      o.forEach(e => URL.revokeObjectURL(e.url));
      s([]);
      P(null);
      A(false);
      M([{
        id: 1,
        text: ``,
        votes: []
      }, {
        id: 2,
        text: ``,
        votes: []
      }]);
      if (ge.current) {
        ge.current.innerHTML = ``;
      }
      setTimeout(() => {
        t(false);
        p(``);
      }, 800);
      if (window.Lexum) {
        window.Lexum.navigate('/');
      } else {
        window.location.hash = '/';
      }
    } catch (e) {
      d(e.message);
    } finally {
      l(false);
    }
  };
  let Je = n.replace(/<[^>]+>/g, ``).length;
  return <Fragment><div className={`relative flex items-center justify-center w-full py-4`}><button onClick={() => window.history.back()} className={`absolute left-4 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`} aria-label={`Go back`}><svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M15 19l-7-7 7-7`} /></svg></button><button onClick={() => t(true)} className={`w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center active:scale-90 hover:bg-blue-700 transition-all`} aria-label={`Create post`}><svg className={`w-7 h-7 text-white`} fill={`none`} stroke={`currentColor`} viewBox={`0 0 24 24`}><path strokeLinecap={`round`} strokeLinejoin={`round`} strokeWidth={`2.5`} d={`M12 4v16m8-8H4`} /></svg></button></div>{e && <div className={`fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col md:bg-black/40 md:items-center md:justify-center`}><div className={`flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl md:border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden`} onClick={e => e.stopPropagation()}><div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0`}><button onClick={() => t(false)} className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} /></svg></button><p className={`text-sm font-bold text-gray-900 dark:text-gray-100`}>{`Create post`}</p><button onClick={qe} disabled={c || !n.trim() && i.length === 0} className={cn(`px-4 py-1.5 rounded-full text-xs font-bold transition-colors`, c || !n.trim() && i.length === 0 ? `bg-blue-100 dark:bg-blue-900/20 text-blue-300 dark:text-blue-700 cursor-not-allowed` : `bg-blue-600 text-white hover:bg-blue-700 active:scale-95`)}>{c ? `Posting…` : `Post`}</button></div><div className={`px-4 pt-3 pb-2 flex-shrink-0`}><div className={`flex items-center gap-2`}><p className={`text-sm font-bold text-gray-900 dark:text-gray-100`}>{localStorage.currentUser || `Guest`}</p>{N && <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30`}><span className={`text-xs`}>{N.emoji}</span><span className={`text-xs font-semibold text-yellow-700 dark:text-yellow-400`}>{N.name}</span><button onClick={() => P(null)} className={`text-yellow-400 hover:text-red-400 transition-colors leading-none ml-0.5`}><svg viewBox={`0 0 24 24`} className={`w-3 h-3 fill-none stroke-current`} strokeWidth={`3`}><path strokeLinecap={`round`} d={`M6 18L18 6M6 6l12 12`} /></svg></button></div>}</div></div><div className={`flex-1 overflow-y-auto px-4 space-y-3 pb-2`}><div className={`flex items-center gap-0.5 pb-2 border-b border-gray-100 dark:border-gray-800`}><ComposerBtn onClick={() => Re(`bold`)} title={`Bold`}><span className={`font-black text-xs`}>{`B`}</span></ComposerBtn><ComposerBtn onClick={() => Re(`italic`)} title={`Italic`}><span className={`italic text-xs`}>{`I`}</span></ComposerBtn><ComposerBtn onClick={() => Re(`underline`)} title={`Underline`}><span className={`underline text-xs`}>{`U`}</span></ComposerBtn><label className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`} title={`Text color`}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M7 21h10M12 3L5 21M12 3l7 18M9.5 15h5`} /></svg><input type={`color`} className={`sr-only`} onChange={e => Re(`foreColor`, e.target.value)} /></label><span className={`ml-auto text-[11px] text-gray-300 dark:text-gray-600 font-medium tabular-nums pr-1`}>{Je}</span></div><div className={`relative`}><div ref={ge} contentEditable={true} onInput={Ae} onKeyDown={Me} onPaste={Le} onDrop={e => {
    e.preventDefault();
    ze(e.dataTransfer.files);
  }} onDragOver={e => e.preventDefault()} data-placeholder={`What's on your mind?`} className={`min-h-[140px] text-sm leading-relaxed text-gray-800 dark:text-gray-200 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 dark:empty:before:text-gray-600`} style={{
    wordBreak: `break-word`,
    overflowWrap: `break-word`,
    whiteSpace: `pre-wrap`
  }} />
    <AutocompleteDropdown items={be} onSelect={je} activeIndex={Se} /></div>{k && <div className={`space-y-2 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800`}><div className={`flex items-center justify-between mb-1`}><p className={`text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>{`Poll`}</p><button onClick={Ve} className={`text-xs font-semibold text-red-400 hover:text-red-500 transition-colors`}>{`Cancel poll`}</button></div>{j.map((e, t) => <input value={e.text} onChange={e => {
      let n = [...j];
      n[t].text = e.target.value;
      M(n);
    }} placeholder={`Option ${t + 1}`} className={`w-full px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all`} key={e.id} />)}<div className={`flex items-center gap-3 pt-1`}>{j.length < 6 && <button onClick={() => M(e => [...e, {
      id: e.length + 1,
      text: ``,
      votes: []
    }])} className={`text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline`}>{`+ Add option`}</button>}{j.length > 2 && <button onClick={() => M(e => e.slice(0, -1))} className={`text-xs font-semibold text-red-400 hover:underline`}>{`Remove last`}</button>}</div></div>}{o.length > 0 && <div className={cn(`grid gap-2`, o.length === 1 ? `grid-cols-1` : o.length === 2 ? `grid-cols-2` : `grid-cols-3`)}>{o.map((e, t) => <div className={cn(`relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group`, o.length === 1 ? `aspect-video` : `aspect-square`)} key={t}>{e.type === `image` ? <img src={e.url} alt={``} className={`w-full h-full object-cover`} style={{
      filter: Ie[e.filter] || `none`
    }} /> : <video src={e.url} className={`w-full h-full object-cover`} />}<div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2`}>{e.type === `image` && <button onClick={() => {
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
    }} className={`w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-gray-700`}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z`} /></svg></button>}<button onClick={() => Be(t)} className={`w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-red-500`}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} /></svg></button></div>{o.length > 1 && <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold text-white bg-black/50 rounded-full px-1.5 leading-5`}>{t + 1}</span>}</div>)}</div>}</div><div className={`flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800`}><div className={`flex items-center gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide`}><label title={De ? `Remove poll to add media` : `Add photo or video`} className={cn(`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer`, De ? `text-gray-200 dark:text-gray-700 cursor-not-allowed` : `text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600`)}><input ref={ye} type={`file`} multiple={true} accept={`image/*,video/*`} className={`sr-only`} disabled={De || i.length >= 10} onChange={e => ze(e.target.files)} /><svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}><rect x={`3`} y={`3`} width={`18`} height={`18`} rx={`2`} /><circle cx={`8.5`} cy={`8.5`} r={`1.5`} /><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M21 15l-5-5L5 21`} /></svg><span className={`text-[9px] font-semibold leading-none`}>{`Media`}</span></label><button onClick={() => F(true)} title={`Add feeling`} className={cn(`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors`, N ? `text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20` : `text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-yellow-500`)}><svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}><circle cx={`12`} cy={`12`} r={`10`} /><path strokeLinecap={`round`} d={`M8 14s1.5 2 4 2 4-2 4-2`} /><line x1={`9`} y1={`9`} x2={`9.01`} y2={`9`} strokeLinecap={`round`} strokeWidth={`3`} /><line x1={`15`} y1={`9`} x2={`15.01`} y2={`9`} strokeLinecap={`round`} strokeWidth={`3`} /></svg><span className={`text-[9px] font-semibold leading-none`}>{`Feeling`}</span></button><button onClick={Ve} disabled={Oe} title={Oe ? `Remove media to add poll` : k ? `Cancel poll` : `Add poll`} className={cn(`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors`, Oe ? `text-gray-200 dark:text-gray-700 cursor-not-allowed` : k ? `text-blue-600 bg-blue-50 dark:bg-blue-900/20` : `text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600`)}><svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z`} /></svg><span className={`text-[9px] font-semibold leading-none`}>{`Poll`}</span></button><button onClick={() => h(true)} title={`Write with AI`} className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors`}><svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z`} /></svg><span className={`text-[9px] font-semibold leading-none`}>{`AI Write`}</span></button><button onClick={He} disabled={ke} title={k ? `Disabled in poll mode` : i.length >= 10 ? `Max images reached` : `Generate AI image`} className={cn(`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors`, ke ? `text-gray-200 dark:text-gray-700 cursor-not-allowed` : `text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-600`)}><svg viewBox={`0 0 24 24`} className={`w-5 h-5 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z`} /><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M9.663 17h4.673M12 3v1`} strokeDasharray={`2 1`} opacity={`0.5`} /></svg><span className={`text-[9px] font-semibold leading-none`}>{`AI Image`}</span></button></div>{u && <p className={`text-xs text-red-500 mt-1`}>{u}</p>}{f && <p className={`text-xs text-blue-600 dark:text-blue-400 mt-1`}>{f}</p>}</div></div></div>}{I && <div className={`fixed inset-0 z-[80] bg-gray-950 flex flex-col`}><div className={`flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0`}><button onClick={() => te(false)} className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-800 transition-colors`}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M15 19l-7-7 7-7`} /></svg></button><p className={`text-sm font-bold text-white`}>{`Edit image`}</p><button onClick={Ge} className={`px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-colors`}>{`Save`}</button></div><div className={`flex-1 flex items-center justify-center bg-gray-950 overflow-hidden p-4`}><div className={`w-full max-w-lg aspect-square`}><canvas ref={_e} className={`w-full h-full`} /></div></div><div className={`flex-shrink-0 bg-gray-900 border-t border-gray-800 overflow-y-auto max-h-[45vh]`}><div className={`px-4 py-3 border-b border-gray-800`}><p className={`text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2`}>{`Filter`}</p><div className={`flex gap-2 overflow-x-auto pb-1`}>{Fe.map(e => <button onClick={() => oe(e.id)} className={cn(`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors`, ae === e.id ? `bg-blue-600 text-white` : `bg-gray-800 text-gray-400 hover:bg-gray-700`)} key={e.id}>{e.label}</button>)}</div></div><div className={`px-4 py-3 space-y-3`}><p className={`text-[11px] font-bold uppercase tracking-widest text-gray-500`}>{`Text overlay`}</p><input type={`text`} value={re} onChange={e => ie(e.target.value)} placeholder={`Type something…`} className={`w-full px-4 py-2.5 rounded-full bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all`} /><div className={`flex items-center gap-2 flex-wrap`}><label className={`flex items-center gap-1.5 text-xs text-gray-400 font-semibold cursor-pointer`}><input type={`color`} value={R} onChange={e => se(e.target.value)} className={`w-7 h-7 rounded-lg border border-gray-700 cursor-pointer bg-transparent`} />{`Color`}</label><select value={z} onChange={e => B(e.target.value)} className={`flex-1 min-w-0 px-3 py-2 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300 focus:outline-none`}>{Pe.map(e => <option value={e} key={e}>{e}</option>)}</select><button onClick={() => he(e => !e)} className={cn(`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors`, me ? `bg-blue-600 text-white` : `bg-gray-800 text-gray-400 hover:bg-gray-700`)}>{`B`}</button><button onClick={() => pe(e => !e)} title={`Shadow`} className={cn(`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors`, fe ? `bg-blue-600 text-white` : `bg-gray-800 text-gray-400 hover:bg-gray-700`)}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z`} /></svg></button></div><div className={`space-y-2`}><div className={`flex items-center gap-3`}><span className={`text-[11px] text-gray-500 font-semibold w-12 flex-shrink-0`}>{`Size `}{ce}{`px`}</span><input type={`range`} min={`12`} max={`80`} value={ce} onChange={e => le(Number(e.target.value))} className={`flex-1 accent-blue-600`} /></div><div className={`flex items-center gap-3`}><span className={`text-[11px] text-gray-500 font-semibold w-12 flex-shrink-0`}>{`Rotate `}{ue}{`°`}</span><input type={`range`} min={`-180`} max={`180`} value={ue} onChange={e => de(Number(e.target.value))} className={`flex-1 accent-blue-600`} /></div></div></div></div></div>}{b && <div className={`fixed inset-0 z-[70] flex flex-col justify-end md:items-center md:justify-center`}><div className={`absolute inset-0 bg-black/50`} onClick={() => {
      x(false);
      O(null);
    }} /><div className={`relative bg-white dark:bg-gray-900 w-full md:max-w-lg rounded-t-2xl md:rounded-2xl border-t md:border border-gray-100 dark:border-gray-800 overflow-hidden`}><div className={`flex justify-center pt-3 pb-1 md:hidden`}><div className={`w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700`} /></div><div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800`}><div className={`flex items-center gap-2`}><div><p className={`text-sm font-bold text-gray-900 dark:text-gray-100`}>{`Generate Image`}</p></div></div><button onClick={() => {
      x(false);
      O(null);
    }} className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}><svg viewBox={`0 0 24 24`} className={`w-3.5 h-3.5 fill-none stroke-current`} strokeWidth={`2.5`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} /></svg></button></div><div className={`px-4 py-4 space-y-4`}><div className={`space-y-2`}><label className={`text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>{`Describe your image`}</label><div className={`relative`}><textarea ref={S} defaultValue={``} onChange={e => w(e.target.value.trim().length > 0)} onKeyDown={e => {
      if (e.key === `Enter` && !e.shiftKey && C && !T) {
        e.preventDefault();
        Ue();
      }
    }} placeholder={`A sunset over Lagos Island, cinematic, vivid colors…`} rows={3} className={`w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 resize-none transition-all`} /><p className={`text-[10px] text-gray-400 dark:text-gray-600 mt-1 px-1`}>{`Press Enter to generate · Shift+Enter for new line`}</p></div></div>{(T || D) && <div className={`rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square relative`}>{T && <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3`}><div className={`w-full h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse`} /><div className={`relative z-10 flex flex-col items-center gap-2`}><div className={`w-10 h-10 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg`}><svg className={`w-5 h-5 animate-spin text-purple-500`} fill={`none`} viewBox={`0 0 24 24`}><circle className={`opacity-25`} cx={`12`} cy={`12`} r={`10`} stroke={`currentColor`} strokeWidth={`4`} /><path className={`opacity-75`} fill={`currentColor`} d={`M4 12a8 8 0 018-8v8H4z`} /></svg></div><p className={`text-xs font-semibold text-gray-500 dark:text-gray-400`}>{`Gemini is painting…`}</p></div></div>}{D && !T && <img src={D.url} alt={`AI generated`} className={`w-full h-full object-cover`} />}</div>}{!D && !T && <div className={`space-y-1.5`}><p className={`text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider`}>{`Quick ideas`}</p><div className={`flex flex-wrap gap-1.5`}>{[`Lagos skyline at night`, `Jollof rice close-up`, `African fashion editorial`, `Abstract vibrant art`, `Futuristic city, African style`].map(e => <button onClick={() => {
      if (S.current) {
        S.current.value = e;
        w(true);
        S.current.focus();
      }
    }} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-900`} key={e}>{e}</button>)}</div></div>}<div className={`flex gap-2 pt-1`}><button onClick={Ue} disabled={!C || T} className={cn(`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2`, !C || T ? `bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed` : `bg-blue-600  text-white hover:opacity-90 active:scale-[0.98]`)}>{T ? <Fragment><svg className={`w-4 h-4 animate-spin`} fill={`none`} viewBox={`0 0 24 24`}><circle className={`opacity-25`} cx={`12`} cy={`12`} r={`10`} stroke={`currentColor`} strokeWidth={`4`} /><path className={`opacity-75`} fill={`currentColor`} d={`M4 12a8 8 0 018-8v8H4z`} /></svg>{`Generating…`}</Fragment> : D ? `Regenerate` : `Generate`}</button>{D && !T && <button onClick={We} className={`flex-1 py-3 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}><svg viewBox={`0 0 24 24`} className={`w-4 h-4 fill-none stroke-current`} strokeWidth={`2.5`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M5 13l4 4L19 7`} /></svg>{`Use this`}</button>}</div></div></div></div>}
    {ee && (
      <ComposerSheet onClose={() => F(false)} title={`How are you feeling?`}>
        <div className={`px-4 pb-6 pt-3`}>
          <div className={`grid grid-cols-3 gap-2`}>
            {Ne.map(item => (
              <button
                key={item.name}
                onClick={() => {
                  P(item);
                  F(false);
                }}
                className={cn(
                  `flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-colors`,
                  N?.name === item.name
                    ? `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400`
                    : `bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`
                )}
              >
                <span className={`text-2xl leading-none`}>{item.emoji}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </ComposerSheet>
    )}{m && <ComposerSheet onClose={() => h(false)} title={`Write with AI`}><div className={`px-4 pb-6 pt-3 space-y-3`}><textarea ref={g} defaultValue={``} onChange={e => y(e.target.value.trim().length > 0)} onKeyDown={e => {
      if (e.key === `Enter` && !e.shiftKey && _ && !c) {
        e.preventDefault();
        Ke(e);
      }
    }} placeholder={`Describe what you want to post about… (Enter to enhance)`} rows={4} className={`w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 resize-none transition-all`} /><button onClick={Ke} disabled={c || !_} className={cn(`w-full py-3 rounded-full text-sm font-bold transition-colors`, c || !_ ? `bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed` : `bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]`)}>{c ? `Enhancing…` : `Enhance post`}</button>{u && <p className={`text-xs text-red-500 text-center`}>{u}</p>}</div></ComposerSheet>}</Fragment>;
}

const ComposerSheet = ({
  onClose: e,
  title: t,
  children: n
}) => <div className={`fixed inset-0 z-[70] flex flex-col justify-end md:items-center md:justify-center`}><div className={`absolute inset-0 bg-black/40`} onClick={e} /><div className={`relative bg-white dark:bg-gray-900 w-full md:max-w-md rounded-t-2xl md:rounded-2xl border-t md:border border-gray-100 dark:border-gray-800 max-h-[85vh] overflow-y-auto`}><div className={`flex justify-center pt-3 pb-1 md:hidden`}><div className={`w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700`} /></div>{t && <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800`}><p className={`text-sm font-bold text-gray-900 dark:text-gray-100`}>{t}</p><button onClick={e} className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}><svg viewBox={`0 0 24 24`} className={`w-3.5 h-3.5 fill-none stroke-current`} strokeWidth={`2.5`}><path strokeLinecap={`round`} strokeLinejoin={`round`} d={`M6 18L18 6M6 6l12 12`} /></svg></button></div>}{n}</div></div>;

const ComposerBtn = ({
  onClick: e,
  title: t,
  active: n,
  disabled: r,
  children: i
}) => <button onClick={e} disabled={r} title={t} className={cn(`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors`, r ? `text-gray-200 dark:text-gray-700 cursor-not-allowed` : n ? `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400` : `text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`)}>{i}</button>;