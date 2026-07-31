# Tasks (003-import-parser-rework)

- [x] **1. Migrações e Tipagens**
  - [x] Ao invés de modificar o schema, utilizamos **Idempotência a nível de software** nos hooks, comparando com o que já existe no banco antes do UPSERT.
  - [x] Atualizar as tipagens do TypeScript em `src/lib/supabase.ts` (não foi necessário mexer no banco, logo a tipagem está correta).

- [x] **2. Hook de Processamento Batch**
  - [x] Criar mutation `useProcessImportedData` num novo hook `useImportProcessor.ts`. Essa mutation recebe `(storeId, osArray, receivablesArray, totals)` e executa a idempotência (insert/update) manual e envia para o banco.

- [x] **3. Parser de Excel**
  - [x] No `ImportReportDialog.tsx`, no loop do `.forEach()`, não ler apenas as "Finalizada".
  - [x] Se a OS tiver placa e data, criar o objeto `ParsedOS`.
  - [x] Se tiver pagamento extrair para `ParsedReceivable` (Crédito, Débito, PIX, etc).
  - [x] Acumular tudo em Arrays. No handleSubmit, repassar para o novo Hook.

- [x] **4. Testes e Validação**
  - [x] Compilado com sucesso. O Usuário validará subindo os arquivos na Vercel / Lovable.
