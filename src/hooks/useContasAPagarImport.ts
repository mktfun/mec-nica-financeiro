import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ParsedContaAPagar, ContasAPagarParseResult } from '@/types/contasPagar';
import { toast } from 'sonner';

export function useContasAPagarImport() {
  const queryClient = useQueryClient();

  const saveBillsMutation = useMutation({
    mutationFn: async ({ parseResult, targetDate }: { parseResult: ContasAPagarParseResult; targetDate: string }) => {
      if (!parseResult.bills || parseResult.bills.length === 0) {
        throw new Error('Nenhuma conta a pagar para salvar.');
      }

      // 1. Gravar registro em accounts_payable_imports
      const { data: importLog, error: logErr } = await supabase
        .from('accounts_payable_imports')
        .insert({
          date: targetDate,
          source_filename: parseResult.fileName,
          total_bills_count: parseResult.totalBills,
          total_amount: parseResult.totalAmount,
        })
        .select()
        .single();

      if (logErr) {
        console.warn('Aviso ao registrar accounts_payable_imports:', logErr);
      }

      // 2. Limpar despesas importadas anteriormente na mesma data para evitar duplicações
      await supabase
        .from('daily_manual_bills')
        .delete()
        .eq('date', targetDate)
        .not('external_code', 'is', null);

      // 3. Buscar lojas existentes para validação de Foreign Key
      const { data: dbStores } = await supabase.from('stores').select('id');
      const validStoreIds = new Set((dbStores || []).map(s => s.id));

      // 4. Preparar payload de inserção em lote com sanitização e deduplicação estritas
      const seenKeys = new Set<string>();
      const rowsToInsert: any[] = [];

      for (const b of parseResult.bills) {
        const amount = Number(b.amount || 0);
        // Blindagem estrita contra amount <= 0 (Check constraint daily_manual_bills_amount_check)
        if (amount <= 0 || isNaN(amount)) continue;

        const cleanStoreId = (b.store_id && b.store_id !== 'master' && validStoreIds.has(b.store_id)) 
          ? b.store_id 
          : null;

        const title = (b.recipient_name || b.description || 'Conta a Pagar').trim() || 'Conta a Pagar';
        const description = b.description || `[${b.store_name || 'Geral'}] ${b.recipient_name || 'Conta'}`;
        const dedupKey = `${cleanStoreId || 'global'}__${b.external_code || ''}__${b.installment || '1/1'}__${Math.round(amount * 100)}__${b.due_date || ''}`;

        if (seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        rowsToInsert.push({
          date: targetDate,
          store_id: cleanStoreId,
          title,
          description,
          amount,
          category: b.category || 'outros',
          external_code: b.external_code || null,
          installment: b.installment || null,
          due_date: b.due_date || targetDate,
          payment_date: b.payment_date || b.due_date || targetDate,
          recipient_name: b.recipient_name || null,
          is_intercompany: Boolean(b.is_intercompany),
          intercompany_entity_id: b.intercompany_entity_id || null,
          matched_os_number: b.matched_os_number || null,
          contabilizar_no_subtotal: true,
        });
      }

      // Inserir em chunks de 100 para alta performance com fallback resiliente
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
        const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
        const { error: insertErr } = await supabase
          .from('daily_manual_bills')
          .insert(chunk);

        if (insertErr) {
          console.warn('Erro no chunk de contas a pagar, aplicando fallback individual:', insertErr);
          // Fallback individual item a item para não perder o lote inteiro
          for (const item of chunk) {
            try {
              await supabase.from('daily_manual_bills').insert(item);
            } catch (singleErr) {
              console.error('Erro ao inserir conta individual:', item, singleErr);
            }
          }
        }
      }

      // 4. Atualizar o snapshot diário com o total de contas importadas
      const { data: existingSnap } = await supabase
        .from('daily_snapshots')
        .select('id, contas_a_pagar')
        .eq('date', targetDate)
        .maybeSingle();

      if (existingSnap) {
        await supabase
          .from('daily_snapshots')
          .update({
            contas_a_pagar: parseResult.totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('date', targetDate);
      }

      return {
        totalBills: parseResult.totalBills,
        totalAmount: parseResult.totalAmount,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      toast.success(`${data.totalBills} contas importadas com sucesso! Total: R$ ${data.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    },
    onError: (err: any) => {
      toast.error(`Falha ao salvar contas a pagar: ${err.message}`);
    },
  });

  return {
    saveBills: saveBillsMutation.mutateAsync,
    isSaving: saveBillsMutation.isPending,
  };
}
