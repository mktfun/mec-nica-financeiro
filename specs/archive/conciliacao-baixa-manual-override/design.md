# Design: Baixa Manual Universal & Forçar Status 'ENTROU' para OSs e Pendências (conciliacao-baixa-manual-override)

## Arquitetura do Fluxo de Baixa Manual

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. AÇÁO DO USUÁRIO NA UI                               │
 │    - Clica em "Marcar como ENTROU" no Modal da OS /     │
 │      no Card de Alerta de ExceçÁo                       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. MUTATION (useUpdateOsStatus / useResolveAlert)      │
 │    - UPDATE patio_os SET status = 'ENTROU'             │
 │    - INSERT INTO conciliation_matches (MANUAL_OVERRIDE)│
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. REVALIDAÇÁO INSTANTÂNEA DE ESTADO (QueryInvalidate) │
 │    - Invalida 'reconciliation_views' e 'modulo1_stores'│
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. FEEDBACK VISUAL NA TELA                             │
 │    - OS muda para Badge Verde "ENTROU (Manual)"         │
 │    - Saldo "NA LOJA (G16)" recalcula imediatamente    │
 └────────────────────────────────────────────────────────┘
```

## Mutations e Hooks (`src/hooks/useConciliacao.ts`)

```typescript
export function useUpdateOsStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ osId, osNumber, storeId, targetDate, newStatus }: {
      osId: string;
      osNumber: string;
      storeId: string;
      targetDate: string;
      newStatus: 'ENTROU' | 'finalizado' | 'em_aberto';
    }) => {
      // 1. Atualizar status na patio_os
      const { data, error } = await supabase
        .from('patio_os')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', osId);

      if (error) throw error;

      // 2. Se for para 'ENTROU', registrar o match manual em conciliation_matches
      if (newStatus === 'ENTROU') {
        await supabase.from('conciliation_matches').upsert([{
          store_id: storeId,
          system_os_number: osNumber,
          target_date: targetDate,
          status: 'APPROVED',
          match_type: 'MANUAL_OVERRIDE'
        }], { onConflict: 'store_id,system_os_number' });
      } else {
        // Se desfez a baixa, remove o match manual
        await supabase.from('conciliation_matches')
          .delete()
          .eq('store_id', storeId)
          .eq('system_os_number', osNumber);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] });
      queryClient.invalidateQueries({ queryKey: ['modulo1_stores_data'] });
      queryClient.invalidateQueries({ queryKey: ['patio_os'] });
    }
  });
}
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Baixa Manual de OS Sem Vínculo Bancário):**
  - *Dados:* OS #804 de R$ 1.500,00 sem depósito bancário correspondente.
  - *AçÁo:* O usuário clica em "Marcar como ENTROU (Baixa Manual)" no modal ou na tabela.
  - *Resultado Esperado:* A OS passa para `status = 'ENTROU'`, exibe badge verde "ENTROU (Manual)", o valor "Na Loja (G16)" cai R$ 1.500,00 e a pendência desaparece da lista.

- **Cenário 2 (Desfazer Baixa Manual):**
  - *Dados:* OS #804 com status `ENTROU` (Manual).
  - *AçÁo:* O usuário clica em "Reverter para Pendente".
  - *Resultado Esperado:* A OS retorna ao status anterior (`finalizado` / `em_aberto`), o vínculo em `conciliation_matches` é removido e o saldo "Na Loja" é restaurado.
