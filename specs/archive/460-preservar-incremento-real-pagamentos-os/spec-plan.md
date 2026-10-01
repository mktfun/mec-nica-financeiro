# Spec Plan: Preservar o Incremento Real dos Pagamentos da OS (Spec 460)

## Tasks

### [DB] Camada de Banco de Dados & Migrations
- [x] Completed: Task 1: Criar migration PostgreSQL com evolução de `os_import_observations`, RPC atômica `record_os_import_batch` e saneamento histórico de 30/09 para OS 22622 (Mauá).
  - **Skill:** `database`
  - **Critério de Verificação:** Execução com sucesso via MCP Supabase / terminal e validação dos tipos e RLS para `anon`.

### [BACKEND] Parsers & Hooks de Ingestão
- [x] Completed: Task 2: Ajustar `src/hooks/useOsImportProcessor.ts` para remover a inferência cega de crédito (`parsed_credit`) quando não houver modalidade de pagamento identificada.
  - **Skill:** `backend-patterns`
  - **Critério de Verificação:** Parser retorna `parsed_credit: 0` para ordens sem método de pagamento informado.

- [x] Completed: Task 3: Atualizar `src/hooks/useImportProcessor.ts` para rotear a persistência do pátio e observações exclusivamente via RPC atômica `record_os_import_batch` com tratamento rigoroso de exceções.
  - **Skill:** `backend-patterns`
  - **Critério de Verificação:** Nenhuma mutação de pátio ocorre isolada de observações e erros interrompem a esteira.

### [FRONTEND] Orquestração do Wizard de Importação
- [x] Completed: Task 4: Ajustar `src/components/importacoes/CentralImportWizard.tsx` para sequenciar o processamento de OSs por filial evitando concorrência e race condition.
  - **Skill:** `frontend-design-pro`
  - **Critério de Verificação:** Lotes da mesma filial executam de forma serial e ordenada.

### [SECURITY/TEST] Testes de Integração & Verificação
- [x] Completed: Task 5: Implementar teste de integração `tests/integration/os-payment-import-baseline.test.mjs` validando incremento 400 → 2.727, preservação de base em reimportações, não vinculação de 500 → 2.727 e ausência de modalidade.
  - **Skill:** `security`
  - **Critério de Verificação:** `node tests/integration/os-payment-import-baseline.test.mjs` com 100% dos testes aprovados.

- [x] Completed: Task 6: Terminal Quality Gate (Build Completo).
  - **Skill:** `sdd-apply`
  - **Critério de Verificação:** `cmd.exe /c "npm run build"` com saída limpa e zero erros de TypeScript.
