const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const basePath = 'C:\\Users\\admin\\Desktop\\conciliacao';

['17-08', '18-08', '19-08'].forEach(folder => {
  const dir = path.join(basePath, folder);
  if (!fs.existsSync(dir)) return;
  console.log(`\n=== INSPECTING OS FILES IN ${folder} ===`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xls') || (f.endsWith('.xlsx') && !f.includes('Rede') && !f.includes('CONCILIAÇÃO')));
  
  let totalOsSum = 0;
  let totalCount = 0;

  files.forEach(f => {
    const full = path.join(dir, f);
    const wb = xlsx.readFile(full);
    const firstSheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Look for OS rows
    // Let's print headers and first 3 rows
    console.log(`\nFile: ${f} (Sheet: ${firstSheetName}, Rows: ${rows.length})`);
    if (rows.length > 0) {
      console.log('  Row 1:', JSON.stringify(rows[0]));
      if (rows.length > 1) console.log('  Row 2:', JSON.stringify(rows[1]));
      if (rows.length > 2) console.log('  Row 3:', JSON.stringify(rows[2]));
    }
  });
});
