const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('C:\\Users\\admin\\Downloads\\cnciliacao\\765_ConferenciaOSxFinanceiro.xls');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  if (data.length > 3) {
    console.log("Rows 3 to 8:", JSON.stringify(data.slice(2, 8), null, 2));
  }
} catch (e) {
  console.error("Error reading file:", e);
}
