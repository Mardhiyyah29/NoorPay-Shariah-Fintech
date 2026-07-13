const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx','utf8').split(/\r?\n/);
const region = lines.slice(493, 640).join('\n');
const tagRE = /<\s*\/?\s*([A-Za-z0-9_:$-]+)([^>]*)>/g;
const selfClosingRE = /\/$/;

const stack=[];
let m; while((m=tagRE.exec(region))){
  const full=m[0];
  const name=m[1];
  const isClosing=/^<\s*\//.test(full);
  const isSelfClosing=selfClosingRE.test(full) || full.endsWith('/>');
  const pos=region.slice(0,m.index).split(/\r?\n/).length;
  if(isClosing){
    const top=stack.pop();
    if(!top){ console.log('unmatched close', name, 'at line', pos); break; }
    if(top !== name){ console.log('tag mismatch', top, 'vs', name, 'at line', pos); break; }
  } else if(!isSelfClosing) {
    stack.push(name);
  }
}
console.log('stack', stack.slice(0,10), 'len', stack.length);
