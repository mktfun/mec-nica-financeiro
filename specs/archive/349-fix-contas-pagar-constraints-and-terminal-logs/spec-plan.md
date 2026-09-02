# Spec Plan: Blindagem do Salvamento de Contas a Pagar (Constraint Violations) e Refatoração do Terminal de Logs (Feature 349)

## Tasks

- [x] [BACKEND/PARSER] No `src/lib/parsers/contasPagarParser.ts`, descartar estritamente qualquer linha com `amount <= 0` evitando a violação da check constraint `daily_manual_bills_amount_check`
- [x] [BACKEND/PERSISTENCE] No `src/hooks/useContasAPagarImport.ts`, implementar sanitização defensiva de `store_id`, `intercompany_entity_id`, `title`, `amount > 0` e deduplicação em memória antes do insert
- [x] [FRONTEND] Criar o componente modular `src/components/importacoes/ImportExecutionTerminal.tsx` com visual Dark Zinc-950, filtros por severidade, cópia de logs de 1-clique e auto-scroll interno independente
- [x] [FRONTEND] Criar o componente modular `src/components/importacoes/ExecutionErrorBanner.tsx` com diagnóstico amigável de erro Supabase/PostgreSQL e botão de retry inteligente
- [x] [FRONTEND] No `src/components/importacoes/CentralImportWizard.tsx`, substituir as strings com UTF-8 Mojibake por texto limpo, integrar os novos componentes e garantir que o retry execute `handleConfirm(true)`
- [x] [TEST] Verificação dos contratos de dados e sanitização prévia concluída
- [x] [VERIFY] Executar `npm run build` garantindo zero erros de compilação (Aprovado em 41.76s + 5.59s SSR)
