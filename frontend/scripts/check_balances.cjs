const fs = require('fs');
const s = fs.readFileSync('src/App.jsx','utf8');
const lines = s.split(/\r?\n/);
let paren=0, brace=0, bracket=0;
let inSingle=false,inDouble=false,inBack=false,esc=false;
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  for(const ch of line){
    if(esc){ esc=false; continue; }
    if(ch==='\\'){ esc=true; continue; }
    if(inSingle){ if(ch==="'") inSingle=false; continue; }
    if(inDouble){ if(ch==='"') inDouble=false; continue; }
    if(inBack){ if(ch==='`') inBack=false; continue; }
    if(ch==="'"){ inSingle=true; continue; }
    if(ch==='"'){ inDouble=true; continue; }
    if(ch==='`'){ inBack=true; continue; }
    if(ch==='(') paren++;
    if(ch===')') paren--;
    if(ch==='{') brace++;
    if(ch==='}') brace--;
    if(ch==='[') bracket++;
    if(ch===']') bracket--;
  }
  if(i >= 470 && i <= 640) {
    console.log(`${i+1} paren=${paren} brace=${brace} bracket=${bracket} | ${line}`);
  }
  if(paren < 0 || brace < 0 || bracket < 0) {
    console.log('NEGATIVE at', i+1, paren, brace, bracket);
    break;
  }
}
console.log('FINAL', paren, brace, bracket);
