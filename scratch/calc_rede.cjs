const xlsx = require('xlsx'); 
const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\cnciliacao\\Rede_Rel_Vendas_15_07_2026-15_07_2026-64d4d4e6-cd1a-4248-adcb-edf15f2f4964.xlsx'); 
const sheet = wb.Sheets[wb.SheetNames[0]]; 
const json = xlsx.utils.sheet_to_json(sheet, {header: 1}); 

let tGross = 0; 
let tNet = 0; 
let count = 0;
for(let i=2; i<json.length; i++) { 
  if(!json[i]) continue; 
  const g = Number(json[i][2]); 
  const n = Number(json[i][3]); 
  if(!isNaN(g) && !isNaN(n) && g > 0) { 
    tGross += g; 
    tNet += n; 
    count++;
  } 
} 
console.log({
  tGross, 
  tNet, 
  juros: tGross - tNet,
  count
});
