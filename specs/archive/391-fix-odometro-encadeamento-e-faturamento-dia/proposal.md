# 📋 Proposal — Spec 391: Correção da Divergência Edit vs Normal no Faturamento e Encadeamento do Odômetro

## 1. Problema e Diagnóstico Forense das Duas Telas
O usuário identificou que:
- **No Modo de Edição (Screenshot 1)**: O sistema calcula os valores corretos:
  - Faturamento Hoje (Odômetro 400.469,38 - Ant 317.946,22) = **R$ 82.523,16**
  - Valor Disp. Contas = **R$ 26.561,98**
  - Contas (Manual) = **R$ 28.141,54** + Juros Rede = **R$ 32.209,24**
  - Diferença Final = **- R$ 5.647,26**
- **No Modo Normal / Ao Salvar (Screenshot 2)**: O sistema subitamente muda para:
  - Faturamento do Dia = **R$ 45.554,62** (queda arbitrária de R$ 36.968,54!)
  - Valor Disp. Contas = **- R$ 10.406,56**
  - Diferença Final = **- R$ 42.615,80** (estouro de mais de R$ 36.968,54!)

### Causa Raiz Identificada:
1. **Diferença de Origem de Dados entre Edit Mode e Normal Mode em `ResumoDiaPanel.tsx`**:
   - No modo de edição (`isEditing: true`), a tela calcula reativamente via inputs locais:
     `faturamentoLiquidoDia = faturamentoDiaInput = 82.523,16`
     `valorDispContasCalculado = faturamentoTotalComAjustes - fluxoCaixaCalculado = 26.561,98`
     `diferencaFinalCalculada = valorDispContasCalculado - subtotalContasCalculado = - 5.647,26`
   - No modo normal (`isEditing: false`), os componentes delegam cegamente para os campos do objeto `summary`:
     ```typescript
     faturamentoTotalComAjustes = summary?.faturamento_periodo ?? ...
     valorDispContasCalculado = summary?.valor_disp_contas ?? ...
     diferencaFinalCalculada = summary?.diferenca_final ?? ...
     ```
2. **Origem do valor R$ 45.554,62 no RPC `get_daily_reconciliation_summary`**:
   No Postgres, a RPC executa a subtração:
   ```sql
   v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
   ```
   Onde:
   - `v_snapshot.faturamento` é o faturamento do dia 14/09 = **R$ 82.523,16** (salvo pelo usuário).
   - `v_faturamento_anterior` retornado pela query anterior é o faturamento do dia 11/09 = **R$ 36.968,54**.
   - Subtração realizada pela RPC:
     $$82.523,16 - 36.968,54 = \mathbf{45.554,62}$$!
   A RPC está subtraindo o faturamento do dia anterior de um valor que JÁ É o faturamento do dia atual!
3. **Ausência de Reatividade Direta do Snapshot em `useDailyReconciliationSummary`**:
   O hook [`useBackendConciliacao.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBackendConciliacao.ts) já enriquece defensivamente o `store_cash_vault` e o `pos_transactions`, mas não protegia o `faturamento_oi_base`, `valor_disp_contas` e `diferenca_final` contra o resultado corrompido do RPC.

---

## 2. Solução Proposta
1. **Unificação Matemática em `ResumoDiaPanel.tsx`**:
   - Eliminar a bifurcação entre modo de edição e modo normal para as fórmulas contábeis.
   - `valorDispContasCalculado` deve ser SEMPRE `faturamentoTotalComAjustes - fluxoCaixaCalculado`.
   - `diferencaFinalCalculada` deve ser SEMPRE `valorDispContasCalculado - subtotalContasCalculado`.
   - `faturamentoLiquidoDia` no modo normal deve priorizar os metadados do snapshot salvo (`currentSnapshot.metadata.faturamento_oi_base` / `currentSnapshot.faturamento`) antes do fallback do `summary`.
2. **Blindagem no Hook `useDailyReconciliationSummary`**:
   - Enriquecer `rawSummary` com os dados persistidos de `daily_snapshots` quando disponíveis (garantindo que `faturamento_oi_base = 82.523,16`, `odometro_hoje = 400.469,38`, `faturamento_anterior = 317.946,22`).
   - Recalcular `valor_disp_contas` e `diferenca_final` no hook garantindo consistência centesimal em qualquer tela que consuma `summary`.
3. **Consistência no Wizard (`CentralImportWizard.tsx`)**:
   - Alinhar o cálculo do odômetro e delta removendo o falso `previousMonthClosing = previousSnapshot.faturamento`.

---

## 3. Skills Especializadas Aplicadas
- `ui-components`: Eliminação de inconsistência de estado entre modos de edição e visualização.
- `backend-patterns`: Validação reativa e determinística de fluxos contábeis.
- `database`: Saneamento das queries de snapshot e odômetro anterior.

---

## 4. Arquivos Afetados
- [MODIFICADO] `src/components/conciliacao/ResumoDiaPanel.tsx`
- [MODIFICADO] `src/hooks/useBackendConciliacao.ts`
- [MODIFICADO] `src/components/importacoes/CentralImportWizard.tsx`

---

## 5. Plano de Rollback
Reversão das alterações nos 3 arquivos TypeScript via `git checkout`.

---

## 6. Critérios de Aceitação Verificáveis
1. **No Modo de Edição**: Faturamento do Dia exibe R$ 82.523,16 e Diferença Final exibe -R$ 5.647,26.
2. **No Modo Normal (após salvar / recarregar)**: Faturamento do Dia exibe **R$ 82.523,16** e Diferença Final exibe **-R$ 5.647,26** (ZERO discrepância entre Edit e Normal!).
3. `npm run build` passa com 0 erros de compilação.
