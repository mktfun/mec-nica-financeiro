import { StoreRow } from '@/lib/supabase';
import { ParsedOS, ParsedReceivable } from '@/hooks/useImportProcessor';
import { OsImportResult } from '@/hooks/useOsImportProcessor';
import { ExtractedOcrOsItem } from '@/hooks/useOcrOsProcessor';

export interface ConvertOcrOptions {
  targetDate?: string;
  defaultStoreAlias?: string;
}

/**
 * Converte um array de OSs extraídas via OCR Vision (ExtractedOcrOsItem[])
 * em uma estrutura sintética idêntica a OsImportResult[] (results.osFiles)
 * para que toda a esteira do Wizard funcione como se tivesse vindo de um .xls.
 */
export function convertOcrToOsImportResults(
  items: ExtractedOcrOsItem[],
  stores: StoreRow[],
  targetDate: string
): OsImportResult[] {
  if (!items || items.length === 0) {
    return [];
  }

  // 1. Agrupar itens por loja (store_id)
  const byStore = new Map<string, ExtractedOcrOsItem[]>();
  items.forEach(item => {
    const list = byStore.get(item.store_id) || [];
    list.push(item);
    byStore.set(item.store_id, list);
  });

  const results: OsImportResult[] = [];

  byStore.forEach((storeItems, storeId) => {
    const storeObj = stores.find(s => s.id === storeId);
    const storeName = storeObj?.name || storeItems[0]?.store_name || 'Filial';

    const osArray: ParsedOS[] = storeItems.map(item => {
      const totalVal = Number(item.total_value) || 0;
      const paidVal = Number(item.paid_value) || 0;
      const pendingVal = item.open_value !== undefined ? Number(item.open_value) : Math.max(0, totalVal - paidVal);

      let canonicalStatus: 'em_aberto' | 'pago_parcial' | 'finalizado' = 'em_aberto';
      if (item.status === 'finalizada' || item.status === 'finalizado' || (pendingVal <= 0.05 && totalVal > 0)) {
        canonicalStatus = 'finalizado';
      } else if (paidVal > 0 && pendingVal > 0.05) {
        canonicalStatus = 'pago_parcial';
      }

      const openedAt = item.opened_at || targetDate;
      const closedAt = item.closed_at || (canonicalStatus === 'finalizado' ? targetDate : null);

      const parsedCash = Number(item.cash_value) || 0;
      const parsedCredit = Number(item.credit_value) || 0;
      const parsedDebit = Number(item.debit_value) || 0;
      const parsedPix = Number(item.pix_transfer_value) || 0;

      return {
        os_number: String(item.os_number || '').trim(),
        plate: (item.plate || 'S/ Placa').toUpperCase().replace(/[^A-Z0-9]/g, ''),
        client_name: item.client_name || null,
        opened_at: openedAt,
        closed_at: closedAt,
        total_value: totalVal,
        paid_value: paidVal,
        payment_method: item.payment_method || null,
        status: canonicalStatus,
        raw_status: item.raw_status || (canonicalStatus === 'finalizado' ? 'Finalizada' : 'Em Aberto'),
        parsed_credit: parsedCredit,
        parsed_debit: parsedDebit,
        parsed_pix_transfer: parsedPix,
        parsed_cash: parsedCash,
        cash_value: parsedCash,
        pending_value: pendingVal,
        days_open: 1,
        is_new_os: true,
        delta_paid: paidVal,
      };
    });

    const receivablesArray: ParsedReceivable[] = [];
    storeItems.forEach(item => {
      const openedAt = item.opened_at || targetDate;
      const osNum = String(item.os_number || '').trim();

      if (item.payments && item.payments.length > 0) {
        const totalP = item.payments.length;
        item.payments.forEach((p, idx) => {
          const pAmount = Number(p.amount) || 0;
          if (pAmount <= 0) return;

          let recType: ParsedReceivable['type'] = 'Outros';
          const mLow = (p.method || '').toLowerCase();
          if (mLow.includes('bol')) recType = 'Boleto';
          else if (mLow.includes('cred') || mLow.includes('créd')) recType = 'Cartão Crédito';
          else if (mLow.includes('deb') || mLow.includes('déb')) recType = 'Cartão Débito';
          else if (mLow.includes('pix')) recType = 'PIX';
          else if (mLow.includes('transf') || mLow.includes('ted') || mLow.includes('doc')) recType = 'Transferência';
          else if (mLow.includes('cheq')) recType = 'Cheque';

          receivablesArray.push({
            store_id: item.store_id,
            store_name: storeName,
            os_number: osNum,
            installment: `${p.installment || idx + 1}/${totalP}`,
            description: `OS #${osNum} - ${p.method || recType} (${p.installment || idx + 1}/${totalP})`,
            type: recType,
            value: pAmount,
            date: openedAt,
            due_date: p.due_date || openedAt,
            status: item.status === 'finalizada' ? 'recebido' : 'pendente'
          });
        });
      } else {
        if (item.credit_value > 0) {
          receivablesArray.push({
            store_id: item.store_id,
            store_name: storeName,
            os_number: osNum,
            type: 'Cartão Crédito',
            value: item.credit_value,
            date: openedAt,
            due_date: openedAt,
            status: 'recebido'
          });
        }
        if (item.debit_value > 0) {
          receivablesArray.push({
            store_id: item.store_id,
            store_name: storeName,
            os_number: osNum,
            type: 'Cartão Débito',
            value: item.debit_value,
            date: openedAt,
            due_date: openedAt,
            status: 'recebido'
          });
        }
        if (item.pix_transfer_value > 0) {
          receivablesArray.push({
            store_id: item.store_id,
            store_name: storeName,
            os_number: osNum,
            type: 'PIX',
            value: item.pix_transfer_value,
            date: openedAt,
            due_date: openedAt,
            status: 'recebido'
          });
        }
      }
    });

    results.push({
      fileName: `OCR_Vision_${storeName.replace(/\s+/g, '_')}.png`,
      storeAlias: storeName,
      success: true,
      osArray,
      receivablesArray,
      osCount: osArray.filter(o => o.status === 'finalizado').length,
    });
  });

  return results;
}
