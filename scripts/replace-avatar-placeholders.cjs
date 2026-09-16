// Replace all external placeholder-avatar providers with the shared
// DEFAULT_AVATAR (client/src/utils/defaultAvatar.js) across Textmob + port.
// Run from repo root: node scripts/replace-avatar-placeholders.cjs
const fs = require('fs');

const DICEBEAR = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';

const targets = [
  'client/src/components/ui/PostCard.jsx',
  'client/src/components/layout/Sidebar.jsx',
  'client/src/pages/home/HomeFeed.jsx',
  'client/src/pages/auth/SavedAccountsSidebar.jsx',
  'client/src/pages/auth/ManageAccountsModal.jsx',
  'client/src/pages/AccountsCenter.jsx',
  'client/src/pages/snaps/SnapsContent.jsx',
  'client/src/pages/search/SearchContent.jsx',
  'client/src/pages/profile/ProfileContent.jsx',
  'client/src/pages/activity/ActivityContent.jsx',
  'client/src/louda/LoudaApp.jsx',
  'client/src/louda/StatusComponents.jsx',
];

const importFor = (f) => {
  const depth = f.split('/').length - 3; // dirs below client/src
  return `import { DEFAULT_AVATAR } from '${'../'.repeat(depth)}utils/defaultAvatar.js';`;
};

let total = 0;
for (const f of targets) {
  let src = fs.readFileSync(f, 'utf8');
  let count = 0;
  const sub = (re) => {
    const m = src.match(re);
    if (m) { count += m.length; src = src.replace(re, 'DEFAULT_AVATAR'); }
  };
  // dicebear default (quoted)
  sub(new RegExp(`['"]${DICEBEAR.replace(/[./?=&]/g, (c) => '\\' + c)}['"]`, 'g'));
  // ui-avatars template literals / concatenations
  sub(/`https:\/\/ui-avatars\.com[^`]*`/g);
  sub(/'https:\/\/ui-avatars\.com[^']*'/g);
  // placehold.co template literals / concatenations (full src expressions)
  sub(/`https:\/\/placehold\.co[^`]*`/g);
  sub(/'https:\/\/placehold\.co[^']*'\s*\+\s*[^,;)}\n]+/g);
  if (count > 0) {
    if (!src.includes('utils/defaultAvatar.js')) {
      src = `${importFor(f)}\n${src}`;
    }
    fs.writeFileSync(f, src);
  }
  console.log(`${f}: ${count} replaced`);
  total += count;
}
console.log(`TOTAL: ${total}`);
