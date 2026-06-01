# Tasks: Reset do Banco e Ajuste na Conciliação (007)

- [x] **1. Consertar a Autenticação (Login)**
  - [x] Adicionar `try/catch` no bloco `supabase.auth.signInWithPassword` em `useAuth.ts`.
  - [x] Garantir que `setLoading(false)` execute sempre no bloco `finally`.
  - [x] Validar a apresentação do erro no UI.

- [x] **2. Refatorar Lógica de Conciliação em Dinheiro**
  - [x] No `ImportReportDialog.tsx`, calcular e exportar a propriedade `totalDinheiro` a partir do objeto `payments`.
  - [x] Em `useImportProcessor.ts`, receber `totalDinheiro` (ou extrai-lo do payload) e enviá-lo como `financialTotal` para a mutação do relatório diário.
  - [x] Garantir que o Dashboard não perca a visualização do total de entrada do dia (ajustar `conciliacao.tsx` para apresentar `os_total` como entradas, se for o caso).

- [x] **3. Reset do Banco de Dados**
  - [x] Executar script SQL via `supabase-mcp-server execute_sql` (ou equivalente) para limpar as tabelas: `patio_os`, `receivables`, `conciliations`, `alerts`, `daily_cash_values`.

- [x] **4. Build & Test**
  - [x] Rodar `npm run build` para garantir a estabilidade.
  - [x] Verificar se os hooks e imports continuam íntegros.
