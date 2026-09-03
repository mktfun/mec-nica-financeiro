# Implementation Plan — Spec 368: Correção OFX SGML e Mapeamento Automático Persistente

## Task List

- [x] Task 1: Migration SQL de Persistência no Banco Supabase
  - Criar `supabase/migrations/20260903000031_seed_ofx_store_file_mappings.sql` com upsert de todos os aliases canônicos das 10 filiais em `store_file_mappings`.
  - Aplicar migration remotamente via `npx supabase db query --linked`.

- [x] Task 2: Correção do Parser OFX SGML em `src/lib/parsers/ofxParser.ts`
  - Leitura resiliente com decodificação `windows-1252` via `arrayBuffer()`.
  - Suporte a tags sem fechamento `</STMTTRN>`.
  - Extração de conta e agência via `<ACCTID>`, `<BRANCHID>` e fallback inteligente por regex no `file.name`.

- [x] Task 3: Atualização do Hook de Mapeamentos e CentralImportWizard
  - Em `src/hooks/useStoreFileMappings.ts`, adicionar todos os aliases e normalizadores de agência/conta.
  - Em `src/components/importacoes/CentralImportWizard.tsx`, aprimorar `resolveStoreForOfx` e exibir rótulo amigável com agência, conta e loja no Step 2.
  - Em `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`, fallback defensivo de agência/conta.

- [x] Task 4: Verificação de Build e Auditoria
  - Executar `bun run build`.
  - Acionar `auditor-agent` para auditoria nas 7 dimensões.
