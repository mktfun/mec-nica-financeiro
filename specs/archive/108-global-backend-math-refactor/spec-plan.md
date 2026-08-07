# Spec Plan: Global Backend Math Refactor (108-global-backend-math-refactor)

## Tasks

- [x] [BACKEND] Escrever migration Supabase (`global_math_and_logs.sql`).
- [x] [BACKEND] Criar tabela `dashboard_daily_logs` e `conciliation_daily_logs`.
- [x] [BACKEND] Escrever RPC `calculate_daily_conciliation(date)` para processar `patio_os`, `transactions` e gravar Snapshot.
- [x] [BACKEND] Escrever RPC `get_dashboard_metrics(date)` para processar macros do painel, cruzar datas, gerar DRE e gravar Snapshot.
- [x] [FRONTEND] Substituir 100% de `useConciliacaoResumo` e `modulo1Calculations` por um novo Hook conectado às RPCs.
- [x] [FRONTEND] Substituir `useDashboardV2` por um hook super magro.
- [x] [FRONTEND] Limpar as View Components (Index/Conciliação) para ler apenas das props fornecidas pelo backend.
- [x] [TEST] Verificar precisão: se eu lançar um pagamento de pátio na Loja X, a conciliação do dia Y atualiza o Previsto/Diferença sem quebrar os painéis?
