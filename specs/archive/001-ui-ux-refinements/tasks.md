# Tasks: Refinamentos de UI/UX e Inteligência Temporal (001-ui-ux-refinements)

## 1. Responsividade Vertical de Cards (min-h-400px)
- [ ] Editar `src/routes/patio.tsx`, localizar o `min-h-[400px]` no wrapper da lista e remover/ajustar.
- [ ] Editar `src/routes/recebiveis.tsx`, remover o `min-h-[400px]` dos cards de lista.
- [ ] Editar `src/routes/importacoes.tsx`, certificar que a listagem não tem `min-h-[400px]` desnecessário.
- [ ] Editar `src/routes/loja.$lojaId.tsx`, remover `min-h-[400px]` da coluna de Extrato.

## 2. Layout da Loja (Reposição do "Sem Divergências")
- [ ] Em `src/routes/loja.$lojaId.tsx`, localizar a section que exibe `<Card className="p-4 border-l-4 border-l-[var(--color-success)]">... Sem Divergências ...</Card>`.
- [ ] Mover esse bloco para o topo da coluna de "Extrato Bancário" (Coluna Direita `lg:col-span-2`) ou como um banner Full-Width (`lg:col-span-3`) imediatamente antes da divisão de colunas (abaixo dos 4 KPI Cards). 
- [ ] Validar alinhamento visual com Tailwind.

## 3. Tela de Evolução da OS (Timeline Visual)
- [ ] Em `src/routes/patio.tsx`, localizar o Modal de `selectedOs`.
- [ ] Reformular a exibição de `history_log`. Criar um componente de Timeline UI (bolinhas ligadas por linha vertical).
- [ ] Se o Array de Histórico estiver vazio, exibir um Empty State elegante indicando "OS Aberta (Nenhuma alteração registrada ainda)".

## 4. Inteligência Temporal Global (Dashboard Fix)
- [ ] Criar um Estado Global ou modificar a obtenção de datas em `src/hooks/useTransactions.ts` (`useDashboardSummary`) e `src/hooks/useConciliacao.ts` (`useConciliacaoResumo`).
- [ ] Modificar `getDefaultDate()` ou adicionar um hook auxiliar que tenta descobrir o mês com os dados mais recentes se não houver um `MonthPicker`. (Ou alternativamente, adicionar um `<input type="month">` super simples ao Topo do Dashboard (`index.tsx` e `conciliacao.tsx`) controlando um estado de Data Base).
- [ ] Refatorar os Queries para usarem essa Data Base em vez do `today` estático.
