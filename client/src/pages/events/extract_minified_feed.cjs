const fs = require('fs');
const content = fs.readFileSync('c:/Users/Ismail/Desktop/Textmob/frontend/index.js', 'utf8');
const lines = content.split('\n');
const startLine = 21680;
const endLine = 21820;
const excerpt = lines.slice(startLine, endLine).join('\n');
fs.writeFileSync('c:/Users/Ismail/Desktop/Textmob/client/src/pages/events/minified_events_feed.txt', excerpt);
console.log('Saved events feed excerpt');
