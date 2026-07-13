const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/App.jsx', 'utf8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
    allowImportExportEverywhere: true,
    errorRecovery: false,
  });
  console.log('parsed ok');
} catch (err) {
  console.error('ERROR', err.message);
  if (err.loc) console.error('LOC', err.loc.line, err.loc.column);
  if (err.codeFrame) console.error(err.codeFrame);
  process.exit(1);
}
