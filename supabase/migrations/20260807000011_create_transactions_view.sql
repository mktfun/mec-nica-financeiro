CREATE OR REPLACE VIEW transactions AS
SELECT 
  id, store_id, store_name, title, subtitle, amount, type, 'completed' as status, payment_method, os_number, occurred_at, target_date::date, created_at,
  icon_type, NULL as fitid, NULL as cnpj_cpf, NULL as counterpart_name, NULL::numeric as previous_balance, gross_amount, fee_amount, source, NULL::uuid as import_batch_id
FROM manual_transactions
UNION ALL
SELECT 
  id, store_id, NULL as store_name, bank_name as title, NULL as subtitle, amount, type, 'completed' as status, 
  NULL as payment_method, matched_os_number as os_number, occurred_at, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date as target_date, created_at,
  'bank' as icon_type, fitid, cnpj_cpf, counterpart_name, NULL::numeric as previous_balance, NULL::numeric as gross_amount, NULL::numeric as fee_amount, 'ofx' as source, import_batch_id
FROM ofx_transactions
UNION ALL
SELECT 
  id, store_id, NULL as store_name, machine_name as title, NULL as subtitle, net_amount as amount, 'in' as type, 'completed' as status,
  payment_method, matched_os_number as os_number, occurred_at, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date as target_date, created_at,
  'card' as icon_type, NULL as fitid, NULL as cnpj_cpf, NULL as counterpart_name, NULL::numeric as previous_balance, gross_amount, fee_amount, 'rede' as source, import_batch_id
FROM pos_transactions;
