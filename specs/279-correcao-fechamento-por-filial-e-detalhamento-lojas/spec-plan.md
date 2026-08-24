# Spec Plan: Correção do Fechamento por Filial e Contrato de Dados por Loja (279)

## Tasks

- [ ] [BACKEND] Criar e aplicar migração SQL `20260824000009_fix_store_reconciliation_array_in_rpc.sql`:
  - Retornar tanto `'stores'` quanto `'stores_detail'` na RPC `get_daily_reconciliation_summary`
  - Mapear cada elemento da lista com:
    - `saldo_banco` e `saldo_banco_ofx` (reconciliations.bank_total)
    - `maquininha` (rede_in ou ofx_maquininhas)
    - `pix` (pix_os)
    - `na_loja_os` (patio_os)
    - `previsto_ofx` (ofx_in_total)
    - `diferenca` (pendentes não justificados)
    - `nao_entrou_valor` (cartoes_a_compensar)
    - `status_compensacao` (entrou / parcial / nao_entrou / sem_movimento)
    - `status` (approved se diferenca <= 0.05 senao divergence)
- [ ] [FRONTEND] Ajustar hook `src/hooks/useBackendConciliacao.ts`:
  - Garantir fallback `data.stores = data.stores || data.stores_detail || []`
- [ ] [FRONTEND] Validar layout e renderização em `src/routes/conciliacao.index.tsx`
- [ ] [TEST] Executar script de auditoria da RPC e validar que `stores` possui 10 itens com valores não zerados
- [ ] [TEST] Executar `npm run build` e confirmar 0 erros TypeScript
