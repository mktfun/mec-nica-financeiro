# Tasks 027: Histórico de Importações

- [x] **1. Mapeamento Automático (Frontend):** 
  - [x] Atualizar a funçÁo `useStoreMapping` em `importacoes-despesas.tsx` para, logo após realizar o parsing, normalizar o array de aliases gerados e cruzar com `stores.map(s => s.name)`.
  - [x] Pré-preencher o state `mapping` com o ID correspondente caso as strings normalizadas (sem acentos e case-insensitive) sejam idênticas.
- [x] **2. CorreçÁo de RLS e Constraints (Backend):**
  - [x] Checar as políticas e constraints da tabela `import_logs`.
  - [x] Identificar a ausência do composite key UNIQUE `(store_id, target_date)` que causa a falha no `.upsert()` do Supabase, ou a falta de políticas (RLS) para o `anon` inserir e ler registros, resolvendo através de uma migration SQL.
- [x] **3. Retroativo de Logs (Data):**
  - [x] Criar um script SQL ou JS para reconstruir o `import_logs` lendo o `transactions`. Agrupar os registros antigos (por loja e data) e inserir no `import_logs` para que as importações antigas voltem a aparecer.
- [ ] **4. Teste End-to-End:** 
  - Fazer upload de uma nova planilha, garantir que o mapeamento automático funciona, e acessar `/importacoes` para validar se ela constou no histórico com sucesso.
