const fs = require('fs');
const xlsx = require('xlsx'); 

const files = [
"Rede_Rel_Vendas_15_07_2026-15_07_2026-235570cd-1595-4956-88f3-bb6c01213926.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-64d4d4e6-cd1a-4248-adcb-edf15f2f4964.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-66000f20-865c-4637-81bb-cf67ed79b727.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-86350d24-b960-4525-bb01-12536841327d.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-9d44d368-141b-47b6-8f81-b75bdc383e29.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-c35a73c2-2367-4b72-94a6-e20de036880a.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-d422e9a5-d61d-4c18-8645-57465c3731f0.xlsx",
"Rede_Rel_Vendas_15_07_2026-15_07_2026-e363b0ff-b09f-4d93-85fa-084d6e0a0553.xlsx"
];

let globalGross = 0;
let globalNet = 0;
let globalJuros = 0;

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

for (const file of files) {
  const wb = xlsx.readFile(`C:\\Users\\admin\\Downloads\\cnciliacao\\${file}`); 
  const sheet = wb.Sheets[wb.SheetNames[0]]; 
  
  // Test 1: with raw=true (like standard sheet_to_json does)
  const jsonRaw = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: true}); 
  
  // Test 2: with raw=false (gives strings)
  const jsonStr = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false}); 

  let tGross = 0;
  let tNet = 0;
  for (let i = 2; i < jsonRaw.length; i++) {
     const rowStr = jsonStr[i] || [];
     const rowRaw = jsonRaw[i] || [];
     
     // Original Logic
     const grossRaw = rowRaw[2];
     const netRaw = rowRaw[3];
     if (grossRaw === undefined || grossRaw === null || grossRaw === '' || isNaN(Number(grossRaw))) {
       // Skipped by old logic
     } else {
       // Accepted by old logic
       let g = extractNumber(grossRaw);
       let n = extractNumber(netRaw);
       if (typeof grossRaw === 'number' && grossRaw > 100 && !grossRaw.toString().includes('.')) {
         g = g / 100;
         n = n / 100;
       }
       tGross += g;
       tNet += n;
     }
  }
  globalGross += tGross;
  globalNet += tNet;
}

console.log({
  OLD_LOGIC: {
    globalGross,
    globalNet,
    juros: globalGross - globalNet
  }
});

let newGross = 0;
let newNet = 0;

for (const file of files) {
  const wb = xlsx.readFile(`C:\\Users\\admin\\Downloads\\cnciliacao\\${file}`); 
  const sheet = wb.Sheets[wb.SheetNames[0]]; 
  const jsonRaw = xlsx.utils.sheet_to_json(sheet, {header: 1, raw: false}); 

  let tGross = 0;
  let tNet = 0;
  for (let i = 2; i < jsonRaw.length; i++) {
     const row = jsonRaw[i] || [];
     const grossRaw = row[2];
     const netRaw = row[3];
     
     let g = extractNumber(grossRaw);
     let n = extractNumber(netRaw);
     
     if (g > 0) {
       if (typeof grossRaw === 'number' && grossRaw > 100 && !grossRaw.toString().includes('.')) {
         g = g / 100;
         n = n / 100;
       }
       tGross += g;
       tNet += n;
     }
  }
  newGross += tGross;
  newNet += tNet;
}

console.log({
  NEW_LOGIC: {
    newGross,
    newNet,
    juros: newGross - newNet
  }
});
