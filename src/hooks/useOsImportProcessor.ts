import * as XLSX from 'xlsx';
import { ParsedOS, ParsedReceivable } from './useImportProcessor';
import { getDefaultDate } from '@/lib/utils';

export type OsImportResult = {
  fileName: string;
  storeAlias: string;
  success: boolean;
  osArray: ParsedOS[];
  receivablesArray: ParsedReceivable[];
  osCount: number;
  error?: string;
};

export async function processOsFiles(files: File[]): Promise<OsImportResult[]> {
  const results: OsImportResult[] = [];

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

      const osArray: ParsedOS[] = [];
      const receivablesArray: ParsedReceivable[] = [];

      let storeAlias = "";

      for (let i = 0; i < Math.min(200, data.length); i++) {
        const row = data[i];
        if (Array.isArray(row)) {
          const rowText = row.map(c => String(c || '')).join(' ');
          const match = rowText.match(/(?:LOJA|UNIDADE)\s+([A-Za-zÀ-ÿ0-9\s]+)|([A-Za-z0-9À-ÿ\s]+?)\s*[-–—]\s*Por Data d[ae] OS/i);
          if (match) {
            storeAlias = (match[1] || match[2]).trim();
            break;
          }
        }
      }

      if (!storeAlias) {
         storeAlias = file.name.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '').replace(/ConferenciaOSxFinanceiro/i, '').replace(/_/g, ' ').trim() || file.name.replace(/\.[^/.]+$/, '');
      }

      const parseExcelDate = (val: any) => {
        if (!val) return null;
        if (typeof val === 'number') {
          const utc_days  = Math.floor(val - 25569);
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
        return null;
      };

      const parseValue = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          let cleaned = val.replace(/R\$/g, '').trim();
          if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
          }
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      let headerRowIndex = -1;
      let colMap: Record<string, number> = {};

      for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        if (Array.isArray(row)) {
          const rowStr = row.map(c => String(c || '').toLowerCase().trim());
          if ((rowStr.includes('os') || rowStr.includes('nº os')) && rowStr.includes('status')) {
            headerRowIndex = i;
            rowStr.forEach((colName, idx) => {
              if (colName === 'os' || colName === 'nº os' || colName === 'nº da os' || colName === 'numero os' || colName === 'código') colMap.os = idx;
              if (colName === 'data' || colName.includes('data entrada') || colName.includes('abertura') || (colName.includes('data') && colMap.openedAt === undefined)) colMap.openedAt = idx;
              if (colName === 'placa' || colName === 'veículo' || colName === 'veiculo') colMap.plate = idx;
              if (colName === 'status' || colName === 'situação' || colName === 'situacao') colMap.status = idx;
              if (colName === 'finalizada em' || colName === 'data fim' || colName.includes('fechamento') || colName.includes('finalizada') || colName.includes('saida') || colName.includes('saída')) colMap.closedAt = idx;
              if (colName.includes('total') || colName.includes('valor total') || colName.includes('r$ total') || colName.includes('vlr total') || colName.includes('vl total') || colName === 'valor' || colName.includes('bruto') || colName.includes('valor os') || colName.includes('valor final')) colMap.totalValue = idx;
              if (colName.includes('pagto') || colName.includes('liquidado') || colName.includes('total pago') || colName.includes('valor pago') || colName.includes('recebid') || colName === 'pago' || colName.includes('restante') || colName.includes('falta') || colName.includes('vlr pago') || colName.includes('vl pago') || colName.includes('valor liquido') || colName.includes('valor líquido')) colMap.paidValue = idx;
              if (colName.includes('forma') || colName.includes('pagamento') || colName.includes('meio')) colMap.paymentMethod = idx;
            });
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error(`Não foi possível localizar o cabeçalho no arquivo ${file.name}`);
      }

      let osCount = 0;

      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const rawOsNumber = row[colMap.os];
        if (!rawOsNumber) continue;
        const osNumber = String(rawOsNumber).trim();
        if (!osNumber || osNumber.toLowerCase().includes('total')) continue;

        const statusStr = String(row[colMap.status] || '').trim();
        const osValue = parseValue(row[colMap.totalValue]);
        const paidValue = colMap.paidValue !== undefined ? parseValue(row[colMap.paidValue]) : osValue;
        
        const opened_at = parseExcelDate(row[colMap.openedAt]) || getDefaultDate();
        let closed_at: string | null = parseExcelDate(row[colMap.closedAt]);
        
        let statusEnum: 'em_aberto' | 'pago_parcial' | 'finalizado' = 'em_aberto';
        
        const isClosed = statusStr.match(/finalizad[oa]|pag[oa]|entregue|faturad[oa]|fechad[oa]/i) || (paidValue > 0 && paidValue >= osValue);
        
        if (isClosed) {
          statusEnum = 'finalizado';
          osCount++;
        } else if (paidValue > 0 && paidValue < osValue) {
          statusEnum = 'pago_parcial';
        }
        
        const start = new Date(opened_at);
        const end = closed_at && !isNaN(new Date(closed_at).getTime()) ? new Date(closed_at) : new Date();
        const diffMs = !isNaN(start.getTime()) && !isNaN(end.getTime()) ? (end.getTime() - start.getTime()) : 0;
        const days_open = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) || 0;

        const payment_method_str = String(row[colMap.paymentMethod] || '').trim();
        let parsed_credit = 0;
        let parsed_debit = 0;
        let parsed_pix_transfer = 0;

        if (payment_method_str) {
          const upperMethod = payment_method_str.toUpperCase();
          let foundPair = false;

          // 1. Tenta extrair pares no formato METODO: VALOR ou METODO VALOR
          const regex = /(PIX|TRANSF|DEP|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)\s*[:\-\s]?\s*(?:R\$\s*)?([\d\.,]+)?/gi;
          let match;

          while ((match = regex.exec(upperMethod)) !== null) {
            const method = match[1].toUpperCase();
            const valStr = match[2];
            const val = valStr ? parseValue(valStr) : (paidValue || osValue);

            if (val > 0 || !valStr) {
              if (method.includes('CREDITO') || method.includes('CRÉDITO') || method.includes('CARTAO') || method.includes('CARTÃO')) {
                parsed_credit += val;
                foundPair = true;
              } else if (method.includes('DEBITO') || method.includes('DÉBITO')) {
                parsed_debit += val;
                foundPair = true;
              } else if (method.includes('PIX') || method.includes('TRANSF') || method.includes('DEP') || method.includes('DINHEIRO')) {
                parsed_pix_transfer += val;
                foundPair = true;
              }
            }
          }

          // 2. Se não encontrou valor numérico no par, classifica pela palavra-chave no texto
          if (!foundPair || (parsed_credit === 0 && parsed_debit === 0 && parsed_pix_transfer === 0)) {
            if (upperMethod.includes('PIX') || upperMethod.includes('TRANSF') || upperMethod.includes('DEP') || upperMethod.includes('DINHEIRO')) {
              parsed_pix_transfer = paidValue || osValue;
            } else if (upperMethod.includes('DEBITO') || upperMethod.includes('DÉBITO')) {
              parsed_debit = paidValue || osValue;
            } else if (upperMethod.includes('CREDITO') || upperMethod.includes('CRÉDITO') || upperMethod.includes('CARTÃO') || upperMethod.includes('CARTAO')) {
              parsed_credit = paidValue || osValue;
            }
          }
        }

        // Fallback apenas se NENHUM método foi identificado no texto
        if (parsed_credit === 0 && parsed_debit === 0 && parsed_pix_transfer === 0) {
          parsed_credit = osValue || paidValue;
        }

        osArray.push({
          os_number: osNumber,
          plate: String(row[colMap.plate] || '').trim(),
          opened_at,
          closed_at,
          total_value: osValue || paidValue, // NUNCA permitir valor bruto zerado se houver paidValue
          paid_value: paidValue,
          payment_method: payment_method_str || null,
          status: statusEnum,
          raw_status: statusStr || null,
          days_open,
          parsed_credit,
          parsed_debit,
          parsed_pix_transfer
        });
      }

      results.push({
        fileName: file.name,
        storeAlias,
        success: true,
        osArray,
        receivablesArray,
        osCount
      });

    } catch (error: any) {
      results.push({
        fileName: file.name,
        storeAlias: '',
        success: false,
        osArray: [],
        receivablesArray: [],
        osCount: 0,
        error: error.message || 'Erro ao processar arquivo'
      });
    }
  }

  return results;
}
