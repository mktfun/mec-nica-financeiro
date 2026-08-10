SELECT s.name, r.date::text, r.bank_total, r.na_loja_os FROM reconciliations r JOIN stores s ON s.id::text = r.store_id WHERE r.date >= '2026-08-04' ORDER BY r.date, s.name LIMIT 20;
