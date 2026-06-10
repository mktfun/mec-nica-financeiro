import * as XLSX from 'xlsx';
import * as fs from 'fs';

function analyzeFile(filePath: string) {
  console.log('--- Analyzing', filePath, '---');
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Ler os primeiros 20 registros
    const dataRawFalse = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }).slice(0, 20);
    const dataRawTrue = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }).slice(0, 20);
    
    // Ultimas 5 linhas pra ver totais
    const fullData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    const lastRows = fullData.slice(Math.max(fullData.length - 5, 0));
    
    console.log('RAW: FALSE (First 15 rows):');
    dataRawFalse.slice(0, 15).forEach((r: any) => console.log(JSON.stringify(r)));
    
    console.log('\nRAW: TRUE (First 15 rows):');
    dataRawTrue.slice(0, 15).forEach((r: any) => console.log(JSON.stringify(r)));
    
    console.log('\nLAST 5 ROWS:');
    lastRows.forEach((r: any) => console.log(JSON.stringify(r)));
    
    console.log('\nTotal rows:', fullData.length);
  } catch (e: any) {
    console.log('Error reading file:', e.message);
  }
}

function analyzeOFX(filePath: string) {
  console.log('--- Analyzing', filePath, '---');
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    console.log(text.substring(0, 500));
    console.log('...');
  } catch (e: any) {
    console.log('Error reading file:', e.message);
  }
}

analyzeFile('C:\\Users\\User\\Downloads\\JABI 0906.xls');
analyzeFile('C:\\Users\\User\\Downloads\\BuscaContasAPagar (1).xls');
analyzeFile('C:\\Users\\User\\Downloads\\JUROS REDE.xlsx');
analyzeOFX('C:\\Users\\User\\Downloads\\Extrato_JAB.ofx');
