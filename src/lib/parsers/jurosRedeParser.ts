import * as XLSX from 'xlsx';
import { ParsedExpense } from './contasAPagarParser';

export function parseJurosRede(workbook: XLSX.WorkBook): ParsedExpense[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Usando raw: true para pegar valores numéricos de fato onde possível
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
  
  const expenses: ParsedExpense[] = [];
  
  // A planilha do JUROS REDE tem um layout horizontal complexo:
  // Linha 4 (index 4) costuma ter os nomes das lojas ("PIRAPORINHA", "PLANALTO", "Rudge")
  // Linha 5 (index 5) tem os cabeçalhos: "Tipo", "Valor Bruto", "Valor Liquido", "taxa juros", "valor cobrado"
  
  let storeRowIndex = -1;
  let headersRowIndex = -1;

  for (let i = 0; i < 10; i++) {
    const row = data[i] || [];
    // Verifica se a linha tem cabeçalhos de juros
    const hasValorBruto = row.some(cell => String(cell).toLowerCase().includes('valor bruto'));
    const hasValorCobrado = row.some(cell => String(cell).toLowerCase().includes('valor cobrado'));
    
    if (hasValorBruto && hasValorCobrado) {
      headersRowIndex = i;
      storeRowIndex = i - 1; // A loja costuma estar 1 linha acima
      break;
    }
  }

  if (headersRowIndex === -1 || storeRowIndex === -1) {
    throw new Error('Formato inválido: Não foi possível localizar o cabeçalho de Juros (Valor Bruto, valor cobrado).');
  }

  const storeRow = data[storeRowIndex] || [];
  const headersRow = data[headersRowIndex] || [];

  // Mapear cada bloco de loja.
  // Precisamos encontrar as posições das lojas e suas respectivas colunas de "valor cobrado".
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
      // Dentro de cada bloco, procuramos a coluna 'valor cobrado'
      let colValorCobrado = -1;
      let colTipo = -1;
      
      for (let c = block.startIndex; c <= block.endIndex; c++) {
        const h = headersRow[c] ? String(headersRow[c]).toLowerCase().trim() : '';
        if (h === 'valor cobrado') colValorCobrado = c;
        if (h === 'tipo' || h === 'bandeira' || h === 'modalidade') {
            if (colTipo === -1) colTipo = c; // pega o primeiro que se parece com tipo
        }
      }

      if (colValorCobrado !== -1) {
        const rawVal = row[colValorCobrado];
        if (rawVal) {
          let amount = 0;
          if (typeof rawVal === 'number') {
            amount = rawVal;
          } else {
             // Caso venha formatado
            amount = parseFloat(String(rawVal).replace(/\./g, '').replace(',', '.'));
          }

          if (!isNaN(amount) && amount > 0) {
            const extraInfo = colTipo !== -1 && row[colTipo] ? String(row[colTipo]) : 'Desconhecida';
            
            expenses.push({
              storeName: block.name, // Ex: "PIRAPORINHA"
              amount: amount, // Valor positivo para ser cobrado (out)
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
