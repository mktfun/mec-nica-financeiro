# Design Document: Backend Aggregation Views (Spec 110)

## 1. get_receivables_summary()
```sql
CREATE OR REPLACE FUNCTION get_receivables_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```
- Varre a tabela `receivables` agrupando por `store_id`.
- Utiliza subqueries ou SUM(CASE WHEN ...) para dividir os saldos entre "pendentes" (no prazo) e "vencidos" (due_date < hoje).
- Retorna um array de JSON com os totais de cada loja e contagem de itens, prontos para o KpiCard.

## 2. get_patio_summary()
```sql
CREATE OR REPLACE FUNCTION get_patio_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```
- Varre a tabela `patio_os`.
- Somente processa `status IN ('em_aberto', 'pago_parcial')`.
- Calcula automaticamente o `total_value - COALESCE(paid_value, 0)`.
- Retorna o número de veículos e o valor a receber total, agrupado por `store_id`.

## 3. get_store_financial_stats(p_store_id uuid, p_start_date date, p_end_date date)
```sql
CREATE OR REPLACE FUNCTION get_store_financial_stats(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
```
- Agrega as entradas (`type='in'`) e saídas (`type='out'`) de `transactions` para uma loja num dado período.
- Retorna um objeto consolidado com `{ "total_in": X, "total_out": Y }` e quebras menores se necessário para gráficos, economizando a transferência do histórico de transações pro navegador.
