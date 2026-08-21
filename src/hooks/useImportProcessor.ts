import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDefaultDate } from '@/lib/utils';
import { useSaveImportedReport } from './useConciliacao';

export interface ParsedOS {
  os_number: string;
  plate: string;
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
  is_new_os?: boolean;
  days_open?: number;
  pending_value?: number;
}

export interface ParsedReceivable {
  type: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Boleto';
  value: number;
  date: string;
  due_date: string;
  status: 'pendente' | 'recebido';
  os_number?: string;
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
      .select('id, os_number, total_value, paid_value, status, raw_status, credit_value, debit_value, pix_transfer_value, history_log, last_payment_date')
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

      const payload = {
        store_id: storeId,
        store_name: storeName,
        os_number: String(os.os_number),
        plate: os.plate,
        total_value: os.total_value,
        paid_value: os.paid_value,
        payment_method: os.payment_method,
        status: os.status,
        raw_status: os.raw_status || null,
        credit_value: os.parsed_credit || 0,
        debit_value: os.parsed_debit || 0,
        pix_transfer_value: os.parsed_pix_transfer || 0,
        opened_at: os.opened_at,
        closed_at: os.closed_at,
        days_open: os.days_open,
        last_payment_date: paymentDate,
        updated_at: new Date().toISOString()
      };

      if (existingObj) {
        const oldTotal = Number(existingObj.total_value);
        const newTotal = Number(payload.total_value);
        const oldPaid = Number(existingObj.paid_value);
        const newPaid = Number(payload.paid_value);
        const oldStatus = existingObj.status;
        const newStatus = os.status;
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
        if (oldPaid !== newPaid) changes.push({ field: 'paid_value', from: oldPaid, to: newPaid });
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
      await supabase.from('patio_os').insert(toInsert);
    }
    for (const update of toUpdate) {
      await supabase.from('patio_os').update(update).eq('id', update.id);
    }
  }

  // 2. Process Receivables (Idempotency by store_id + type + date + value rounded)
  if (receivablesArray.length > 0) {
    const { data: existingRecs } = await supabase
      .from('receivables')
      .select('id, type, value, date, status')
      .eq('store_id', storeId);

    const toInsertRecs: any[] = [];
    const toUpdateRecs: { id: string; status: string }[] = [];
    const localSeen = new Set<string>();

    for (const rec of receivablesArray) {
      const key = `${rec.type}__${rec.date}__${Math.round(rec.value * 100)}`;
      if (localSeen.has(key)) continue;
      localSeen.add(key);

      const existingMatch = existingRecs?.find(
        (er) => er.type === rec.type && er.date === rec.date &&
                Math.round(Number(er.value) * 100) === Math.round(rec.value * 100)
      );

      if (!existingMatch) {
        toInsertRecs.push({
          store_id: storeId,
          store_name: storeName,
          type: rec.type,
          value: rec.value,
          status: rec.status,
          date: rec.date,
          due_date: rec.due_date,
        });
      } else if (existingMatch.status === 'pendente' && rec.status === 'recebido') {
        toUpdateRecs.push({
          id: existingMatch.id,
          status: 'recebido'
        });
      }
    }

    if (toInsertRecs.length > 0) {
      await supabase.from('receivables').insert(toInsertRecs);
    }
    for (const up of toUpdateRecs) {
      await supabase.from('receivables').update({ status: up.status }).eq('id', up.id);
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

