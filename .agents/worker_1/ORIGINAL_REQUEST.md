## 2026-07-24T19:49:34Z
Execute Requirement R1 (Mock Data Generation and Insertion for ALL registered stores).

Step-by-Step Instructions:
1. Inspect `.env` or `.env.local` in `c:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro` to obtain Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. Create and run a script (e.g., `scripts/seed-stress-test.js` or `scripts/seed-stress-test.ts` via `cmd.exe /c "node ..."` or `npx tsx ...`) that:
   a. Queries `public.stores` to fetch ALL active registered stores (`st-01` to `st-09` and `3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f`). Verify that all 10 stores are retrieved.
   b. Generates a unique batch timestamp tag: `STRESS_TEST_<TIMESTAMP>` (e.g. `STRESS_TEST_20260724_170000`).
   c. For EACH of the 10 stores, inserts realistic financial records for target date `2026-07-24`:
      - **Exact Triple Match Pair**: 1 record in `patio_os` (`os_number='STRESS_<STORE>_TRIPLE_01'`, `total_value=1850.00`, `paid_value=1850.00`, `status='finalizado'`, `payment_method='CARTÃO'`), 1 record in `transactions` (`source='rede'`, `amount=1850.00`, `type='in'`, `os_number='STRESS_<STORE>_TRIPLE_01'`, `icon_type=batch_tag`), 1 record in `transactions` (`source='ofx'`, `amount=1850.00`, `type='in'`, `title='STRESS_TEST... | DEPOSITO REDECARD'`, `icon_type=batch_tag`).
      - **Partial Match OS + Rede**: 1 record in `patio_os` (`os_number='STRESS_<STORE>_PARTIAL_REDE'`, `total_value=920.00`, `paid_value=920.00`, `payment_method='CARTÃO'`), 1 record in `transactions` (`source='rede'`, `amount=920.00`, `type='in'`, `os_number='STRESS_<STORE>_PARTIAL_REDE'`, `icon_type=batch_tag`).
      - **Partial Match OS + OFX**: 1 record in `patio_os` (`os_number='STRESS_<STORE>_PARTIAL_PIX'`, `total_value=650.00`, `paid_value=650.00`, `payment_method='PIX'`), 1 record in `transactions` (`source='ofx'`, `amount=650.00`, `type='in'`, `title='STRESS_TEST... | PIX RECEBIDO CLIENTE'`, `icon_type=batch_tag`).
      - **Exceptions**: 1 unmatched `patio_os` (`os_number='STRESS_<STORE>_UNMATCHED_OS'`, `total_value=3100.00`), 1 unmatched `transactions` (`source='rede'`, `amount=410.00`, `type='in'`, `title='STRESS_TEST... | Venda Avulsa Maquininha'`), 1 unmatched `transactions` (`source='ofx'`, `amount=1250.00`, `type='in'`, `title='STRESS_TEST... | DEPOSITO DINHEIRO'`).
   d. Inserts corresponding entries in `import_logs` and `reconciliations` for each store for date `2026-07-24` tagged with `STRESS_TEST` in `top_error` / `store_name`.
3. Execute the script, capturing output and verifying that every single database insert succeeded with 0 errors across all 10 stores.
4. Run a verification query to count inserted rows by table and store ID.
5. Document all insertion metrics, batch ID, exact code created, and query results in `c:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro\.agents\worker_1\handoff.md`.
6. Send a completion message back to the parent orchestrator with the summary and path to `handoff.md`.
