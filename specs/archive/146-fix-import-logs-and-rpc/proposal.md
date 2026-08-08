# Proposal: Restauração de Logs de Importação e Ajuste de RPC (146)

## Problema
1. O backend retornou erro `404 Not Found` ao tentar consultar `import_logs` na página da Loja e em outras rotas. O motivo é que a tabela `import_logs` foi acidentalmente destruída em uma migração de limpeza (`20260807000009_schema_cleanup_and_split.sql`). A ausência dessa tabela quebra o tracking de importações diárias no wizard e em outras partes da UI.
2. A RPC `get_store_financial_stats` está lançando erro `400 Bad Request` porque foi declarada recebendo um `p_store_id uuid`, mas o sistema usa identificadores do tipo `text` (ex: `'st-01'`) para Lojas, desde a migração de conversão antiga.
3. Despesas do OFX que possuem datas anteriores à data-alvo não aparecem no Dashboard do dia corrente. Isso ocorre porque a nova view de `transactions` substitui a `target_date` do lançamento pela formatação da data do evento (`occurred_at`). Desse modo, se o OFX for do dia 07, mas o arquivo contiver uma transação do dia 06, ela ficará no dia 06 e não será vista na conciliação do dia 07.

## Solução Proposta
1. Restaurar a tabela `import_logs` através de uma nova migration, devolvendo os seus campos originais, RLS e unique constraint para `(store_id, target_date)`.
2. Alterar a assinatura e implementação da função `get_store_financial_stats` para aceitar `p_store_id text`.
3. Adicionar uma nova coluna real `target_date date` às tabelas físicas `ofx_transactions` e `pos_transactions`. Ao criar a view `transactions`, mapear diretamente para essa coluna `target_date` física ao invés de usar `TO_CHAR(occurred_at, 'YYYY-MM-DD')::date`. Alterar o código do `useBulkInsertTransactions` para persistir o `target_date` original nos inserts físicos.

## Contratos de Dados
- **Tabela `import_logs` (restaurada)**:
  - `id uuid PK`, `store_id text`, `store_name text`, `target_date date`, `total_os numeric`, `total_paid_all numeric`, `total_dinheiro numeric`, `os_count integer`, `receivables_count integer`, `created_at timestamptz`.
  - Unique Constraint: `import_logs_store_id_target_date_key` em `(store_id, target_date)`.
- **Tabelas alteradas**:
  - `ofx_transactions` → nova coluna `target_date date`.
  - `pos_transactions` → nova coluna `target_date date`.
- **RPC `get_store_financial_stats`**:
  - `p_store_id` passa de `uuid` para `text`.

## API / Interface
- O Frontend passará o `target_date` no array de transações do `useBulkInsertTransactions`. O payload do `useBulkInsertTransactions` será ajustado para injetar `target_date` no `upsert` do OFX e do POS.

## Features Existentes Impactadas
- Tela de Central de Importações (voltará a rastrear os logs com sucesso).
- Tela individual da Loja (Dashboard voltará a exibir as contas a pagar corretamente).
- Conciliação (Transações com datas defasadas mas importadas na `target_date` correta voltarão a aparecer sob a conciliação do dia alvo).

## Risco Principal
- View `transactions`: Ao alterar as tabelas base para incluir `target_date`, é necessário recriar a View `transactions`. O erro nessa view pode derrubar o Dashboard geral. (Risco contornado usando DROP VIEW seguido da sua recriação na mesma transação).
