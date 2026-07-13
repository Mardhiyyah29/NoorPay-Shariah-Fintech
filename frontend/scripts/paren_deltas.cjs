const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx','utf8').split(/\r?\n/);
for (let i = 626; i <= 637; i++) {
  const line = lines[i-1] || '';
  let open = 0, close = 0;
  let inSingle = false, inDouble = false, inBack = false, esc = false;
  for (const ch of line) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inSingle) { if (ch === "'") inSingle = false; continue; }
    if (inDouble) { if (ch === '"') inDouble = false; continue; }
    if (inBack) { if (ch === '`') inBack = false; continue; }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === '`') { inBack = true; continue; }
    if (ch === '(') open++;
    if (ch === ')') close++;
  }
  console.log(i, 'open', open, 'close', close, 'line', JSON.stringify(line));
}
