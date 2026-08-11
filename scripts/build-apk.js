// Sequential release runner:
//   node scripts/build-apk.js            → bump minor, commit, build
//   node scripts/build-apk.js 1.7        → bump to exact version, commit, build
//   node scripts/build-apk.js skip-bump  → skip version bump, just commit + build
// Runs one step at a time; stops on first failure.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const MOBILE = path.join(ROOT, 'mobile');
const arg = (process.argv[2] || 'minor').toLowerCase();

function run(cmd, args, cwd = ROOT) {
  console.log(`\n=== ${cmd} ${args.join(' ')} (in ${path.relative(ROOT, cwd) || '.'}) ===`);
  const exe = cmd === 'npx' && process.platform === 'win32' ? 'npx.cmd' : cmd;
  const res = spawnSync(exe, args, { cwd, stdio: 'inherit', shell: false });
  if (res.status !== 0) {
    console.error(`\nFAILED: ${cmd} ${args.join(' ')} exited with code ${res.status}`);
    process.exit(res.status || 1);
  }
  return res;
}

function gitStatus() {
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  return (res.stdout || '').trim();
}

if (!fs.existsSync(path.join(MOBILE, 'package.json'))) {
  console.error('Run this from the repo root (where mobile/ lives).');
  process.exit(1);
}

if (arg !== 'skip-bump') {
  run('node', ['bump-version.js', arg]);
}

const changes = gitStatus();
if (!changes) {
  console.log('\nNothing to commit — tree is clean.');
} else {
  const message = process.argv[3] || `Release build (auto): ${new Date().toISOString().slice(0, 10)}`;
  run('git', ['add', '-A']);
  run('git', ['commit', '-m', message]);
}

run('npx', ['eas', 'build', '-p', 'android', '--profile', 'production'], MOBILE);

console.log('\nDone. Next: download the APK, replace public/apk/thetextmobapp.apk, then publish from the admin panel.');
