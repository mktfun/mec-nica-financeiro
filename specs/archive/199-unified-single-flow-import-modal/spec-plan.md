# Spec Plan: Unified Single-Flow Import & Reconciliation Modal (199)

## Tasks

- [x] [DATABASE/MIGRATION] Criar migração Supabase `supabase/migrations/20260814120000_create_store_file_mappings.sql` para tabela `store_file_mappings` e aplicar no banco.
- [x] [FRONTEND/HOOK] Criar `src/hooks/useStoreFileMappings.ts` para carregar e sincronizar matches de arquivos/lojas diretamente no Supabase com fallback local.
- [x] [FRONTEND/COMPONENTS] Criar `src/components/conciliacao/ImportConciliacaoModal.tsx` com layout Single-Flow Block de 2 colunas responsivas em Dark-UI sólido (Zinc-950/Zinc-900/Zinc-800), sem steppers.
- [x] [FRONTEND/INPUTS] Implementar na coluna esquerda do modal a dropzone de arquivos (com matches persistentes do Supabase) e o card de inputs manuais globais (Odômetro Hoje, Dinheiro MP, A Receber, Contas Manual) com foco `ring-2 ring-emerald-500`.
- [x] [FRONTEND/ORPHANS] Implementar na coluna direita a detecção de OSs órfãs e a tabela de ajuste manual com inputs diretos de `Valor Total`, `Total Pago` e `<select>` de `Status` (sem automações).
- [x] [BACKEND/PERSISTENCE] Implementar a gravação em lote atômica ao clicar em **"Confirmar e Gravar Fechamento"** (Emerald-600) persistindo OSs novas, OSs órfãs modificadas, transações e snapshot diário.
- [x] [FRONTEND/INTEGRATION] Integrar o novo `ImportConciliacaoModal.tsx` na tela de conciliação diária e na página de importações.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo TypeScript limpo e bundling 100% verde.
- [x] [TEST] Testar o modal em tela: matches de lojas persistidos no banco, upload, inputs manuais, edição de OSs órfãs e salvamento em lote.
