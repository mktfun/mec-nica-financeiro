# Proposal — Spec 451: Unificação do Cálculo de Diferença Final e Subtotal Contas

## 1. Sumário Executivo & Diagnóstico Forense

### O Problema Relatado
No dashboard diário (`ResumoDiaPanel.tsx` / `useBackendConciliacao.ts`):
1. **Modo Visualização (`!isEditing`)**:
   - Os cards da tela exibem:
     - `Valor Disp. Contas`: **R$ 48.805,95**
     - `Subtotal Contas`: **R$ 45.145,92** (Base Planilha R$ 41.771,21 + Juros Rede R$ 3.374,71)
   - Mas o card **DIFERENÇA FINAL** exibe: **R$ 7.034,74** (Status: Divergente)
   - Contradição matemática: a fórmula no card é `|Valor Disp. Contas| - Subtotal Contas`, ou seja, `48.805,95 - 45.145,92 = 3.660,03`. A tela exibe `7.034,74`.
2. **Modo Edição (`isEditing = true`)**:
   - O card da Diferença Final calcula pela tela: `48.805,95 - 45.145,92 = R$ 3.660,03` (Status: Aprovado).
3. **Ao Clicar em "Salvar Alterações"**:
   - O painel salva `diferenca_final: 3660.03` no `daily_snapshots`.
   - `isEditing` volta para `false`.
   - O hook recarrega os dados e a tela **reverte instantaneamente para R$ 7.034,74**.

---

## 2. Causa-Raiz Técnica Detalhada

A investigação no banco e no código revelou que o erro **NÃO** está na RPC do Postgres nem no banco de dados:

1. **No Banco (`daily_snapshots` para `2026-09-29`)**:
   - `contas_a_pagar`: `41.771,21`
   - `juros_rede`: `3.374,71`
   - `metadata.subtotal_contas`: `45.145,92`
   - `metadata.valor_disp_contas`: `48.805,95`
   - `metadata.diferenca_final`: `3.660,03`
   - `is_closed`: `true`

2. **Na RPC `get_daily_reconciliation_summary`**:
   - Retorna fielmente `diferenca_final = 3.660,03` e `subtotal_contas = 45.145,92`.

3. **No Hook `src/hooks/useBackendConciliacao.ts` (A Causa-Raiz)**:
   - Linhas 301–314: consulta dinamicamente a tabela `daily_manual_bills`, somando boletos do dia (`totalManualBills = 38.396,50`).
   - Linha 508: ignora o snapshot congelado do dia fechado e recalcula:
     `finalSubtotalContas = totalManualBills + juros_rede = 38.396,50 + 3.374,71 = 41.771,21`.
   - Linhas 510–514:
     ```typescript
     const finalDiferenca = Number(
       (snapMeta.is_marco_zero && snapMeta.diferenca_final !== undefined)
         ? snapMeta.diferenca_final
         : (finalValorDisp - finalSubtotalContas).toFixed(2)
     );
     ```
     O hook **SÓ** respeita o snapshot se `snapMeta.is_marco_zero` for verdadeiro! Para todos os outros dias fechados, ele descarta `snapMeta.diferenca_final` (3.660,03) e `raw.diferenca_final` (3.660,03) e força:
     `finalDiferenca = 48.805,95 - 41.771,21 = 7.034,74`!
   - Linhas 556–557: sobrescreve `subtotal_contas: 41.771,21` e `diferenca_final: 7.034,74` no objeto `summary` retornado.

4. **No Componente `ResumoDiaPanel.tsx` (Efeito Split-Brain)**:
   - Em Modo Visualização (`!isEditing`):
     - Linha 367 lê `canonicalDiferencaFinal = summary.diferenca_final` (7.034,74 adulterado pelo hook).
     - Mas os cards de Contas calculam a visualização a partir de `currentSnapshot.contas_a_pagar` (41.771,21) + `juros_rede` (3.374,71) = 45.145,92.
     - Isso cria a incoerência visual: a tela mostra Contas = 45.145,92, Valor Disp = 48.805,95, mas Diferença = 7.034,74.
   - Em Modo Edição (`isEditing = true`):
     - Linha 367 calcula `diferencaFinalCalculada = valorDispContasCalculado - subtotalContasCalculado = 3.660,03`.
   - Ao Salvar:
     - Salva 3.660,03 no snapshot.
     - `isEditing` vira `false`.
     - O hook refaz a query, re-adultera para 7.034,74 e a tela reverte.

---

## 3. Solução Proposta

### A. Blindagem do Hook `useBackendConciliacao.ts` (SSOT de Snapshot)
1. Para dias fechados (`snapshotData?.is_closed && !forceDynamic`):
   - `finalContasBase`: ler de `snapshotData.contas_a_pagar ?? raw.contas_base ?? totalManualBills`.
   - `finalSubtotalContas`: ler de `snapMeta.subtotal_contas ?? raw.subtotal_contas ?? (finalContasBase + juros_rede)`.
   - `finalValorDisp`: ler de `snapMeta.valor_disp_contas ?? raw.valor_disp_contas ?? (finalFatPeriodo - finalFluxoCaixa)`.
   - `finalDiferenca`: ler de `snapMeta.diferenca_final ?? raw.diferenca_final ?? (finalValorDisp - finalSubtotalContas)`.
2. Para dias abertos (`!snapshotData?.is_closed || forceDynamic`):
   - Recalcular dinamicamente de forma consistente e com arredondamento preciso em 2 casas decimais.

### B. Unificação Reativa em `ResumoDiaPanel.tsx`
1. Garantir que `canonicalDiferencaFinal` mantenha consistência com a matemática dos cards apresentados.
2. Sincronizar perfeitamente as variáveis de contas (`contasManualValor`, `subtotalContasCalculado`, `valorDispContasCalculado`).
3. Ao salvar, persistir os valores canônicos e garantir invalidação e recarregamento sem divergências.

---

## 4. Blast Radius (Arquivos Afetados)
1. `src/hooks/useBackendConciliacao.ts`:
   - Linhas 500–560 (lógica de consolidação de `finalSubtotalContas`, `finalValorDisp`, `finalDiferenca` respeitando dias fechados).
2. `src/components/conciliacao/ResumoDiaPanel.tsx`:
   - Linhas 180–195 (sanitização de base inicial de contas).
   - Linhas 266–273 (apuração de `contasManualValor`).
   - Linhas 362–373 (apuração de `subtotalContasCalculado` e `canonicalDiferencaFinal`).
3. `tests/e2e/tier2_boundary/spec451_dashboard_reconciliation_math.test.mjs`:
   - Novo teste E2E garantindo que modo visualização e modo edição retornem exatamente a mesma diferença contábil e que salvar não reverta o cálculo.

---

## 5. Comando de Verificação de Terminal
```bash
npm run build
node tests/e2e/tier2_boundary/spec451_dashboard_reconciliation_math.test.mjs
```
