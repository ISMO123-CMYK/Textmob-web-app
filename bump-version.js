// Version bump helper for Textmob mobile builds.
//
//   node bump-version.js            → bump minor (1.0 → 1.1, 1.1 → 1.2, ...)
//   node bump-version.js major      → bump major (1.9 → 2.0)
//   node bump-version.js patch      → bump patch (1.0.0 → 1.0.1)
//   node bump-version.js 1.5        → set the exact version (e.g. 1.7)
//
// Updates BOTH mobile/app.json (expo.version + android.versionCode) and
// mobile/package.json so every build carries one consistent number.
// After running it: build the APK, replace public/apk/thetextmobapp.apk,
// then publish the new version from the admin panel (asilfcismail → App Updates).

const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, 'mobile', 'app.json');
const PKG_JSON = path.join(__dirname, 'mobile', 'package.json');

function fail(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

function splitVersion(v) {
  return String(v || '')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

function formatVersion(parts) {
  const p = parts.slice(0, 3);
  while (p.length < 2) p.push(0);
  return p.join('.');
}

// Rewrite a single `"key": value` occurrence in place instead of running the
// whole file through JSON.stringify. JSON.stringify would reflow hand-written
// formatting (e.g. package.json's one-line `exclude` array) and turn a 1-line
// version bump into a noisy multi-line diff. Returns null if the key is absent
// or the result is not valid JSON, so callers can fall back to a re-serialise.
function replaceField(raw, key, literal) {
  const re = new RegExp('("' + key + '"\\s*:\\s*)("[^"]*"|-?\\d+(?:\\.\\d+)?)');
  if (!re.test(raw)) return null;
  const out = raw.replace(re, '$1' + literal);
  try {
    JSON.parse(out);
    return out;
  } catch (e) {
    return null;
  }
}

function emit(raw, fields, parsed) {
  let out = raw;
  for (let i = 0; i < fields.length; i++) {
    const next = replaceField(out, fields[i][0], fields[i][1]);
    if (next === null) {
      out = null;
      break;
    }
    out = next;
  }
  if (out !== null) return out;
  return JSON.stringify(parsed, null, 2) + '\n';
}

function main() {
  const arg = (process.argv[2] || 'minor').toLowerCase();
  const appRaw = fs.readFileSync(APP_JSON, 'utf8');
  const pkgRaw = fs.readFileSync(PKG_JSON, 'utf8');

  let app;
  let pkg;
  try {
    app = JSON.parse(appRaw);
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    fail('Could not parse JSON: ' + e.message);
  }

  const oldVersion = app.expo && app.expo.version ? String(app.expo.version) : pkg.version || '0.0';
  const parts = splitVersion(oldVersion);

  let nextVersion;
  if (/^\d+(\.\d+){1,2}$/.test(arg)) {
    nextVersion = formatVersion(splitVersion(arg));
    if (parts.join('.') === nextVersion) fail('Version is already ' + nextVersion + '.');
  } else if (arg === 'major') {
    parts[0]++;
    parts[1] = 0;
    nextVersion = formatVersion([parts[0], parts[1]]);
  } else if (arg === 'patch') {
    if (parts.length < 3) parts[2] = 0;
    parts[2]++;
    nextVersion = formatVersion(parts);
  } else if (arg === 'minor' || arg === '') {
    parts[1]++;
    nextVersion = formatVersion([parts[0], parts[1]]);
  } else {
    fail('Usage: node bump-version.js [major|minor|patch|<version>]');
  }

  if (nextVersion === oldVersion) fail('Version unchanged, nothing to do.');

  const oldCode = app.expo && app.expo.android && app.expo.android.versionCode
    ? parseInt(app.expo.android.versionCode, 10)
    : 1;
  const nextCode = oldCode + 1;

  app.expo.version = nextVersion;
  if (!app.expo.android) app.expo.android = {};
  app.expo.android.versionCode = nextCode;
  pkg.version = nextVersion;

  const appOut = emit(appRaw, [
    ['version', JSON.stringify(nextVersion)],
    ['versionCode', String(nextCode)],
  ], app);
  const pkgOut = emit(pkgRaw, [['version', JSON.stringify(nextVersion)]], pkg);
  fs.writeFileSync(APP_JSON, appOut);
  fs.writeFileSync(PKG_JSON, pkgOut);

  console.log('Version bumped: ' + oldVersion + ' → ' + nextVersion);
  console.log('Android versionCode: ' + oldCode + ' → ' + nextCode);
  console.log('Updated: mobile/app.json + mobile/package.json');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Build the APK (eas build -p android)');
  console.log('  2. Replace public/apk/thetextmobapp.apk with the new build');
  console.log('  3. Admin panel → App Updates → Publish v' + nextVersion);
}

main();