const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\17-08';
if (!fs.existsSync(dir)) {
  console.log(`Directory ${dir} not found!`);
  process.exit(1);
}

const files = fs.readdirSync(dir);
console.log(`Found ${files.length} files in ${dir}:`);

files.forEach(f => {
  const fullPath = path.join(dir, f);
  const stat = fs.statSync(fullPath);
  console.log(`- ${f} (${stat.size} bytes)`);
});
