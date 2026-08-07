# Action Plan: Fix Conciliação Diária (Fluxo de Caixa e Contas OFX)

- [x] [BACKEND] Criar nova migration `20260807000014_fix_conciliacao_math.sql`
  - [x] Alterar `get_dashboard_metrics`:
    - Adicionar `AND source = 'ofx'` na extração de `v_contas_a_pagar_ofx`.
    - Alterar `v_fluxo_caixa` para ser `v_caixa_atual - v_caixa_anterior`.
    - Buscar `v_caixa_anterior` da tabela `daily_snapshots` onde `date < p_date` e ordenar DESC, fallback para 0.
- [x] [FRONTEND] Alterar `src/hooks/useBackendConciliacao.ts`:
  - [x] Retornar o valor global de saídas do OFX para a data correspondente.
- [x] [FRONTEND] Alterar `src/routes/conciliacao.index.tsx`:
  - [x] Substituir o prop `totalOfxOut={0}` em `ResumoDiaPanel` pelo valor global de OFX extraído.
