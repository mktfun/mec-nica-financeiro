import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';
import { useSaveImportedReport } from './useConciliacao';

export interface ParsedOS {
  os_number: string;
  plate: string;
  client_name?: string | null;
  opened_at: string;
  closed_at: string | null;
  total_value: number;
  paid_value: number;
  payment_method: string | null;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado';
  raw_status?: string | null;
  parsed_credit?: number;
  parsed_debit?: number;
  parsed_pix_transfer?: number;
  parsed_cash?: number;
  cash_value?: number;
  is_new_os?: boolean;
  days_open?: number;
  pending_value?: number;
}

export interface ParsedReceivable {
  store_id?: string;
  store_name?: string;
  os_number?: string | null;
  installment?: string | null;
  description?: string;
  type: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros';
  value: number;
  date: string;
  due_date: string;
  status: 'pendente' | 'recebido' | 'vencido' | 'cancelado';
}



export async function savePatioOsAndReceivables(
  storeId: string, 
  storeName: string, 
  osArray: ParsedOS[], 
  receivablesArray: ParsedReceivable[],
  targetDate?: string
) {
  // 1. Process Patio OS (upsert by os_number — idempotent)
  if (osArray.length > 0) {
    const { data: existingOs } = await supabase
      .from('patio_os')
      .select('id, os_number, total_value, paid_value, status, raw_status, credit_value, debit_value, pix_transfer_value, cash_value, history_log, last_payment_date')
      .eq('store_id', storeId);

    const existingMap = new Map((existingOs || []).map(o => [String(o.os_number), o]));

    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const os of osArray) {
      const existingObj = existingMap.get(String(os.os_number));
      const velho_valor_pago = existingObj ? Number(existingObj.paid_value) : 0;
      const delta_paid = os.paid_value - velho_valor_pago;
      (os as any).delta_paid = delta_paid;

      let paymentDate: string | null = null;
      if (delta_paid > 0) {
        paymentDate = targetDate || new Date().toISOString().split('T')[0];
      } else if (existingObj?.last_payment_date) {
        paymentDate = existingObj.last_payment_date;
      } else if (os.paid_value > 0) {
        paymentDate = targetDate || new Date().toISOString().split('T')[0];
      }

      const osCash = os.parsed_cash || os.cash_value || 0;

      const payload = {
        store_id: storeId,
        store_name: storeName,
        os_number: String(os.os_number),
        plate: os.plate,
        client_name: os.client_name || existingObj?.client_name || null,
        total_value: os.total_value,
        paid_value: os.paid_value,
        payment_method: os.payment_method,
        status: os.status,
        raw_status: os.raw_status || null,
        credit_value: os.parsed_credit || 0,
        debit_value: os.parsed_debit || 0,
        pix_transfer_value: os.parsed_pix_transfer || 0,
        cash_value: osCash,
        opened_at: os.opened_at,
        closed_at: os.closed_at,
        days_open: os.days_open,
        last_payment_date: paymentDate,
        updated_at: new Date().toISOString()
      };

      if (existingObj) {
        const oldTotal = Number(existingObj.total_value);
        const newTotal = Number(payload.total_value);
        const oldPaid = Number(existingObj.paid_value || 0);
        const incomingPaid = Number(payload.paid_value || 0);
        // Merge defensivo: quitação prévia nunca regride
        const finalPaid = Math.max(oldPaid, incomingPaid);
        payload.paid_value = finalPaid;

        const oldStatus = existingObj.status;
        let newStatus = os.status;
        if (finalPaid >= newTotal && newTotal > 0) {
          newStatus = 'finalizado';
          payload.status = 'finalizado';
        }

        const oldRawStatus = existingObj.raw_status;
        const newRawStatus = payload.raw_status;
        const oldCredit = Number(existingObj.credit_value || 0);
        const newCredit = Number(payload.credit_value);
        const oldDebit = Number(existingObj.debit_value || 0);
        const newDebit = Number(payload.debit_value);
        const oldPix = Number(existingObj.pix_transfer_value || 0);
        const newPix = Number(payload.pix_transfer_value);
        
        const changes = [];
        if (oldTotal !== newTotal) changes.push({ field: 'total_value', from: oldTotal, to: newTotal });
        if (oldPaid !== finalPaid) changes.push({ field: 'paid_value', from: oldPaid, to: finalPaid });
        if (oldStatus !== newStatus) changes.push({ field: 'status', from: oldStatus, to: newStatus });
        if (oldRawStatus !== newRawStatus) changes.push({ field: 'raw_status', from: oldRawStatus, to: newRawStatus });
        if (oldCredit !== newCredit) changes.push({ field: 'credit_value', from: oldCredit, to: newCredit });
        if (oldDebit !== newDebit) changes.push({ field: 'debit_value', from: oldDebit, to: newDebit });
        if (oldPix !== newPix) changes.push({ field: 'pix_transfer_value', from: oldPix, to: newPix });
        
        let currentHistory = existingObj.history_log || [];
        if (!Array.isArray(currentHistory)) currentHistory = [];
        
        if (changes.length > 0) {
           currentHistory.push({
             date: new Date().toISOString(),
             changes
           });
        }
        
        toUpdate.push({ id: existingObj.id, history_log: currentHistory, ...payload });
      } else {
        toInsert.push({ history_log: [], ...payload });
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('patio_os').upsert(toInsert, { onConflict: 'store_id,os_number', ignoreDuplicates: true });
    }
    for (const update of toUpdate) {
      await supabase.from('patio_os').update(update).eq('id', update.id);
    }

    // Sincronizar store_cash_vault para OSs com pagamento em dinheiro físico de forma atômica
    const cashOsList = osArray.filter(os => (os.parsed_cash && os.parsed_cash > 0) || (os.cash_value && os.cash_value > 0));
    if (cashOsList.length > 0) {
      for (const cashOs of cashOsList) {
        const cashAmount = cashOs.parsed_cash || cashOs.cash_value || 0;
        const entryDate = targetDate || (cashOs.closed_at ? String(cashOs.closed_at).split('T')[0] : new Date().toISOString().split('T')[0]);
        const osNumRef = String(cashOs.os_number);
        
        const { data: existingVault } = await supabase
          .from('store_cash_vault')
          .select('id, status, amount')
          .eq('store_id', storeId)
          .eq('os_number_ref', osNumRef)
          .maybeSingle();

        if (!existingVault) {
          await supabase.from('store_cash_vault').insert({
            store_id: storeId,
            os_number_ref: osNumRef,
            amount: cashAmount,
            description: `OS #${cashOs.os_number} - ${storeName} (Dinheiro em Espécie)`,
            entry_date: entryDate,
            status: 'em_transito',
            notes: 'Importado automaticamente via ConferenciaOSxFinanceiro'
          });
        } else if (existingVault.status === 'em_transito' && existingVault.amount !== cashAmount) {
          await supabase.from('store_cash_vault').update({
            amount: cashAmount
          }).eq('id', existingVault.id);
        }
      }
    }
  }

  // 2. Process Receivables (Idempotency by store_id + os_number + installment OR type + due_date + value)
  if (receivablesArray.length > 0) {
    const { data: existingRecs } = await supabase
      .from('receivables')
      .select('id, os_number, installment, type, value, date, due_date, status')
      .eq('store_id', storeId);

    const toInsertRecs: any[] = [];
    const toUpdateRecs: { id: string; status?: string; due_date?: string; value?: number; description?: string }[] = [];
    const localSeen = new Set<string>();

    for (const rec of receivablesArray) {
      const key = `${rec.os_number || ''}__${rec.installment || ''}__${rec.type}__${rec.due_date}__${Math.round(rec.value * 100)}`;
      if (localSeen.has(key)) continue;
      localSeen.add(key);

      const existingMatch = existingRecs?.find((er) => {
        if (rec.os_number && er.os_number) {
          return er.os_number === rec.os_number && (er.installment || '1/1') === (rec.installment || '1/1');
        }
        return er.type === rec.type && er.due_date === rec.due_date &&
               Math.round(Number(er.value) * 100) === Math.round(rec.value * 100);
      });

      if (!existingMatch) {
        toInsertRecs.push({
          store_id: storeId,
          store_name: storeName,
          os_number: rec.os_number || null,
          installment: rec.installment || null,
          description: rec.description || `OS #${rec.os_number || ''} - ${rec.type}`,
          type: rec.type,
          value: rec.value,
          status: rec.status,
          date: rec.date,
          due_date: rec.due_date,
        });
      } else if (existingMatch.status === 'pendente') {
        toUpdateRecs.push({
          id: existingMatch.id,
          status: rec.status,
          due_date: rec.due_date,
          value: rec.value,
          description: rec.description || undefined
        });
      }
    }

    if (toInsertRecs.length > 0) {
      await supabase.from('receivables').insert(toInsertRecs);
    }
    for (const up of toUpdateRecs) {
      await supabase.from('receivables').update({
        status: up.status,
        due_date: up.due_date,
        value: up.value,
        ...(up.description ? { description: up.description } : {})
      }).eq('id', up.id);
    }

    // Auto-match inteligente: Se transações de recebíveis/maquininhas cobrirem OSs em aberto na mesma loja
    const { data: openStoreOs } = await supabase
      .from('patio_os')
      .select('id, os_number, total_value, paid_value, status')
      .eq('store_id', storeId)
      .not('status', 'in', '("finalizada","finalizado","paga","pago","cancelada","cancelado")');

    if (openStoreOs && openStoreOs.length > 0) {
      for (const rec of receivablesArray) {
        const recVal = Number(rec.value || 0);
        if (recVal <= 0) continue;

        const matchedOs = openStoreOs.find(o => {
          const saldo = Number(o.total_value || 0) - Number(o.paid_value || 0);
          return (Math.abs(Number(o.total_value || 0) - recVal) <= 0.05) || (Math.abs(saldo - recVal) <= 0.05);
        });

        if (matchedOs) {
          await supabase.from('patio_os').update({
            paid_value: matchedOs.total_value,
            status: 'finalizada',
            raw_status: 'Finalizada (Auto-Match Maquininha)',
            closed_at: rec.date || targetDate || new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          }).eq('id', matchedOs.id);
        }
      }
    }
  }
}

export function useProcessImportedData() {
  const qc = useQueryClient();
  const saveImportedReport = useSaveImportedReport();

  return useMutation({
    mutationFn: async ({
      storeId,
      storeName,
      osArray,
      receivablesArray,
      targetDate,
      ofxBankBalance,
    }: {
      storeId: string;
      storeName: string;
      osArray: ParsedOS[];
      receivablesArray: ParsedReceivable[];
      targetDate?: string;
      ofxBankBalance?: number;
    }) => {
      await savePatioOsAndReceivables(storeId, storeName, osArray, receivablesArray, targetDate);


      // 3. Agrupar OSs por data de fechamento para processar Transações, Conciliações e Logs
      const dailySummaries = new Map<string, {
        totalOs: number;
        totalPaidAll: number;
        totalDinheiro: number;
        osCount: number;
        oss: ParsedOS[];
      }>();

      for (const os of osArray) {
        const deltaPaid = (os as any).delta_paid || 0;
        if (deltaPaid > 0) {
          const date = targetDate || getDefaultDate();
          if (!dailySummaries.has(date)) {
            dailySummaries.set(date, { totalOs: 0, totalPaidAll: 0, totalDinheiro: 0, osCount: 0, oss: [] });
          }
          const summary = dailySummaries.get(date)!;

          // O total processado para transações é exatamente o delta_paid
          const adjustedDelta = deltaPaid;

          summary.totalOs += adjustedDelta;
          summary.totalPaidAll += deltaPaid;
          summary.osCount++;
          summary.oss.push(os);
        }
      }

      // Para cada dia encontrado, salvar Totals, Logs e Transações (IDEMPOTENTE)
      for (const [date, summary] of Array.from(dailySummaries.entries())) {
        
        // A) Save Reconciliations (upsert â€” substitui ao invés de somar)
        await saveImportedReport.mutateAsync({
          storeId,
          date,
          osTotal: summary.totalOs,
          financialTotal: 0,
          bankTotal: ofxBankBalance,
        });

        // B) Save Import Log (upsert por store_id + target_date â€” substitui)
        const recCountForDate = receivablesArray.filter(r => r.date === date).length;
        await supabase.from('import_logs').upsert({
          store_id: storeId,
          store_name: storeName,
          target_date: date,
          total_os: summary.totalOs,
          total_paid_all: summary.totalPaidAll,
          os_count: summary.osCount,
          receivables_count: recCountForDate,
        }, { onConflict: 'store_id,target_date' });

        // C) Atualizar Caixa Físico (Removido)

        // C) Inserir transações para o extrato
        // Removida a trava de idempotência por os_number para permitir transações de deltas
        const txToInsert: any[] = [];
        
        for (const os of summary.oss) {
          const deltaPaid = (os as any).delta_paid || 0;
          const bankAmount = deltaPaid;
          
          if (bankAmount > 0) {
            const desc = `OS #${os.os_number} - ${os.plate || 'Sem placa'}`;
            txToInsert.push({
              store_id: storeId,
              store_name: storeName,
              type: 'in',
              amount: bankAmount, // Apenas o valor bancário do delta
              occurred_at: new Date().toISOString(),
              target_date: date,
              title: desc,
              os_number: os.os_number,
              payment_method: os.payment_method || 'Não especificado'
            });
          }
        }

        if (txToInsert.length > 0) {
          await supabase.from('manual_transactions').insert(txToInsert);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patio_os'] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['import_logs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
    },
  });
}

export interface GroupedImportLog {
  id: string;
  store_id: string;
  store_name: string;
  created_at: string;
  target_dates: string[];
  os_count: number;
  receivables_count: number;
  total_os: number;
  raw_logs: any[];
}

export function useImportsHistory() {
  return useQuery({
    queryKey: ['import_logs', 'history', 'grouped'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      
      const groups = new Map<string, GroupedImportLog>();
      
      data.forEach(log => {
        // Agrupar por minuto para juntar uploads da mesma planilha
        const minuteKey = log.created_at.substring(0, 16);
        const key = `${log.store_id}_${minuteKey}`;
        
        if (!groups.has(key)) {
          groups.set(key, {
            id: log.id,
            store_id: log.store_id,
            store_name: log.store_name,
            created_at: log.created_at,
            target_dates: [log.target_date],
            os_count: log.os_count || 0,
            receivables_count: log.receivables_count || 0,
            total_os: Number(log.total_os || 0),
            raw_logs: [log]
          });
        } else {
          const g = groups.get(key)!;
          if (!g.target_dates.includes(log.target_date)) {
            g.target_dates.push(log.target_date);
          }
          g.os_count += (log.os_count || 0);
          g.receivables_count += (log.receivables_count || 0);
          g.total_os += Number(log.total_os || 0);
          g.raw_logs.push(log);
        }
      });
      
      return Array.from(groups.values());
    },
  });
}

export function useDeleteImport() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ storeId, targetDates, logIds, rawLogs }: { storeId: string; targetDates: string[]; logIds: string[]; rawLogs?: any[] }) => {
      const isExpenseImport = rawLogs?.some(l => l.os_count === 0 && l.total_os === 0) || false;
      const batchCreatedAts = rawLogs?.map(l => l.created_at) || [];

      // 1. Tenta deletar via RPC
      try {
        await supabase.rpc('delete_import_batch', {
          p_store_id: storeId === 'GLOBAL' ? null : storeId,
          p_target_dates: targetDates,
          p_is_expense: isExpenseImport,
          p_log_ids: logIds,
          p_batch_created_ats: batchCreatedAts
        });
      } catch (e) {
        console.warn('RPC delete_import_batch notice:', e);
      }

      // 2. Fallback resiliente via JS Client para garantir que os logs e registros não fiquem órfãos
      if (logIds && logIds.length > 0) {
        try {
          if (storeId && storeId !== 'GLOBAL' && targetDates && targetDates.length > 0) {
            await supabase.from('conciliation_matches').delete().eq('store_id', storeId).in('target_date', targetDates);
            await supabase.from('reconciliations').delete().eq('store_id', storeId).in('date', targetDates);
          }
          await supabase.from('import_logs').delete().in('id', logIds);
        } catch (clientErr) {
          console.warn('Fallback delete notice:', clientErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import_logs'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['reconciliations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['patio'] });
      qc.invalidateQueries({ queryKey: ['patio_os'] });
      qc.invalidateQueries({ queryKey: ['daily_snapshots'] });
      toast.success('Lote de importação excluído com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir importação: ${err.message || 'Erro desconhecido'}`);
    }
  });
}

export function useClearAllData() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Chamada atômica à RPC SECURITY DEFINER no PostgreSQL que trunca todas as 20 tabelas
      const { data, error } = await (supabase as any).rpc('clear_all_financial_data');
      if (error) {
        console.error('Erro na RPC clear_all_financial_data:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.clear();
      toast.success('Todas as tabelas financeiras foram 100% zeradas no banco de dados!');
    },
    onError: (err: any) => {
      toast.error('Erro ao limpar dados do banco: ' + (err?.message || 'Erro desconhecido'));
    }
  });
}

