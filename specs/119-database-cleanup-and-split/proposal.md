﻿# Proposal: Database Cleanup & Split Architecture (119)

## Problema
O banco de dados se tornou uma "bagunça" devido a tabelas legadas inutilizadas e ao acúmulo de naturezas financeiras misturadas na tabela genérica \	ransactions\. Atualmente, extratos bancários (OFX), expectativas de recebimento da maquininha e contas inseridas manualmente residem na mesma tabela \	ransactions\, distinguidos apenas por colunas como \source\. Isso dificulta a integridade de dados (campos específicos de maquininha estão em branco para OFX e vice-versa) e a escalabilidade. Além disso, há dezenas de tabelas de log espalhadas (import, bot, execução de IA) que apenas incham o banco.

## Solução Proposta
Uma reestruturação profunda do schema, focando em separação de domínios e limpeza rigorosa:
1. **Drop Massivo de Legados:** Remover tabelas antigas de IA, bot e logs avulsos.
2. **Divisão de Domínios Financeiros:** Criar entidades específicas e segregadas para OFX, Maquininha e Lançamentos Avulsos. (O Pátio de OS já está perfeitamente segregado em \patio_os\).
3. **Log Centralizado Efêmero:** Criar uma tabela unificada \system_logs\ com Time-To-Live (TTL) de 1 dia para rastrear o "por trás das cortinas" (cálculos, imports) sem sobrecarregar o DB.

## Contratos de Dados
- **Novas Tabelas Supabase:**
  - \ofx_transactions\: Específico para linhas de banco real (\id, store_id, fitid, type, amount, occurred_at, bank_name, counterpart_name, cnpj_cpf\).
  - \pos_transactions\: Específico para recebíveis de maquininha (\id, store_id, machine_name, payment_method, gross_amount, net_amount, fee_amount, occurred_at\).
  - \manual_transactions\: Para contas e avulsos manuais (novo nome para as antigas transações puramente inseridas sem importador automático).
  - \system_logs\: Tabela única para telemetria (\id, level, context, message, metadata jsonb, created_at\).
- **Tabelas Excluídas (DROP):** 
  - \i_execution_logs\, \ot_audit_logs\, \ot_runs\, \ot_credentials\, \mcp_logs\, \gent_reflections\, \claritas_prompts\, \claritas_policies\, \import_logs\, \conversations\, \messages\, \i_settings\, \oficina_os_cache\, \oficina_contas\.

## API / Interface
- Os hooks React (\useTransactions\, \useBotLogs\, etc.) serão profundamente refatorados para apontar para as novas tabelas específicas.
- O componente \CentralImportWizard\ salvará OFX em \ofx_transactions\ e Rede/Maquininha em \pos_transactions\ (ou \eceivables\, a depender da regra existente).
- Uma rotina Edge Function ou \pg_cron\ (via Supabase) será implementada para o DELETE WHERE \created_at < now() - interval '1 day'\ na \system_logs\.

## Features Existentes Impactadas
- \CentralImportWizard\ (Parsing de CSV/OFX/XLSX)
- Dashboards (\useDashboardV2\, \get_dashboard_metrics\ RPC)
- Painéis de auditoria (\CustosPanel\, \LogsAgentePanel\, \LogsMotorPanel\)
- *Risco altíssimo de quebra no cálculo de Saldo Bancário se a RPC de dashboard não for atualizada em conjunto.*

## Risco Principal
Como todas as integrações de tela dependem da tabela \	ransactions\ atual (e de seu RPC correspondente \get_dashboard_metrics\), quebrar \	ransactions\ em \ofx_transactions\, \pos_transactions\ e \manual_transactions\ significa reescrever a arquitetura completa de agregações financeiras e a migração de dados antigos pode ser complexa ou requerer um "Clean Slate" (zerar a base).
