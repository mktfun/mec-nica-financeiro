# Spec Plan: Transparência de Entradas OFX, Empilhamento Visual de Saldos e Governança Contábil na RPC (334)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260901000011_fix_canonical_store_ofx_entries_and_split.sql` refinando a RPC `get_daily_reconciliation_summary` com o somatório real de créditos OFX em `ofx_entradas_total`, previsto de vendas em `previsto_vendas_total` e cálculo blindado de diferenças
- [x] [BACKEND] Aplicar migration via script local e auditar o retorno de Planalto (`st-06`) e demais 9 filiais no Supabase
- [x] [FRONTEND] Atualizar `src/hooks/useBackendConciliacao.ts` consolidando os tipos de split de Entradas e Saídas
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreCardModulo1.tsx` implementando o layout empilhado (Vertical Stack) para Saldo Total, Rede Total (com badge de compensação ao lado) e Saldo em Pátio, eliminando truncamentos
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ConciliacaoLojasView.tsx` garantindo o repasse dos valores calculados pela RPC
- [x] [TEST] Executar Cenário 1: Validar matematicamente a decomposição de OFX Entradas e Previsto Vendas em Planalto (`st-06`) e Dom Pedro (`st-01`)
- [x] [TEST] Executar Cenário 2: Realizar Visual QA com Playwright comprovando ausência de reticências/truncamento e harmonia visual do layout empilhado
