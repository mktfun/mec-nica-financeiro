# Spec Plan: Corrigir Matemática da Conciliação e Restaurar Histórico de OS (148-fix-conciliation-diff)

## Tasks

- [x] [BACKEND] Executar query de limpeza de duplicatas em `pos_transactions` onde `dedup_hash IS NULL` para remover o lixo inflado da maquininha.
- [x] [BACKEND] Modificar a query de `v_na_loja_os` na RPC `calculate_daily_conciliation` para restaurar a prioridade do snapshot salvo na tabela `reconciliations` se existir, usando `patio_os` apenas como fallback para datas atuais sem snapshot.
- [x] [BACKEND] Alterar o cálculo de `v_previsto_ofx` na mesma RPC de volta ao original, confiando no `store_id` associado, já que os arquivos OFX são de fato importados por loja.
- [x] [BACKEND] Modificar a RPC `auto_match_transactions` para reativar a exigência de `ofx.store_id = os.store_id`, impedindo cruzamentos indevidos entre filiais.
- [x] [BACKEND] Executar as migrations no banco.
- [x] [TEST] Garantir que o Dashboard não mostre mais diferenças gritantes (tipo -120k) e que o Na Loja OS mostre valores preenchidos.
