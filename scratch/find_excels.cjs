const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Let's find any .xlsx files in the project or workspace
function findFiles(dir, match) {
  let res = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.gemini')) {
        res = res.concat(findFiles(full, match));
      }
    } else if (file.match(match)) {
      res.push(full);
    }
  });
  return res;
}

const files = findFiles('c:\\Users\\admin\\.gemini\\antigravity\\scratch\\financeiro', /\.(xlsx|xls)$/i);
console.log('Found spreadsheet files:');
files.forEach(f => console.log(' ', f));
