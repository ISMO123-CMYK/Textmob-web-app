// Replace a `@mention` / `#hashtag` token that starts at `start` inside `text`.
//
// Every composer captures the token's END from the caret on the render that
// produced the suggestion. A click (or Enter) can land one keystroke later,
// at which point `end` points into the middle of the token — the leftover
// fragment then gets appended after the replacement and the hashtag shows up
// twice ("#football #foo"). Re-deriving the end from the text that is actually
// in the box makes that impossible.
export function replaceTokenAt(text, start, token) {
  const str = String(text ?? '');
  const tok = String(token ?? '');
  if (!tok) return str;

  const s = Number.isFinite(start) ? Math.max(0, Math.min(start, str.length)) : 0;
  const symbol = tok.charAt(0);
  const rest = str.slice(s);
  const re = symbol === '@' ? /^@[\w.-]*/ : /^#[\w-]*/;
  const m = rest.match(re);
  const end = s + (m ? m[0].length : rest.charAt(0) === symbol ? 1 : 0);

  return `${str.slice(0, s)}${tok} ${str.slice(end)}`;
}
