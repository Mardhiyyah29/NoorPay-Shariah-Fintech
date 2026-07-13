const fs = require('fs');
const s = fs.readFileSync('frontend/src/App.jsx','utf8');
const lines = s.split(/\r?\n/);
let cum=0;let inS=false,inD=false,inB=false,esc=false;
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  for(const ch of line){
    if(esc){esc=false;continue;} if(ch==='\\'){esc=true;continue;} if(inS){ if(ch==="'") inS=false; continue;} if(inD){ if(ch==='"') inD=false; continue;} if(inB){ if(ch==='`') inB=false; continue;} if(ch==="'"){inS=true;continue;} if(ch==='"'){inD=true;continue;} if(ch==='`'){inB=true;continue;} if(ch==='{') cum++; if(ch==='}') cum--; }
  if(i>=580 && i<=640) console.log(i+1, 'cum', cum, '=>', line.trim());
  if(cum<0){ console.log('NEGATIVE at', i+1); break; }
}
console.log('FINAL',cum);
