# Tasks

## Backend / Database
- [x] Criar arquivo `.sql` da migration (`supabase/migrations/YYYYMMDDHHMMSS_add_tx_source_and_match_engine.sql`):
  - Adicionar coluna `source VARCHAR DEFAULT 'system'` à tabela `transactions`.
  - Criar Stored Procedure (RPC) `match_bank_transactions` que compara as transações (`source='system'`) do mês com as importadas (`source='ofx'`) da loja informada, e gera registros na tabela `alerts` caso encontre discrepâncias no dia.
- [x] Atualizar as queries em `src/hooks/useConsolidatedBalance.ts` e `src/hooks/useTransactions.ts` (Dashboard da Loja) para SOMAR APENAS AS TRANSAÇÕES ONDE `source = 'system'` no Saldo Geral, para nÁo duplicar saldo com as do Extrato.
- [x] Atualizar `WizardImportacao.tsx` para acionar mutaçÁo de insert em `step === 3`, salvando dados na tabela `transactions` com `source='ofx'`.

## Frontend / UI
- [x] Em `src/routes/loja.$lojaId.tsx`, alterar o cálculo de `txSemOS` para ignorar o ajuste de saldo: `tx.type === 'in' && !tx.os_number && tx.subtitle !== 'Ajuste de Saldo Inicial'`.
- [x] Na tela `src/routes/conciliacao.tsx`, transformar o Card da Divergência em algo que indique um botÁo "Ver Alertas" encaminhando o usuário para `/alertas`.
- [x] Na tela `src/routes/alertas.tsx`, garantir a integraçÁo com a tabela de alertas caso a tipagem mude, e que exiba as anomalias do Match Engine OFX com excelência.
- [x] Realizar `npm run build` ao final.
