const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
  const projectRef = process.env.SUPABASE_PROJECT_REF || (process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]);
  const sqlEndpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const query = `
    WITH recon_latest AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= '2026-08-24'
        ORDER BY store_id, date DESC
    ),
    ofx_in_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as ofx_in_total
        FROM ofx_transactions
        WHERE target_date = '2026-08-24' AND type = 'in'
        GROUP BY store_id
    ),
    patio_store AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0) as patio_val
        FROM patio_os
        WHERE opened_at <= '2026-08-24 23:59:59'::timestamp
          AND (closed_at IS NULL OR closed_at > '2026-08-24 23:59:59'::timestamp)
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
        GROUP BY store_id
    ),
    vault_store AS (
        SELECT 
            store_id, 
            COALESCE(SUM(amount), 0) as vault_val,
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'description', description,
                'entry_date', entry_date,
                'status', status
            )), '[]'::jsonb) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= '2026-08-24' AND status IN ('em_transito', 'pending')
        GROUP BY store_id
    )
    SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(r.bank_total, 0),
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'dinheiro_loja', COALESCE(v.vault_val, 0),
        'na_loja_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'previsto_ofx', COALESCE(ois.ofx_in_total, 0)
    ) ORDER BY s.name) as stores
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN vault_store v ON v.store_id = s.id
    LEFT JOIN ofx_in_store ois ON ois.store_id = s.id
    WHERE s.active = true;
  `;

  const resp = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query })
  });

  const res = await resp.json();
  console.log('Stores aggregation result:', JSON.stringify(res, null, 2));
}
testQuery();
