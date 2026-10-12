require('dotenv').config();
const { createStorage } = require('../b2');

(async () => {
  const s = createStorage();
  await s._authorize();
  let deleted = 0;
  for (;;) {
    const objs = await s.list('data/');
    if (!objs.length) break;
    for (const o of objs) {
      await s.delete(o.name);
      deleted++;
    }
    console.log('deleted ' + deleted + ' so far (page of ' + objs.length + ')');
    if (deleted > 20000) break;
  }
  const final = await s.list('');
  console.log('TOTAL deleted:', deleted);
  console.log('bucket now has', final.length, 'objects:');
  final.forEach(o => console.log(' ', o.name, (o.size / 1024).toFixed(0) + 'KB'));
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
