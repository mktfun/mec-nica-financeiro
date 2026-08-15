# Spec Plan: 210-fix-store-card-reconciliation-and-orphan-categorization

## Tasks

- [x] [HOOK] Em `src/hooks/useCategorizeOrphan.ts`, atualizar diretamente as tabelas base `ofx_transactions` e `pos_transactions` para eliminar o erro PostgreSQL 55000 de views com UNION não atualizáveis.
- [x] [HOOK] Em `src/hooks/useConciliacao.ts` (`useReconciliationViews`), recalibrar `osVsRede` para confrontar o valor bruto da maquininha com o valor entrado no extrato bancário OFX da loja (`adquirenteOfx` / `redeLiquido`), filtrando UUIDs falsos de OS e evitando deltas astronômicos com o pátio total.
- [x] [UI] Em `src/components/conciliacao/OsVsRedeTable.tsx`, atualizar títulos de colunas, formatação de referências (Extrato REDE vs OS real) e exibição das taxas retidas.
- [x] [TEST] Executar `cmd.exe /c "npm run build"` para validação técnica com 0 erros.
