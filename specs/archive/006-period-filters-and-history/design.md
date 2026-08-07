# Design: Filtros de Período e Histórico

## Alterações de Backend (Hooks / Supabase)
1. **`usePatio.ts`:**
   - Adicionar parâmetros `startDate: string` e `endDate: string` na funçÁo.
   - Hoje o Pátio puxa as `finalizadas_hoje` filtrando no Javascript ou no SQL pela data exata? 
   - *Design de ajuste:* Vamos passar o range (primeiro e último dia do mês atual). O `.select()` do Supabase para as finalizadas deverá usar `.gte('closed_at', startDate).lte('closed_at', endDate)`.
2. **`useStores.ts` / `useTransactions.ts`:**
   - Para o histórico de movimentações da loja, criaremos uma view no Supabase ou uma query combinada na tabela `conciliations` e `transactions` listando tudo que aconteceu referente a um `store_id`.
   - Se já temos a tabela `conciliations`, podemos buscar nela `.eq('store_id', lojaId)`.

## Alterações de UI (React)
1. **`patio.tsx`:**
   - Adicionar 2 inputs de data tipo `date` acima da tabela, alinhados à direita (ou perto dos filtros de busca).
   - Definir estado inicial:
     ```javascript
     const now = new Date();
     const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
     const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
     const [startDate, setStartDate] = useState(firstDay);
     const [endDate, setEndDate] = useState(lastDay);
     ```
   - Renomear a tab de "Finalizadas Hoje" para "Finalizadas (Período)".
2. **`lojas.tsx`:**
   - Adicionar um evento `onClick` em cada card de loja.
   - Abrir o componente `Modal` com o título "Histórico - NOME DA LOJA".
   - Dentro do modal, listar a tabela de `conciliations` daquela loja.
3. **Data Anterior (D-1):**
   - Garantir que o Dashboard e resumos globais (onde houver "hoje") chamem `getDefaultDate()` no lugar de `new Date()`.
