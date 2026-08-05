# Spec Plan: Saldo Anterior Nativo do OFX (089)

## Tarefas

- [/] [BACKEND] Adicionar coluna `previous_balance NUMERIC` na tabela `reconciliations`
  - Criar e rodar script de migração via RPC ou chave de serviço.
- [x] [FRONTEND] Atualizar TypeScript de `ReconciliationRow` em `src/lib/supabase.ts`
  - Adicionar `previous_balance?: number | null;` (se já não estiver lá)
- [x] [FRONTEND] Ajustar Parser `ofxParser.ts`
  - Aplicar checagem anti-centavos no `<TRNAMT>` do `"SALDO ANTERIOR"` (identico à rule do `bank_total`)
- [x] [FRONTEND] Mapear dados na Importação 
  - Em `CentralImportWizard.tsx`: Coletar `ofx.previousBalance` em `storePreviousBalances` e passar ao payload.
  - Em `useTransactions.ts` (`useBulkInsertTransactions`): Dar upsert em `previous_balance` na `reconciliations`.
- [x] [FRONTEND] Injetar na Matemática de Fechamento
  - Atualizar `ResumoDiaPanel.tsx` para carregar `previous_balance` e usá-lo em `caixa_anterior`
  - Atualizar `useDashboardV2.ts` para ler o `previous_balance` atualizado ao invés de recalcular histórico (se aplicável).
