# 📋 SDD Proposal: Correção do Over-filtering de Datas do OFX (Cards Zerados na Conciliação)

## 1. Problema Diagnosticado

### A. Sintoma Relatado
Após a blindagem de escopo de data do OFX realizada para conter o vazamento contábil de transações anteriores (Spec `fix-ofx-date-leakage`), os painéis da direita na tela de conciliação diária (`OFX Entradas`, `Saídas OFX`, `Conciliados`, `Contas / Boletos` nos cards de fechamento por filial em `StoreCardModulo1.tsx`) ficaram travados em **R$ 0,00**.
O painel esquerdo (Saldo Total, Rede Total e Saldo em Pátio) carrega normalmente, pois consome dados consolidados de `reconciliations` e `pos_transactions`, mas as métricas baseadas no extrato bancário OFX não dão match com a data selecionada.

### B. Causa-Raiz Técnica
1. **Filtro de Data Restritivo Demais nas CTEs de Agregação:**
   Na RPC `get_daily_reconciliation_summary` (`supabase/migrations/20260917000001_redefine_daily_reconciliation_summary_ssot.sql`), as CTEs `ofx_entradas_agg` e `ofx_saidas_agg` agregam utilizando estritamente:
   ```sql
   WHERE target_date = v_target_date::date AND type = 'in'
   ```
   e
   ```sql
   WHERE target_date = v_target_date::date AND type = 'out'
   ```
   Transações bancárias OFX possuem campos `occurred_at TIMESTAMPTZ` (ex: `2026-09-16T10:00:00+00:00`). Qualquer transação que possua `target_date` desajustado, nulo ou divergência de fuso horário UTC vs UTC-3 (Horário de Brasília) é descartada sumariamente da agregação.
2. **Falta de Sargabilidade no Filtro Temporal:**
   Filtros que realizam cast `occurred_at::date = input_date` não utilizam os índices btree da coluna `occurred_at` e quebram quando há transações perto da meia-noite (21h às 23h59 de Brasília = 00h às 02h59 UTC do dia seguinte).
   A solução padrão sargable é um intervalo semi-aberto cobrindo a data contábil inteira:
   ```sql
   occurred_at >= v_start_ts AND occurred_at < v_end_ts
   ```
3. **Inversão e Omissão de Propriedades no Retorno JSON da RPC:**
   Na construção de `v_stores_detail` na RPC `get_daily_reconciliation_summary`:
   - A chave `'entradas_realizadas'` foi associada aos créditos já identificados/conciliados (`oe.ofx_maquininhas + oe.pix_total + oe.entradas_justificadas`), e `'entradas_previsto'` recebeu o total de extrato `oe.ofx_entradas_total`.
   - As chaves canônicas `ofx_entradas_total` e `entradas_conciliadas` foram omitidas do payload `jsonb_build_object`.
   - Como consequência, o hook `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx` recebem dados cruzados ou nulos, renderizando valores zerados.
4. **Hooks Frontend Restritivos:**
   Em `src/hooks/useTransactions.ts`, as funções `useTransactionsPorDataELoja` e `useStoreExtratoBancario` executam `.eq('target_date', date)` estrito sem fallback para o intervalo sargable de `occurred_at`.

---

## 2. Solução Proposta

1. **Refatoração da RPC SSOT (`get_daily_reconciliation_summary`):**
   - Implementar cálculo de limites temporais sargables para o dia base tanto em UTC quanto no fuso horário oficial de Brasília (`America/Sao_Paulo`, UTC-3):
     ```sql
     v_start_utc := (v_target_date::date::text || ' 00:00:00+00')::timestamptz;
     v_end_utc := ((v_target_date::date + INTERVAL '1 day')::date::text || ' 00:00:00+00')::timestamptz;
     v_start_brt := (v_target_date::date::text || ' 00:00:00-03')::timestamptz;
     v_end_brt := ((v_target_date::date + INTERVAL '1 day')::date::text || ' 00:00:00-03')::timestamptz;
     ```
   - Nas CTEs `ofx_entradas_agg` e `ofx_saidas_agg`, utilizar o predicado abrangente e sargable:
     ```sql
     WHERE (
         target_date = v_target_date::date
         OR (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
         OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
     )
     ```
   - Normalizar a construção de `v_stores_detail` exportando explicitamente as chaves:
     - `ofx_entradas_total`: Total de créditos OFX no banco (Realizado)
     - `entradas_conciliadas`: Lotes Rede + PIX OS + Justificados (Conciliado)
     - `entradas_realizadas`: Alias compatível de `ofx_entradas_total`
     - `entradas_previsto`: Alias compatível de `entradas_conciliadas`
     - `dif_entradas` / `diferenca_entradas`: `ofx_entradas_total - entradas_conciliadas`
     - `ofx_saidas_total` / `saidas_ofx`: Total de débitos OFX no banco
     - `contas_loja_total` / `contas_conciliadas` / `contas_loja`: Despesas lançadas + justificativas
     - `dif_saidas` / `diferenca_saidas`: `ofx_saidas_total - contas_conciliadas`
   - Ajustar as consultas de `transactions` para `v_faturamento_oi_base` e `v_contas_base` com o mesmo daterange sargable.

2. **Atualização da View `transactions`:**
   - Garantir derivação segura de `target_date`:
     ```sql
     COALESCE(target_date, (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date) as target_date
     ```

3. **Auditoria e Ajuste dos Hooks do Frontend:**
   - Em `src/hooks/useTransactions.ts` (`useTransactionsPorDataELoja` e `useStoreExtratoBancario`), expandir o filtro Supabase para aceitar tanto `target_date.eq.${date}` quanto o intervalo `occurred_at.gte.${date}T00:00:00` / `occurred_at.lt.${nextDate}T00:00:00`.
   - Em `src/hooks/useBackendConciliacao.ts` (`useDailyReconciliationSummary` e `useGlobalOfxOut`), assegurar que a extração de `ofx_entradas_total`, `entradas_conciliadas`, `saidas_ofx` e `contas_loja` priorize as propriedades corretas sem inverter previstos e realizados.
   - Em `src/components/conciliacao/ConciliacaoLojasView.tsx`, manter o mapeamento canônico direto para `StoreCardModulo1`.

---

## 3. Skills Especializadas Aplicadas

- `database`: Sargability de índices em `ofx_transactions(occurred_at)` e `ofx_transactions(target_date)`, isolamento de timezone UTC-3 e RPC SSOT.
- `backend-patterns`: Adaptação de hooks e queries PostgREST resilientes com tratamento de nulos e fallbacks.
- `frontend-design-pro`: Preservação estrita dos tokens de design system (Zinc-950) e layout de cards sem regressão visual.

---

## 4. Contratos de Dados

### Tabela `ofx_transactions`:
- `occurred_at`: TIMESTAMPTZ (Data/hora original do lançamento bancário).
- `target_date`: DATE (Data contábil de competência).

### Retorno JSONB de Cada Filial em `v_stores_detail`:
```json
{
  "store_id": "st-06",
  "store_name": "Planalto - BRASICAR",
  "saldo_banco": -18184.30,
  "saldo_banco_ofx": -18184.30,
  "ofx_entradas_total": 15027.26,
  "entradas_conciliadas": 14307.26,
  "entradas_realizadas": 15027.26,
  "entradas_previsto": 14307.26,
  "dif_entradas": 720.00,
  "diferenca_entradas": 720.00,
  "ofx_saidas_total": 11179.90,
  "saidas_ofx": 11179.90,
  "contas_loja": 2053.77,
  "contas_conciliadas": 2053.77,
  "dif_saidas": 9126.13,
  "diferenca_saidas": 9126.13,
  "diferenca": -8406.13,
  "status": "divergence"
}
```

---

## 5. Arquivos Afetados

### [Arquivos Existentes Reutilizados/Modificados]
- `supabase/migrations/20260917000001_redefine_daily_reconciliation_summary_ssot.sql` (Substituído pela nova migration incremental `20260917000002_fix_ofx_daterange_sargability.sql`)
- `src/hooks/useBackendConciliacao.ts`: Ajustar normalização de propriedades em `useDailyReconciliationSummary` e filtro em `useGlobalOfxOut`.
- `src/hooks/useTransactions.ts`: Refatorar queries em `useTransactionsPorDataELoja` e `useStoreExtratoBancario` com daterange sargable.
- `src/components/conciliacao/ConciliacaoLojasView.tsx`: Assegurar leitura robusta das propriedades pré-calculadas.

### [Arquivos Novos]
- `supabase/migrations/20260917000002_fix_ofx_daterange_sargability.sql`

---

## 6. Plano de Rollback

Caso ocorra regressão, o rollback será efetuado executando a migration anterior `20260917000001_redefine_daily_reconciliation_summary_ssot.sql` e revertendo as alterações no frontend via `git checkout -- src/hooks/useBackendConciliacao.ts src/hooks/useTransactions.ts src/components/conciliacao/ConciliacaoLojasView.tsx`.

---

## 7. Risco Principal e Mitigação

- **Risco:** Dupla contagem de transações OFX se o intervalo sargable capturar lançamentos de dias vizinhos.
- **Mitigação:** Utilização de intervalos estritamente semi-abertos `[inicio, fim)` ancorados na data contábil especificada, sem sobreposição entre dias adjacentes.
