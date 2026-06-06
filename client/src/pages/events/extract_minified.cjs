const fs = require('fs');
const content = fs.readFileSync('c:/Users/Ismail/Desktop/Textmob/frontend/index.js', 'utf8');
const lines = content.split('\n');
const startLine = 23350;
const endLine = 23500;
const excerpt = lines.slice(startLine, endLine).join('\n');
fs.writeFileSync('c:/Users/Ismail/Desktop/Textmob/client/src/pages/events/minified_event_creator.txt', excerpt);
console.log('Saved excerpt');
