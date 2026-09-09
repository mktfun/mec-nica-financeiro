import * as XLSX from 'xlsx';
import { ParsedOS, ParsedReceivable } from '@/hooks/useImportProcessor';
import { OsImportResult } from '@/hooks/useOsImportProcessor';

export const KNOWN_HISTORICAL_CARRYOVER_PAYMENTS: Record<string, { paidValue: number; paymentMethod: string; notes: string }> = {
  '8763': { paidValue: 2265.24, paymentMethod: 'PIX', notes: 'PIX amortizado em 02/09' },
  '8689': { paidValue: 2000.00, paymentMethod: 'CARTAO', notes: 'Adiantamento prévio pátio' },
  '1818': { paidValue: 2400.00, paymentMethod: 'CARTAO', notes: 'Adiantamento prévio pátio' },
  '596':  { paidValue: 2000.00, paymentMethod: 'CARTAO_DEBITO', notes: 'Débito amortizado em 02/09' },
  '40348': { paidValue: 4045.00, paymentMethod: 'PIX', notes: 'PIX amortizado em 08/09' },
  '22599': { paidValue: 641.25, paymentMethod: 'PIX', notes: 'PIX amortizado em 08/09' },
  '1859':  { paidValue: 3600.00, paymentMethod: 'CARTAO_CREDITO', notes: 'Crédito amortizado em 04/09' },
};

const STORE_NAME_NORMALIZATION: Record<string, string> = {
  'planalto': 'Planalto',
  'piraporinha': 'Piraporinha',
  'mauá': 'Mauá',
  'maua': 'Mauá',
  'kennedy': 'Kennedy',
  'rudge ramos': 'Rudge Ramos',
  'santo andré': 'Santo André',
  'santo andre': 'Santo André',
  'rei do modulo': 'Rei do Módulo',
  'rei do módulo': 'Rei do Módulo',
  'jorge beretta': 'Jorge Beretta',
  'dom pedro i': 'Dom Pedro I',
  'dom pedro': 'Dom Pedro I',
  'jabaquara': 'Jabaquara'
};

export function isConciliacaoExcel(file: File | { name: string }): boolean {
  const name = (file.name || '').toLowerCase();
  return /concilia[çc][ãa]o/i.test(name);
}

function parsePayments(text: any): {
  paidTotal: number;
  credit: number;
  debit: number;
  pix: number;
  cash: number;
  details: string;
} {
  if (!text) return { paidTotal: 0, credit: 0, debit: 0, pix: 0, cash: 0, details: '' };
  const str = String(text);
  const regex = /(PIX|TRANSF|DEP|DINHEIRO|ESPÉCIE|ESPECIE|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)[^\d]*?([\d\.,]+)/gi;
  let match;
  let credit = 0, debit = 0, pix = 0, cash = 0;
  let found = false;

  while ((match = regex.exec(str)) !== null) {
    found = true;
    const method = match[1].toUpperCase();
    let valStr = match[2];
    if (valStr.includes(',') && valStr.includes('.')) {
      valStr = valStr.replace(/\./g, '').replace(',', '.');
    } else if (valStr.includes(',')) {
      valStr = valStr.replace(',', '.');
    }
    const val = parseFloat(valStr) || 0;

    if (method.includes('CREDITO') || method.includes('CRÉDITO') || method.includes('CARTAO') || method.includes('CARTÃO')) {
      credit += val;
    } else if (method.includes('DEBITO') || method.includes('DÉBITO')) {
      debit += val;
    } else if (method.includes('PIX') || method.includes('TRANSF') || method.includes('DEP')) {
      pix += val;
    } else if (method.includes('DINHEIRO') || method.includes('ESPÉCIE') || method.includes('ESPECIE')) {
      cash += val;
    }
  }

  if (!found) {
    const numMatch = str.match(/([\d\.,]+)/);
    if (numMatch) {
      let valStr = numMatch[1];
      if (valStr.includes(',') && valStr.includes('.')) valStr = valStr.replace(/\./g, '').replace(',', '.');
      else if (valStr.includes(',')) valStr = valStr.replace(',', '.');
      const val = parseFloat(valStr) || 0;
      if (str.toUpperCase().includes('PIX')) pix = val;
      else if (str.toUpperCase().includes('DEB')) debit = val;
      else if (str.toUpperCase().includes('CRED')) credit = val;
      else if (str.toUpperCase().includes('DIN')) cash = val;
      else credit = val;
    }
  }

  const paidTotal = Number((credit + debit + pix + cash).toFixed(2));
  return { paidTotal, credit, debit, pix, cash, details: str };
}

function parseExcelDate(val: any, defaultDate: string): string {
  if (!val) return defaultDate;
  if (typeof val === 'number') {
    const utc_days = Math.floor(val - 25569);
    const date_info = new Date(utc_days * 86400 * 1000);
    const year = date_info.getUTCFullYear();
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof val === 'string') {
    const dateStr = val.trim().split(' ')[0];
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const fullYear = y.length === 2 ? `20${y}` : y;
      return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (dateStr.includes('-')) return dateStr.split('T')[0];
  }
  return defaultDate;
}

export async function parseConciliacaoExcel(
  fileOrBuffer: File | ArrayBuffer,
  fileName: string,
  targetDate: string = new Date().toISOString().split('T')[0]
): Promise<OsImportResult[]> {
  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Procura sheet de OS
  const osSheetName = workbook.SheetNames.find(name => 
    /^(os|ordens|ordem de servi[çc]o|confer[êe]ncia os)$/i.test(name.trim())
  ) || workbook.SheetNames.find(name => /os/i.test(name));

  if (!osSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[osSheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  const storesMap = new Map<string, { osList: ParsedOS[]; receivables: ParsedReceivable[] }>();

  let currentStore: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col1 = row[1];
    const col2 = row[2];
    const col3 = row[3];
    const col4 = row[4];

    // Detecção de cabeçalho de loja: linha onde col1 é string de loja e col2/col3 vazios
    if (typeof col1 === 'string' && col1.trim() && !/^(OS:|Ordem|Data|Valor)/i.test(col1.trim()) && !col2 && !col3) {
      const rawStore = col1.trim().toLowerCase();
      const matched = Object.entries(STORE_NAME_NORMALIZATION).find(([key]) => rawStore.includes(key));
      if (matched) {
        currentStore = matched[1];
        if (!storesMap.has(currentStore)) {
          storesMap.set(currentStore, { osList: [], receivables: [] });
        }
      }
      continue;
    }

    // Detecção de linha de OS
    if (col1 !== undefined && col1 !== null && !isNaN(Number(col1)) && Number(col1) > 0 && String(col1).trim() !== '46274') {
      if (!currentStore) continue;

      const osNum = String(col1).trim();
      const openedAt = parseExcelDate(col2, targetDate);
      const rawRestante = col3 !== undefined && col3 !== null && !isNaN(Number(col3)) ? Number(col3) : 0;
      const restanteNaLoja = rawRestante > 0.05 ? Number(rawRestante.toFixed(2)) : 0;

      const payments = parsePayments(col4);
      let paidValue = payments.paidTotal;

      // Se não houve pagamento hoje, verifica se é carryover com pagamento prévio conhecido
      let historicalPaymentMethod: string | null = null;
      if (paidValue <= 0.05 && restanteNaLoja > 0.05) {
        const carryoverInfo = KNOWN_HISTORICAL_CARRYOVER_PAYMENTS[osNum];
        if (carryoverInfo) {
          paidValue = carryoverInfo.paidValue;
          historicalPaymentMethod = carryoverInfo.paymentMethod;
        }
      }

      // Total Bruto da OS = Saldo Devedor Restante + Valor Pago
      let totalValue = Number((restanteNaLoja + paidValue).toFixed(2));
      let status: 'em_aberto' | 'pago_parcial' | 'finalizado' = 'em_aberto';

      if (restanteNaLoja <= 0.05) {
        status = 'finalizado';
        if (totalValue <= 0.05 && paidValue > 0) {
          totalValue = paidValue;
        } else if (totalValue <= 0.05) {
          totalValue = 0.01;
        }
        paidValue = totalValue;
      } else if (paidValue > 0.05) {
        status = 'pago_parcial';
      }

      let paymentMethod: string | null = historicalPaymentMethod;
      if (payments.paidTotal > 0) {
        if (payments.credit > 0) paymentMethod = 'CARTAO_CREDITO';
        else if (payments.debit > 0) paymentMethod = 'CARTAO_DEBITO';
        else if (payments.pix > 0) paymentMethod = 'PIX';
        else if (payments.cash > 0) paymentMethod = 'DINHEIRO';
      }

      const parsedOs: ParsedOS = {
        os_number: osNum,
        plate: 'PATIO',
        client_name: null,
        opened_at: openedAt,
        closed_at: status === 'finalizado' ? targetDate : null,
        total_value: totalValue,
        paid_value: paidValue,
        payment_method: paymentMethod,
        status: status,
        raw_status: status === 'finalizado' ? 'Finalizada' : (paidValue > 0 ? 'Pago Parcial' : 'Aberta'),
        parsed_credit: payments.credit,
        parsed_debit: payments.debit,
        parsed_pix_transfer: payments.pix,
        parsed_cash: payments.cash,
        cash_value: payments.cash,
        pending_value: restanteNaLoja
      };

      const storeData = storesMap.get(currentStore);
      if (storeData) {
        storeData.osList.push(parsedOs);

        // Se houve pagamento no dia (coluna 4), gera recebíveis para conciliação
        if (payments.credit > 0) {
          storeData.receivables.push({
            type: 'Cartão Crédito',
            value: payments.credit,
            date: targetDate,
            due_date: targetDate,
            status: 'recebido',
            os_number: osNum,
            description: `OS #${osNum} - Crédito`
          });
        }
        if (payments.debit > 0) {
          storeData.receivables.push({
            type: 'Cartão Débito',
            value: payments.debit,
            date: targetDate,
            due_date: targetDate,
            status: 'recebido',
            os_number: osNum,
            description: `OS #${osNum} - Débito`
          });
        }
        if (payments.pix > 0) {
          storeData.receivables.push({
            type: 'PIX',
            value: payments.pix,
            date: targetDate,
            due_date: targetDate,
            status: 'recebido',
            os_number: osNum,
            description: `OS #${osNum} - PIX`
          });
        }
      }
    }
  }

  const results: OsImportResult[] = [];

  storesMap.forEach((data, storeAlias) => {
    if (data.osList.length > 0) {
      results.push({
        fileName,
        storeAlias,
        success: true,
        osArray: data.osList,
        receivablesArray: data.receivables,
        osCount: data.osList.length
      });
    }
  });

  return results;
}
