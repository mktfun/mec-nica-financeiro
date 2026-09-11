# SDD Proposal — Spec 395: Correção de Cartões (Rede Não Entrou), Edição/Salvamento de Dinheiro e Encadeamento de Odômetro Anterior

## 1. Problema Identificado & Evidências Forenses
A análise técnica forense baseada nas reclamações do usuário e nos prints oficiais (`media_1789069718248.png` e `media_1789069718249.png`) revelou 3 anomalias críticas no fluxo de conciliação e importação:

### 1.1 Bug de Cartões "Rede NÃO ENTROU" (Supernotificação e Falha de Match)
- **Causa Raiz 1 (Import Wizard):** Em `CentralImportWizard.tsx`, a rotina determinística de cartões por bandeira identifica os itens `entrou`, mas tenta persistir no Supabase usando:
  ```ts
  const matchedPosIds = entrouItems.map(i => i.saleId || (i as any).sale?.id || (i as any).id).filter(Boolean);
  await supabase.from('pos_transactions').update({ settlement_status: 'entrou', settled_date: targetDate }).in('id', matchedPosIds);
  ```
  O campo `i.saleId` continha o NSU da adquirente (ex: `"30700194"`), e não o UUID da coluna `id` de `pos_transactions`. O Supabase rejeitava ou atualizava 0 linhas. Com isso, **100% das transações POS de 10/09 permaneceram como `nao_entrou`**, somando R$ 42.362,89 como "a compensar", quando na verdade apenas Piraporinha (R$ 4.642,10) deveria estar pendente.
- **Causa Raiz 2 (Modal Raio-X):** Em `SaldoBancosDetailModal.tsx`, a linha 56 busca `s.nao_entrou_valor`. As propriedades retornadas pelas RPCs e snapshots são `s.maquininha`, `s.cartao_nao_entrou` ou `s.rede_liquido`. Como `s.nao_entrou_valor` vinha `undefined`, a coluna exibia `-` (traço) para todas as 10 lojas, e o total do modal ignorava os cartões a compensar.

### 1.2 Bug do Dinheiro ("O sistema não deixa salvar")
- **Causa Raiz 1 (Sobrescrita na Finalização):** Ao finalizar o fechamento no wizard (`CentralImportWizard.tsx`), a função chama a RPC `close_daily_snapshot`. Essa RPC internamente recalcula os totais via `get_daily_reconciliation_summary` e sobrescreve `dinheiro_mp` com `(v_summary->>'dinheiro_mp')::numeric`, descartando por completo o input do usuário enviado em `p_metadata->>'manual_dinheiro_mp'`.
- **Causa Raiz 2 (Trava de Interface e useEffect):** Os campos manuais no Step 7 possuem trava `disabled={isManualLocked}` (que inicia ativa por default), e um `useEffect` recarregava os valores padrão do banco sobrescrevendo o input se `isDinheiroMpUserEdited` sofresse reset entre abas.
- **Causa Raiz 3 (Bloqueio no ResumoDiaPanel):** O botão de "Salvar Fechamento" fica desabilitado se `isStoreBreakdownCorrupted` for `true`, o que ocorre sempre que `storesData` estiver temporariamente vazio ou zerado enquanto houver movimentação macro.

### 1.3 Bug do Faturamento / Odômetro Anterior ("Puxar o CÁLCULO ao invés do Faturamento Atual Acumulado")
- **Causa Raiz Central:** No encadeamento diário:
  - No dia 09/09/2026, o **Odômetro Acumulado (Faturamento Atual)** fechou em **R$ 235.023,20** (`metadata.odometro_hoje`). O **Faturamento Líquido Diário (Cálculo)** daquele dia foi **R$ 64.930,73** (`snapshot.faturamento`).
  - Para a conciliação de 10/09/2026, o campo `(-) ANT.` (Odômetro Anterior) DEVE ser o Odômetro Acumulado de ontem (**R$ 235.023,20**).
  - Em vez disso, a RPC `get_daily_reconciliation_summary` e o frontend puxaram `v_prev_snapshot.faturamento` (**R$ 64.930,73**, que é o CÁLCULO).
  - Ao subtrair 64.930,73 de 64.930,73 com imprecisão de ponto flutuante IEEE-754 em JavaScript (`2^-41`), o sistema gerou a anomalia visual **`4.5474735088646...`** exibida no card do print `media_1789069718248.png`.

---

## 2. Solução Proposta

1. **Reconciliação e Persistência Determinística de Cartões:**
   - Corrigir `CentralImportWizard.tsx` para atualizar `pos_transactions` usando `dedup_hash` ou chave unívoca `store_id + occurred_at + net_amount` e acionar diretamente a rotina determinística de conciliação de cartões no backend/Postgres.
   - Atualizar `SaldoBancosDetailModal.tsx` para consumir defensivamente:
     `const maquininhaNaoEntrou = Number(s.nao_entrou_valor ?? s.cartao_nao_entrou ?? (s.status_compensacao === 'nao_entrou' ? s.maquininha : 0) ?? 0);`
     garantindo que Piraporinha exiba R$ 4.642,10 e o total do modal bata R$ 154.794,67.

2. **Desbloqueio e Persistência Resiliente de Dinheiro:**
   - Atualizar `close_daily_snapshot` e `CentralImportWizard.tsx` para que `manual_dinheiro_mp` tenha precedência absoluta e soberana sobre os resumos históricos.
   - Ajustar a guarda de `isStoreBreakdownCorrupted` para não travar a interface quando o usuário estiver salvando inputs manuais globais no `ResumoDiaPanel.tsx`.
   - Garantir que a trava de edição manual no Step 7 seja intuitiva e não descarte edições legítimas do operador.

3. **Correção do Encadeamento de Odômetro (Anterior vs Acumulado):**
   - Atualizar `get_daily_reconciliation_summary` e os hooks `useDailySnapshot` / `ResumoDiaPanel` para que `faturamento_anterior` busque compulsoriamente o **Odômetro Acumulado Anterior**:
     `COALESCE((v_prev_snapshot.metadata->>'odometro_hoje')::numeric, (v_prev_snapshot.metadata->>'faturamento_odometro')::numeric, v_prev_snapshot.faturamento, 0)`
   - No dia 10/09/2026:
     - Odômetro Hoje: **R$ 281.317,68**
     - (-) Odômetro Anterior: **R$ 235.023,20**
     - (=) Faturamento Líquido do Dia: **R$ 46.294,48** (`281.317,68 - 235.023,20`).
   - Aplicar arredondamento determinístico `Math.round(val * 100) / 100` e sanitização `val < 0.01 ? 0 : val` para exterminar resíduos de ponto flutuante.

---

## 3. Critérios de Aceitação
- [ ] O card "FATURAMENTO DO DIA" exibe:
  - Odômetro Hoje: R$ 281.317,68
  - (-) Ant.: R$ 235.023,20 (nunca mais o cálculo de 64.930,73)
  - (=) Faturamento Dia: R$ 46.294,48 (sem glitch de notação científica).
- [ ] O modal "Raio-X de Saldos Bancários & Dinheiro por Filial" exibe:
  - Piraporinha: Maquininhas (Rede) = R$ 4.642,10
  - Mauá: Dinheiro no Cofre = R$ 380,00
  - Jabaquara: Dinheiro no Cofre = R$ 500,00
  - Total Ativos da Holding = R$ 154.794,67.
- [ ] A edição de Dinheiro MP no painel e na tela de importação salva imediatamente sem travar o botão e sem reverter o valor.
- [ ] `npm run build` executa sem erros de lint ou tipagem TypeScript.
