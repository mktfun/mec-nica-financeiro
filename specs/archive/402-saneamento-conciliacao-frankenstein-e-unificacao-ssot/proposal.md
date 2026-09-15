# Proposal: Saneamento da Tela de Conciliação e Unificação SSOT (402)

## Problema
A tela de conciliação financeira do sistema (`/conciliacao` e `/conciliacao/$lojaId`) tornou-se um **Frankenstein arquitetural** resultante do acúmulo de refatorações parciais ocorridas entre junho e setembro de 2026:

1. **Dualidade de Fontes de Dados (Tabelas Desconectadas)**:
   - As ingestões recentes (wizard) gravam transações bancárias em `ofx_transactions` e vendas de cartões em `pos_transactions`.
   - Porém, as views detalhadas da filial (`StoreExtratoBancarioView.tsx` e `StoreCartaoMaquininhaView.tsx`) e hooks legados (`useTransactionsPorDataELoja`, `useStoreExtratoBancario`, `useReconciliationViews` em `useConciliacao.ts`) continuam consultando a tabela legada `transactions` (descontinuada para novas ingestões).
   - Resultado: A aba de Cartão exibe *"Nenhuma transação de cartão encontrada"* mesmo havendo R$ 15.000+ em `pos_transactions`; o extrato bancário exibe transações antigas ou fica vazio; e ações de categorização de despesas alteram `ofx_transactions` enquanto a tela continua lendo `transactions`, gerando a impressão de falha total.

2. **Guerra de Três Motores de Cálculo Matemático**:
   - **Motor 1 (RPC Postgres)**: `get_daily_reconciliation_summary` calcula os 5 pilares, caixa atual, fluxo de caixa, disponível para contas e diferença final.
   - **Motor 2 (Hook JS)**: `useDailyReconciliationSummary` em `useBackendConciliacao.ts` intercepta a RPC e dispara queries paralelas via cliente Supabase JS em `store_cash_vault`, `pos_transactions` e `daily_snapshots`, recalculando valores no client-side.
   - **Motor 3 (Componente React)**: `ResumoDiaPanel.tsx` recalcula novamente no frontend todas as fórmulas (`caixaAtualCalculado`, `fluxoCaixaCalculado`, `valorDispContasCalculado`, `subtotalContasCalculado`, `diferencaFinalCalculada`) e sobrescreve o snapshot ao salvar.
   - Consequência: Divergências fantasmas, valores piscando na tela e bloqueios de segurança indevidos (*"⛔ Bloqueio de Segurança: O detalhamento por filiais está zerado enquanto há movimentação bancária consolidada"*).

3. **Arquivos Zumbis e Telas Duplicadas**:
   - 10+ arquivos mortos no projeto ocupando dezenas de kilobytes e confundindo manutenções:
     - `src/routes/conciliacao-detalhes.tsx` (rota fantasma sem links).
     - `src/components/dashboard/BankReconciliationDashboard.tsx` e `.new` (não importados).
     - `src/components/conciliacao/Modulo1SaldoPanel.tsx` (não importado).
     - 5 tabelas inteiras mortas: `RedeVsOfxTable.tsx`, `RedeVsExtratoTable.tsx`, `OsVsRedeTable.tsx`, `PixVsOfxTable.tsx`, `OfxSemMatchTable.tsx`.
     - 2 modais mortos: `BreakdownModal.tsx` (estado nunca acionado) e `FaturamentoAtualBreakdownModal.tsx` (nunca aberto).
     - `src/hooks/useConciliacao.ts` (787 linhas) com funções obsoletas consumindo tabelas legadas.

---

## Solução Proposta (Foco em Reuso, Saneamento e SSOT)

A proposta consiste em unificar o fluxo ponta a ponta respeitando a **Fonte Única de Verdade (SSOT)** já construída no Postgres e consolidada na RPC `get_daily_reconciliation_summary`:

1. **Unificação do Consumo no Frontend (SSOT)**:
   - `useDailyReconciliationSummary`: Purificar o hook para consumir diretamente o JSON retornado pela RPC `get_daily_reconciliation_summary`, eliminando as queries client-side redundantes e cálculos paralelos em JS.
   - `ResumoDiaPanel.tsx`: Exibir os valores canônicos fornecidos pelo `summary` da RPC, mantendo reatividade local exclusivamente quando o usuário estiver no modo explícito de edição manual (`isEditing`).
   - Eliminar a dependência de `storesState` de `lib/modulo1Calculations.ts` em `conciliacao.index.tsx`, passando a consumir diretamente `summary.stores`.

2. **Sincronização das Views por Filial (`/conciliacao/$lojaId`) com as Tabelas Modernas**:
   - **Aba 1 (`StoreCartaoMaquininhaView.tsx`)**: Consumir `pos_transactions` diretamente para a loja e data selecionada (ou via `usePosTripleReconciliation`), trazendo as transações reais da maquininha com status `entrou` / `nao_entrou`.
   - **Aba 2 (`StoreExtratoBancarioView.tsx`)**: Migrar a leitura para `ofx_transactions`, conectando perfeitamente a listagem com os modais de categorização de órfãs e pareamento manual.
   - **Aba 3 (`StoreOrdensServicoView.tsx`)**: Manter o vínculo com `patio_os`, garantindo revalidação imediata do summary após mutações.

3. **Remoção Segura de Código Zumbi e Telas Fantasmas**:
   - Deletar / desativar os arquivos mortos (`conciliacao-detalhes.tsx`, `BankReconciliationDashboard.tsx`, `Modulo1SaldoPanel.tsx`, `RedeVsOfxTable.tsx`, `RedeVsExtratoTable.tsx`, `OsVsRedeTable.tsx`, `PixVsOfxTable.tsx`, `OfxSemMatchTable.tsx`, `BreakdownModal.tsx`, `FaturamentoAtualBreakdownModal.tsx`).
   - Depreciar as funções zumbis de `useConciliacao.ts`.

---

## Investigação e Análise de Reuso

- **Tabelas / RPCs Existentes Encontradas:**
  - `get_daily_reconciliation_summary`: Já foi corrigida na migration `20260914000034` para lidar com `settlement_status`, `daily_manual_bills`, `store_cash_vault` e `patio_os`. Vamos **REAPROVEITÁ-LA INTEGRALMENTE** como SSOT.
  - `get_store_pos_triple_reconciliation`: RPC funcional para conciliação tripla de cartões.
  - `ofx_transactions`, `pos_transactions`, `patio_os`, `daily_manual_bills`, `store_cash_vault`: Estruturas ativas no Supabase.
- **Componentes / Hooks Existentes Encontrados:**
  - `ResumoDiaPanel.tsx`: Possui o design Dark UI Zinc-950 refinado, cards com bordas indicativas e modais de drilldown. Será **MODIFICADO** `[MODIFY]` para remover recálculos duplicados e modais mortos.
  - `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx`: Layout excelente de fechamento individual por filial. Serão **MODIFICADOS** `[MODIFY]` para limpar fallbacks `?? ??` e usar os campos limpos da RPC.
  - `StoreExtratoBancarioView.tsx`: Manter seu layout rico, mas **MODIFICAR** `[MODIFY]` a query de dados para `ofx_transactions`.
  - `StoreCartaoMaquininhaView.tsx`: Manter a UI de tabela e cards, mas **MODIFICAR** `[MODIFY]` para buscar de `pos_transactions`.
- **Justificativa para Artefatos Novos:**
  - **Nenhum arquivo novo de tela ou RPC será criado.** O trabalho é 100% de saneamento, remoção de lixo e correção cirúrgica de bindings.

---

## Contratos de Dados & SQL (Supabase)

- **Sem novas tabelas ou colunas necessárias**: As tabelas `ofx_transactions`, `pos_transactions`, `patio_os`, `daily_manual_bills`, `store_cash_vault`, `daily_snapshots` e `reconciliations` cobrem 100% dos requisitos.
- **RPC `get_daily_reconciliation_summary`**: Mantida e validada como SSOT contábil.
- **RLS**: Mantidas as políticas existentes.

---

## API & Componentes (Frontend)

### Componentes a Modificar `[MODIFY]`:
1. `src/hooks/useBackendConciliacao.ts`: Purificar `useDailyReconciliationSummary` para retornar o JSON da RPC sem sobrescrições destrutivas em JS.
2. `src/components/conciliacao/ResumoDiaPanel.tsx`: Eliminar cálculos concorrentes no cliente; usar dados do summary; remover modais zumbis.
3. `src/components/conciliacao/ConciliacaoLojasView.tsx`: Limpar a derivação de cards consumindo campos canônicos da RPC.
4. `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`: Conectar a `pos_transactions` em vez de `useReconciliationViews`.
5. `src/components/conciliacao/StoreExtratoBancarioView.tsx`: Conectar a `ofx_transactions` em vez de `transactions`.
6. `src/routes/conciliacao.index.tsx`: Remover `storesState` arcaico e modal `BreakdownModal`.
7. `src/routes/conciliacao.$lojaId.tsx`: Assegurar que os cards de cabeçalho reflitam os mesmos dados de `ConciliacaoLojasView`.

### Arquivos a Remover `[DELETE]`:
1. `src/routes/conciliacao-detalhes.tsx`
2. `src/components/dashboard/BankReconciliationDashboard.tsx`
3. `src/components/dashboard/BankReconciliationDashboard.tsx.new`
4. `src/components/conciliacao/Modulo1SaldoPanel.tsx`
5. `src/components/conciliacao/RedeVsOfxTable.tsx`
6. `src/components/conciliacao/RedeVsExtratoTable.tsx`
7. `src/components/conciliacao/OsVsRedeTable.tsx`
8. `src/components/conciliacao/PixVsOfxTable.tsx`
9. `src/components/conciliacao/OfxSemMatchTable.tsx`
10. `src/components/conciliacao/FaturamentoAtualBreakdownModal.tsx`
11. `src/components/conciliacao/BreakdownModal.tsx`

---

## Risco Principal e Mitigação

- **Risco Principal**: Quebrar algum fluxo de fechamento histórico ou impedir a persistência do snapshot ao salvar o dia.
- **Mitigação**:
  - Garantir que `saveSnapshot` continue recebendo o payload compatível com `daily_snapshots`.
  - Proteger a reatividade no modo de edição manual (`isEditing`), preservando o cálculo dinâmico enquanto o usuário digita os inputs de faturamento ou contas.
  - Executar testes de build (`bun run build` / `vite build`) para garantir que nenhum import quebrado permaneça após a exclusão dos arquivos zumbis.
