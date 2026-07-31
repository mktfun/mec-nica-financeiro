const XLSX = require('xlsx');  
const fs = require('fs');  
const dir = 'C:/Users/admin/Desktop/conciliacao/';  
const files = fs.readdirSync(dir);  
console.log('=== MAQUININHA ===');  
files.filter(f = 
  const wb = XLSX.readFile(dir + f);  
  const sheet = wb.Sheets[wb.SheetNames[0]];  
  const json = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: false});  
  let sum = 0;  
  let count = 0;  
  let headerRow = 0;  
  for(let i=0; i<10; i++) { if(json[i] && json[i].includes('STATUS DA VENDA')) { headerRow = i; break; } }  
  const statusIdx = json[headerRow].indexOf('STATUS DA VENDA');  
  const valIdx = json[headerRow].indexOf('VALOR DA VENDA ORIGINAL');  
  const dateIdx = json[headerRow].indexOf('DATA DA VENDA');  
  for(let i=headerRow+1; i<json.length; i++) {  
    const row = json[i];  
    if(row && row[statusIdx] === 'APROVADA' && row[dateIdx] === '09/06/2026') {  
      let val = row[valIdx];  
      if(typeof val === 'string') val = parseFloat(val.replace(/[0-9,-]/g, '').replace(',', '.'));  
