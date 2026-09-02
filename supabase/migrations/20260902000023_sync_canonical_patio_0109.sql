-- ============================================================================
-- Migration: 20260902000023_sync_canonical_patio_0109.sql
-- Sincronização Canônica Estrita de Pátio com a Planilha Oficial (R$ 57.780,63)
-- ============================================================================

-- 1. Finaliza e quita qualquer OS que NÃO esteja na conciliação oficial de 01/09/2026
UPDATE public.patio_os
SET status = 'finalizada',
    paid_value = total_value
WHERE os_number NOT IN ('18465', '18464', '18463', '18462', '18461', '40340', '40339', '40338', '40337', '40336', '40333', '22593', '22592', '22571', '22566', '22559', '4416', '4405', '8766', '8765', '8764', '8763', '8762', '8761', '8759', '8756', '8755', '8689', '8659', '2411', '2410', '2409', '2408', '2405', '2402', '1858', '1857', '1856', '1855', '1854', '1847', '1846', '1818', '1103', '601', '600', '599', '598', '597', '596', '594', '578', '368');

-- 2. Remove duplicações de OSs atribuídas a lojas incorretas
DELETE FROM public.patio_os WHERE os_number = '18465' AND store_id != 'st-06';
DELETE FROM public.patio_os WHERE os_number = '18464' AND store_id != 'st-06';
DELETE FROM public.patio_os WHERE os_number = '18463' AND store_id != 'st-06';
DELETE FROM public.patio_os WHERE os_number = '18462' AND store_id != 'st-06';
DELETE FROM public.patio_os WHERE os_number = '18461' AND store_id != 'st-06';
DELETE FROM public.patio_os WHERE os_number = '40340' AND store_id != 'st-05';
DELETE FROM public.patio_os WHERE os_number = '40339' AND store_id != 'st-05';
DELETE FROM public.patio_os WHERE os_number = '40338' AND store_id != 'st-05';
DELETE FROM public.patio_os WHERE os_number = '40337' AND store_id != 'st-05';
DELETE FROM public.patio_os WHERE os_number = '40336' AND store_id != 'st-05';
DELETE FROM public.patio_os WHERE os_number = '40333' AND store_id != 'st-05';
DELETE FROM public.patio_os WHERE os_number = '22593' AND store_id != '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
DELETE FROM public.patio_os WHERE os_number = '22592' AND store_id != '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
DELETE FROM public.patio_os WHERE os_number = '22571' AND store_id != '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
DELETE FROM public.patio_os WHERE os_number = '22566' AND store_id != '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
DELETE FROM public.patio_os WHERE os_number = '22559' AND store_id != '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
DELETE FROM public.patio_os WHERE os_number = '4416' AND store_id != 'st-04';
DELETE FROM public.patio_os WHERE os_number = '4405' AND store_id != 'st-04';
DELETE FROM public.patio_os WHERE os_number = '8766' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8765' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8764' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8763' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8762' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8761' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8759' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8756' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8755' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8689' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '8659' AND store_id != 'st-07';
DELETE FROM public.patio_os WHERE os_number = '2411' AND store_id != 'st-08';
DELETE FROM public.patio_os WHERE os_number = '2410' AND store_id != 'st-08';
DELETE FROM public.patio_os WHERE os_number = '2409' AND store_id != 'st-08';
DELETE FROM public.patio_os WHERE os_number = '2408' AND store_id != 'st-08';
DELETE FROM public.patio_os WHERE os_number = '2405' AND store_id != 'st-08';
DELETE FROM public.patio_os WHERE os_number = '2402' AND store_id != 'st-08';
DELETE FROM public.patio_os WHERE os_number = '1858' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1857' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1856' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1855' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1854' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1847' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1846' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1818' AND store_id != 'st-09';
DELETE FROM public.patio_os WHERE os_number = '1103' AND store_id != 'st-03';
DELETE FROM public.patio_os WHERE os_number = '601' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '600' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '599' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '598' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '597' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '596' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '594' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '578' AND store_id != 'st-01';
DELETE FROM public.patio_os WHERE os_number = '368' AND store_id != 'st-02';

-- 3. Upsert atômico das 53 OSs canônicas
INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-06', 'Planalto - BRASICAR', '18465', 'N/I', 'Cliente Balcão',
  250, 250, 0, 0,
  250, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-06', 'Planalto - BRASICAR', '18464', 'N/I', 'Cliente Balcão',
  1929.6, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-06', 'Planalto - BRASICAR', '18463', 'N/I', 'Cliente Balcão',
  385, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-06', 'Planalto - BRASICAR', '18462', 'N/I', 'Cliente Balcão',
  3468, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-06', 'Planalto - BRASICAR', '18461', 'N/I', 'Cliente Balcão',
  190, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-05', 'Piraporinha - EMPORIO', '40340', 'N/I', 'Cliente Balcão',
  950, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-05', 'Piraporinha - EMPORIO', '40339', 'N/I', 'Cliente Balcão',
  450, 450, 0, 450,
  0, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-05', 'Piraporinha - EMPORIO', '40338', 'N/I', 'Cliente Balcão',
  375, 375, 0, 375,
  0, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-05', 'Piraporinha - EMPORIO', '40337', 'N/I', 'Cliente Balcão',
  9670.7, 5300, 5300, 0,
  0, 0, 'pago_parcial', 'pago_parcial', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-05', 'Piraporinha - EMPORIO', '40336', 'N/I', 'Cliente Balcão',
  640, 640, 0, 0,
  640, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-05', 'Piraporinha - EMPORIO', '40333', 'N/I', 'Cliente Balcão',
  0, 0, 0, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', '22593', 'N/I', 'Cliente Balcão',
  1200, 720, 0, 0,
  720, 0, 'pago_parcial', 'pago_parcial', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', '22592', 'N/I', 'Cliente Balcão',
  385, 365.75, 0, 0,
  365.75, 0, 'pago_parcial', 'pago_parcial', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', '22571', 'N/I', 'Cliente Balcão',
  0, 0, 0, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-17'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', '22566', 'N/I', 'Cliente Balcão',
  3709, 3709, 0, 3709,
  0, 0, 'finalizada', 'finalizada', '2026-08-13'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', 'Maua - MHE', '22559', 'N/I', 'Cliente Balcão',
  6003.64, 5537.04, 0, 5537.04,
  0, 0, 'pago_parcial', 'pago_parcial', '2026-08-08'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-04', 'Kennedy - MP', '4416', 'N/I', 'Cliente Balcão',
  1743.8, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-04', 'Kennedy - MP', '4405', 'N/I', 'Cliente Balcão',
  4153.6, 4153.6, 0, 2076.8,
  2076.8, 0, 'finalizada', 'finalizada', '2026-08-18'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8766', 'N/I', 'Cliente Balcão',
  280, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8765', 'N/I', 'Cliente Balcão',
  562.8, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8764', 'N/I', 'Cliente Balcão',
  1796, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8763', 'N/I', 'Cliente Balcão',
  2736.4, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8762', 'N/I', 'Cliente Balcão',
  1585, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8761', 'N/I', 'Cliente Balcão',
  5094.7, 5094.7, 0, 5094.7,
  0, 0, 'finalizada', 'finalizada', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8759', 'N/I', 'Cliente Balcão',
  0, 0, 0, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-27'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8756', 'N/I', 'Cliente Balcão',
  2583.62, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-26'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8755', 'N/I', 'Cliente Balcão',
  3100, 3100, 0, 3100,
  0, 0, 'finalizada', 'finalizada', '2026-08-26'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8689', 'N/I', 'Cliente Balcão',
  4140, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-07-14'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-07', 'Rudge Ramos - CAP', '8659', 'N/I', 'Cliente Balcão',
  1200, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-06-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-08', 'Santo André - HD', '2411', 'N/I', 'Cliente Balcão',
  2609.9, 2609.9, 0, 2609.9,
  0, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-08', 'Santo André - HD', '2410', 'N/I', 'Cliente Balcão',
  385, 385, 385, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-08', 'Santo André - HD', '2409', 'N/I', 'Cliente Balcão',
  3332, 3332, 3332, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-08', 'Santo André - HD', '2408', 'N/I', 'Cliente Balcão',
  434.5, 434.5, 0, 434.5,
  0, 0, 'finalizada', 'finalizada', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-08', 'Santo André - HD', '2405', 'N/I', 'Cliente Balcão',
  385, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-08', 'Santo André - HD', '2402', 'N/I', 'Cliente Balcão',
  2302.16, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1858', 'N/I', 'Cliente Balcão',
  4140, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1857', 'N/I', 'Cliente Balcão',
  900, 900, 900, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1856', 'N/I', 'Cliente Balcão',
  4000, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1855', 'N/I', 'Cliente Balcão',
  900, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1854', 'N/I', 'Cliente Balcão',
  0, 0, 0, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-27'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1847', 'N/I', 'Cliente Balcão',
  899, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-20'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1846', 'N/I', 'Cliente Balcão',
  4480, 240, 0, 240,
  0, 0, 'pago_parcial', 'pago_parcial', '2026-08-19'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-09', 'Rei do Módulo - MP', '1818', 'N/I', 'Cliente Balcão',
  2800, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-06'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-03', 'Jorge Beretta - DHJV', '1103', 'N/I', 'Cliente Balcão',
  865, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '601', 'N/I', 'Cliente Balcão',
  2637.5, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '600', 'N/I', 'Cliente Balcão',
  520, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '599', 'N/I', 'Cliente Balcão',
  5186.3, 5186.3, 0, 5186.3,
  0, 0, 'finalizada', 'finalizada', '2026-08-31'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '598', 'N/I', 'Cliente Balcão',
  3180, 3000, 3000, 0,
  0, 0, 'pago_parcial', 'pago_parcial', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '597', 'N/I', 'Cliente Balcão',
  1700, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-29'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '596', 'N/I', 'Cliente Balcão',
  3330, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-28'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '594', 'N/I', 'Cliente Balcão',
  0, 0, 0, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-27'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-01', 'Dom Pedro - DP', '578', 'N/I', 'Cliente Balcão',
  0, 0, 0, 0,
  0, 0, 'finalizada', 'finalizada', '2026-08-12'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

INSERT INTO public.patio_os (
  store_id, store_name, os_number, plate, client_name,
  total_value, paid_value, pix_transfer_value, credit_value,
  debit_value, cash_value, status, raw_status, opened_at
) VALUES (
  'st-02', 'Jabaquara - JAB', '368', 'N/I', 'Cliente Balcão',
  211.2, 0, 0, 0,
  0, 0, 'em_aberto', 'em_aberto', '2026-08-01'::timestamptz
)
ON CONFLICT (store_id, os_number) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  paid_value = EXCLUDED.paid_value,
  pix_transfer_value = EXCLUDED.pix_transfer_value,
  credit_value = EXCLUDED.credit_value,
  debit_value = EXCLUDED.debit_value,
  cash_value = EXCLUDED.cash_value,
  status = EXCLUDED.status,
  raw_status = EXCLUDED.raw_status,
  opened_at = EXCLUDED.opened_at;

