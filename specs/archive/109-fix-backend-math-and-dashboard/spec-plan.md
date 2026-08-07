# Spec Plan: CorreçÁo Lógica e Cronológica do Backend (109-fix-backend-math-and-dashboard)

## Tasks

- [x] [BACKEND] Criar nova migration `update_global_math_logic.sql`.
- [x] [BACKEND] Reescrever RPC `calculate_daily_conciliation`: 
  - Faturam. Banco puxando de `reconciliations.bank_total`.
  - Na Loja OS somando `patio_os` apenas onde `created_at <= p_date` ou puxando do legado.
  - PIX puxando corretamente via lógica legada (ou matching preciso).
- [x] [FRONTEND] Atualizar `useBackendDashboard` para buscar a última `target_date` válida em `import_logs` se `date` for vazio.
- [x] [FRONTEND] Atualizar `useBackendConciliacao` com a mesma lógica de auto-select de data.
- [x] [FRONTEND] Adicionar log no carregamento do hook para provar pro usuário que os dados estÁo vindo do banco corretamente.
- [x] [TEST] Verificar se a Tela inicial carrega no dia 04 com Faturamentos nÁo-zerados.
