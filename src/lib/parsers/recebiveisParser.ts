import * as XLSX from 'xlsx';
import { extractNumber } from './numberUtils';
import { normalizeStoreName, STORE_ALIASES } from '../storeMapping';

export interface ParsedReceivableRow {
  storeId: string;
  storeName: string;
  description: string;
  osNumber?: string;
  installment?: string;
  type: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros';
  value: number;
  dueDate: string;
  date: string;
  status: 'pendente' | 'recebido';
}

export interface ParseRecebiveisResult {
  success: boolean;
  data: ParsedReceivableRow[];
  total: number;
  storesCount: number;
  error?: string;
}

const RECEBIVEIS_STORE_MAP: Record<string, { id: string; name: string }> = {
  'BRASICAR': { id: 'st-06', name: 'Planalto - BRASICAR' },
  'PLANALTO': { id: 'st-06', name: 'Planalto - BRASICAR' },
  'EMPORIO': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  'EMPÓRIO': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  'PIRAPORINHA': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  'MHE': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' },
  'MAUÁ': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' },
  'MAUA': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' },
  'MP': { id: 'st-04', name: 'Kennedy - MP' },
  'KENNEDY': { id: 'st-04', name: 'Kennedy - MP' },
  'CAP': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  'RUDGE': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  'RUDGE RAMOS': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  'SANTO ANDRÉ': { id: 'st-08', name: 'Santo André - HD' },
  'SANTO ANDRE': { id: 'st-08', name: 'Santo André - HD' },
  'HD': { id: 'st-08', name: 'Santo André - HD' },
  'JORGE BERETTA': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  'BERETTA': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  'DHJV': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  'REI DO MODULO': { id: 'st-09', name: 'Rei do Módulo - MP' },
  'REI DO MÓDULO': { id: 'st-09', name: 'Rei do Módulo - MP' },
  'REIDOMODULO': { id: 'st-09', name: 'Rei do Módulo - MP' },
  'DOM PEDRO': { id: 'st-01', name: 'Dom Pedro - DP' },
  'DP': { id: 'st-01', name: 'Dom Pedro - DP' },
  'JABAQUARA': { id: 'st-02', name: 'Jabaquara - JAB' },
  'JAB': { id: 'st-02', name: 'Jabaquara - JAB' }
};

function excelSerialToIsoDate(serial: number | string, fallbackDate: string): string {
  if (typeof serial === 'number' && serial > 30000 && serial < 60000) {
    // Excel epoch: Dec 30 1899
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const y = dateInfo.getUTCFullYear();
    const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateInfo.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(serial || '').trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;

  const brMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }

  return fallbackDate;
}

export function parseRecebiveisFromBuffer(buffer: ArrayBuffer | Uint8Array, targetDate: string): ParseRecebiveisResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    
    // Procura aba RECEBIVEIS
    const sheetName = workbook.SheetNames.find(n => /^RECEBIVE?IS?\s*$/i.test(n.trim())) ||
                      workbook.SheetNames.find(n => n.toLowerCase().includes('receb')) ||
                      workbook.SheetNames[0];

    if (!sheetName) {
      return { success: false, data: [], total: 0, storesCount: 0, error: 'Aba de Recebíveis não encontrada' };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const result: ParsedReceivableRow[] = [];
    let currentStore = { id: 'st-06', name: 'Planalto - BRASICAR' };
    const storesFound = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim();

      // Detecta cabeçalho de loja: ex: "Recebiveis BRASICAR", "Recebiveis SANTO ANDRÉ"
      if (firstCell.toUpperCase().startsWith('RECEBIVEIS') || firstCell.toUpperCase().startsWith('RECEBÍVEIS')) {
        const cleanStoreKey = firstCell
          .replace(/^RECEBIVEIS/i, '')
          .replace(/^RECEBÍVEIS/i, '')
          .trim()
          .toUpperCase();

        const match = RECEBIVEIS_STORE_MAP[cleanStoreKey] || 
                      Object.entries(RECEBIVEIS_STORE_MAP).find(([k]) => cleanStoreKey.includes(k))?.[1];

        if (match) {
          currentStore = match;
          storesFound.add(match.id);
        }
        continue;
      }

      // Ignora linhas de total ou cabeçalhos de coluna (VALOR, VENC)
      if (firstCell.toUpperCase() === 'TOTAL' || firstCell.toUpperCase() === 'VALOR' || firstCell.toUpperCase() === '') {
        continue;
      }

      // Detecção de linha de título
      const desc = firstCell;
      const val = typeof row[1] === 'number' ? row[1] : extractNumber(row[1] || row[2]);
      const rawDueDate = row[2] !== undefined && row[2] !== '' ? row[2] : (row[1] || targetDate);

      if (desc && val > 0 && !desc.toUpperCase().startsWith('RECEB')) {
        const osMatch = desc.match(/OS\s*#?\s*(\d+)/i);
        const instMatch = desc.match(/(\d+\/\d+)/);
        
        let type: ParsedReceivableRow['type'] = 'Outros';
        const descUpper = desc.toUpperCase();
        if (descUpper.includes('BOLETO')) type = 'Boleto';
        else if (descUpper.includes('PGTO EM CONTA') || descUpper.includes('TRANSF') || descUpper.includes('PIX')) type = 'Transferência';
        else if (descUpper.includes('CHEQUE')) type = 'Cheque';
        else if (descUpper.includes('CARTAO') || descUpper.includes('CARTÃO')) type = 'Cartão';

        const dueDateIso = excelSerialToIsoDate(rawDueDate, targetDate);

        result.push({
          storeId: currentStore.id,
          storeName: currentStore.name,
          description: desc,
          osNumber: osMatch ? osMatch[1] : undefined,
          installment: instMatch ? instMatch[1] : undefined,
          type,
          value: Number(Number(val).toFixed(2)),
          dueDate: dueDateIso,
          date: targetDate,
          status: 'pendente'
        });
      }
    }

    const total = result.reduce((acc, curr) => acc + curr.value, 0);

    return {
      success: true,
      data: result,
      total: Number(total.toFixed(2)),
      storesCount: storesFound.size
    };
  } catch (err: any) {
    console.error('Erro no parser de Recebíveis:', err);
    return {
      success: false,
      data: [],
      total: 0,
      storesCount: 0,
      error: err.message || 'Falha ao processar arquivo de Recebíveis'
    };
  }
}

export async function parseRecebiveisExcel(file: File, targetDate: string): Promise<ParseRecebiveisResult> {
  const buffer = await file.arrayBuffer();
  return parseRecebiveisFromBuffer(buffer, targetDate);
}
