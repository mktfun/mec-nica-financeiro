const xlsx = require('xlsx'); 

function extractNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  str = str.replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  const lastCommaIndex = str.lastIndexOf(',');
  const lastDotIndex = str.lastIndexOf('.');
  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastCommaIndex > -1) {
    const parts = str.split(',');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || lastPart.length === 3) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (lastDotIndex > -1) {
    const parts = str.split('.');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || lastPart.length === 3) {
      str = str.replace(/\./g, '');
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

const file = "C:\\Users\\admin\\Downloads\\cnciliacao\\Rede_Rel_Vendas_15_07_2026-15_07_2026-64d4d4e6-cd1a-4248-adcb-edf15f2f4964.xlsx";
const wb = xlsx.readFile(file); 
const sheet = wb.Sheets[wb.SheetNames[0]]; 

// EXACT browser behavior
const json = xlsx.utils.sheet_to_json(sheet, {header: 1}); // default raw: true

let tGross = 0;
let tNet = 0;
for (let i = 2; i < json.length; i++) {
   const row = json[i];
   if (!Array.isArray(row) || row.length < 10) continue;

   const grossRaw = row[2];
   const netRaw = row[3];

   if (grossRaw === undefined || grossRaw === null || grossRaw === '') continue;

   let grossAmount = extractNumber(grossRaw);
   let netAmount = extractNumber(netRaw);

   if (grossAmount === 0 && netAmount === 0) continue;

   if (typeof grossRaw === 'number' && grossRaw > 100 && !grossRaw.toString().includes('.')) {
      console.log('Dividing by 100:', {grossRaw, grossAmount, netAmount});
      grossAmount = grossAmount / 100;
      netAmount = netAmount / 100;
   }

   tGross += grossAmount;
   tNet += netAmount;
}

console.log({ tGross, tNet });
