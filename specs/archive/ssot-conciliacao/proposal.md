# Proposal — SSOT da Conciliação Financeira & Eliminação de Recálculos no Front

## 1. Problema Diagnosticado
O sistema de conciliação financeira acumulou divergências crônicas causadas por 5 fatores estruturais:
1. **Resultados Duplos para o Mesmo Dia:** `get_daily_reconciliation_summary` e rotinas legadas geram resultados divergentes (ex: congelado vs ao vivo).
2. **Fechamento Prematuro:** A importação fecha o dia no navegador antes de rodar os motores de pareamento no banco.
3. **Duas Contabilidades Paralelas & Cálculos no Front:** Telas diferentes chamam funções diferentes com critérios de tolerância (R$ 50, R$ 250) e vocabulários incompatíveis (`divergent` vs `divergence`).
4. **Gravações Fantasmas:** Componentes tentam escrever na view `transactions`, que não suporta inserção/exclusão direta.
5. **Vocabulário de Status Frágil:** 60 linhas de extrato com status vazio e variações textuais (`MATCHED`, `matched`, `paid_cash`, etc.).

## 2. Solução Proposta
Estabelecer a **Fonte Única de Verdade (SSOT)** no Banco de Dados:
- **Etapa 1:** Uma única calculadora no Postgres (`get_daily_reconciliation_summary`), eliminando `calculate_daily_conciliation`. Dia fechado retorna congelado; dia aberto recalcula do banco. Tolerância e status (`approved` / `divergence`) calculados no backend.
- **Etapa 2:** Hook único no frontend (`useDailyReconciliationSummary`), repassando os dados do backend sem enriquecimento matemático ou somas manuais no React.
- **Etapa 3:** Backend-first closing: nova RPC transacional e idempotente `fechar_dia(p_date)` executando: ingestão -> pareamento -> recálculo -> gravação do snapshot -> auditoria.
- **Etapa 4:** Padronização de status com constraints e migração de dados legados (`pending`, `matched`, `batch`, `intercompany`, `cancelled`, `ignored`).
- **Etapa 5:** Persistência direta nas tabelas físicas (`ofx_transactions`, `pos_transactions`, `daily_manual_bills`).
- **Etapa 6:** Fluxo unificado e simplificado de fechamento.

## 3. Skills Especializadas Aplicadas
- `database`: Migrações idempotentes, funções PL/pgSQL transacionais com advisory locks e constraints de integridade.
- `backend-patterns`: RPCs transacionais, tipagem estrita de retorno e revalidação unificada de cache.
- `frontend-design-pro`: Eliminação de AI Slop, adesão aos tokens de `DESIGN.md` (Zinc-950) e desacoplamento de lógica contábil dos componentes visuais.

## 4. Arquivos Afetados
### Arquivos Existentes Modificados:
- `supabase/migrations/` (novas migrações consolidadas)
- `src/hooks/useBackendConciliacao.ts` (depreciação em favor do novo hook)
- `src/components/conciliacao/ResumoDiaPanel.tsx` (remoção de cálculos locais de saldo, juros e contas)
- `src/components/importacoes/CentralImportWizard.tsx` (chamada direta de `fechar_dia`)
- `src/routes/loja.$lojaId.tsx` (escrita direta em tabelas físicas)
- `src/components/conciliacao/CashVaultCompositionModal.tsx` (leitura SSOT)
- `src/types/status.ts` (definição canônica de status)

### Arquivos Novos:
- `src/hooks/useDailyReconciliationSummary.ts` (o hook canônico do frontend)
- `supabase/migrations/20260917000001_redefine_daily_reconciliation_summary_ssot.sql`
- `supabase/migrations/20260917000002_create_fechar_dia_and_standardize_statuses.sql`

## 5. Plano de Rollback
- Caso qualquer etapa falhe, as migrações possuem bloco de drop/rollback específico e o frontend mantém fallback via Git revert atômico do commit correspondente.
- A visualização dos dados históricos não destrói registros físicos das tabelas base.

## 6. Risco Principal e Mitigação
- **Risco:** Incompatibilidade com snapshots antigos gravados no formato legado.
- **Mitigação:** A RPC unificada lê os metadados canônicos do snapshot se `is_closed = true`, garantindo compatibilidade reversa com dias já consolidados no passado.
