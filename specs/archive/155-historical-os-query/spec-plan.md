# Spec Plan: Pátio OS Cumulativo na Conciliação (Backlog Histórico) - 155

## Tasks

- [x] [BACKEND] Criar nova migration SQL (ex: `20260810190000_historical_patio_os.sql`) para conter os `CREATE OR REPLACE FUNCTION`.
- [x] [BACKEND] Dentro da migration, substituir a view de OS da `get_conciliation_breakdown` para filtrar `opened_at::date <= p_date` somado à regra de `remaining_value > 0`.
- [x] [BACKEND] Dentro da migration, substituir a view `get_raw_os_data` para ter a mesma regra de cumulatividade (para que a Tabela Modal reflita a matemática global).
- [x] [BACKEND] Auditar todas as RPCs em `20260807000003_master_backend_delegation.sql` ou global aggregations (ex: `get_patio_summary`) e adicionar a query cumulativa onde ele somava apenas as OSs restritas ao `p_date`.
- [x] [BACKEND] Executar a migration contra o Supabase local/deploy.
- [x] [TEST] Verificar cenário 1: Abrir frontend na conciliação de "hoje", ver se o saldo inflou corretamente puxando o histórico do banco.
