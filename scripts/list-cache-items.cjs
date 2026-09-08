const fs = require('fs');
const path = require('path');

const cacheFile = path.join(__dirname, 'extracted_0209_os_cache.json');
const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

console.log(`Total de itens no cache: ${Object.keys(cache).length}\n`);

let idx = 1;
for (const [file, item] of Object.entries(cache)) {
  console.log(`${idx.toString().padStart(2, ' ')}. [${file}] | OS: ${item.os_number} | Loja: "${item.empresa_loja}" | Placa: ${item.plate} | Cliente: ${item.client_name} | Total: R$ ${item.total_value} | Pago: R$ ${item.paid_value} | Status: ${item.status}`);
  idx++;
}
