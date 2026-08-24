import * as XLSX from 'xlsx';
import { ParsedOS, ParsedReceivable } from './useImportProcessor';
import { getDefaultDate } from '@/lib/utils';
import { traceLog } from '@/lib/logger';
import { extractNumber } from '@/lib/parsers/numberUtils';

export type OsImportResult = {
  fileName: string;
  storeAlias: string;
  success: boolean;
  osArray: ParsedOS[];
  receivablesArray: ParsedReceivable[];
  osCount: number;
  error?: string;
};

export async function processOsFiles(files: File[], options?: { sessionId?: string }): Promise<OsImportResult[]> {
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
        return extractNumber(val);
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
              if (colName === 'os' || colName === 'nº os' || colName === 'nº da os' || colName === 'numero os' || colName === 'código' || colName === 'cod') colMap.os = idx;
              if (colName === 'data' || colName.includes('data entrada') || colName.includes('abertura') || (colName.includes('data') && colMap.openedAt === undefined)) colMap.openedAt = idx;
              if (colName === 'placa' || colName === 'veículo' || colName === 'veiculo') colMap.plate = idx;
              if (colName === 'status' || colName === 'situação' || colName === 'situacao') colMap.status = idx;
              if (colName === 'finalizada em' || colName === 'data fim' || colName.includes('fechamento') || colName.includes('finalizada') || colName.includes('saida') || colName.includes('saída')) colMap.closedAt = idx;
              
              const isExactTotal = ['total', 'r$ total', 'valor total', 'vlr total', 'vl total', 'valor os', 'valor da os', 'valor final', 'bruto', 'r$ total da os'].includes(colName);
              if (isExactTotal || colName.includes('total da os') || colName.includes('valor da os')) {
                if (!colName.includes('financeiro') && !colName.includes('pagto') && !colName.includes('pago') && !colName.includes('produto') && !colName.includes('serviço') && !colName.includes('servico') && !colName.includes('desconto')) {
                  colMap.totalValue = idx;
                }
              } else if (colMap.totalValue === undefined && (colName.includes('total') || colName.includes('bruto'))) {
                if (!colName.includes('financeiro') && !colName.includes('pagto') && !colName.includes('pago') && !colName.includes('produto') && !colName.includes('serviço') && !colName.includes('servico') && !colName.includes('desconto')) {
                  colMap.totalValue = idx;
                }
              }
              
              if (colName.includes('total pagto') || colName.includes('liquidado') || colName.includes('total pago') || colName.includes('valor pago') || colName.includes('vlr pago') || colName.includes('vl pago') || colName === 'pago' || colName === 'recebido' || colName.includes('pagto') || colName.includes('pgto')) {
                colMap.paidValue = idx;
              }
              
              if (colName.includes('restante na os') || colName === 'restante' || colName.includes('aberto') || colName.includes('falta') || colName.includes('saldo')) {
                colMap.openValue = idx;
              }
              
              if (colName.includes('forma') || colName.includes('pagamento') || colName.includes('meio') || colName.includes('regra') || colName.includes('negocia')) colMap.paymentMethod = idx;
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

        // Se o status da coluna não foi mapeado pelo cabeçalho, tenta a coluna D (índice 3)
        const statusIdx = colMap.status !== undefined ? colMap.status : 3;
        const statusStr = String(row[statusIdx] || '').trim();
        
        const rawTotalValue = colMap.totalValue !== undefined ? parseValue(row[colMap.totalValue]) : 0;
        const paidValue = colMap.paidValue !== undefined ? parseValue(row[colMap.paidValue]) : 0;
        const openValue = colMap.openValue !== undefined ? parseValue(row[colMap.openValue]) : 0;

        const opened_at = parseExcelDate(row[colMap.openedAt]) || getDefaultDate();
        let closed_at: string | null = parseExcelDate(row[colMap.closedAt]);

        const start = new Date(opened_at);
        const end = closed_at && !isNaN(new Date(closed_at).getTime()) ? new Date(closed_at) : new Date();
        const diffMs = !isNaN(start.getTime()) && !isNaN(end.getTime()) ? (end.getTime() - start.getTime()) : 0;
        const days_open = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) || 0;

        // 1. Extração antecipada das formas de pagamento (Crédito, Débito, PIX, Dinheiro)
        const rawPaymentMethodStr = String(row[colMap.paymentMethod] || '').trim();
        const rawPaidStr = String(row[colMap.paidValue] || '').trim();
        const payment_method_str = `${rawPaymentMethodStr} ${rawPaidStr}`.trim();
        let parsed_credit = 0;
        let parsed_debit = 0;
        let parsed_pix_transfer = 0;
        let parsed_cash = 0;

        if (payment_method_str) {
          const upperMethod = payment_method_str.toUpperCase();
          let foundPair = false;

          const regex = /(PIX|TRANSF|DEP|DINHEIRO|ESPÉCIE|ESPECIE|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)[^\d]*?([\d\.,]+)/gi;
          let match;

          while ((match = regex.exec(upperMethod)) !== null) {
            const method = match[1].toUpperCase();
            const valStr = match[2];
            const val = valStr ? parseValue(valStr) : (paidValue || rawTotalValue);

            if (val > 0 || !valStr) {
              if (method.includes('DINHEIRO') || method.includes('ESPÉCIE') || method.includes('ESPECIE')) {
                parsed_cash += val;
                foundPair = true;
              } else if (method.includes('CREDITO') || method.includes('CRÉDITO') || method.includes('CARTAO') || method.includes('CARTÃO')) {
                parsed_credit += val;
                foundPair = true;
              } else if (method.includes('DEBITO') || method.includes('DÉBITO')) {
                parsed_debit += val;
                foundPair = true;
              } else if (method.includes('PIX') || method.includes('TRANSF') || method.includes('DEP')) {
                parsed_pix_transfer += val;
                foundPair = true;
              }
            }
          }

          if (!foundPair || (parsed_credit === 0 && parsed_debit === 0 && parsed_pix_transfer === 0 && parsed_cash === 0)) {
            if (upperMethod.includes('DINHEIRO') || upperMethod.includes('ESPÉCIE') || upperMethod.includes('ESPECIE')) {
              parsed_cash = paidValue || rawTotalValue;
            } else if (upperMethod.includes('PIX') || upperMethod.includes('TRANSF') || upperMethod.includes('DEP')) {
              parsed_pix_transfer = paidValue || rawTotalValue;
            } else if (upperMethod.includes('DEBITO') || upperMethod.includes('DÉBITO')) {
              parsed_debit = paidValue || rawTotalValue;
            } else if (upperMethod.includes('CREDITO') || upperMethod.includes('CRÉDITO') || upperMethod.includes('CARTÃO') || upperMethod.includes('CARTAO')) {
              parsed_credit = paidValue || rawTotalValue;
            }
          }
        }

        const sumPayments = parsed_credit + parsed_debit + parsed_pix_transfer + parsed_cash;

        // 2. Consolidação robusta do Valor Total e Valor Pago com base contábil estrita
        let totalValue = Math.max(rawTotalValue, paidValue + openValue, sumPayments);
        if (totalValue === 0 && (paidValue > 0 || openValue > 0)) {
          totalValue = paidValue + openValue;
        }

        // Se a coluna Restante na OS está preenchida (> 0), o saldo pendente no pátio é exatamente o openValue
        let finalPaidValue = paidValue;
        if (openValue > 0) {
          finalPaidValue = totalValue > openValue ? (totalValue - openValue) : (paidValue || sumPayments);
        } else if (openValue === 0 && (rawTotalValue > 0 || sumPayments > 0)) {
          // Se Restante na OS é 0 / '-', a OS está 100% quitada/faturada
          finalPaidValue = totalValue;
        }

        // Fallback apenas se NENHUM método foi identificado no texto
        if (parsed_credit === 0 && parsed_debit === 0 && parsed_pix_transfer === 0 && parsed_cash === 0) {
          parsed_credit = totalValue || finalPaidValue;
        }

        // 3. Determinação precisa do Status da OS com corte financeiro
        let statusEnum: 'em_aberto' | 'pago_parcial' | 'finalizado' = 'em_aberto';

        const isClosedStr = statusStr.match(/finalizad[oa]|pag[oa]|entregue|faturad[oa]|fechad[oa]|concluíd[oa]/i);
        const remOpen = openValue > 0 ? openValue : Math.max(0, totalValue - finalPaidValue);

        if (isClosedStr || remOpen <= 0.05) {
          statusEnum = 'finalizado';
          osCount++;
        } else if (finalPaidValue > 0 && remOpen > 0.05) {
          statusEnum = 'pago_parcial';
        } else {
          statusEnum = 'em_aberto';
        }

        osArray.push({
          os_number: osNumber,
          plate: String(row[colMap.plate] || '').trim(),
          opened_at,
          closed_at,
          total_value: totalValue,
          paid_value: finalPaidValue,
          payment_method: payment_method_str || null,
          status: statusEnum,
          raw_status: statusStr || null,
          days_open,
          parsed_credit,
          parsed_debit,
          parsed_pix_transfer,
          parsed_cash,
          cash_value: parsed_cash
        });
      }

      if (osArray.length > 0) {
        if (options?.sessionId) {
          traceLog('3_EXTRACTION_EXCEL', 'DEBUG', `Extração Completa Pátio/OS: ${file.name}`, options.sessionId, {
            storeAlias,
            os_count: osArray.length,
            os_extracted_values: osArray.map(os => ({
              os_number: os.os_number,
              total_value: os.total_value,
              paid_value: os.paid_value,
              pending_value: os.pending_value,
              status: os.status
            })),
            receivables_count: receivablesArray.length,
            receivables_extracted_values: receivablesArray.map(r => ({
              os_number: r.os_number,
              value: r.value,
              type: r.type,
              date: r.date
            }))
          });
        }
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
