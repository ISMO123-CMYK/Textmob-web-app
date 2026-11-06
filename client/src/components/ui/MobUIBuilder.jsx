import React, { useMemo, useState } from "react";
import MobUIRenderer from "./MobUIRenderer";
import { createMobUIBlock } from "../../utils/mobui";
import { cn } from "../../utils/classNames";

const ITEMS = [
  ["quiz","Quiz","Learn","Check understanding with answers."],
  ["flashcards","Flashcards","Learn","Flip through questions and answers."],
  ["chart","Chart","Data","Visualise numbers you provide."],
  ["table","Table","Data","Compare information in rows."],
  ["flowchart","Flowchart","Visuals","Explain a process step by step."],
  ["timeline","Timeline","Visuals","Show events in order."],
  ["slides","Slides","Visuals","Create a mini presentation."],
  ["cards","Cards","Visuals","Arrange highlights into cards."],
  ["callout","Callout","Visuals","Highlight an important point."],
  ["calculator","Calculator","Tools","Let readers adjust a value."],
  ["checklist","Checklist","Tools","Create a progress list."],
  ["decision","Decision guide","Tools","Help readers choose a direction."],
  ["accordion","Expandable card","Tools","Keep extra details tucked away."],
  ["poll","Poll","Community","Ask readers to vote."],
  ["code","Code example","Developers","Share a read-only code example."],
  ["palette","Colour palette","Design","Display a set of colours."]
];

const DEFAULTS = {
  quiz:{question:"Which option is correct?",options:["Option one","Option two","Option three"],answerIndex:0,explanation:"Add a short explanation."},
  flashcards:{title:"Quick revision",cards:[{front:"Question",back:"Answer"}]},
  chart:{title:"Your data",unit:"",data:[{label:"January",value:30},{label:"February",value:55}]},
  table:{title:"Quick comparison",columns:["Feature","Option A","Option B"],rows:[["Price","₦0","₦1,000"]]},
  flowchart:{title:"How it works",steps:["Start with an idea","Create the content","Review the result","Publish"]},
  timeline:{title:"Key milestones",events:[{date:"Step 1",title:"The beginning",description:"Describe this milestone."}]},
  slides:{title:"Your presentation",slides:[{heading:"First slide",body:"Introduce your idea."},{heading:"Second slide",body:"Explain the key point."}]},
  cards:{title:"Key points",items:[{title:"First point",description:"Explain it."}]},
  callout:{title:"Key takeaway",body:"Write the important point.",tone:"info"},
  calculator:{title:"Quick estimate",label:"Adjust the value",min:0,max:100,step:1,multiplier:10,suffix:""},
  checklist:{title:"Your checklist",items:["First task","Second task"]},
  decision:{question:"Which path fits you?",options:[{label:"Option A",result:"Suggested direction A."},{label:"Option B",result:"Suggested direction B."}]},
  accordion:{title:"Read more",content:"Add supporting details here."},
  poll:{question:"What do you think?",options:["Option one","Option two","Option three"]},
  code:{title:"Code example",language:"javascript",source:"// Add your example here"},
  palette:{title:"Your palette",colors:[{name:"Primary blue",hex:"#2563EB"},{name:"Light blue",hex:"#DBEAFE"}]}
};

function lines(value) {
  return String(value || "").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
}

function toData(type, fields) {
  const items=lines(fields.items);
  if(type==="quiz")return {question:fields.question,options:items,answerIndex:Math.max(0,Math.min(items.length-1,Number(fields.answer)-1)),explanation:fields.detail};
  if(type==="poll")return {question:fields.question,options:items};
  if(type==="flowchart"||type==="checklist")return type==="flowchart"?{title:fields.title,steps:items}:{title:fields.title,items:items};
  if(type==="chart")return {title:fields.title,unit:fields.unit,data:items.map(line=>{const pair=line.split(",");return {label:(pair[0]||"").trim(),value:Number(pair[1])||0};})};
  if(type==="table")return {title:fields.title,columns:lines(fields.columns),rows:lines(fields.rows).map(line=>line.split("|").map(value=>value.trim()))};
  if(type==="timeline")return {title:fields.title,events:items.map(line=>{const pair=line.split("|");return {date:pair[0]||"",title:pair[1]||"",description:pair.slice(2).join("|")};})};
  if(type==="calculator")return {title:fields.title,label:fields.question,min:Number(fields.min),max:Number(fields.max),step:Math.max(1,Number(fields.step)||1),multiplier:Number(fields.multiplier),suffix:fields.detail};
  if(type==="decision")return {question:fields.question,options:items.map(line=>{const pair=line.split("|");return {label:pair[0]||"",result:pair.slice(1).join("|")};})};
  if(type==="accordion")return {title:fields.title,content:fields.detail};
  if(type==="flashcards")return {title:fields.title,cards:items.map(line=>{const pair=line.split("|");return {front:pair[0]||"",back:pair.slice(1).join("|")};})};
  if(type==="cards")return {title:fields.title,items:items.map(line=>{const pair=line.split("|");return {title:pair[0]||"",description:pair.slice(1).join("|")};})};
  if(type==="callout")return {title:fields.title,body:fields.detail,tone:"info"};
  if(type==="slides")return {title:fields.title,slides:items.map(line=>{const pair=line.split("|");return {heading:pair[0]||"",body:pair.slice(1).join("|")};})};
  if(type==="code")return {title:fields.title,language:fields.language,source:fields.detail};
  if(type==="palette")return {title:fields.title,colors:items.map(line=>{const pair=line.split("|");return {name:pair[0]||"",hex:pair[1]||""};})};
  return {};
}

export default function MobUIBuilder({ onInsert, onClose }) {
  const [group,setGroup]=useState("All");
  const [type,setType]=useState("quiz");
  const [sourceMode,setSourceMode]=useState(false);
  const [source,setSource]=useState(JSON.stringify(DEFAULTS.quiz,null,2));
  const [fields,setFields]=useState({
    title:"Which option is correct?",question:"Which option is correct?",
    items:"Option one\nOption two\nOption three",detail:"Add a short explanation.",
    answer:"1",unit:"",columns:"Feature\nOption A\nOption B",
    rows:"Price | ₦0 | ₦1,000",min:"0",max:"100",step:"1",multiplier:"10",language:"javascript"
  });

  const options=useMemo(()=>ITEMS.filter(item=>group==="All"||item[2]===group),[group]);
  const data=useMemo(()=>{try{return sourceMode?JSON.parse(source):toData(type,fields);}catch(_){return null;}},[sourceMode,source,type,fields]);
  const preview=data?createMobUIBlock(type,data):"";
  const preview=data?createMobUIBlock(type,data):"";

  function update(key,value) {
    setFields(previous=>Object.assign({},previous,{[key]:value}));
  }

  function choose(nextType) {
    const initial=DEFAULTS[nextType]||{};
    const list=initial.options||initial.steps||initial.items||initial.events||initial.cards||initial.slides||initial.data||initial.colors||[];
    const listText=list.map(item=>{
      if(typeof item==="string")return item;
      if(item.label&&item.result)return item.label+" | "+item.result;
      if(item.label&&item.value!==undefined)return item.label+", "+item.value;
      if(item.date)return [item.date,item.title,item.description].join(" | ");
      if(item.front)return item.front+" | "+item.back;
      if(item.heading)return item.heading+" | "+item.body;
      if(item.name&&item.hex)return item.name+" | "+item.hex;
      return [item.title,item.description].filter(Boolean).join(" | ");
    }).join("\n");
    setType(nextType);
    setFields({
      title:initial.title||initial.question||"",question:initial.question||initial.label||"",
      items:listText,detail:initial.explanation||initial.content||initial.body||initial.source||"",
      answer:String((initial.answerIndex||0)+1),unit:initial.unit||"",
      columns:Array.isArray(initial.columns)?initial.columns.join("\n"):"",
      rows:Array.isArray(initial.rows)?initial.rows.map(row=>row.join(" | ")).join("\n"):"",
      min:String(initial.min===undefined?0:initial.min),max:String(initial.max===undefined?100:initial.max),
      step:String(initial.step===undefined?1:initial.step),multiplier:String(initial.multiplier===undefined?10:initial.multiplier),
      language:initial.language||"javascript"
    });
    setSource(JSON.stringify(initial,null,2));
    setSourceMode(false);
  }

  function insert() {
    if(!data){window.alert("Check the component details before inserting it.");return;}
    try{onInsert(createMobUIBlock(type,data));}
    catch(error){window.alert(error.message||"Could not insert this component.");}
  }

  const questionTypes=["quiz","poll","decision","calculator"];
  const listTypes=["quiz","poll","flowchart","checklist","chart","timeline","decision","flashcards","cards","slides","palette"];
  const labels={
    quiz:"Answer options, one per line",poll:"Poll options, one per line",
    flowchart:"Steps, one per line",checklist:"Checklist items, one per line",
    chart:"One value per line: label,number",
    timeline:"One event per line: date | title | description",
    decision:"One choice per line: label | suggested result",
    flashcards:"One card per line: question | answer",
    cards:"One card per line: title | description",
    slides:"One slide per line: heading | body",
    palette:"One colour per line: name | #hex"
  };

  return (
    <section className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5">
        <div><p className="text-sm font-bold text-gray-900">MobUI Studio</p><p className="text-[10px] text-gray-500">Choose a component, fill in a few details, and insert it.</p></div>
        <button type="button" onClick={onClose} className="h-8 rounded-lg px-3 text-xs font-semibold text-gray-500 hover:bg-gray-100">Close</button>
      </header>
      <div className="grid gap-3 p-3 lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {["All","Learn","Data","Visuals","Tools","Community","Developers","Design"].map(item=><button key={item} type="button" onClick={()=>setGroup(item)} className={cn("rounded-md px-2 py-1 text-[10px] font-semibold",group===item?"bg-brand-600 text-white":"bg-gray-100 text-gray-600")}>{item}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {options.map(item=><button key={item[0]} type="button" onClick={()=>choose(item[0])} className={cn("rounded-lg border p-2 text-left",type===item[0]?"border-brand-300 bg-brand-50":"border-gray-100 hover:border-brand-200")}><span className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-brand-700">{item[0]==="code"?"</>":item[0].slice(0,1).toUpperCase()}</span><p className="text-xs font-bold text-gray-900">{item[1]}</p><p className="mt-0.5 text-[10px] leading-snug text-gray-500">{item[3]}</p></button>)}
          </div>
        </aside>
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold text-gray-900">{ITEMS.find(item=>item[0]===type)[1]} settings</p><p className="text-[10px] text-gray-500">No coding needed. Source mode is for advanced creators.</p></div><button type="button" onClick={()=>setSourceMode(!sourceMode)} className="h-7 rounded-md border border-gray-200 px-2.5 text-[10px] font-semibold text-brand-700">{sourceMode?"Visual editor":"Source mode"}</button></div>
          {sourceMode ? <textarea value={source} onChange={event=>setSource(event.target.value)} rows={9} spellCheck={false} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-[11px] leading-relaxed outline-none focus:border-brand-400"/> : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[10px] font-semibold text-gray-600">Title<input value={fields.title} onChange={event=>update("title",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal outline-none focus:border-brand-400"/></label>
              {questionTypes.indexOf(type)>=0&&<label className="text-[10px] font-semibold text-gray-600">{type==="calculator"?"Prompt or label":"Question"}<input value={fields.question} onChange={event=>update("question",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal outline-none focus:border-brand-400"/></label>}
              {listTypes.indexOf(type)>=0&&<label className="text-[10px] font-semibold text-gray-600 sm:col-span-2">{labels[type]||"Items"}<textarea value={fields.items} onChange={event=>update("items",event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-gray-200 p-2 text-xs font-normal outline-none focus:border-brand-400"/></label>}
              {type==="quiz"&&<><label className="text-[10px] font-semibold text-gray-600">Correct option number<input type="number" min="1" value={fields.answer} onChange={event=>update("answer",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label><label className="text-[10px] font-semibold text-gray-600">Explanation<input value={fields.detail} onChange={event=>update("detail",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label></>}
              {type==="chart"&&<label className="text-[10px] font-semibold text-gray-600">Unit<input value={fields.unit} onChange={event=>update("unit",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label>}
              {type==="table"&&<><label className="text-[10px] font-semibold text-gray-600">Columns, one per line<input value={fields.columns} onChange={event=>update("columns",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label><label className="text-[10px] font-semibold text-gray-600 sm:col-span-2">Rows, one per line. Separate cells with |<textarea value={fields.rows} onChange={event=>update("rows",event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-gray-200 p-2 text-xs font-normal"/></label></>}
              {type==="calculator"&&<><label className="text-[10px] font-semibold text-gray-600">Minimum<input type="number" value={fields.min} onChange={event=>update("min",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label><label className="text-[10px] font-semibold text-gray-600">Maximum<input type="number" value={fields.max} onChange={event=>update("max",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label><label className="text-[10px] font-semibold text-gray-600">Multiplier<input type="number" value={fields.multiplier} onChange={event=>update("multiplier",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label><label className="text-[10px] font-semibold text-gray-600">Result suffix<input value={fields.detail} onChange={event=>update("detail",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label></>}
              {(type==="accordion"||type==="callout"||type==="code")&&<label className="text-[10px] font-semibold text-gray-600 sm:col-span-2">{type==="code"?"Source code":"Details"}<textarea value={fields.detail} onChange={event=>update("detail",event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-gray-200 p-2 text-xs font-normal"/></label>}
              {type==="code"&&<label className="text-[10px] font-semibold text-gray-600">Language<input value={fields.language} onChange={event=>update("language",event.target.value)} className="mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs font-normal"/></label>}
              {type==="slides"&&<p className="sm:col-span-2 text-[10px] text-gray-500">Separate slide heading and body with |.</p>}
              {type==="palette"&&<p className="sm:col-span-2 text-[10px] text-gray-500">Use six-digit hexadecimal colours, such as #2563EB.</p>}
            </div>
          )}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-2"><p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-gray-400">Live preview</p>{data?<MobUIRenderer content={preview}/>:<p className="p-3 text-xs text-gray-400">Fix the data to see a preview.</p>}</div>
          <div className="flex items-center justify-between gap-2"><p className="text-[10px] text-gray-400">You can edit the JSON in source mode.</p><button type="button" disabled={!data} onClick={insert} className="h-9 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40">Insert into post</button></div>
        </div>
      </div>
    </section>
  );
}
