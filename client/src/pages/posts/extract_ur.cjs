const fs = require('fs');
const content = fs.readFileSync('c:/Users/Ismail/Desktop/Textmob/frontend/index.js', 'utf8');
const match = content.match(/function Ur\([\s\S]*?function Gr/);
if (match) {
  fs.writeFileSync('c:/Users/Ismail/Desktop/Textmob/client/src/pages/posts/minified_post_viewer.txt', match[0]);
  console.log('Saved Ur definition');
} else {
  console.log('not found');
}
