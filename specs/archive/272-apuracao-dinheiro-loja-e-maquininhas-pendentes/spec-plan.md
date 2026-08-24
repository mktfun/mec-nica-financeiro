# Spec Plan: Apuração Automática de Dinheiro no Cofre das Lojas por Janela Contábil (Spec 272)

## Tasks

- [x] [BACKEND] Criar migração SQL `20260824000004_auto_cash_vault_window_and_pos_pending.sql` implementando o algoritmo de janela contábil automática e ajustando `get_daily_reconciliation_summary` para apurar `dinheiro_loja` (apenas `status = 'em_transito'`) e `nao_entrou_valor` (maquininhas a compensar)
- [x] [BACKEND] Executar sincronização de `store_cash_vault` para 24/08: Dom Pedro OS #586 (R$ 1.845,00) como `em_transito` e OSs de datas anteriores como `depositado`
- [x] [FRONTEND] Atualizar `useOsImportProcessor.ts` para separar pagamentos em `DINHEIRO` de `PIX`
- [x] [FRONTEND] Atualizar `CentralImportWizard.tsx` / `useImportProcessor.ts` para gravar entradas em `store_cash_vault` usando a regra de janela contábil automática no Step 4
- [x] [FRONTEND] Validar que `SaldoBancosDetailModal.tsx` exibe os R$ 1.845,00 de Dom Pedro em Dinheiro no Cofre e R$ 0,00 para as lojas já baixadas
- [x] [TEST] Executar `npm run build` e validar compilação e paridade de fechamento
