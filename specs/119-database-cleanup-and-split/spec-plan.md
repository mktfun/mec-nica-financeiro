﻿# Spec Plan: Database Cleanup & Split Architecture (119)

## Tasks

- [/] [BACKEND] Escrever migration \20260807000009_schema_cleanup_and_split.sql\.
  - [ ] Implementar os drops de \i_execution_logs\, \ot_audit_logs\, \import_logs\, \ot_runs\, \ot_credentials\, \mcp_logs\, \conversations\, \messages\, etc.
  - [ ] Criar tabelas \system_logs\ (com cron TTL de 1 dia), \ofx_transactions\ e \pos_transactions\.
  - [ ] Renomear \	ransactions\ existente (ou usá-la apenas para despesas manuais) e ajustar as restrições \source\.
  - [ ] Atualizar RPC \get_dashboard_metrics\ para unir \ofx_transactions\ (faturamento/despesas OFX) em substituição à antiga agregação de \	ransactions\.
- [ ] [FRONTEND] Atualizar \src/hooks/useBotLogs.ts\ e afins para puxar dados unicamente de \system_logs\.
- [/] [FRONTEND] Remover componentes e páginas mortas que dependiam das tabelas (ex: \gente.tsx\ se for legada, ou adaptá-la para não depender de tabelas removidas).
- [ ] [FRONTEND] Refatorar \useTransactions.ts\ e \CentralImportWizard.tsx\ para salvar OFX e POS nas suas respectivas tabelas novas em vez do pool genérico de \	ransactions\.
- [ ] [TEST] Verificar a importação de um OFX (Cenário de importação caindo perfeitamente em \ofx_transactions\).
- [ ] [TEST] Verificar renderização do Dashboard sem quebrar, com saldos coerentes.



