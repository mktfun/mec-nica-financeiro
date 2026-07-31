const XLSX = require('xlsx');

const workbook = XLSX.readFile('1543_ConferenciaOSxFinanceiro.xls');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Total rows:", data.length);
console.log("Columns of row 4:", Object.keys(data[3] || {}));
console.log("Row 4:", data[3]);
console.log("Row 5:", data[4]);
console.log("Row 6:", data[5]);

let totalOs = 0;
let totalPaid = 0;
const payments = {};

data.forEach((row, i) => {
  if (row["__EMPTY_5"] === "Finalizada") {
    console.log(`Row ${i} Finalizada:`, row["__EMPTY_6"], row["__EMPTY_7"], row["__EMPTY_10"], row["__EMPTY_11"], row["__EMPTY_14"]);
  }
});
