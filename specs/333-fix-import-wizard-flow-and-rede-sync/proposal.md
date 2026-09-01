# Proposal: Refatoração do Fluxo do Wizard e Sincronização da Rede (333)

## Problema
O usuário relatou duas inconsistências graves no fluxo de importação e na conciliação da maquininha:
1. **Inversão do Fluxo do Wizard:** Ao clicar para conciliar na etapa 3, o sistema grava imediatamente no banco (Step 8), exibe a tela de conclusão e só depois permite navegar para as etapas de conferência de saídas, maquininha e PIX (Steps 4, 5, 6, 7). Como o salvamento já ocorreu, as alterações manuais e vinculações feitas nessas telas não ficam salvas.
2. **Vendas da Rede Desincronizadas:** As vendas do arquivo da Rede passadas no fim de semana foram gravadas com `target_date = 2026-08-31` (ou não consolidadas em `pos_transactions` com a data contábil de 01/09/2026), enquanto o extrato bancário creditou o lote em 01/09/2026. A tela de conciliação diária de 01/09 filtra estritamente `target_date = 2026-09-01`, exibindo 0 transações de cartão e gerando falso alarme de divergência.

## Solução Proposta (Foco em Reuso e Correção)
Vamos modificar `CentralImportWizard.tsx`, `useTransactions.ts` e `useConciliacao.ts` [MODIFY]:
- **Linearizar o Fluxo do Wizard:**
  - `Step 1 (Upload)` $\rightarrow$ `Step 2 (Mapeamento)` $\rightarrow$ `Step 3 (Entradas Manuais & Odômetro)` $\rightarrow$ `Step 4 (Saídas x Contas)` $\rightarrow$ `Step 5 (Rede x OFX)` $\rightarrow$ `Step 6 (PIX x OFX)` $\rightarrow$ `Step 7 (Auditoria Final dos 5 Pilares)` $\rightarrow$ **`Step 8 (Gravação Atômica no Banco & Tela de Sucesso)`**.
  - As ações manuais de matching executadas em Step 4, 5, 6 e 7 são acumuladas no payload e persistidas de forma atômica no Step 8.
- **Sincronização de Data da Rede:**
  - Garantir que todas as transações da Rede inseridas em `pos_transactions` recebam o `target_date` canônico selecionado no Wizard (`targetDate = 2026-09-01`), vinculando as vendas de fim de semana ao lote creditado na segunda-feira.
  - Atualizar os registros de `2026-08-31` em `pos_transactions` para `2026-09-01` quando o lote for da competência do dia.

## Investigação e Análise de Reuso
- **Componentes Existentes:** `CentralImportWizard.tsx`, `Step1SaidasVsContasPagar.tsx`, `Step2RedeVsOfx.tsx`, `Step3PixVsOfx.tsx`, `Step4FinalAuditAndClose.tsx`. Todos os componentes já existem; apenas a ordem de transição de `step` e o momento do dispatch de gravação serão corrigidos.
- **Hooks Existentes:** `useTransactions.ts` (`useBulkInsertTransactions`, `useBulkInsertConciliationMatches`), `useConciliacao.ts`.

## Contratos de Dados
- Mutações nos payloads de `useBulkInsertTransactions` e `useBulkInsertConciliationMatches`.

## Risco Principal e Mitigação
- **Risco:** Perda de dados durante a navegação entre as etapas de auditoria intermediárias.
- **Mitigação:** Manter o estado acumulado em `results` e `manualMatches` no componente pai (`CentralImportWizard.tsx`) com persistência única e atômica na confirmação do Step 7/8.
