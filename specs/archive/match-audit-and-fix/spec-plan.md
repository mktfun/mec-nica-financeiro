# Spec Plan: Audit and Fix Conciliation Matches (match-audit-and-fix)

## Tasks

- [x] [BACKEND] Escrever migration SQL substituindo a função `auto_match_transactions`. O novo script deve ter o Pipeline 1 (OFX PIX x OS PIX) buscando através de todas as lojas, já que OFX PIX geralmente é global.
- [x] [BACKEND] Adicionar na migration o Pipeline 2 (POS Líquido x OFX Rede). Agrupar os `pos_transactions` por `store_id` (soma de `net_amount`) e procurar o match em `ofx_transactions` independente do `store_id` do OFX.
- [x] [BACKEND] Adicionar na migration o Pipeline 3 (POS Bruto x OS Cartão). Iterar sobre `pos_transactions` (não vinculadas) e buscar OS na `patio_os` (mesmo `store_id`) onde o valor total/pago feche com `gross_amount`.
- [x] [BACKEND] Executar a migration no banco (Cloud) usando `supabase db query --linked`.
- [x] [TEST] Verificar se a chamada da função de auto-match pareia corretamente o escopo global vs local nos 3 cenários.
