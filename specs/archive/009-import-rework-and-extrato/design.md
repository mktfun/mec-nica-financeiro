# Design: RefatoraçÁo da ImportaçÁo e Novo Extrato Bancário (009)

## 1. Banco de Dados
- **Limpeza Necessária**: Vamos limpar as tabelas `patio_os`, `receivables`, `import_logs`, `reconciliations` e `transactions` para começar do zero com o formato em lote.
- Nenhuma tabela nova será criada, mas o uso da tabela `transactions` vai mudar: agora ela armazenará UMA linha para cada OS finalizada (tipo `in`), permitindo a visÁo real do extrato bancário.

## 2. Hooks (Frontend)

### `useImportProcessor.ts`
O hook vai receber um array de OSs e Recebíveis sem estarem atrelados a um único `targetDate`.
Ele vai:
1. Inserir todas as OSs em `patio_os`.
2. Inserir todos os `receivables`.
3. Agrupar as OSs por `closed_at` para inserir os resumos em `reconciliations` e gerar os logs em `import_logs`.
4. (NOVO) Inserir registros na tabela `transactions` com o valor pago de cada OS.

### `useTransactions.ts`
- Novo hook `useExtrato(storeId, startDate, endDate)` para buscar as transações da loja no período.
- Retornará entradas, saídas e o saldo consolidado do período.

## 3. Componentes

### `ImportReportDialog.tsx`
- Remover o state `targetDate` e o input da UI.
- No parsing, remover o filtro `if (closed_at === targetDate)`. Agora todas as OSs sÁo lidas e agrupadas pelas datas em que foram fechadas.

### `historico.tsx`
- Transformado em Extrato Bancário.
- Filtros de Data Inicial e Final.
- Cards superiores de resumo: Entradas, Saídas, Saldo Período.
- Lista cronológica mostrando as OSs pagas e as despesas.
