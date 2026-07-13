const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx','utf8').split(/\r?\n/);
let inSingle=false,inDouble=false,inBack=false,esc=false;
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  for(let j=0;j<line.length;j++){
    const ch = line[j];
    if(esc){ esc=false; continue; }
    if(ch==='\\'){ esc=true; continue; }
    if(inSingle){ if(ch==="'") { inSingle=false; } continue; }
    if(inDouble){ if(ch==='"') { inDouble=false; } continue; }
    if(inBack){ if(ch==='`') { inBack=false; } continue; }
    if(ch==="'"){ inSingle=true; console.log('enter single', i+1, j+1, JSON.stringify(line)); }
    if(ch==='"'){ inDouble=true; }
    if(ch==='`'){ inBack=true; }
  }
}
console.log('final states', {inSingle,inDouble,inBack});
