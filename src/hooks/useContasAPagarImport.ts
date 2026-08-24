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

      // 3. Preparar payload de inserção em lote
      const rowsToInsert = parseResult.bills.map((b: ParsedContaAPagar) => ({
        date: targetDate,
        store_id: b.store_id !== 'master' ? b.store_id : null,
        title: b.recipient_name || b.description || 'Conta a Pagar',
        description: `[${b.store_name}] ${b.recipient_name} - ${b.description}`,
        amount: b.amount,
        category: b.category,
        external_code: b.external_code,
        installment: b.installment,
        due_date: b.due_date,
        payment_date: b.payment_date,
        recipient_name: b.recipient_name,
        is_intercompany: b.is_intercompany,
        intercompany_entity_id: b.intercompany_entity_id || null,
        matched_os_number: b.matched_os_number || null,
      }));

      // Inserir em chunks de 100 para alta performance
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
        const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
        const { error: insertErr } = await supabase
          .from('daily_manual_bills')
          .insert(chunk);

        if (insertErr) throw insertErr;
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
