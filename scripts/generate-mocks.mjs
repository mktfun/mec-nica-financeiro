import fs from 'fs';
import path from 'path';

// Pega a pasta Downloads do usuário no Windows ou Mac/Linux
const homeDir = process.env.USERPROFILE || process.env.HOME || '';
const downloadsDir = path.join(homeDir, 'Downloads', '04-08', '04-08');
const outputDir = path.join(process.cwd(), 'src', '__mocks__');
const outputFile = path.join(outputDir, 'importFiles.ts');

if (!fs.existsSync(downloadsDir)) {
  console.error(`Pasta Downloads não encontrada em: ${downloadsDir}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Filtra arquivos relevantes de teste que a gente costuma dropar
const files = fs.readdirSync(downloadsDir).filter(f => {
  const ext = path.extname(f).toLowerCase();
  const name = f.toLowerCase();
  // Pega Extrato_*, planilhas com "0408" ou "0608" ou "0508", ou "Rede_Rel_Vendas"
  return (
    (ext === '.ofx' && name.includes('extrato')) ||
    (ext === '.xls' && (name.includes('0408') || name.includes('0608') || name.includes('0508'))) ||
    (ext === '.xlsx' && name.includes('rede')) ||
    (ext === '.xls' && name.includes('mapa_metas'))
  );
});

console.log(`Encontrados ${files.length} arquivos para mock em ${downloadsDir}...`);

let fileContent = `// Arquivo gerado automaticamente por scripts/generate-mocks.mjs
// NÃO COMITE ESTE ARQUIVO!

export const mockFiles = [\n`;

for (const file of files) {
  const filePath = path.join(downloadsDir, file);
  const ext = path.extname(file).toLowerCase();
  let mimeType = 'text/plain';
  
  if (ext === '.xls') mimeType = 'application/vnd.ms-excel';
  else if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === '.ofx') mimeType = 'application/x-ofx';
  else if (ext === '.pdf') mimeType = 'application/pdf';

  const base64 = fs.readFileSync(filePath, 'base64');

  fileContent += `  {
    name: ${JSON.stringify(file)},
    type: ${JSON.stringify(mimeType)},
    size: ${fs.statSync(filePath).size},
    base64: "${base64}"
  },\n`;
}

fileContent += `];\n`;

fs.writeFileSync(outputFile, fileContent);
console.log(`Gerado: ${outputFile} com ${files.length} arquivos encodados.`);
