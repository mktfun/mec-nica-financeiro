# Spec Plan: Dashboard Fintech V5 (065)

## Tasks

- [x] [BACKEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx`
  - [x] Consertar hardcode de `total_os: 0` na geração do `logsToInsert`
  - [x] Somar o valor total (Faturamento real) dos `osFiles` e passar para a variável
- [x] [BACKEND] Atualizar hook de métricas (`src/hooks/useDashboardV2.ts`)
  - [x] Trocar consulta de `.from('reconciliations')` para `.from('import_logs')` para discovery de datas e ancoragem de faturamento
  - [x] Adicionar sub-query `.from('daily_snapshots').select('*').eq('date', dateAtual).maybeSingle()`
  - [x] Apagar uso da tabela `oficina_contas` e basear KPIs de Contas nas saídas do OFX (tabela `transactions`, `amount < 0`, `type = 'out'`)
  - [x] Somar dados manuais (Faturamento Outros, Dinheiro MP, A Receber Manual) oriundos do `daily_snapshots` nas totalizações globais e no fluxo de caixa
- [x] [FRONTEND] Atualizar Tabela (`src/components/dashboard/StoreTableDashboard.tsx` ou similar)
  - [x] Alterar o label da coluna "Contas a Pagar" para "Contas (OFX)" se necessário
- [x] [TEST] Re-importar dados usando a tela ou recarregar dashboard para ver as Contas sendo populadas por números negativos do banco

## Status
COMPLETED
