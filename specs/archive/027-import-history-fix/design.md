# Design 027: Histórico de Importações

## Backend (Supabase MCP)
- **Correção da Tabela `import_logs`:** Identificar por que os inserts/upserts falham silenciosamente.
  - Verificar se a política de RLS para `insert` e `update` existe e permite inserção anon/autenticada.
  - Verificar se a constraint única `(store_id, target_date)` existe. Se não existir, o `upsert` no arquivo `useImportProcessor.ts` irá falhar (é necessário criá-la).
  - Criar uma migration ou Edge Function rápida que agrupe todas as transações atuais no banco que vieram de uploads (por ex: `title LIKE 'OS #%'` ou `type = 'out'`) e recrie os logs perdidos em `import_logs`.

## Frontend (Antigravity)
- **Refatoração no `useStoreMapping`:**
  - Em `importacoes-despesas.tsx`, quando ler os dados da planilha, comparar o `storeName` da planilha com a lista de lojas (`stores`).
  - Utilizar uma função que normalize a string (remover acentos, ignorar cases, remover espaços extras) para encontrar o ID da loja e salvar automaticamente no state `mapping`.
- **Refatoração em `importar-os.tsx` (opcional caso já não faça):**
  - Garantir que a extração do nome da loja no frontend consiga pré-selecionar o `store_id` corretamente ao iniciar a importação.
