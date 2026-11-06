import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../config/api";
import { cn } from "../../utils/classNames";
import { parseMobUIContent, renderMobMarkdown } from "../../utils/mobui";

function Shell(props) {
  return <section className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
      <p className="min-w-0 truncate text-xs font-bold text-gray-900">{props.title || "Interactive content"}</p>
      <span className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-700">{props.label}</span>
    </header>
    <div className="p-3">{props.children}</div>
  </section>;
}

function Quiz({ data }) {
  const [choice,setChoice]=useState(null);
  const [checked,setChecked]=useState(false);
  const options=Array.isArray(data.options)?data.options.slice(0,12):[];
  return <Shell title={data.title||data.question} label="Quiz">
    <p className="mb-3 text-sm font-semibold text-gray-800">{data.question||"Choose an answer"}</p>
    <div className="space-y-2">{options.map((option,index)=><button key={index} type="button" onClick={()=>{setChoice(index);setChecked(false);}} className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs",choice===index?"border-brand-500 bg-brand-50 text-brand-800":"border-gray-200 text-gray-700 hover:border-brand-200")}><span className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",choice===index?"border-brand-600 bg-brand-600 text-white":"border-gray-300 text-gray-500")}>{String.fromCharCode(65+index)}</span><span>{option}</span></button>)}</div>
    <button type="button" disabled={choice===null} onClick={()=>setChecked(true)} className="mt-3 h-8 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-40">Check answer</button>
    {checked&&<p className={cn("mt-2 rounded-lg px-3 py-2 text-xs",choice===Number(data.answerIndex)?"bg-brand-50 text-brand-800":"bg-gray-50 text-gray-700")}>{choice===Number(data.answerIndex)?"Correct. ":"Not quite. "}{data.explanation||""}</p>}
  </Shell>;
}

function Chart({ data }) {
  const [view,setView]=useState("bars");
  const rows=Array.isArray(data.data)?data.data.slice(0,24):[];
  const max=Math.max(1,...rows.map(row=>Math.max(0,Number(row.value)||0)));
  return <Shell title={data.title||"Data overview"} label="Chart">
    <div className="mb-3 inline-flex gap-1 rounded-lg bg-gray-100 p-1"><button onClick={()=>setView("bars")} className={cn("h-7 rounded-md px-3 text-[10px] font-semibold",view==="bars"?"bg-white text-brand-700 shadow-sm":"text-gray-500")}>Bars</button><button onClick={()=>setView("values")} className={cn("h-7 rounded-md px-3 text-[10px] font-semibold",view==="values"?"bg-white text-brand-700 shadow-sm":"text-gray-500")}>Values</button></div>
    <div className="space-y-2">{rows.map((row,index)=><div key={index} className="grid grid-cols-[minmax(54px,90px)_minmax(0,1fr)_auto] items-center gap-2 text-xs"><span className="truncate text-gray-500">{row.label}</span>{view==="bars"?<div className="h-2.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-600" style={{width:(Math.max(0,Number(row.value)||0)/max*100)+"%"}}/></div>:<span className="text-gray-400">Value</span>}<strong className="tabular-nums text-gray-800">{Number(row.value||0).toLocaleString()} {data.unit||""}</strong></div>)}</div>
  </Shell>;
}

function Flowchart({ data }) {
  const steps=Array.isArray(data.steps)?data.steps.slice(0,20):[];
  return <Shell title={data.title||"How it works"} label="Flowchart"><div className="mx-auto flex max-w-sm flex-col items-center gap-1">{steps.map((step,index)=><React.Fragment key={index}>{index>0&&<div className="h-4 w-px bg-brand-300"/>}<div className="w-full rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-center text-xs font-semibold text-brand-900">{step}</div></React.Fragment>)}</div></Shell>;
}

function TableBlock({ data }) {
  const columns=Array.isArray(data.columns)?data.columns.slice(0,8):[];
  const rows=Array.isArray(data.rows)?data.rows.slice(0,40):[];
  return <Shell title={data.title||"Comparison"} label="Table"><div className="overflow-x-auto"><table className="w-full min-w-[280px] text-left text-xs"><thead><tr>{columns.map((column,index)=><th key={index} className="border-b border-gray-200 px-2 py-2 font-bold text-gray-700">{column}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index} className="border-b border-gray-100 last:border-0">{columns.map((column,cell)=><td key={cell} className="px-2 py-2 text-gray-600">{Array.isArray(row)?row[cell]||"":""}</td>)}</tr>)}</tbody></table></div></Shell>;
}

function Calculator({ data }) {
  const minimum=Number(data.min)||0;
  const maximum=Math.max(minimum+1,Number(data.max)||100);
  const step=Math.max(1,Number(data.step)||1);
  const multiplier=Number(data.multiplier)||1;
  const [value,setValue]=useState(minimum);
  return <Shell title={data.title||"Quick calculator"} label="Calculator"><div className="flex items-center justify-between gap-2"><label className="text-xs text-gray-600">{data.label||"Adjust the value"}</label><strong className="text-lg tabular-nums text-brand-700">{value.toLocaleString()}</strong></div><input type="range" min={minimum} max={maximum} step={step} value={value} onChange={event=>setValue(Number(event.target.value))} className="mt-3 w-full accent-blue-600"/><div className="mt-1 flex justify-between text-[10px] text-gray-400"><span>{minimum}</span><span>{maximum}</span></div><div className="mt-3 rounded-lg bg-brand-50 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-brand-600">Calculated result</p><p className="text-xl font-black tabular-nums text-brand-900">{(value*multiplier).toLocaleString()} {data.suffix||""}</p></div></Shell>;
}

function Timeline({ data }) {
  const events=Array.isArray(data.events)?data.events.slice(0,30):[];
  return <Shell title={data.title||"Timeline"} label="Timeline"><div className="space-y-3">{events.map((event,index)=><div key={index} className="relative flex gap-3"><div className="flex flex-col items-center"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600"/>{index<events.length-1&&<span className="mt-1 h-full w-px bg-brand-200"/>}</div><div className="min-w-0 pb-1"><p className="text-[10px] font-semibold text-brand-700">{event.date||""}</p><p className="text-xs font-bold text-gray-900">{event.title||""}</p><p className="mt-0.5 text-xs text-gray-600">{event.description||""}</p></div></div>)}</div></Shell>;
}

function Checklist({ data }) {
  const items=Array.isArray(data.items)?data.items.slice(0,60):[];
  const [done,setDone]=useState([]);
  const percent=items.length?Math.round(done.length/items.length*100):0;
  return <Shell title={data.title||"Checklist"} label="Progress"><div className="mb-3 flex items-center justify-between text-xs"><span className="text-gray-500">Your progress</span><strong className="text-brand-700">{done.length} of {items.length}</strong></div><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{width:percent+"%"}}/></div><div className="space-y-2">{items.map((item,index)=><label key={index} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={done.indexOf(index)>=0} onChange={event=>setDone(prev=>event.target.checked?prev.concat([index]):prev.filter(value=>value!==index))} className="h-4 w-4 accent-blue-600"/><span className={done.indexOf(index)>=0?"text-gray-400 line-through":""}>{item}</span></label>)}</div></Shell>;
}

function Decision({ data }) {
  const [selected,setSelected]=useState(null);
  const options=Array.isArray(data.options)?data.options.slice(0,12):[];
  const current=selected===null?null:options[selected];
  return <Shell title={data.question||"Choose a path"} label="Decision"><div className="space-y-2">{options.map((option,index)=><button key={index} onClick={()=>setSelected(index)} className={cn("w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold",selected===index?"border-brand-500 bg-brand-50 text-brand-800":"border-gray-200 text-gray-700 hover:border-brand-200")}>{option.label||"Option "+(index+1)}</button>)}</div>{current&&<div className="mt-3 rounded-lg bg-brand-50 p-3"><p className="text-[10px] font-bold uppercase text-brand-700">Suggested next step</p><p className="mt-1 text-xs text-brand-900">{current.result||"Explore this option next."}</p></div>}</Shell>;
}

function AccordionBlock({ data }) {
  const [open,setOpen]=useState(false);
  return <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-white"><button onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"><span className="text-xs font-bold text-gray-900">{data.title||"More details"}</span><span className="text-brand-600">{open?"−":"+"}</span></button>{open&&<div className="border-t border-gray-100 px-3 py-3 text-xs leading-relaxed text-gray-600">{data.content||""}</div>}</div>;
}

function Poll({ data, postId, blockId }) {
  const username=typeof window!=="undefined"?localStorage.getItem("currentUser")||"":"";
  const options=Array.isArray(data.options)?data.options.slice(0,12):[];
  const [choice,setChoice]=useState(null);
  const [voted,setVoted]=useState(false);
  const [counts,setCounts]=useState([]);
  const [total,setTotal]=useState(0);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    if(!postId)return function(){};
    apiFetch("/api/mobui/poll-results?postId="+encodeURIComponent(postId)+"&blockId="+encodeURIComponent(blockId)+"&username="+encodeURIComponent(username))
      .then(response=>response.ok?response.json():null)
      .then(result=>{if(!active||!result)return;setCounts(Array.isArray(result.counts)?result.counts:[]);setTotal(Number(result.total)||0);if(result.selected!==null&&result.selected!==undefined){setChoice(Number(result.selected));setVoted(true);}})
      .catch(()=>{});
    return ()=>{active=false;};
  },[postId,blockId,username]);
  async function submitVote(){
    if(!username){if(window.showAuthPrompt)window.showAuthPrompt("Sign in to vote");return;}
    if(choice===null||busy)return;
    if(!postId){setVoted(true);setCounts(prev=>{const next=prev.slice();next[choice]=(next[choice]||0)+1;return next;});setTotal(prev=>prev+1);return;}
    setBusy(true);
    try{
      const response=await apiFetch("/api/mobui/poll-vote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:postId,blockId:blockId,username:username,optionIndex:choice})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Could not save your vote.");
      setCounts(result.counts||[]);setTotal(Number(result.total)||0);setVoted(true);
    }catch(error){window.alert(error.message||"Could not save your vote.");}
    finally{setBusy(false);}
  }
  return <Shell title={data.title||data.question||"Community poll"} label="Poll"><p className="mb-3 text-sm font-semibold text-gray-800">{data.question||"Choose an option"}</p><div className="space-y-2">{options.map((option,index)=>{const percent=total?Math.round((Number(counts[index])||0)/total*100):0;return <button key={index} type="button" disabled={voted} onClick={()=>setChoice(index)} className={cn("relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs",choice===index?"border-brand-500 bg-brand-50 text-brand-800":"border-gray-200 text-gray-700",voted&&"cursor-default")}>{voted&&<span className="absolute inset-y-0 left-0 bg-brand-50" style={{width:percent+"%"}}/>}<span className="relative flex items-center justify-between gap-2"><span>{option}</span>{voted&&<strong className="tabular-nums">{percent}%</strong>}</span></button>;})}</div>{!voted?<button type="button" disabled={choice===null||busy} onClick={submitVote} className="mt-3 h-8 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-40">{busy?"Saving…":"Vote"}</button>:<p className="mt-2 text-[10px] text-gray-500">{total.toLocaleString()} votes recorded</p>}</Shell>;
}

function Flashcards({ data }) {
  const cards=Array.isArray(data.cards)?data.cards.slice(0,40):[];
  const [index,setIndex]=useState(0);
  const [flipped,setFlipped]=useState(false);
  const current=cards[index]||{};
  return <Shell title={data.title||"Flashcards"} label="Study"><button onClick={()=>setFlipped(!flipped)} className="min-h-28 w-full rounded-xl border border-brand-100 bg-brand-50 p-4 text-center"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-brand-600">{flipped?"Answer":"Question"}</p><p className="text-sm font-semibold text-brand-900">{flipped?current.back||"":current.front||""}</p></button><div className="mt-2 flex items-center justify-between"><button onClick={()=>{setIndex(Math.max(0,index-1));setFlipped(false);}} disabled={index===0} className="h-8 rounded-md border border-gray-200 px-3 text-xs disabled:opacity-30">Previous</button><span className="text-[10px] text-gray-500">{cards.length?index+1:0} / {cards.length}</span><button onClick={()=>{setIndex(Math.min(cards.length-1,index+1));setFlipped(false);}} disabled={index>=cards.length-1} className="h-8 rounded-md border border-gray-200 px-3 text-xs disabled:opacity-30">Next</button></div></Shell>;
}

function Cards({ data }) {
  const items=Array.isArray(data.items)?data.items.slice(0,16):[];
  return <Shell title={data.title||"Highlights"} label="Cards"><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{items.map((item,index)=><div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-900">{item.title||""}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{item.description||""}</p></div>)}</div></Shell>;
}

function Callout({ data }) {
  return <div className="my-3 rounded-xl border border-brand-100 bg-brand-50 px-3 py-3"><p className="text-xs font-bold text-brand-900">{data.title||"Key point"}</p><p className="mt-1 text-xs leading-relaxed text-brand-800">{data.body||""}</p></div>;
}

function Slides({ data }) {
  const slides=Array.isArray(data.slides)?data.slides.slice(0,30):[];
  const [index,setIndex]=useState(0);
  const slide=slides[index]||{};
  return <Shell title={data.title||"Slides"} label="Presentation"><div className="flex min-h-40 flex-col justify-between rounded-lg border border-brand-100 bg-brand-50 p-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Slide {slides.length?index+1:0}</p><h3 className="mt-2 text-lg font-bold text-brand-950">{slide.heading||""}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-brand-900">{slide.body||""}</p></div><div className="mt-4 flex items-center justify-between"><button onClick={()=>setIndex(Math.max(0,index-1))} disabled={index===0} className="h-8 rounded-md border border-brand-200 bg-white px-3 text-xs disabled:opacity-30">Previous</button><span className="text-[10px] text-brand-700">{index+1} / {slides.length}</span><button onClick={()=>setIndex(Math.min(slides.length-1,index+1))} disabled={index>=slides.length-1} className="h-8 rounded-md border border-brand-200 bg-white px-3 text-xs disabled:opacity-30">Next</button></div></div></Shell>;
}

function CodeBlock({ data }) {
  return <Shell title={data.title||"Code example"} label={data.language||"Code"}><pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-100"><code>{String(data.source||"")}</code></pre></Shell>;
}

function Palette({ data }) {
  const colors=Array.isArray(data.colors)?data.colors.slice(0,20):[];
  return <Shell title={data.title||"Colour palette"} label="Design"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{colors.map((color,index)=>{const hex=/^#[0-9a-f]{6}$/i.test(color.hex||"")?color.hex:"#2563EB";return <div key={index} className="overflow-hidden rounded-lg border border-gray-200"><div className="h-12" style={{backgroundColor:hex}}/><div className="p-2"><p className="truncate text-[10px] font-semibold text-gray-700">{color.name||"Colour"}</p><p className="text-[10px] text-gray-400">{hex}</p></div></div>;})}</div></Shell>;
}

function ComponentBlock({ part, postId }) {
  const data=part.data||{};
  if(part.error)return <div className="my-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">{part.error}</div>;
  switch(part.name){
    case "quiz":return <Quiz data={data}/>;
    case "chart":return <Chart data={data}/>;
    case "flowchart":return <Flowchart data={data}/>;
    case "table":return <TableBlock data={data}/>;
    case "calculator":return <Calculator data={data}/>;
    case "timeline":return <Timeline data={data}/>;
    case "checklist":return <Checklist data={data}/>;
    case "decision":return <Decision data={data}/>;
    case "accordion":return <AccordionBlock data={data}/>;
    case "poll":return <Poll data={data} postId={postId} blockId={part.blockId}/>;
    case "flashcards":return <Flashcards data={data}/>;
    case "cards":return <Cards data={data}/>;
    case "callout":return <Callout data={data}/>;
    case "slides":return <Slides data={data}/>;
    case "code":return <CodeBlock data={data}/>;
    case "palette":return <Palette data={data}/>;
    default:return null;
  }
}

export default function MobUIRenderer({ content, className, postId }) {
  const parts=useMemo(()=>parseMobUIContent(content),[content]);
  return <div className={cn("mobui-content min-w-0",className)}>{parts.map((part,index)=>part.type==="markdown"
    ? <div key={"md-"+index} className="prose markdown max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{__html:renderMobMarkdown(part.value)}}/>
    : <ComponentBlock key={part.blockId} part={part} postId={postId}/>)}</div>;
}
