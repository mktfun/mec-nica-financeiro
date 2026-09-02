const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const days = ['14-08', '17-08', '18-08', '19-08'];
const baseDir = 'C:\\Users\\admin\\Desktop\\conciliacao';

console.log('=== INSPEÇÃO DOS DIRETÓRIOS E ARQUIVOS BRUTOS ===');
days.forEach(day => {
  const dirPath = path.join(baseDir, day);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    console.log(`\n📁 Diretório ${day} (${files.length} arquivos):`);
    files.forEach(f => console.log(`  - ${f}`));
  } else {
    console.log(`\n❌ Diretório não encontrado: ${dirPath}`);
  }
});

console.log('\n=== INSPEÇÃO DAS PLANILHAS EXCEL DE CONCILIAÇÃO ===');
const excelFiles = [
  'CONCILIAÇÃO 1408.xlsx',
  'CONCILIAÇÃO 1708.xlsx',
  'CONCILIAÇÃO 1808.xlsx',
  'CONCILIAÇÃO 1908.xlsx'
];

excelFiles.forEach(ef => {
  const efPath = path.join(baseDir, ef);
  if (fs.existsSync(efPath)) {
    const wb = xlsx.readFile(efPath);
    console.log(`\n📊 Excel: ${ef} | Abas: ${wb.SheetNames.join(', ')}`);
  } else {
    console.log(`\n❌ Excel não encontrado: ${efPath}`);
  }
});
