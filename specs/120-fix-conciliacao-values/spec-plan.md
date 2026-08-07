﻿# Spec Plan: CorreçÁo de ConciliaçÁo e Juros (120)

## Tasks

- [/] [BACKEND] Criar migration `20260807000010_fix_dashboard_rpc.sql` corrigindo as subqueries de `caixa_atual` e `fluxo_caixa` na RPC `get_dashboard_metrics` para apontar para `daily_snapshots`.
- [ ] [FRONTEND] Ajustar `jurosRedeParser.ts` para buscar pela coluna `"valor juros"` ou `"valor de juros"` além de `"valor cobrado"`. Garantir parse de número positivo/negativo absoluto.
- [ ] [FRONTEND] Revisar `CentralImportWizard.tsx` (linhas 1129) onde `manualDinheiroMp` e `manualAReceber` sÁo alimentados. Verificar se estÁo sendo atualizados no form (ver se os onChanges estÁo pegando `value={manualDinheiroMp || ''}`).
- [ ] [FRONTEND] Revisar `ResumoDiaPanel.tsx` para assegurar que `DINHEIRO MP` e `A RECEBER` exibam `currentSnapshot.dinheiro_mp` ou seus dinâmicos/manuais locais corretamente.
- [ ] [TEST] Reexecutar RPC via Supabase SQL Editor e recarregar Dashboard pra validar contas/fluxo.



