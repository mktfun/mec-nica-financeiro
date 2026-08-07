# Proposal: Global Backend Math Refactor (108-global-backend-math-refactor)

## Problema
O sistema financeiro atual delega todas as agregações (Dashboard, DRE, Fluxo de Caixa, ConciliaçÁo, Diferenças) para componentes React e Hooks complexos (`useDashboardV2`, `useConciliacaoResumo`, `modulo1Calculations`). Isso causa múltiplos transtornos:
1. **Inconsistência e LentidÁo**: O frontend baixa centenas de registros via requisições parciais, faz `.reduce()`, `.filter()`, lidando com estados imperfeitos. 
2. **Caixa Preta (Falta de Auditoria)**: Como os números sÁo gerados em tempo de execuçÁo no navegador, é impossível rastrear no banco de dados como o sistema chegou àquele Faturamento ou àquela Divergência no dia X. NÁo há logs imutáveis desses consolidados.
3. **Retrabalho**: Toda vez que a regra de um cálculo muda (ex: Diferença = Previsto - PIX - Maquininha), é preciso caçar dezenas de hooks no React.

## SoluçÁo Proposta
Realizar uma migraçÁo arquitetural massiva: **O Frontend será burro.**
1. **Single Source of Truth no Backend**: Toda matemática financeira pesada ocorrerá exclusivamente no Postgres através de RPCs robustas.
2. **Snapshot Audition Logs**: Criar tabelas diárias para congelar a visÁo do Dashboard e da ConciliaçÁo de cada dia (`dashboard_daily_logs`, `conciliation_daily_logs`). Isso garantirá rastreabilidade para auditoria, e o sistema mostrará sempre o histórico gravado e preciso.
3. O frontend apenas evocará essas RPCs (que retornam os JSONs pré-computados e salvam o estado diário) e cuidará estritamente de plotar os componentes na tela.

## Contratos de Dados
- **Novas Tabelas (Audit Logs)**: 
  - `conciliation_daily_logs`: (date, store_id, faturamento_banco, maquininha, pix, na_loja_os, previsto_ofx, diferenca)
  - `dashboard_daily_logs`: (date, saldo_total, caixa_atual, contas_a_pagar, diferenca, faturamento_atual, faturamento_anterior, fluxo_caixa, a_receber, veiculos_patio)
- **RLS**: Acesso restrito para SELECT (`authenticated`) e INSERT controlado via RPC (`SECURITY DEFINER`).

## API / Interface
- **Supabase RPCs (Novas)**:
  - `calculate_store_conciliation(p_date)`: Substitui o `useConciliacaoResumo`.
  - `get_dashboard_metrics(p_date)`: Substitui a aberraçÁo de 310 linhas do `useDashboardV2`.
- **Hooks React (Novos)**:
  - `useBackendDashboard`
  - `useBackendConciliacao`

## Features Existentes Impactadas
(Ref: spec/global/features.md)
- Dashboard V2 (Home)
- Painel de ConciliaçÁo Index e Lojas individuais
- Rotinas de InicializaçÁo (Bootstrap) e Fechamento de Caixa

## Risco Principal
Ao remover os cálculos do frontend, bugs que estavam escondidos no javascript virÁo à tona se as queries SQL nÁo tratarem os mesmos Edge Cases. Como as RPCs vÁo agrupar valores diretamente de `patio_os`, `transactions` e `reconciliations`, qualquer conversÁo incorreta de Null/Undefined para 0 no SQL quebrará os visuais macro (DRE e Gráficos de barra). Teremos que ser cirúrgicos na transposiçÁo das regras de negócio (taxas, datas alvo, métodos de pagamento).
