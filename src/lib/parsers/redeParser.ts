import * as XLSX from 'xlsx';
import { extractNumber, roundCurrency } from './numberUtils';
import { normalizeRedeStoreName } from './storeMapping';
import { traceLog } from '../logger';

export interface RedeTransaction {
  storeName: string;
  method: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros';
  grossAmount: number;
  netAmount: number;
  interest: number;
  date: string;
}

export interface RedeResult {
  success: boolean;
  fileName: string;
  transactions: RedeTransaction[];
  totalInterest: number;
  totalNet: number;
  totalGross: number;
  error?: string;
}

export async function parseRedeFile(file: File, options?: { sessionId?: string }): Promise<RedeResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });

    if (json.length < 3) {
      throw new Error("Arquivo muito pequeno.");
    }

    const row0 = String(json[0]?.[0] || '');
    if (!row0.includes("EXTRATO PARA SIMPLES CONFERÊNCIA")) {
       throw new Error("Não é um arquivo da Rede reconhecido.");
    }

    // Tentar extrair a data do "PERÍODO: DD-MM-YYYY A DD-MM-YYYY"
    let targetDate = new Date().toISOString().split('T')[0];
    const dateMatch = row0.match(/PERÍODO:\s*(\d{2}-\d{2}-\d{4})/i);
    if (dateMatch && dateMatch[1]) {
      // Converter DD-MM-YYYY para YYYY-MM-DD
      const parts = dateMatch[1].split('-');
      if (parts.length === 3) {
        targetDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Encontra o índice da linha de cabeçalho
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, json.length); i++) {
      const r = json[i];
      if (Array.isArray(r)) {
        const rowStr = r.map(c => String(c).toLowerCase().trim());
        if (rowStr.some(c => c.includes('bruto') || c.includes('líquido') || c.includes('liquido') || c.includes('bandeira') || c.includes('produto') || c.includes('estabelecimento'))) {
          headerIndex = i;
          break;
        }
      }
    }

    if (headerIndex === -1) {
      headerIndex = 1; // Fallback seguro para Rede
    }

    const headers = json[headerIndex] ? json[headerIndex].map((h: any) => String(h || '').toLowerCase().trim()) : [];
    
    // Mapeamento dinâmico inteligente para todas as variações de colunas da REDE
    let methodIdx = headers.findIndex((h: string) => h.includes('meio de pagamento') || h.includes('bandeira') || h.includes('modalidade') || h.includes('produto'));
    if (methodIdx === -1) methodIdx = 0;

    let grossIdx = headers.findIndex((h: string) => h === 'valor da venda atualizado');
    if (grossIdx === -1) grossIdx = headers.findIndex((h: string) => h === 'valor da venda original');
    if (grossIdx === -1) grossIdx = headers.findIndex((h: string) => h.includes('valor bruto') || h.includes('venda bruta') || h.includes('bruto'));
    if (grossIdx === -1) grossIdx = headers.findIndex((h: string) => h.includes('valor da venda'));

    let netIdx = headers.findIndex((h: string) => h === 'valor líquido' || h === 'valor liquido');
    if (netIdx === -1) netIdx = headers.findIndex((h: string) => h.includes('valor líquido') || h.includes('valor liquido'));
    if (netIdx === -1) netIdx = headers.findIndex((h: string) => h.includes('líquido') || h.includes('liquido'));

    let storeIdx = headers.findIndex((h: string) => h === 'nome do estabelecimento' || h === 'nome fantasia' || h === 'loja');
    if (storeIdx === -1) storeIdx = headers.findIndex((h: string) => h.includes('nome do estabelecimento'));
    if (storeIdx === -1) storeIdx = headers.findIndex((h: string) => h.includes('estabelecimento') && !h.includes('número') && !h.includes('numero'));

    // Colunas de taxas e descontos explícitos
    let totalFeeIdx = headers.findIndex((h: string) => h.includes('valor total das taxas') || h.includes('total das taxas'));
    let mdrFeeIdx = headers.findIndex((h: string) => h === 'valor mdr' || h.includes('valor mdr'));
    let antecipacaoFeeIdx = headers.findIndex((h: string) => h.includes('valor taxa de recebimento') || h.includes('valor antecipa'));

    const transactions: RedeTransaction[] = [];
    let totalInterest = 0;
    let totalNet = 0;
    let totalGross = 0;

    // Os dados começam na linha seguinte ao cabeçalho
    for (let i = headerIndex + 1; i < json.length; i++) {
      const row = json[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const methodRaw = String(row[methodIdx] || '').toLowerCase();
      const grossRaw = grossIdx !== -1 ? row[grossIdx] : undefined;
      const netRaw = netIdx !== -1 ? row[netIdx] : undefined;
      const rawStoreName = storeIdx !== -1 ? String(row[storeIdx] || 'DESCONHECIDA').trim() : 'DESCONHECIDA';
      const storeName = normalizeRedeStoreName(rawStoreName);

      if (storeName === 'IGNORAR') continue;

      // Se a linha não tiver valor numérico, ignora
      if (grossRaw === undefined || grossRaw === null || grossRaw === '') continue;

      let grossAmount = extractNumber(grossRaw);
      let netAmount = extractNumber(netRaw);

      if (grossAmount === 0 && netAmount === 0) continue;

      let method: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros' = 'Outros';
      if (methodRaw.includes('crédito') || methodRaw.includes('credito')) method = 'Cartão Crédito';
      else if (methodRaw.includes('débito') || methodRaw.includes('debito')) method = 'Cartão Débito';
      else if (methodRaw.includes('pix')) method = 'PIX';

      let interest = 0;
      // 1. Prioridade: coluna monetária explícita "valor total das taxas descontadas"
      if (totalFeeIdx !== -1 && row[totalFeeIdx]) {
        interest = extractNumber(row[totalFeeIdx]);
      }
      // 2. Prioridade: soma de valor MDR + valor taxa antecipação
      if (interest === 0 && (mdrFeeIdx !== -1 || antecipacaoFeeIdx !== -1)) {
        const mdr = mdrFeeIdx !== -1 ? extractNumber(row[mdrFeeIdx]) : 0;
        const ant = antecipacaoFeeIdx !== -1 ? extractNumber(row[antecipacaoFeeIdx]) : 0;
        interest = roundCurrency(mdr + ant);
      }
      // 3. Prioridade: diferença contábil real entre valor bruto vendido e líquido creditado
      if (interest === 0 && grossAmount > 0 && netAmount > 0 && grossAmount >= netAmount) {
        interest = roundCurrency(grossAmount - netAmount);
      }
      
      totalGross = roundCurrency(totalGross + grossAmount);
      totalNet = roundCurrency(totalNet + netAmount);
      totalInterest = roundCurrency(totalInterest + interest);

      // Tenta achar a data na linha (formato DD/MM/YYYY ou similar)
      let rowDate = targetDate;
      for (const cell of row) {
        if (typeof cell === 'string') {
          const m = cell.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) {
             rowDate = `${m[3]}-${m[2]}-${m[1]}`;
             break;
          }
        }
      }

      transactions.push({
        storeName,
        method,
        grossAmount,
        netAmount,
        interest,
        date: rowDate
      });
    }

    if (options?.sessionId) {
      traceLog('3_EXTRACTION_EXCEL', 'DEBUG', 'Extração de linhas do Excel concluída (REDE)', options.sessionId, {
        sheet_name: sheetName,
        total_rows_read: json.length,
        transactions_extracted: transactions.length,
        extracted_values: transactions.map(t => ({
          date: t.date,
          method: t.method,
          grossAmount: t.grossAmount,
          netAmount: t.netAmount,
          interest: t.interest
        }))
      });
    }

    return {
      success: true,
      fileName: file.name,
      transactions,
      totalInterest,
      totalNet,
      totalGross
    };

  } catch (error: any) {
    return {
      success: false,
      fileName: file.name,
      transactions: [],
      totalInterest: 0,
      totalNet: 0,
      totalGross: 0,
      error: error.message || "Erro desconhecido"
    };
  }
}
