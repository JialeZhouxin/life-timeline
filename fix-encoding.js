const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf-8');

// Split into HTML segments and JS segments by <script> boundaries
const parts = content.split(/(<script[\s\S]*?<\/script>)/g);

const result = parts.map((part, i) => {
  // Odd indices are <script> blocks — keep as-is (JS \uXXXX is valid)
  if (i % 2 === 1) return part;
  
  // Even indices are HTML text — replace \uXXXX with actual characters
  return part.replace(/\\u([0-9a-fA-F]{4,5})/g, (match, code) => {
    return String.fromCodePoint(parseInt(code, 16));
  });
});

fs.writeFileSync('index.html', result.join(''), 'utf-8');
console.log('Done: Replaced \\uXXXX in HTML sections only');
