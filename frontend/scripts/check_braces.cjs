const fs = require('fs');
const s = fs.readFileSync('frontend/src/App.jsx','utf8');
let cum = 0;let inSingle=false,inDouble=false,inBack=false,esc=false;const lines=s.split(/\r?\n/);
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  for(let j=0;j<line.length;j++){
    const c=line[j]; if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(inSingle){ if(c==="'") inSingle=false; continue;} if(inDouble){ if(c==='"') inDouble=false; continue;} if(inBack){ if(c==='`') inBack=false; continue;} if(c==="'"){inSingle=true;continue;} if(c==='"'){inDouble=true;continue;} if(c==='`'){inBack=true;continue;} if(c==='{') cum++; if(c==='}') cum--; }
  if(cum<0){ console.log('Negative braces at line',i+1,'cum',cum); console.log(lines.slice(Math.max(0,i-3),i+1).join('\n')); process.exit(0);} }
console.log('Final braces cum',cum);
