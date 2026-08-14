# Proposta de Especificação Técnica: Auditoria e Blindagem da RPC do Dashboard e Queries de Pátio (Spec 204)

## Contexto e Diagnóstico
Para que o Dashboard Executivo e o painel de Conciliação exibam métricas em tempo real com carregamento instantâneo (< 50ms) e precisão matemática estrita:
1. **Prevenção de Produto Cartesiano:** As agregações de Ordens de Serviço (`patio_os`), transações bancárias (`ofx_transactions`) e saldos de contas (`reconciliations`) devem ser executadas em CTEs (`WITH`) estritamente isoladas, evitando que joins colidam e multipliquem os valores de faturamento ou saldos de contas.
2. **Nova Regra de Negócio do Odômetro Diário:**
   - O cálculo do Faturamento do Dia no backend deve respeitar a regra de delta de odômetro:
     $$\text{Faturamento Líquido} = (\text{Odômetro Hoje}) - (\text{Odômetro Anterior})$$
   - Se não houver medição anterior ou no caso do primeiro fechamento, a RPC utilizará o valor do odômetro do dia ou o fallback do extrato bancário.
3. **Cálculo de "Carros no Pátio" / "Na Loja OS":**
   - Agregação do saldo pendente residual de cada OS ativa (`status IN ('em_aberto', 'pago_parcial')`):
     $$\text{Valor Pendente} = \text{total\_value} - \text{paid\_value}$$
   - Agrupamento direto por filial sem duplicidade.
4. **Índices de Performance:** Criação de índices otimizados no PostgreSQL para garantir respostas abaixo de 50ms.

---

## Objetivos da Especificação
1. **Refatorar e Blindar a RPC `get_dashboard_metrics` no Supabase:**
   - Usar CTEs isoladas para `daily_snapshots` (odômetro hoje e anterior), `reconciliations` (saldo bancário mais recente por filial), `ofx_transactions` (entradas e saídas) e `patio_os` (OSs ativas).
   - Eliminar qualquer possibilidade de produto cartesiano.
   - Retornar o JSON estruturado esperado por `useBackendDashboard.ts`.
2. **Criar Migration SQL de Otimização e Índices:**
   - Criar `supabase/migrations/20260814143000_audit_and_harden_dashboard_rpc.sql` contendo a nova versão de `get_dashboard_metrics` e índices compostos.
3. **Auditar Hooks Frontend (`useBackendDashboard.ts` e `useConciliacao.ts`):**
   - Garantir que o frontend consome a RPC sem reprocessamentos redundantes ou fórmulas divergentes.

---

## Critérios de Sucesso
- [x] RPC `get_dashboard_metrics` refatorada com CTEs independentes e idempotentes.
- [x] Faturamento calculado via delta de odômetro ($Hoje - Anterior$).
- [x] Índices criados para `patio_os`, `ofx_transactions`, `reconciliations` e `daily_snapshots`.
- [x] `npm run build` aprovado 100% verde.
