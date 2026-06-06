// Bn – relative time formatter (exact match of minified bundle)
export default function timeAgo(e) {
  let t;
  if (e instanceof Date) {
    t = e.getTime();
  } else if (typeof e == 'number') {
    t = e;
  } else if (typeof e == 'string') {
    t = Date.parse(e.trim());
    if (isNaN(t)) {
      let n = new Date(e);
      t = isNaN(n.getTime()) ? NaN : n.getTime();
    }
  } else {
    return 'Invalid date';
  }
  if (isNaN(t)) return 'Invalid date';
  if (t > Date.now()) return 'Just now';

  let n = Date.now() - t;
  let r = Math.floor(n / 1000);
  let i = Math.floor(r / 60);
  let a = Math.floor(i / 60);
  let o = Math.floor(a / 24);
  let s = Math.floor(o / 7);
  let c = Math.floor(o / 30.436875);
  let l = Math.floor(o / 365.25);
  let u = (e, t) => `${e} ${t}${e === 1 ? '' : 's'}`;

  if (r < 60) {
    return r < 5 ? 'Just now' : `${u(r, 'second')} ago`;
  } else if (i < 60) {
    return `${u(i, 'minute')} ago`;
  } else if (a < 24) {
    return `${u(a, 'hour')} ago`;
  } else if (o < 7) {
    return `${u(o, 'day')} ago`;
  } else if (s < 4) {
    return `${u(s, 'week')} ago`;
  } else if (c < 12) {
    return `${u(c, 'month')} ago`;
  } else {
    return `${u(l, 'year')} ago`;
  }
}
