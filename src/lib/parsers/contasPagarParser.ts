import * as XLSX from 'xlsx';
import { extractNumber } from './numberUtils';
import { ParsedContaAPagar, ContasAPagarParseResult } from '@/types/contasPagar';

export const STORE_EMP_MAP: Record<string, { id: string; name: string }> = {
  'mpjorgeberetta': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  'reidomodulo':    { id: 'st-09', name: 'Rei do Módulo - MP' },
  'mppiraporinha':  { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  'mpjabaquara':    { id: 'st-02', name: 'Jabaquara - JAB' },
  'mprudge':        { id: 'st-07', name: 'Rudge Ramos - CAP' },
  'mpkennedy':      { id: 'st-04', name: 'Kennedy - MP' },
  'reidooleomaua':  { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' },
  'mpplanalto':     { id: 'st-06', name: 'Planalto - BRASICAR' },
  'mpsantoandre':   { id: 'st-08', name: 'Santo André - HD' },
  'mpdompedro1':    { id: 'st-01', name: 'Dom Pedro - DP' },
  'mpmaster':       { id: 'master', name: 'Matriz / Compartilhado' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  'retirada_socios':    'Retirada / Sócios',
  'gestao_tech':        'Gestão, Cartão & Tech',
  'pecas':              'Peças & Fornecedores',
  'logistica_os':       'Logística Uber OS',
  'despesas_bancarias': 'Despesas Bancárias',
  'outros':             'Outros / Operacional',
};

export function mapEmpToStore(empRaw: string): { id: string; name: string } {
  if (!empRaw) return { id: 'master', name: 'Matriz / Compartilhado' };
  const clean = empRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (STORE_EMP_MAP[clean]) return STORE_EMP_MAP[clean];

  for (const [key, val] of Object.entries(STORE_EMP_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return val;
  }

  return { id: 'master', name: empRaw };
}

export function classifyExpense(fornecedor: string, descricao: string): { category: string; matchedOs?: string; isIntercompany: boolean } {
  const fullText = `${fornecedor || ''} ${descricao || ''}`.toUpperCase();

  // 1. Extração de OS em Uber
  const uberMatch = fullText.match(/UBER\s*(?:OS)?\s*#?([0-9]{4,8})/);
  if (uberMatch) {
    return { category: 'logistica_os', matchedOs: uberMatch[1], isIntercompany: false };
  }
  if (fullText.includes('UBER')) {
    return { category: 'logistica_os', isIntercompany: false };
  }

  // 2. Retiradas de Sócios & Pró-labore
  if (
    fullText.includes('RETIRADA') || 
    fullText.includes('PARTICIPACAO DE LUCROS') || 
    fullText.includes('PARTICIPAÇÃO DE LUCROS') || 
    fullText.includes('PRO LABORE') || 
    fullText.includes('PRÓ-LABORE') ||
    fullText.includes('ROGERIO') ||
    fullText.includes('ROGÉRIO') ||
    fullText.includes('RAPHAEL')
  ) {
    return { category: 'retirada_socios', isIntercompany: true };
  }

  // 3. Gestão, Cartão Corporativo e Tech
  if (
    fullText.includes('CARTAO DANIEL') || 
    fullText.includes('CARTÃO DANIEL') || 
    fullText.includes('GOOGLE') || 
    fullText.includes('FACEBOOK') || 
    fullText.includes('VERISURE') || 
    fullText.includes('SISTEMA') ||
    fullText.includes('INTERNET') ||
    fullText.includes('TELEFONIA')
  ) {
    return { category: 'gestao_tech', isIntercompany: fullText.includes('CARTAO DANIEL') };
  }

  // 4. Peças e Fornecedores
  if (
    fullText.includes('CAMBIO') || 
    fullText.includes('CÂMBIO') || 
    fullText.includes('PECAS') || 
    fullText.includes('PEÇAS') || 
    fullText.includes('JUNTAS') || 
    fullText.includes('DISTRIBUIDORA') || 
    fullText.includes('MERCADO LIVRE') || 
    fullText.includes('COOPERPECAS') ||
    fullText.includes('AUTO PECAS') ||
    fullText.includes('ROLAMENTOS') ||
    fullText.includes('RETIFICA')
  ) {
    return { category: 'pecas', isIntercompany: false };
  }

  // 5. Despesas Bancárias
  if (
    fullText.includes('TARIFA') || 
    fullText.includes('JUROS LIMITE') || 
    fullText.includes('IOF') || 
    fullText.includes('MANUTENCAO CONTA')
  ) {
    return { category: 'despesas_bancarias', isIntercompany: false };
  }

  return { category: 'outros', isIntercompany: false };
}

export async function parseContasAPagarFile(file: File | ArrayBuffer, fileName: string): Promise<ContasAPagarParseResult> {
  try {
    const buffer = file instanceof File ? await file.arrayBuffer() : file;
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (!rawData || rawData.length === 0) {
      throw new Error('Arquivo de Contas a Pagar está vazio.');
    }

    // Achar linha de cabeçalho
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i] || [];
      const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (rowStr.includes('emp') && (rowStr.includes('código') || rowStr.includes('codigo') || rowStr.includes('fornecedor') || rowStr.includes('vl. pago'))) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (rawData[headerRowIndex] || []).map(h => typeof h === 'string' ? h.trim().toLowerCase() : String(h || '').trim().toLowerCase());
    
    const empIdx = headers.findIndex(h => h && (h === 'emp' || h.includes('empresa') || h.includes('filial')));
    const codIdx = headers.findIndex(h => h && (h === 'código' || h === 'codigo'));
    const parcIdx = headers.findIndex(h => h && h.includes('parc'));
    const fornIdx = headers.findIndex(h => h && (h.includes('cliente') || h.includes('fornecedor') || h.includes('favorecido')));
    const descIdx = headers.findIndex(h => h && (h.includes('descrição') || h.includes('descricao') || h.includes('histórico')));
    const dtVectoIdx = headers.findIndex(h => h && (h.includes('vecto') || h.includes('vencimento')));
    const dtPgtoIdx = headers.findIndex(h => h && (h.includes('pgto') || h.includes('pagamento')));
    const vlPagoIdx = headers.findIndex(h => h && (h.includes('vl. pago') || h.includes('valor pago') || h.includes('vl pago')));
    const vlAPagarIdx = headers.findIndex(h => h && (h.includes('vl. a pagar') || h.includes('valor a pagar')));
    const statusIdx = headers.findIndex(h => h && h === 'status');

    const bills: ParsedContaAPagar[] = [];
    const storeTotals: Record<string, { storeName: string; total: number; count: number }> = {};
    const categoryTotals: Record<string, { label: string; total: number; count: number }> = {};

    let targetDate = new Date().toISOString().split('T')[0];

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const empRaw = String(row[empIdx] || '').trim();
      const codRaw = String(row[codIdx] || '').trim();
      const fornRaw = String(row[fornIdx] || '').trim();
      const descRaw = String(row[descIdx] || '').trim();
      const parcRaw = String(row[parcIdx] || '1/1').trim();
      
      // Ignorar linha de total geral
      if (!empRaw && !codRaw) continue;
      if (fornRaw.toUpperCase().includes('TOTAL') || descRaw.toUpperCase().includes('TOTAL')) continue;

      const vlPago = extractNumber(row[vlPagoIdx]);
      const vlAPagar = extractNumber(row[vlAPagarIdx]);
      const amount = vlPago > 0 ? vlPago : vlAPagar;

      if (amount <= 0 && !codRaw) continue;

      const store = mapEmpToStore(empRaw);
      const classification = classifyExpense(fornRaw, descRaw);

      let dtPgto = String(row[dtPgtoIdx] || '').trim();
      let dtVecto = String(row[dtVectoIdx] || '').trim();

      const parseDate = (dStr: string) => {
        if (!dStr) return undefined;
        if (dStr.match(/^\d{4}-\d{2}-\d{2}/)) return dStr.substring(0, 10);
        const parts = dStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return undefined;
      };

      const normalizedPgtoDate = parseDate(dtPgto);
      const normalizedVectoDate = parseDate(dtVecto) || targetDate;
      
      if (normalizedPgtoDate) {
        targetDate = normalizedPgtoDate;
      }

      const bill: ParsedContaAPagar = {
        external_code: codRaw || `AUTO-${i}`,
        installment: parcRaw,
        store_id: store.id,
        store_name: store.name,
        recipient_name: fornRaw || 'Diversos',
        description: descRaw || 'Despesa Operacional',
        category: classification.category,
        due_date: normalizedVectoDate,
        payment_date: normalizedPgtoDate || normalizedVectoDate,
        amount,
        status: (String(row[statusIdx] || 'PAG').toUpperCase().includes('ABER') ? 'ABER' : 'PAG'),
        matched_os_number: classification.matchedOs,
        is_intercompany: classification.isIntercompany,
      };

      bills.push(bill);

      // Agregações por loja
      if (!storeTotals[store.id]) {
        storeTotals[store.id] = { storeName: store.name, total: 0, count: 0 };
      }
      storeTotals[store.id].total += amount;
      storeTotals[store.id].count += 1;

      // Agregações por categoria
      const catKey = classification.category;
      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = { label: CATEGORY_LABELS[catKey] || catKey, total: 0, count: 0 };
      }
      categoryTotals[catKey].total += amount;
      categoryTotals[catKey].count += 1;
    }

    const totalAmount = bills.reduce((acc, b) => acc + b.amount, 0);

    return {
      success: true,
      fileName,
      targetDate,
      totalBills: bills.length,
      totalAmount,
      bills,
      storeTotals,
      categoryTotals,
    };
  } catch (err: any) {
    return {
      success: false,
      fileName,
      targetDate: new Date().toISOString().split('T')[0],
      totalBills: 0,
      totalAmount: 0,
      bills: [],
      storeTotals: {},
      categoryTotals: {},
      error: err.message || 'Erro ao processar arquivo de Contas a Pagar.',
    };
  }
}
