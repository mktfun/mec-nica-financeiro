# Spec Plan: Cockpit de Diagnóstico 360° Pós-Motor (384)

## Tasks

- [x] [BACKEND] Criar migration `20260909000041_cockpit_pos_triple_reconciliation_brand.sql` adicionando colunas `brand`, `expected_credit_date`, `nsu`, `authorization_code` em `pos_transactions` com backfill inteligente
- [x] [BACKEND] Atualizar RPC `public.get_store_pos_triple_reconciliation(p_target_date)` com agregação por Loja e por Bandeira (`entrou`, `nao_entrou`, `a_compensar`, `divergente`) e KPIs estruturados
- [x] [FRONTEND] Criar arquivo de tipos TypeScript `src/types/cockpit360.ts` com as interfaces do diagnóstico
- [x] [FRONTEND] Criar componente `src/components/importacoes/wizard/DiagnosticActionCards.tsx` (4 cards de ação rápida e métricas do lote)
- [x] [FRONTEND] Criar componente `src/components/importacoes/wizard/StoreDiagnosticRow.tsx` (linha canônica com micro-chips de bandeiras e accordion inline de detalhes)
- [x] [FRONTEND] Criar componente mestre `src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx` com filtros, loading/empty/error states em Dark UI Zinc-950
- [x] [FRONTEND] Adaptar `src/components/conciliacao/MaquininhasDetailModal.tsx` com a prop `initialStoreId` para foco direto na filial
- [x] [FRONTEND] Corrigir bug de update cego em `src/components/importacoes/CentralImportWizard.tsx:1870` e plugar o `<PostMotorDiagnosticCockpit />` no Step 8
- [x] [TEST] Executar Cenário 1: Fechamento com lote consolidado, retenção de aluguel de POS e validação do Action Card de baixa
- [x] [TEST] Executar Cenário 2: Validação de vendas parceladas D+30 como 'a_compensar' e verificação de não regressão do caixa diário
