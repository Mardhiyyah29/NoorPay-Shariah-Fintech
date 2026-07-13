const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx','utf8').split(/\r?\n/);
for (let i = 626; i <= 640; i++) {
  const line = lines[i-1] || '';
  console.log(`LINE ${i}: ${line}`);
  const codes = [];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === '[' || ch === ']' || ch === '"' || ch === "'" || ch === '`') {
      codes.push(`${j}:${ch}:${ch.charCodeAt(0)}`);
    }
  }
  if (codes.length) console.log('  chars:', codes.join(' | '));
}
