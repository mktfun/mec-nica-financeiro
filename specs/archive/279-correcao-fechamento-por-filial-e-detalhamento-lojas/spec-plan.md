# Spec Plan: Correção do Fechamento por Filial e Cálculo de Diferença por Loja (279)

## Tasks

- [x] [BACKEND] Criar migration `20260901000003_fix_store_breakdown_metrics_and_differences.sql` atualizando a agregação de Saldo, Maquininha, PIX, Previsto e Diferença na RPC `get_daily_reconciliation_summary`
- [x] [FRONTEND] Criar componente `src/components/conciliacao/StoreCardModulo1.tsx` com layout Dark UI e badges informativas
- [x] [FRONTEND] Criar container `src/components/conciliacao/ConciliacaoLojasView.tsx` e integrar em `src/routes/conciliacao.index.tsx`
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx` com tratamento seguro de dados e retorno preservando a data selecionada
- [x] [TEST] Executar script de teste automatizado validando o retorno de métricas das 10 filiais
- [x] [TEST] Executar build de produção (`npm run build`) e checagem de tipos TypeScript


