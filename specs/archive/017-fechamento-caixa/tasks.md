# Tarefas: Fechamento de Caixa Físico (017)

- `[x]` **Backend / Supabase**
  - `[x]` Criar migration (Supabase) para tabela `cash_registers` (script `setup_cash_registers.sql` gerado).
  - `[x]` Definir RLS e tipagens em `src/lib/supabase.ts`.

- `[x]` **Hooks e Integração (`useImportProcessor.ts`)**
  - `[x]` Separar os pagamentos em "Dinheiro" e remover do extrato bancário.
  - `[x]` Criar lógica de Upsert em `cash_registers` para salvar o valor esperado do dia.

- `[x]` **Frontend (`useCashRegister.ts`)**
  - `[x]` Criar hook para ler e atualizar os registros de caixa da loja.

- `[x]` **Frontend UI (`loja.$lojaId.tsx`)**
  - `[x]` Adicionar aba "Caixa Físico" na área do extrato.
  - `[x]` Criar componente visual listando os dias pendentes.
  - `[x]` Adicionar input para o usuário digitar o valor "contado nas mãos".
  - `[x]` Ao salvar, calcular a divergência e mover para o histórico de "Caixas Fechados".
