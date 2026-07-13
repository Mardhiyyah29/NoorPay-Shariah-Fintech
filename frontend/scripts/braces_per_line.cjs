const fs = require('fs');
const lines = fs.readFileSync('frontend/src/App.jsx','utf8').split(/\r?\n/);
for(let i=580;i<=640;i++){
  const line = lines[i-1] || '';
  let o=0,c=0;let inS=false,inD=false,inB=false,esc=false;
  for(const ch of line){
    if(esc){esc=false;continue;} if(ch==='\\'){esc=true;continue;} if(inS){ if(ch==="'") inS=false; continue;} if(inD){ if(ch==='"') inD=false; continue;} if(inB){ if(ch==='`') inB=false; continue;} if(ch==="'"){inS=true;continue;} if(ch==='"'){inD=true;continue;} if(ch==='`'){inB=true;continue;} if(ch==='{') o++; if(ch==='}') c++; }
  console.log(i,'open',o,'close',c,'=>',line.trim());
}
