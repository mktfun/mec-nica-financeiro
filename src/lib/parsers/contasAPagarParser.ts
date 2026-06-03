import * as XLSX from 'xlsx';

export interface ParsedExpense {
  storeName: string;
  amount: number;
  description: string;
  occurredAt: string;
  category: string;
  originalStatus: string;
}

export function parseContasAPagar(workbook: XLSX.WorkBook): ParsedExpense[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Usando raw: false para pegar datas como string se o excel estiver formatado
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
  
  const expenses: ParsedExpense[] = [];
  let headerRowIndex = -1;
  let headers: string[] = [];

  // Encontrar onde os cabeçalhos começam (procurar "Emp", "Código", "Vl. a Pagar")
  for (let i = 0; i < data.length; i++) {
    const row = data[i] || [];
    const hasEmp = row.some(cell => String(cell).toLowerCase() === 'emp');
    const hasVl = row.some(cell => String(cell).toLowerCase().includes('vl. a pagar'));
    
    if (hasEmp && hasVl) {
      headerRowIndex = i;
      headers = row.map(r => String(r || '').trim());
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Formato inválido: Não foi possível localizar as colunas "Emp" e "Vl. a Pagar" no arquivo.');
  }

  const empIndex = headers.findIndex(h => h && h.toLowerCase() === 'emp');
  const descIndex = headers.findIndex(h => h && h.toLowerCase() === 'descrição');
  const catIndex = headers.findIndex(h => h && (h.toLowerCase().includes('categoria') || h.toLowerCase().includes('classificação') || h.toLowerCase().includes('plano de contas') || h.toLowerCase() === 'centro de custo'));
  const vlPagoIndex = headers.findIndex(h => h && (h.toLowerCase() === 'vl. pago' || h.toLowerCase() === 'vl pago'));
  const vlPagarIndex = headers.findIndex(h => h && (h.toLowerCase() === 'vl. a pagar' || h.toLowerCase() === 'vl a pagar'));
  const statusIndex = headers.findIndex(h => h && h.toLowerCase() === 'status');
  const dtPgtoIndex = headers.findIndex(h => h && (h.toLowerCase() === 'dt. pgto' || h.toLowerCase() === 'dt pgto'));

  if (empIndex === -1 || (vlPagoIndex === -1 && vlPagarIndex === -1)) {
    throw new Error('Formato inválido: Faltam colunas essenciais ("Emp" ou "Vl. Pago").');
  }

  // Iterar pelas linhas de dados
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] || [];
    const storeName = row[empIndex];
    if (!storeName || String(storeName).trim() === '') continue; // linha vazia
    if (String(storeName).toUpperCase() === 'TOTAL') continue; // linha de total

    // Se tiver valor pago usa ele, senao valor a pagar
    const rawVal = vlPagoIndex !== -1 ? row[vlPagoIndex] : row[vlPagarIndex];
    if (!rawVal) continue;
    
    // Converte de "1.573,33" para float se for string
    let amount = 0;
    if (typeof rawVal === 'number') {
      amount = rawVal;
    } else {
      amount = parseFloat(String(rawVal).replace(/\./g, '').replace(',', '.'));
    }

    if (isNaN(amount) || amount <= 0) continue;

    const description = descIndex !== -1 && row[descIndex] ? String(row[descIndex]) : 'Conta a Pagar Importada';
    const originalStatus = statusIndex !== -1 && row[statusIndex] ? String(row[statusIndex]) : 'PAG';
    
    let category = 'Outras Despesas';
    if (catIndex !== -1 && row[catIndex]) {
      category = String(row[catIndex]).trim();
    } else if (description !== 'Conta a Pagar Importada') {
      // Se não tem categoria, agrupa pela própria descrição ou fornecedor
      category = description.split('-')[0].split('|')[0].trim();
    }
    
    // Pega dtPgto, se não houver, assume hoje
    let occurredAt = new Date().toISOString().split('T')[0];
    if (dtPgtoIndex !== -1 && row[dtPgtoIndex]) {
      // row[dtPgtoIndex] pode ser "02/06/2026" se raw:false, ou um numero de data do excel se raw:true falhou
      const rawDate = String(row[dtPgtoIndex]);
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          // assumindo DD/MM/YYYY
          occurredAt = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    expenses.push({
      storeName: String(storeName).trim(),
      amount,
      description,
      occurredAt,
      category,
      originalStatus
    });
  }

  return expenses;
}
