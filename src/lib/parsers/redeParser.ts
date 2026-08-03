import * as XLSX from 'xlsx';
import { extractNumber } from './numberUtils';
import { normalizeRedeStoreName } from './storeMapping';

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

export async function parseRedeFile(file: File): Promise<RedeResult> {
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

    const transactions: RedeTransaction[] = [];
    let totalInterest = 0;
    let totalNet = 0;
    let totalGross = 0;

    // Os dados começam na linha 2 (index 2)
    for (let i = 2; i < json.length; i++) {
      const row = json[i];
      if (!Array.isArray(row) || row.length < 10) continue;

      const methodRaw = String(row[0] || '').toLowerCase();
      const grossRaw = row[2];
      const netRaw = row[3];
      const rawStoreName = String(row[9] || 'DESCONHECIDA').trim();
      const storeName = normalizeRedeStoreName(rawStoreName);

      if (storeName === 'IGNORAR') continue;

      // Se a linha não tiver valor de venda numérico, ignora
      if (grossRaw === undefined || grossRaw === null || grossRaw === '') continue;

      let grossAmount = extractNumber(grossRaw);
      let netAmount = extractNumber(netRaw);

      if (grossAmount === 0 && netAmount === 0) continue;

      let method: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros' = 'Outros';
      if (methodRaw.includes('crédito') || methodRaw.includes('credito')) method = 'Cartão Crédito';
      else if (methodRaw.includes('débito') || methodRaw.includes('debito')) method = 'Cartão Débito';
      else if (methodRaw.includes('pix')) method = 'PIX';

      const interest = parseFloat((grossAmount - netAmount).toFixed(2));
      
      totalGross += grossAmount;
      totalNet += netAmount;
      totalInterest += interest;

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
