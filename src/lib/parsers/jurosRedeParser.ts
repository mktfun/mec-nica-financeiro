import * as XLSX from 'xlsx';
import { ParsedExpense } from './contasAPagarParser';
import { extractNumber } from '@/lib/parsers/numberUtils';
import { normalizeRedeStoreName } from './storeMapping';

export function parseJurosRede(workbook: XLSX.WorkBook): ParsedExpense[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Usando raw: true para pegar valores numéricos de fato onde possível
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
  
  const expenses: ParsedExpense[] = [];
  
  let storeRowIndex = -1;
  let headersRowIndex = -1;

  for (let i = 0; i < 10; i++) {
    const row = data[i] || [];
    const hasValorBruto = row.some(cell => String(cell).toLowerCase().includes('valor bruto'));
    const hasValorCobrado = row.some(cell => String(cell).toLowerCase().includes('valor cobrado'));
    
    if (hasValorBruto && hasValorCobrado) {
      headersRowIndex = i;
      storeRowIndex = i - 1;
      break;
    }
  }

  if (headersRowIndex === -1 || storeRowIndex === -1) {
    throw new Error('Formato inválido: Não foi possível localizar o cabeçalho de Juros (Valor Bruto, valor cobrado).');
  }

  const storeRow = data[storeRowIndex] || [];
  const headersRow = data[headersRowIndex] || [];

  const storeBlocks: { name: string, startIndex: number, endIndex: number }[] = [];
  
  let currentStore = '';
  let startIndex = -1;

  for (let col = 0; col < headersRow.length; col++) {
    const cellStore = storeRow[col] ? String(storeRow[col]).trim() : '';
    const cellHeader = headersRow[col] ? String(headersRow[col]).toLowerCase().trim() : '';
    
    if (cellStore && cellStore !== '') {
      if (currentStore !== '') {
        storeBlocks.push({ name: currentStore, startIndex, endIndex: col - 1 });
      }
      currentStore = cellStore;
      startIndex = col;
    }
  }
  
  if (currentStore !== '') {
    storeBlocks.push({ name: currentStore, startIndex, endIndex: headersRow.length - 1 });
  }

  // Iterar pelas linhas de dados
  for (let i = headersRowIndex + 1; i < data.length; i++) {
    const row = data[i] || [];
    
    for (const block of storeBlocks) {
      const normalizedStoreName = normalizeRedeStoreName(block.name);
      if (normalizedStoreName === 'IGNORAR') continue;

      const storeStr = normalizedStoreName.toUpperCase();
      if (storeStr.includes('TOTAL') || storeStr.includes('SOMA') || storeStr.includes('GERAL')) {
        continue;
      }

      let colValorCobrado = -1;
      let colTipo = -1;
      
      for (let c = block.startIndex; c <= block.endIndex; c++) {
        const h = headersRow[c] ? String(headersRow[c]).toLowerCase().trim() : '';
        if (h === 'valor cobrado') colValorCobrado = c;
        if (h === 'tipo' || h === 'bandeira' || h === 'modalidade') {
            if (colTipo === -1) colTipo = c;
        }
      }

      if (colValorCobrado !== -1) {
        const rawVal = row[colValorCobrado];
        if (rawVal) {
          const amount = extractNumber(rawVal);

          if (amount > 0) {
            const extraInfo = colTipo !== -1 && row[colTipo] ? String(row[colTipo]) : 'Desconhecida';
            const extraStr = extraInfo.toUpperCase();
            
            if (extraStr.includes('TOTAL') || extraStr.includes('SOMA') || extraStr.includes('GERAL')) {
              continue;
            }
            
            expenses.push({
              storeName: normalizedStoreName,
              amount: amount,
              description: `Juros Antecipação - Tipo: ${extraInfo}`,
              occurredAt: new Date().toISOString().split('T')[0],
              category: 'juros_rede',
              originalStatus: 'PAG'
            });
          }
        }
      }
    }
  }

  return expenses;
}
