const xlsx = require('xlsx');
const workbook = xlsx.readFile('C:\\\\Users\\\\User\\\\Downloads\\\\1675_ConferenciaOSxFinanceiro.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
console.log(JSON.stringify(xlsx.utils.sheet_to_json(sheet, {header: 1}).slice(0, 10), null, 2));
