import { marked } from "marked";
import DOMPurify from "dompurify";

export const MOBUI_BLOCK_TYPES = [
  "quiz", "chart", "flowchart", "table", "calculator", "timeline",
  "checklist", "decision", "accordion", "poll", "flashcards", "cards",
  "callout", "slides", "code", "palette"
];

export const MOBUI_AI_SYSTEM_PROMPT = [
  "You are Textmob's MobUI writing assistant.",
  "Use Markdown for normal post text and MobUI blocks for useful interactions.",
  "Never return HTML, JavaScript, JSX, scripts, iframes or embeds.",
  "Wrap each block with :::mobui type, a valid JSON object, then :::.",
  "Supported types: quiz, chart, flowchart, table, calculator, timeline, checklist, decision, accordion, poll, flashcards, cards, callout, slides, code, palette.",
  "quiz {question,options:string[],answerIndex:number,explanation}",
  "chart {title,unit,data:[{label:string,value:number}]}. Only use supplied data.",
  "flowchart {title,steps:string[]}; table {title,columns:string[],rows:string[][]}",
  "calculator {title,label,min,max,step,multiplier,suffix}; timeline {title,events:[{date,title,description}]}",
  "checklist {title,items:string[]}; decision {question,options:[{label,result}]}",
  "accordion {title,content}; poll {question,options:string[]}",
  "flashcards {title,cards:[{front,back}]}; cards {title,items:[{title,description}]}",
  "callout {title,body,tone}; slides {title,slides:[{heading,body}]}",
  "code {title,language,source}; palette {title,colors:[{name,hex}]}",
  "Never fabricate numbers, chart data, sources or quotations.",
  "Ordinary writing requests should return normal Markdown only.",
  "Keep posts clear, accessible, concise and mobile-first."
].join("\n");

export function createMobUIBlock(type, payload) {
  if (MOBUI_BLOCK_TYPES.indexOf(type) === -1) throw new Error("That MobUI component is not supported.");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Add valid component content first.");
  const output = "\n\n:::mobui " + type + "\n" + JSON.stringify(payload, null, 2) + "\n:::\n\n";
  if (output.length > 18000) throw new Error("This component is too large to insert.");
  return output;
}

export function parseMobUIContent(source) {
  const lines = String(source || "").split(/\r?\n/);
  const parts = [];
  let markdown = [];
  let codeFence = false;
  let pollIndex = 0;

  function flushMarkdown() {
    if (markdown.length) {
      parts.push({ type:"markdown", value:markdown.join("\n") });
      markdown = [];
    }
  }

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*(\x60{3}|~~~)/.test(line)) {
      codeFence = !codeFence;
      markdown.push(line);
      index += 1;
      continue;
    }
    const start = codeFence ? null : line.match(/^:::mobui\s+([a-z][a-z0-9-]*)\s*$/i);
    if (!start) {
      markdown.push(line);
      index += 1;
      continue;
    }

    flushMarkdown();
    const name = start[1].toLowerCase();
    const content = [];
    let closed = false;
    index += 1;
    while (index < lines.length) {
      if (/^\s*:::\s*$/.test(lines[index])) {
        closed = true;
        index += 1;
        break;
      }
      content.push(lines[index]);
      index += 1;
    }

    const raw = content.join("\n");
    const blockId = name === "poll" ? "poll-" + pollIndex++ : name + "-" + parts.length;
    let data = null;
    let error = null;
    if (MOBUI_BLOCK_TYPES.indexOf(name) === -1) error = "This MobUI component is not supported.";
    else if (!closed) error = "This MobUI component is missing its closing marker.";
    else if (raw.length > 16000) error = "This MobUI component is too large.";
    else {
      try {
        data = JSON.parse(raw);
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid component data");
      } catch (_) {
        error = "This MobUI component has invalid data. Open MobUI Studio to repair it.";
      }
    }
    parts.push({ type:"component", name:name, data:data, error:error, blockId:blockId });
  }

  flushMarkdown();
  return parts.length ? parts : [{ type:"markdown", value:String(source || "") }];
}

export function hasMobUIBlocks(source) {
  return parseMobUIContent(source).some(part => part.type === "component");
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function sanitizeMobHtml(html) {
  return DOMPurify.sanitize(String(html || ""), {
    ADD_ATTR:["class", "align", "start", "aria-label", "data-lexum", "target", "rel"],
    FORBID_TAGS:["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR:["style", "onerror", "onclick", "onload", "onmouseover", "onfocus", "oninput"]
  });
}

export function renderMobMarkdown(source) {
  const text = String(source || "");
  if (!text) return "";
  const renderer = new marked.Renderer();
  renderer.html = function(token) {
    const raw = typeof token === "string" ? token : token && (token.text || token.raw) || "";
    return escapeHtml(raw);
  };
  const html = marked.parse(text, {
    async:false, gfm:true, breaks:true, pedantic:false, headerIds:false,
    mangle:false, renderer:renderer
  });
  return sanitizeMobHtml(html);
}

export function isLegacyHtmlContent(value) {
  return /^\s*<(?:!doctype|html|body|p|div|span|br|strong|b|em|i|u|ul|ol|li|blockquote|h[1-6]|img|a|video)\b/i.test(String(value || ""));
}
