# Design: Fechamento de Caixa Físico (017)

## Componentes Afetados

### 1. Backend (Supabase)
Tabela Nova: `cash_registers`
- `id` (uuid)
- `store_id` (uuid)
- `date` (date) - Unique per store
- `expected_amount` (numeric) - Calculado via OS
- `declared_amount` (numeric) - Inserido pelo usuário
- `divergence` (numeric) - Calculado
- `status` (text) - 'pending' | 'closed'
- `created_at` / `updated_at`

### 2. `src/hooks/useImportProcessor.ts`
- Alterar o `for` que gera as `transactions`. Atualmente, qualquer `paid_value > 0` gera uma transaction.
- Nova regra: Se o `payment_method` contiver "Dinheiro" ou "Espécie", o valor correspondente **NÁO** vira uma `transaction` `in` no extrato bancário.
- Ao invés disso, no bloco de salvamento diário (C), faremos um `upsert` na tabela `cash_registers`:
  - `store_id`, `date`, `expected_amount = summary.totalDinheiro`, `status = 'pending'` (se já nÁo estiver closed).

### 3. `src/routes/loja.$lojaId.tsx`
- Adicionar uma nova aba "Caixa Físico" na seçÁo do Extrato (atualmente tem Todas / Entradas / Saídas).
- Na aba "Caixa Físico", listar os dias pendentes (buscar da tabela `cash_registers`).
- Mostrar um input `<input type="number" />` para cada dia pendente para o gerente digitar o valor contado.
- Um botÁo "Fechar Caixa". Ao clicar, salva o `declared_amount` e muda status para `closed`.

### 4. Novos Hooks (`src/hooks/useCashRegister.ts`)
- `useCashRegisters(storeId)` - Busca os registros.
- `useCloseCashRegister()` - Mutation para salvar a declaraçÁo.

## Mapa de Dependências
- `useImportProcessor.ts` precisa conhecer a separaçÁo do que é "Dinheiro" para descontar do Extrato.
