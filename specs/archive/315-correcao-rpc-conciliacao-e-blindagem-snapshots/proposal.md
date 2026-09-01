# Proposal: Correção Crítica da RPC de Conciliação, Cálculo de Faturamento e Blindagem de Snapshots (315)

## 1. Problema

1. **'Fechamento por Filial' Zerado em Dias Fechados:**
   - Na RPC canônica get_daily_reconciliation_summary, o **Ramal 1** (is_closed = true) omitia a chave 'stores' no payload JSON retornado e não computava _stores_detail.
   - Consequentemente, a RPC calculate_daily_conciliation (que consome _summary->'stores') e o hook useDailyReconciliationSummary retornavam stores: [] para qualquer dia fechado.
   - Na interface (src/routes/conciliacao.index.tsx), todas as 10 lojas apareciam zeradas (R$ 0,00) em Saldo, Maquininha, PIX, Previsto e Diferença.

2. **Faturamento Acumulado Vazando (Diferença de R$ 1.010.869,29 em 01/09/2026):**
   - Na lógica de odômetro da RPC, a condição IF v_faturamento_anterior > 0 AND v_faturamento_oi_base > v_faturamento_anterior avaliava como FALSE quando o odômetro de hoje era igual ou menor que o anterior (1.030.303,99 == 1.030.303,99).
   - O fluxo caía no ELSE e atribuía _faturamento_periodo = 1.030.303,99 (o acumulado inteiro desde a fundação da empresa) como se fosse a receita do dia.
   - Isso gerava um alor_disp_contas de R$ 1.052.711,94 e uma falsa divergência de R$ 1.010.869,29 contra contas de R$ 41.842,65.

3. **Loop Destrutivo do Botão 'Salvar Fechamento' (handleSave):**
   - Quando o frontend carregava storesList = [], storesState era preenchido com saldo_banco_itau = 0 e 
a_loja_os = 0.
   - Ao salvar o fechamento, o frontend fazia upsert na tabela 
econciliations gravando ank_total: 0 e apagando os saldos reais das 10 filiais no banco, corrompendo o histórico.

4. **Ausência de Guarda Anti-Corrupção e Imutabilidade Histórica:**
   - O sistema permitia homologar fechamentos mesmo com detalhamento por filial zerado e divergências astronômicas sem trava de segurança.

---

## 2. Solução Proposta (Foco em Reuso e Correção)

1. **Reaproveitamento e Correção da RPC get_daily_reconciliation_summary [MODIFY]:**
   - **Correção Ramal 1 (is_closed = true):** Computar e incluir obrigatoriamente 'stores', v_stores_detail no JSON de retorno com os dados históricos congelados das 10 lojas (
econciliations, store_cash_vault e pos_transactions).
   - **Correção da Lógica de Odômetro:**
     - Se _faturamento_oi_base >= v_faturamento_anterior e _faturamento_anterior > 0, _faturamento_periodo = v_faturamento_oi_base - v_faturamento_anterior (resultando em R$ 0,00 se forem iguais).
     - Se for lançamento avulso ou odômetro diário (menor que o acumulado histórico), utiliza o valor direto.

2. **Reaproveitamento e Atualização da RPC calculate_daily_conciliation [MODIFY]:**
   - Manter a delegação 100% para get_daily_reconciliation_summary(p_date, false)->'stores', que agora sempre retornará as 10 lojas com todas as métricas (saldo_banco, maquininha, pix, 
a_loja_os, previsto_ofx, diferenca).

3. **Guarda de Validação no Frontend (ResumoDiaPanel.tsx) [MODIFY]:**
   - Implementar a trava isStoreBreakdownCorrupted: Se houver movimentação macro consolidada (> 0) mas o somatório das filiais estiver zerado ou vazio, o botão 'Salvar Fechamento' fica desabilitado e a submissão é bloqueada com aviso de erro.
   - Proteção de sobrescrita: Não enviar ank_total: 0 para 
econciliations caso haja valor preexistente no banco.

4. **Guarda de Integridade no Backend (close_daily_snapshot) [MODIFY]:**
   - Adicionar RAISE EXCEPTION caso o resumo retornado possua stores vazio enquanto houver saldo bancário ou faturamento consolidado.

5. **Restauração e Hotfix dos Snapshots de 01/09/2026 e 31/08/2026 [MIGRATION]:**
   - Recalcular e atualizar o snapshot de 01/09/2026 com o faturamento diário correto (R$ 0,00 se odômetro inalterado) e a diferença real.

---

## 3. Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - get_daily_reconciliation_summary: Função central de consolidação dos 5 Pilares em public.
  - calculate_daily_conciliation: Função de agregação de lojas em public.
  - close_daily_snapshot: Função de selamento em public.
  - daily_snapshots: Tabela de fechamento diário imutável.
  - 
econciliations: Tabela de saldos bancários e pátio por loja.
- **Componentes / Hooks Existentes Encontrados:**
  - src/routes/conciliacao.index.tsx: Painel de visualização das 10 lojas.
  - src/components/conciliacao/ResumoDiaPanel.tsx: Painel de fechamento e DRE consolidado.
  - src/hooks/useBackendConciliacao.ts: Hook de consumo da RPC.
  - src/hooks/useDailySnapshot.ts: Hook de leitura e gravação de snapshot.

---

## 4. Contratos de Dados & SQL (Supabase)

### RPC get_daily_reconciliation_summary
- **Retorno JSONB obrigatório em ambos os ramais:**
  date, is_closed, saldo_bancos_ofx, saldo_bancos_positivo, saldo_negativo_itau, dinheiro_lojas, cartoes_a_compensar, devolucoes_rede, 	otal_saldo_banco_positivo, 	otal_saldo_banco, dinheiro_mp, _receber, 
a_loja_os, caixa_atual, caixa_anterior, luxo_caixa, aturamento_oi_base, aturamento_anterior, aturamento_ajustes, aturamento_periodo, alor_disp_contas, contas_base, contas_extras, contas_manual, juros_rede, subtotal_contas, diferenca_final, status_geral, **stores**, stores_detail, 	riple_recon.

---

## 5. Risco Principal e Mitigação

- **Risco:** Alteração retroativa de valores ao consultar datas anteriores.
- **Mitigação:** No Ramal 1 (is_closed = true), a RPC preserva rigorosamente todos os totais gravados na linha de daily_snapshots correspondente, realizando apenas o join seguro com 
econciliations para recuperar os saldos das filiais daquela data.
