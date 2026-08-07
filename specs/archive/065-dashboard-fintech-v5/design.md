# Design: Dashboard Fintech V5 (065)

## Arquitetura de Dados (Data Flow)

O Dashboard abandonará completamente as tabelas legadas (`reconciliations` e `oficina_contas`) e fará o merge dos dados diretamente do coraçÁo da operaçÁo:

1. **Eixo do Tempo (`import_logs`):**
   - Substitui `reconciliations` como fonte de descoberta de datas (`uniqueDates`).
   - O campo `target_date` ditará a data do fechamento.

2. **Faturamento (Revenue):**
   - Base Primária: `import_logs` (campo `total_os` global, e por loja através de agregações caso existam múltiplas lojas num dia).
   - Complemento (Manual): `daily_snapshots.faturamento_outros_valor`.

3. **Caixa Atual (Cash on Hand):**
   - `bank_total` (saldo na conta) extraído do Snapshot ou recalculado pela API do Supabase. Mas para V5, leremos de `daily_snapshots`.
   - Adicionaremos `dinheiro_mp` ao caixa livre.

4. **Contas / Despesas (Expenses via OFX):**
   - Lógica: Consulta na tabela `transactions`.
   - Filtro: `target_date = dateAtual`, `amount < 0`, `source = 'ofx'`.
   - Matemática: `Math.abs(amount)`.
   - AplicaçÁo: Isso alimentará o KPI "Contas" global e o "Contas" de cada loja na tabela `Resultado por Loja`.

5. **A Receber:**
   - Adiciona o campo manual `a_receber_manual` (do Snapshot) na contagem global de A Receber.

## Modificações Críticas em Arquivos

1. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - Ao construir a constante `logsToInsert` (linha 538~), calcular o `osCountTotal` real somando `osArray.length`, e o `total_os` somando os valores reais de Faturamento (total_value das OSs) processados.

2. **`src/hooks/useDashboardV2.ts`:**
   - Alterar query inicial de datas de `.from('reconciliations')` para `.from('import_logs')`.
   - Inserir uma query extra para pegar o snapshot do dia: `.from('daily_snapshots').select('*').eq('date', dateAtual).maybeSingle()`.
   - Alterar a query de `oficina_contas` para usar a já existente requisiçÁo de `transactions` (ou fazê-la se nÁo estiver lá) e somar os valores negativos para formar o KPI de Contas.
   - Refatorar a atribuiçÁo final de variáveis (Faturamento, Contas, Saldo) incorporando os campos manuais do snapshot e a saída do OFX.
