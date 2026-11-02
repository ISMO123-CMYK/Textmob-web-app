// Replace a `@mention` / `#hashtag` token that starts at `start` inside `text`.
//
// Every composer captures the token's END from the caret on the render that
// produced the suggestion. A click (or Enter) can land one keystroke later,
// at which point `end` points into the middle of the token - the leftover
// fragment then gets appended after the replacement and the hashtag shows up
// twice ("#football #foo"). Re-deriving the end from the text that is actually
// in the box makes that impossible.
export function replaceTokenAt(text, start, token) {
  const str = String(text ?? '');
  let tok = String(token ?? '');
  if (!tok) return str;

  const symbol = tok.charAt(0);
  if (symbol === '#') tok = '#' + tok.replace(/^#+/, '');
  if (symbol === '@') tok = '@' + tok.replace(/^@+/, '');

  let s = Number.isFinite(start) ? Math.max(0, Math.min(start, str.length)) : 0;

  // Recover a doubled trigger instead of leaving one behind.
  if (symbol === '#') {
    while (s > 0 && str.charAt(s - 1) === '#') s -= 1;
  }

  const rest = str.slice(s);
  const re = symbol === '@' ? /^@+[\w.-]*/ : /^#+[\w-]*/;
  const m = rest.match(re);
  const end = s + (m ? m[0].length : rest.charAt(0) === symbol ? 1 : 0);
  const suffix = str.slice(end);

  // Keep exactly one separator after the selected token.
  const cleanSuffix = suffix.charAt(0) === ' ' ? suffix.slice(1) : suffix;
  return `${str.slice(0, s)}${tok} ${cleanSuffix}`;
}
