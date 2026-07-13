const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx','utf8').split(/\r?\n/);
let inSingle=false,inDouble=false,inBack=false,esc=false;
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  for(let j=0;j<line.length;j++){
    const ch = line[j];
    if(esc){ esc=false; continue; }
    if(ch==='\\'){ esc=true; continue; }
    if(inSingle){
      if(ch==="'"){
        inSingle=false;
        console.log('exit single', i+1, j+1, JSON.stringify(line));
      }
      continue;
    }
    if(inDouble){
      if(ch==='"'){
        inDouble=false;
        console.log('exit double', i+1, j+1, JSON.stringify(line));
      }
      continue;
    }
    if(inBack){
      if(ch==='`'){
        inBack=false;
        console.log('exit back', i+1, j+1, JSON.stringify(line));
      }
      continue;
    }
    if(ch==="'"){
      inSingle=true;
      console.log('enter single', i+1, j+1, JSON.stringify(line));
      continue;
    }
    if(ch==='"'){
      inDouble=true;
      console.log('enter double', i+1, j+1, JSON.stringify(line));
      continue;
    }
    if(ch==='`'){
      inBack=true;
      console.log('enter back', i+1, j+1, JSON.stringify(line));
      continue;
    }
  }
}
console.log('FINAL states', {inSingle,inDouble,inBack});
