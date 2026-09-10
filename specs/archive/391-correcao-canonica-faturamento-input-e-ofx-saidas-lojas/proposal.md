# 📋 SDD Proposal: Spec 391 — Correção Canônica do Faturamento Input (Fim do 'Atual - Ant') e Re-ancoragem de Saídas/Entradas OFX por Loja

## 1. Problema Identificado

Durante a conciliação diária de **10/09/2026** (e reincidindo em padrões de dias anteriores), o usuário identificou duas falhas críticas e uma distorção financeira de **R$ 207.840,99**:

1. **Divergência Grotesca de R$ 207 Mil na Conciliação Diária:**
   - A conciliação do dia 10/09 apresentou uma divergência final anômala de **+R$ 207.840,99** (e no snapshot gravado de +R$ 272.771,72).
   - **Causa Raiz 1 (RPC `get_daily_reconciliation_summary`):** A RPC contém uma regra de regressão que recalcula `v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior`. Como `v_faturamento_anterior` puxou `64.930,73` do snapshot anterior, a RPC subtraiu esse valor novamente, distorcendo o faturamento e gerando exatamente os R$ 207 mil de erro.
   - **Causa Raiz 2 (`CentralImportWizard.tsx`):** O motor de importação forçou o cálculo `odometroHoje - fatAnt` (`281.317,68 - 64.930,73 = 216.386,95`), subtraindo o odômetro acumulado do mês contra o faturamento líquido de um único dia de ontem (64k), em vez de respeitar o **INPUT REAL** fornecido pelo operador no motor de importação.

2. **Fechamento de Saídas Zerado em Todas as Lojas ("Sem Movimentações"):**
   - Na visualização por filial (`ConciliacaoLojasView.tsx` / `StoreCardModulo1.tsx`), a linha de Saídas de todas as 10 lojas ficou com `Saídas OFX: R$ 0,00`, `Contas Conciliadas: R$ 0,00` e `Dif. a Justificar: R$ 0,00`.
   - **Causa Raiz:** No `CentralImportWizard.tsx` (linha 1308), as transações do OFX foram inseridas com `target_date: effectiveOfxDate` (herdando `tx.date` da tag `<DTPOSTED>` do banco, que era `2026-09-09` ou `2026-09-08`). Como o lote de conciliação é para `targetDate = '2026-09-10'`, 64 transações de débito/crédito caíram em datas passadas já fechadas. Na data de hoje (`2026-09-10`), `ofx_transactions` ficou com zero saídas.

3. **Entradas sem Nenhuma Diferença ("Sem Nenhuma Dif") e Contas Não Pareadas:**
   - As únicas 8 transações gravadas com data `2026-09-10` foram repasses de maquininha da REDE, classificados 100% como `ofx_maquininhas`, zerando `entradas_orfas`.
   - As 39 contas cadastradas pelo operador em `daily_manual_bills` para 10/09 (totalizando R$ 58.950,11) ficaram com `matched_ofx_id = null`, pois o motor de match não encontrou os débitos bancários no dia 10.

---

## 2. Solução Proposta (Foco em Reuso e Correção Canônica)

Refatoração cirúrgica, sem criar tabelas ou RPCs redundantes, corrigindo o fluxo ponta a ponta:

1. **[MODIFY] RPC `get_daily_reconciliation_summary` (`supabase/migrations/`):**
   - **Eliminação Definitiva da Subtração Arbitrária:** Remover a lógica `ELSIF v_snapshot.faturamento >= v_faturamento_anterior THEN v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;`.
   - O campo `v_snapshot.faturamento` gravado no fechamento é a fonte soberana da DRE do dia. Se existir `faturamento_oi_base` no metadata ou `faturamento > 0`, ele é consumido diretamente (`v_faturamento_oi_base := v_snapshot.faturamento`).
   - `v_faturamento_anterior`: carregar como `COALESCE((v_prev_snapshot.metadata->>'odometro_hoje')::numeric, v_prev_snapshot.faturamento, 0)` estritamente para visualização informativa do odômetro, sem jamais intervir no faturamento líquido.

2. **[MODIFY] `CentralImportWizard.tsx`:**
   - **Soberania do INPUT de Faturamento:** O valor informado pelo operador no Wizard (seja direto, via Mapa de Metas ou OS) passa a ser a fonte canônica de `fatOiBase` e `finalFaturamento`. O sistema não mais força a subtração arbitrária `odometroHoje - fatAnt` que causou a quebra.
   - **Ancoragem Temporal Canônica de OFX ao Batch (`target_date = targetDate`):** No processamento de transações bancárias do OFX (`results.ofxResults`), atribuir `target_date: targetDate`. A data contábil original do arquivo é preservada em `occurred_at`. Assim, todas as saídas e entradas enviadas pelo operador para o fechamento do dia são vinculadas à conciliação daquele dia.

3. **[MODIFY] `ResumoDiaPanel.tsx`:**
   - Manter o Faturamento Atual sempre alinhado ao input persistido do fechamento (`summary?.faturamento_oi_base ?? summary?.faturamento_periodo`), evitando que o card recalcule `odômetro - ant` com bases defasadas.

4. **[BACKFILL & SYNC] Saneamento Imediato do Dia 10/09/2026:**
   - Atualizar as transações do batch de hoje (`ae7764bc-62fe-4d50-b0c3-b880a7550ad0`) em `ofx_transactions` para `target_date = '2026-09-10'`.
   - Acionar `auto_match_daily_transactions({ p_date: '2026-09-10' })` para ligar as 39 contas manuais (R$ 58.950,11) aos débitos bancários reais das filiais.
   - Equalizar o snapshot de 10/09 eliminando a divergência anômala de R$ 207 mil.

---

## 3. Investigação e Análise de Reuso

- **Tabelas e RPCs Reutilizadas:**
  - `public.get_daily_reconciliation_summary(text, boolean)`: atualizada via `CREATE OR REPLACE FUNCTION` para extirpar a subtração duplicada de faturamento.
  - `public.auto_match_daily_transactions(text)`: reutilizada sem alterações para parear as contas com as saídas re-ancoradas.
  - `daily_snapshots`, `ofx_transactions`, `daily_manual_bills`: reutilizadas integralmente.
- **Componentes Reutilizados:**
  - `CentralImportWizard.tsx`: correção cirúrgica da atribuição de `target_date` e gravação de `fatOiBase`.
  - `ResumoDiaPanel.tsx`: proteção da exibição do faturamento do dia.
  - `ConciliacaoLojasView.tsx` / `StoreCardModulo1.tsx`: já possuem a estrutura visual pronta e passarão a exibir as saídas e contas conciliadas automaticamente assim que as transações estiverem no `target_date` correto.

---

## 4. Contratos de Dados & SQL (Supabase)

- **RPC `get_daily_reconciliation_summary`:**
  - Parâmetros: `(p_date text, p_force_dynamic boolean DEFAULT false) RETURNS jsonb`
  - Garantia de que `faturamento_oi_base` venha do snapshot persistido ou do somatório de vendas do dia, sem subtrair `faturamento_anterior`.
- **`ofx_transactions`:**
  - `target_date = p_date` (data da conciliação do lote).
  - `occurred_at` preserva o timestamp original do extrato.

---

## 5. Risco Principal e Mitigação

- **Risco:** Re-ancorar `target_date = targetDate` em transações de OFX que cobrem múltiplos dias passados misturar despesas de datas já fechadas.
- **Mitigação:** A re-ancoragem ao `targetDate` aplica-se exclusivamente às transações do lote corrente de fechamento submetidas pelo operador no Wizard. Transações históricas já consolidadas em lotes passados permanecem intocadas.
