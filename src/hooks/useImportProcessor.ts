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

// ─── Tabela de Juros Progressivo ────────────────────────────────────────
// Baseado no "Gráfico Progressivo de Juros" oficial da loja.
// Parcelas → Taxa de acréscimo (%)
const INTEREST_TABLE: Record<number, number> = {
  1: 0, 2: 0, 3: 0, 4: 0,          // Excelente p/ Cliente
  5: 10.5, 6: 11, 7: 11.5, 8: 12,  // Ruim p/ Cliente
  9: 12.5, 10: 13, 11: 13.5,
  12: 14, 13: 14.5, 14: 15,         // Bom p/ Cliente
  15: 15.5, 16: 16, 17: 17.5, 18: 18, // Ótimo p/ Cliente (para a loja)
};

// Descontos para pagamento à vista
const DISCOUNT_PIX = 6;    // 6% de desconto
const DISCOUNT_DEBITO = 3; // 3% de desconto

/**
 * Detecta se a diferença entre o valor da OS e o valor pago corresponde
 * a uma taxa de juros conhecida (parcelamento no cartão) ou desconto (PIX/Débito).
 * 
 * O gerente NÃO PODE lançar os juros no sistema fonte, então a OS vem com
 * o valor original. O cliente paga mais, mas o sistema recebe apenas o valor base.
 * Essa função identifica e retorna o valor "real" ajustado.
 */
export function detectInterestOrDiscount(
  osValue: number,
  paidValue: number,
  paymentMethod: string | null
): { adjustedTotal: number; interestType: string | null; rate: number } {
  if (osValue <= 0 || paidValue <= 0) {
    return { adjustedTotal: osValue, interestType: null, rate: 0 };
  }

  const ratio = paidValue / osValue;
  const TOLERANCE = 0.008; // ~0.8% tolerance for rounding

  // 1. Check for interest (paid > os value → parcelamento no cartão)
  if (ratio > 1.05) {
    for (const [parcelas, taxa] of Object.entries(INTEREST_TABLE)) {
      if (taxa === 0) continue;
      const expectedRatio = 1 + taxa / 100;
      if (Math.abs(ratio - expectedRatio) <= TOLERANCE) {
        return {
          adjustedTotal: paidValue,
          interestType: `Juros ${parcelas}x (${taxa}%)`,
          rate: taxa,
        };
      }
    }
  }

  // 2. Check for PIX discount (paid < os value by ~6%)
  if (ratio < 1 && ratio > 0.9) {
    const pixExpected = 1 - DISCOUNT_PIX / 100; // 0.94
    if (Math.abs(ratio - pixExpected) <= TOLERANCE) {
      return {
        adjustedTotal: paidValue,
        interestType: `Desconto PIX (${DISCOUNT_PIX}%)`,
        rate: -DISCOUNT_PIX,
      };
    }

    // 3. Check for Débito discount (~3%)
    const debitoExpected = 1 - DISCOUNT_DEBITO / 100; // 0.97
    if (Math.abs(ratio - debitoExpected) <= TOLERANCE) {
      return {
        adjustedTotal: paidValue,
        interestType: `Desconto Débito (${DISCOUNT_DEBITO}%)`,
        rate: -DISCOUNT_DEBITO,
      };
    }
  }

  // No match — keep original values
  return { adjustedTotal: osValue, interestType: null, rate: 0 };
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
      // 1. Process Patio OS (upsert by os_number — idempotent)
      if (osArray.length > 0) {
        const { data: existingOs } = await supabase
          .from('patio_os')
          .select('id, os_number, total_value, paid_value, status, history_log')
          .eq('store_id', storeId);

        const existingMap = new Map((existingOs || []).map(o => [String(o.os_number), o]));

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        for (const os of osArray) {
          // ─── Aplicar Motor de Juros ───────────────────────
          const { adjustedTotal, interestType } = detectInterestOrDiscount(
            os.total_value,
            os.paid_value,
            os.payment_method
          );

          const payload = {
            store_id: storeId,
            store_name: storeName,
            os_number: String(os.os_number),
            plate: os.plate,
            total_value: adjustedTotal, // Usa o valor ajustado (com juros incluso)
            paid_value: os.paid_value,
            payment_method: os.payment_method
              ? (interestType
                  ? `${os.payment_method} [${interestType}]`
                  : os.payment_method)
              : os.payment_method,
            status: os.status,
            opened_at: os.opened_at,
            closed_at: os.closed_at,
            days_open: os.days_open,
            updated_at: new Date().toISOString()
          };

          const existingObj = existingMap.get(String(os.os_number));
          if (existingObj) {
            const oldTotal = Number(existingObj.total_value);
            const newTotal = Number(payload.total_value);
            const oldPaid = Number(existingObj.paid_value);
            const newPaid = Number(payload.paid_value);
            const oldStatus = existingObj.status;
            const newStatus = payload.status;
            
            const changes = [];
            if (oldTotal !== newTotal) changes.push({ field: 'total_value', from: oldTotal, to: newTotal });
            if (oldPaid !== newPaid) changes.push({ field: 'paid_value', from: oldPaid, to: newPaid });
            if (oldStatus !== newStatus) changes.push({ field: 'status', from: oldStatus, to: newStatus });
            
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

      // 3. Agrupar OSs por data de fechamento para processar Transações, Conciliações e Logs
      const dailySummaries = new Map<string, {
        totalOs: number;
        totalPaidAll: number;
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

          // Aplica o motor de juros no acumulado diário
          const { adjustedTotal } = detectInterestOrDiscount(
            os.total_value,
            os.paid_value,
            os.payment_method
          );

          summary.totalOs += adjustedTotal;
          summary.totalPaidAll += os.paid_value;
          summary.osCount++;
          summary.oss.push(os);
          
          // Calcular dinheiro apenas (PIX / Dinheiro)
          let dinheiroValForOs = 0;
          if (os.payment_method) {
             const parts = os.payment_method.split(';');
             parts.forEach(part => {
                const [method, valStr] = part.split(':');
                if (method && valStr) {
                  const m = method.toLowerCase();
                  if (m.includes('dinheiro') || m.includes('espécie')) {
                    const parsed = parseFloat(valStr.trim());
                    if (!isNaN(parsed)) dinheiroValForOs += parsed;
                  }
                }
             });
          }
          summary.totalDinheiro += dinheiroValForOs;
          
          // Anexar o valor em dinheiro na OS para não precisarmos recalcular na hora das transações
          (os as any).dinheiroVal = dinheiroValForOs;
        }
      }

      // Para cada dia encontrado, salvar Totals, Logs e Transações (IDEMPOTENTE)
      for (const [date, summary] of Array.from(dailySummaries.entries())) {
        
        // A) Save Reconciliations (upsert — substitui ao invés de somar)
        await saveImportedReport.mutateAsync({
          storeId,
          date,
          osTotal: summary.totalOs,
          financialTotal: summary.totalDinheiro,
        });

        // B) Save Import Log (upsert por store_id + target_date — substitui)
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

        // C) Atualizar Caixa Físico (cash_registers)
        if (summary.totalDinheiro > 0) {
          // Busca para ver se já existe para não sobreescrever um declarado, 
          // ou usamos upsert se quisermos forçar a atualização do expected_amount
          const { data: existingCash } = await supabase
            .from('cash_registers')
            .select('id, declared_amount')
            .eq('store_id', storeId)
            .eq('date', date)
            .single();

          if (existingCash) {
            // Só atualiza o expected_amount, recalcula divergência se já tiver declared
            const div = existingCash.declared_amount !== null 
                ? existingCash.declared_amount - summary.totalDinheiro 
                : null;
            await supabase.from('cash_registers').update({
              expected_amount: summary.totalDinheiro,
              divergence: div
            }).eq('id', existingCash.id);
          } else {
            await supabase.from('cash_registers').insert({
              store_id: storeId,
              date: date,
              expected_amount: summary.totalDinheiro,
              status: 'pending'
            });
          }
        }

        // C) Inserir transações para o extrato (IDEMPOTENTE por os_number)
        // Busca TODAS as transações existentes para esta loja (não apenas do dia),
        // evitando que a mesma OS importada em dois dias gere duplicatas.
        const { data: existingTransactions } = await supabase
          .from('transactions')
          .select('id, title, os_number')
          .eq('store_id', storeId)
          .eq('type', 'in');

        const existingOsNumbers = new Set(
          (existingTransactions || []).map(t => t.os_number).filter(Boolean)
        );

        const txToInsert: any[] = [];
        
        for (const os of summary.oss) {
          // ─── Chave de Idempotência: os_number ───────────────
          // Se essa OS já está no extrato (de qualquer dia), não insere novamente.
          if (existingOsNumbers.has(os.os_number)) continue;
          
          const bankAmount = os.paid_value - ((os as any).dinheiroVal || 0);
          
          if (bankAmount > 0) {
            const { adjustedTotal, interestType } = detectInterestOrDiscount(
              os.total_value,
              os.paid_value,
              os.payment_method
            );

            const desc = `OS #${os.os_number} - ${os.plate || 'Sem placa'}`;
            txToInsert.push({
              store_id: storeId,
              store_name: storeName,
              type: 'in',
              amount: bankAmount, // Apenas o valor bancário
              occurred_at: date,
              title: desc,
              os_number: os.os_number,
              payment_method: os.payment_method
                ? (interestType
                    ? `${os.payment_method} [${interestType}]`
                    : os.payment_method)
                : 'Não especificado'
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
