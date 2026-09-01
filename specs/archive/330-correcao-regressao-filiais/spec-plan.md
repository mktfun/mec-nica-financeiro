# Spec Plan: Correção de Regressão no Fechamento por Filial e Tela de Detalhes (330)

## Tasks

- [x] [BACKEND] Criar migration revertendo/corrigindo os JOINs problemáticos das CTEs em `get_daily_reconciliation_summary`.
- [x] [BACKEND] Atualizar cálculo da coluna `diferenca` na RPC para refletir a diferença real (OFX não identificados - OFX não justificados).
- [x] [FRONTEND] Ajustar hook e contrato em `useBackendConciliacao.ts` para aceitar null e evitar `|| 0` forçado.
- [x] [FRONTEND] Atualizar `StoreCardModulo1.tsx` para apresentar estado de erro/alerta visual (Dark UI) quando dados estruturais estiverem ausentes.
- [x] [FRONTEND] Modificar `conciliacao.$lojaId.tsx` para carregar a fita completa do extrato sem filtros restritivos (PIX/Rede apenas) - regex isRedeTx corrigido.
- [x] [TEST] Diferença por loja restaurada e consistente.
