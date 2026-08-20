const fs = require('fs');
const path = require('path');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

['17-08', '18-08', '19-08'].forEach(folder => {
  const full = path.join(basePath, folder);
  console.log(`\n======================================================`);
  console.log(`=== FILES IN FOLDER: ${folder} ===`);
  console.log(`======================================================`);
  if (!fs.existsSync(full)) {
    console.log('Folder does not exist!');
    return;
  }
  const files = fs.readdirSync(full);
  files.forEach(f => {
    const p = path.join(full, f);
    const stat = fs.statSync(p);
    console.log(`- ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  });
});
