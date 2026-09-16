// Replace remaining dicebear fallbacks with shared DEFAULT_AVATAR.
const fs = require('fs');
const DICE = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';
const files = [
  'client/src/pages/discussions/Discussions.jsx',
  'client/src/pages/discussions/DiscussionRoom.jsx',
  'client/src/pages/posts/PostContent.jsx',
  'client/src/pages/posts/MakePostContent.jsx',
];
const importFor = (f) => {
  const depth = f.split('/').length - 3;
  return `import { DEFAULT_AVATAR } from '${'../'.repeat(depth)}utils/defaultAvatar.js';`;
};
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  const count = src.split(`'${DICE}'`).length - 1;
  src = src.split(`'${DICE}'`).join('DEFAULT_AVATAR');
  if (count > 0 && !src.includes('utils/defaultAvatar.js')) {
    src = `${importFor(f)}\n${src}`;
  }
  fs.writeFileSync(f, src);
  console.log(`${f}: ${count}`);
}
