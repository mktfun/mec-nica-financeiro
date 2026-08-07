# Tasks - Refinamento ConciliaçÁo e Tela Dedicada

## Backend Engineer
- [x] Criar novos Hooks em `src/hooks/useConciliacao.ts` (ou ajustar existentes como `useConciliacaoDiaria`) que nÁo confiem no `bank_total` genérico, e sim na soma dinâmica: Buscar `transactions` no `targetDate` e separar a soma `(type = in) - (type = out)` onde `source = ofx` (para o "Extrato Bancário") e `source IN ('patio', 'despesa')` (para o "Apurado Sistema").

## Frontend Engineer
- [x] No arquivo `src/routes/loja.$lojaId.tsx`:
  - Remover a aba "ConciliaçÁo 3-WAY".
  - Remover as abas "Apenas Entradas", "Apenas Saídas", "Todas as Transações" (deixe apenas o Resumo Gerencial / Faturamento Mensal, se houver).
  - Limpar a UI de conciliaçÁo diária da tela de detalhes, mantendo nela o perfil da loja e os dados de longo prazo (Mensal).
- [x] Criar uma nova rota: `src/routes/conciliacao.$lojaId.tsx`
  - Criar componente que receba a `lojaId` e a data (via search params `?date=YYYY-MM-DD`).
  - Mover o grid do `useTripleMatch` (ConciliaçÁo 3-WAY) para cá.
  - Mover o grid/lista de transações de Extrato Bancário ("Todas", "Entradas", "Saídas") para cá.
  - Implementar UI Liquid Glass e modernidades propostas na `design.md`.
- [x] No arquivo `src/routes/conciliacao.tsx`:
  - Atualizar os redirecionamentos nos cards de Lojas (`<Link>`). Onde antes era `/loja/st-01`, passe a ser `/conciliacao/st-01?date=${selectedDate}`.
  - Corrigir a lógica matemática que calcula os totalizadores da tela principal para que o "Extrato Bancário" exiba a SOMA das transações do dia (DELTA) ao invés do saldo final do banco. O mesmo para "Apurado Sistema".
