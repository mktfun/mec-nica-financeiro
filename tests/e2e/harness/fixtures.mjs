// tests/e2e/harness/fixtures.mjs

export const MOCK_STORES = [
  { id: 'st-01', name: 'Dom Pedro - DP' },
  { id: 'st-02', name: 'Jabaquara - JAB' },
  { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  { id: 'st-04', name: 'Kennedy - MP' },
  { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  { id: 'st-06', name: 'Planalto - BRASICAR' },
  { id: 'st-07', name: 'Rudge Ramos - CAP' },
  { id: 'st-08', name: 'Santo André - HD' },
  { id: 'st-09', name: 'Rei do Módulo - MP' },
  { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' }
];

export const BOUNDARY_INPUTS = {
  EMPTY_DATE: '',
  NULL_DATE: null,
  INVALID_DATE_FORMAT: '17-08-2026',
  IMPOSSIBLE_DATE: '2026-02-31',
  FUTURE_DATE: '2030-12-31',
  PAST_ANCIENT_DATE: '1990-01-01',
  SQL_INJECTION_DATE: "2026-08-24'; DROP TABLE test; --",
  EXTREME_AMOUNT: 999999999.99,
  NEGATIVE_AMOUNT: -5000.00,
  TINY_AMOUNT: 0.01,
  ZERO_AMOUNT: 0.00
};

export const MOCK_OFX_TX = {
  store_id: 'st-01',
  bank_name: 'Banco Itaú',
  type: 'in',
  amount: 1500.50,
  occurred_at: '2026-08-24T10:30:00Z',
  target_date: '2026-08-24',
  fitid: 'TEST_E2E_FITID_' + Date.now(),
  counterpart_name: 'Cliente E2E Test',
  cnpj_cpf: '12345678901',
  match_status: 'pending'
};

export const MOCK_POS_TX = {
  store_id: 'st-01',
  machine_name: 'Rede POS 01',
  payment_method: 'credito_vista',
  gross_amount: 100.00,
  net_amount: 97.00,
  fee_amount: 3.00,
  occurred_at: '2026-08-24T14:20:00Z',
  target_date: '2026-08-24',
  dedup_hash: 'TEST_HASH_' + Date.now(),
  settlement_status: 'a_compensar'
};

export const MOCK_DAILY_BILL = {
  store_id: 'st-01',
  date: '2026-08-24',
  title: 'Conta de Energia E2E',
  amount: 450.00,
  category: 'energia'
};
