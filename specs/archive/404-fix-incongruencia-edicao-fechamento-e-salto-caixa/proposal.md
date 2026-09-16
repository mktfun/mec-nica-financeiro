# Proposal: Correção da Incongruência no Modo Edição do Fechamento e Salto Indevido do Caixa (404)

## Problema
Ao clicar no botão `Editar Fechamento` na tela de conciliação diária (`ResumoDiaPanel.tsx`), os valores da tela sofrem mutações bruscas e inconsistentes antes de qualquer digitação pelo usuário:
1. **Salto Fantasma do Caixa Atual:** O Caixa Atual sobe de **R$ 260.574,46** para **R$ 309.641,77** (+R$ 49.067,31).
2. **Salto do Faturamento do Dia:** O Faturamento do Dia muda de **R$ 50.674,62** para **R$ 82.523,16** (+R$ 31.848,54).
3. **Distorção em Cascata:** O Fluxo de Caixa salta de **+R$ 57.334,44** para **+R$ 106.401,75**, o Valor Disponível para Contas varia de **-R$ 6.659,82** para **-R$ 19.758,59**, e a Diferença Final salta de **-R$ 38.869,06** para **-R$ 51.967,83**.
4. **Causa Raiz 1 (Dupla Contagem de Cartão e Dinheiro no Card 1):** O hook de totais derivados (`derivedBankTotals`) e a RPC atribuem `cartoes_a_compensar = R$ 50.335,65` (vendas brutas/líquidas totais da Rede no dia), ignorando que R$ 46.307,31 já entraram na conta corrente via extrato OFX (estão com status `entrou`). Apenas R$ 4.028,34 estão com status `nao_entrou`. Além disso, o dinheiro no cofre soma registros já depositados (`6.140,00`) em vez de apenas o pendente em trânsito (`3.380,00`).
5. **Causa Raiz 2 (Bifurcação Ternária `isEditing` no Frontend):** O componente `ResumoDiaPanel.tsx` utiliza ternários onde no modo normal (`!isEditing`) consome campos congelados/antigos retornados pela RPC (`summary?.caixa_atual`, `summary?.faturamento_periodo`), mas no modo edição (`isEditing`) recalcula fórmulas dinâmicas que usam o Card 1 inflado.
6. **Causa Raiz 3 (Subtração Corrompida de Faturamento na RPC):** A RPC `get_daily_reconciliation_summary` subtrai o `faturamento_anterior` (faturamento diário de 11/09: R$ 36.968,54) do `snapshot.faturamento` (faturamento total: R$ 87.643,16), gerando R$ 50.674,62 no modo normal, enquanto no modo edição o odômetro calculava `400.469,38 - 317.946,22 = 82.523,16`.

---

## Solução Proposta (Foco em Reuso e Correção)
Reaproveitar integralmente as estruturas existentes e eliminar 100% das bifurcações e duplicações contábeis:

1. **Correção de `derivedBankTotals` (`ResumoDiaPanel.tsx` [MODIFY]):**
   - Garantir que o sub-chip e totalizador `A Compensar` some estritamente as transações de maquininha com status pendente (`settlement_status IN ('nao_entrou', 'a_compensar')`), correspondendo a R$ 4.028,34 (e nunca ao faturamento de cartão de R$ 50.335,65 já creditado no banco).
   - Garantir que `Dinheiro no Cofre` some estritamente o dinheiro físico pendente em trânsito (`status IN ('em_transito', 'pending')`), correspondendo a R$ 3.380,00 (e nunca somando entradas já depositadas).
   - O Card 1 (`Saldo Bancos + Dinheiro`) passa a exibir o valor fiduciário real: Extrato Positivo R$ 161.348,56 + Dinheiro R$ 3.380,00 + A Compensar R$ 4.028,34 = **R$ 168.756,90** (Líquido: R$ 135.799,17).

2. **Unificação Matemática Estrita SSOT (`ResumoDiaPanel.tsx` [MODIFY]):**
   - Eliminar a bifurcação ternária `isEditing ? dinamico : summary?.campo`.
   - `caixaAtualCalculado` deve ser calculado pela MESMA fórmula canônica fiduciária tanto no modo normal quanto no modo edição:
     $$\text{Caixa Atual} = \text{Saldo Bancos Positivo} + \text{Dinheiro Cofre} + \text{A Compensar} - \text{Cheque Esp.} + \text{Dinheiro MP} + \text{A Receber} + \text{Pátio OS}$$
     Com os valores reais de 14/09:
     $$161.348,56 + 3.380,00 + 4.028,34 - 32.957,73 + 42.460,00 + 6.929,67 + 75.385,62 = \mathbf{R\$\ 260.574,46}$$
     Ao entrar no modo edição, o Caixa Atual **permanece rigorosamente em R$ 260.574,46** (zero saltos!).
   - `faturamentoTotalComAjustes` deve usar o Faturamento do Dia apurado pelo odômetro ou `metadata.faturamento_oi_base` (R$ 82.523,16) + Ajustes (R$ 1.000,00) = **R$ 83.523,16** tanto no modo normal quanto no modo edição.

3. **Atualização da RPC `get_daily_reconciliation_summary` (`supabase/migrations/` [NEW]):**
   - Saneamento na RPC para garantir que:
     - `v_cartoes_a_compensar` filtre rigorosamente `settlement_status IN ('nao_entrou', 'a_compensar')`.
     - `v_dinheiro_lojas` filtre rigorosamente `status IN ('em_transito', 'pending')`.
     - `v_faturamento_oi_base` respeite o odômetro fechado sem subtrair faturamentos diários anteriores.
     - `stores_detail` popule `nao_entrou_valor` e `status_compensacao` para cada filial, garantindo paridade com a visualização do Raio-X.

4. **Sincronização no Hook `useBackendConciliacao.ts` [MODIFY]:**
   - Garantir mapeamento fiel de `nao_entrou_valor`, `cartoes_a_compensar` e `dinheiro_lojas`.

---

## Investigação e Análise de Reuso (Relatório de Engenharia)
- **Tabelas e Estruturas Existentes Reutilizadas:**
  - `daily_snapshots`: Linha do dia 14/09 já contém `caixa_atual = 260574.46` e `metadata.odometro_hoje = 400469.38`.
  - `pos_transactions`: 28 transações registradas, sendo R$ 46.307,31 `entrou` e R$ 4.028,34 `nao_entrou`.
  - `store_cash_vault`: Registros identificados com distinção clara entre `depositado` e `em_transito`.
  - `reconciliations`: Saldos bancários e pátio por filial intactos.
- **Componentes / Hooks Existentes Reutilizados:**
  - `ResumoDiaPanel.tsx`: Todos os cards e inputs de edição já existem. A alteração é cirúrgica na lógica de derivação e sincronização de estados.
  - `useBackendConciliacao.ts`: Hook existente mantido e ajustado.

---

## Contratos de Dados & SQL (Supabase)
Migration `20260915000050_fix_rpc_summary_card_settlement_and_vault_status.sql`:
- Ajusta a RPC `get_daily_reconciliation_summary`:
  ```sql
  SELECT COALESCE(SUM(CASE WHEN settlement_status IN ('nao_entrou', 'a_compensar') THEN net_amount ELSE 0 END), 0)
  INTO v_cartoes_a_compensar
  FROM pos_transactions
  WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_dinheiro_lojas
  FROM store_cash_vault
  WHERE entry_date = v_target_date::date
    AND status IN ('em_transito', 'pending');
  ```

---

## Risco Principal e Mitigação
- **Risco:** Alterar a fórmula de Caixa Atual e impactar datas anteriores já consolidadas.
- **Mitigação:** Como `caixa_atual` em snapshots fechados (`is_closed = true`) já é R$ 260.574,46, a equalização da fórmula garante que o recálculo dinâmico coincida exatamente com o valor histórico persistido.
