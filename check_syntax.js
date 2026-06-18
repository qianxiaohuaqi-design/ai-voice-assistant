const fs = require('fs');
const html = fs.readFileSync('D:\\claude\\static\\index.html', 'utf8');
const regex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  try {
    new Function(match[1]);
  } catch (e) {
    console.error("Syntax error found:");
    console.error(e);
    process.exit(1);
  }
}
console.log("No syntax errors in <script> blocks.");
