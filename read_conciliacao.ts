import * as fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('C:/Users/admin/Downloads/cnciliacao/CONCILIAÇÃO 1407.xlsx');
const workbook = XLSX.read(buf, { type: 'buffer' });
workbook.SheetNames.forEach(name => {
  console.log('Sheet:', name);
  const json = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
  console.log(json.slice(0, 10));
});
