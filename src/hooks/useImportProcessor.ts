import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  days_open: number;
}

export interface ParsedReceivable {
  type: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Boleto';
  value: number;
  date: string;
  due_date: string;
  status: 'pendente' | 'recebido';
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
    }: {
      storeId: string;
      storeName: string;
      osArray: ParsedOS[];
      receivablesArray: ParsedReceivable[];
    }) => {
      // 1. Process Patio OS
      if (osArray.length > 0) {
        const { data: existingOs } = await supabase
          .from('patio_os')
          .select('id, os_number')
          .eq('store_id', storeId);

        const existingMap = new Map((existingOs || []).map(o => [String(o.os_number), o.id]));

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        for (const os of osArray) {
          const payload = {
            store_id: storeId,
            store_name: storeName,
            os_number: String(os.os_number),
            plate: os.plate,
            total_value: os.total_value,
            paid_value: os.paid_value,
            payment_method: os.payment_method,
            status: os.status,
            opened_at: os.opened_at,
            closed_at: os.closed_at,
            days_open: os.days_open,
            updated_at: new Date().toISOString()
          };

          const existingId = existingMap.get(String(os.os_number));
          if (existingId) {
            toUpdate.push({ id: existingId, ...payload });
          } else {
            toInsert.push(payload);
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
          .select('id, type, value, date')
          .eq('store_id', storeId);

        const toInsertRecs: any[] = [];
        const localSeen = new Set<string>();

        for (const rec of receivablesArray) {
          const key = `${rec.type}__${rec.date}__${Math.round(rec.value * 100)}`;
          if (localSeen.has(key)) continue;
          localSeen.add(key);

          const isDuplicate = existingRecs?.some(
            (er) => er.type === rec.type && er.date === rec.date &&
                    Math.round(Number(er.value) * 100) === Math.round(rec.value * 100)
          );

          if (!isDuplicate) {
            toInsertRecs.push({
              store_id: storeId,
              store_name: storeName,
              type: rec.type,
              value: rec.value,
              status: rec.status,
              date: rec.date,
              due_date: rec.due_date,
            });
          }
        }

        if (toInsertRecs.length > 0) {
          await supabase.from('receivables').insert(toInsertRecs);
        }
      }

      // 3. Agrupar OSs por data de fechamento para processar Transações, Conciliações e Logs
      const dailySummaries = new Map<string, {
        totalOs: number;
        totalPaidAll: number; // Sum of all paid
        totalDinheiro: number;
        osCount: number;
        oss: ParsedOS[];
      }>();

      for (const os of osArray) {
        if (os.status === 'finalizado' && os.closed_at) {
          const date = os.closed_at;
          if (!dailySummaries.has(date)) {
            dailySummaries.set(date, { totalOs: 0, totalPaidAll: 0, totalDinheiro: 0, osCount: 0, oss: [] });
          }
          const summary = dailySummaries.get(date)!;
          summary.totalOs += os.total_value;
          summary.totalPaidAll += os.paid_value;
          summary.osCount++;
          summary.oss.push(os);
          
          // Calcular dinheiro apenas (PIX / Dinheiro) - uma estimativa caso venha Payment_method
          let dinheiroVal = 0;
          if (os.payment_method) {
             const parts = os.payment_method.split(';');
             parts.forEach(part => {
                const [method, valStr] = part.split(':');
                if (method && valStr) {
                  const m = method.toLowerCase();
                  if (m.includes('dinheiro') || m.includes('espécie')) {
                    const parsed = parseFloat(valStr.trim());
                    if (!isNaN(parsed)) dinheiroVal += parsed;
                  }
                }
             });
          }
          summary.totalDinheiro += dinheiroVal;
        }
      }

      // Para cada dia encontrado, salvar Totals, Logs e Transações
      for (const [date, summary] of Array.from(dailySummaries.entries())) {
        
        // A) Save Reconciliations
        await saveImportedReport.mutateAsync({
          storeId,
          date,
          osTotal: summary.totalOs,
          financialTotal: summary.totalDinheiro,
        });

        // B) Save Import Log
        const recCountForDate = receivablesArray.filter(r => r.date === date).length;
        await supabase.from('import_logs').upsert({
          store_id: storeId,
          store_name: storeName,
          target_date: date,
          total_os: summary.totalOs,
          total_paid_all: summary.totalPaidAll,
          total_dinheiro: summary.totalDinheiro,
          os_count: summary.osCount,
          receivables_count: recCountForDate,
        }, { onConflict: 'store_id,target_date' });

        // C) Inserir transações para o extrato (somente novos)
        // Precisamos evitar duplicar transações da mesma OS
        const { data: existingTransactions } = await supabase
          .from('transactions')
          .select('id, title')
          .eq('store_id', storeId)
          .eq('occurred_at', date)
          .eq('type', 'in');

        const txToInsert: any[] = [];
        
        for (const os of summary.oss) {
          const desc = `OS #${os.os_number} - ${os.plate || 'Sem placa'}`;
          const isDuplicateTx = existingTransactions?.some(t => t.title === desc);
          
          if (!isDuplicateTx && os.paid_value > 0) {
            txToInsert.push({
              store_id: storeId,
              store_name: storeName,
              type: 'in',
              amount: os.paid_value,
              occurred_at: date,
              title: desc,
              os_number: os.os_number,
              payment_method: os.payment_method || 'Não especificado'
            });
          }
        }

        if (txToInsert.length > 0) {
          await supabase.from('transactions').insert(txToInsert);
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
