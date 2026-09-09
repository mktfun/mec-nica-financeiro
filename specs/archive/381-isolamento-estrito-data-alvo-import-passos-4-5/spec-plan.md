# Spec Plan: Isolamento Estrito de Data Alvo nos Passos 4 e 5 da Importação (Spec 381)

## Tasks

- [x] `[DB-MIGRATION]` **Saneamento de `target_date` em Transações Existentes**
  - Criar e aplicar migration `supabase/migrations/20260909000040_sanitize_transactions_target_date.sql`.
  - Realinhar `target_date` com a data de ocorrência real (`occurred_at::date::text`) onde houve distorção em lotes de importação antigos.
  - *Critério de Verificação:* Query de auditoria confirma que não existem transações em `ofx_transactions` com `target_date` divergente de `occurred_at`.

- [x] `[ENGINE-MATCH]` **Guardrail de Data Alvo em `autoMatchingEngine.ts`**
  - Implementar verificação de `isSameDate(tx.date, targetDate)` para transações de cartão Rede e depósitos bancários OFX.
  - Garantir que transações de outras datas contidas no mesmo extrato não concorram ao match nem sejam enviadas para `unmatchedTransactions`.
  - *Critério de Verificação:* Teste com mock contendo transações de 08/09 e 09/09 retorna em `unmatchedTransactions` estritamente itens de 09/09.

- [x] `[ENGINE-EXPENSE]` **Guardrail de Data Alvo em `expenseMatcher.ts`**
  - Adicionar suporte a `targetDate` em `executeExpenseAutoMatching`.
  - Filtrar débitos bancários para confrontar apenas lançamentos da data alvo com contas a pagar do dia.
  - *Critério de Verificação:* O array `orphanOutflows` retornado não contém nenhuma movimentação com data divergente de `targetDate`.

- [x] `[WIZARD-CORE]` **Preservação de Datas na Ingestão e Filtro em `CentralImportWizard.tsx`**
  - Ajustar a montagem de `txsToInsert` para não sobrescrever `target_date` com `targetDate` quando a transação possui data própria diferente.
  - Reforçar `fetchRealUnmatchedTransactions` para validar correspondência entre `target_date` e a data de ocorrência real.
  - *Critério de Verificação:* Ingestão de extrato multi-dias no wizard salva as transações em suas respectivas datas contábeis no banco.

- [x] `[FRONTEND-UI]` **Blindagem Defensiva nos Componentes de Interface (Passos 4 e 5)**
  - Adicionar filtro por `targetDate` em `Step1UnregisteredPayments.tsx` para assegurar que apenas pagamentos de hoje apareçam para vínculo.
  - Adicionar filtro por `targetDate` em `Step2NonRevenueJustifications.tsx` no fallback em memória e na renderização dos débitos pendentes.
  - *Critério de Verificação:* Ao navegar pelos Passos 4 e 5 na data 09/09, zero registros de 04/09 ou 08/09 são exibidos na grade.

- [x] `[BUILD-GATE]` **Auditoria de Build TypeScript e Integridade Geral**
  - Executar `cmd.exe /c "npm run build"` e garantir 0 erros de compilação.
  - *Critério de Verificação:* Build concluído com sucesso e exit code 0.
