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
      targetDate,
      osArray,
      receivablesArray,
      totalOs,
      totalPaid,
      totalDinheiro,
    }: {
      storeId: string;
      storeName: string;
      targetDate: string;
      osArray: ParsedOS[];
      receivablesArray: ParsedReceivable[];
      totalOs: number;
      totalPaid: number;
      totalDinheiro: number;
    }) => {
      // 1. Process Patio OS
      if (osArray.length > 0) {
        // Fetch existing OSs for this store to prevent duplicates
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

      // 2. Process Receivables (Soft Idempotency matching date, type and value)
      if (receivablesArray.length > 0) {
        const { data: existingRecs } = await supabase
          .from('receivables')
          .select('id, type, value, date')
          .eq('store_id', storeId);

        const toInsertRecs: any[] = [];

        for (const rec of receivablesArray) {
          // Check if there is already a receivable with same type, date and value (approx)
          const isDuplicate = existingRecs?.some(
            (er) => er.type === rec.type && er.date === rec.date && Math.abs(er.value - rec.value) < 0.01
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
            // Add to existingRecs locally so we don't insert duplicates of the same file
            existingRecs?.push({ id: 'temp', type: rec.type, value: rec.value, date: rec.date });
          }
        }

        if (toInsertRecs.length > 0) {
          await supabase.from('receivables').insert(toInsertRecs);
        }
      }

      // 3. Save the Reconciliations Totals
      await saveImportedReport.mutateAsync({
        storeId,
        date: targetDate,
        osTotal: totalOs,
        financialTotal: totalDinheiro, // Usando o total filtrado apenas para dinheiro
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patio_os'] });
      qc.invalidateQueries({ queryKey: ['receivables'] });
    },
  });
}
