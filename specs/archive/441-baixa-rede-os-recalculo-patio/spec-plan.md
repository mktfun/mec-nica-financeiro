# Plano de Execução — Spec 441: Baixa Rede × OS e Recálculo Atômico do Pátio

- [x] Completed [FORENSE/BACKUP] Gerar backup em JSON do estado atual das tabelas `patio_os`, `reconciliations` e `daily_snapshots` para a filial `st-03` e datas 25/09 e 28/09 em `.tmp/backup_patio_pre_441.json`. Confirmar a equação exata da OS #1120 (`6.583,80 - 3.794,28 = 2.789,52`) e o delta do pátio global (R$ 73.338,54 -> R$ 69.544,26). **Verificação:** Script de consulta SQL sem mutações salvando o snapshot em `.tmp/`. Referência: `database`.

- [x] Completed [DB/RPC] Criar migration `supabase/migrations/20260928000002_recompute_patio_and_atomic_rede_os_settlement.sql` contendo:
  1. Função canônica `public.recompute_patio_for_date_and_store(p_date DATE, p_store_id TEXT)` para recomputar e sincronizar atomicamente `reconciliations.na_loja_os`, `daily_snapshots.total_patio` e `metadata.stores`.
  2. Atualização da RPC `public.link_manual_rede_to_os` para chamar o recálculo canônico na mesma transação e retornar o payload JSONB discriminado com antes/depois.
  3. Atualização da RPC `public.unlink_manual_os_match` para reverter o pagamento correspondente à transação POS e recalcular o pátio.
  **Verificação:** Teste de execução das RPCs no banco Supabase com checagem de integridade e idempotência. Referência: `database`.

- [x] Completed [FRONTEND/HOOKS] Atualizar `src/hooks/useManualMatch.ts` para invalidar todas as queries dependentes do pátio (`['store-ordens-servico']`, `['patio-os-detail-modal']`, `['daily-reconciliation-summary']`, `['daily_snapshots']`, `['reconciliations']`) e retornar os dados contábeis de retorno. Em `src/components/conciliacao/ManualMatchOsModal.tsx`, exibir toast/feedback informativo com o impacto no saldo da OS e no pátio da loja. **Verificação:** Executar `npm run build` sem erros de tipagem TypeScript. Referências: `frontend-design-pro`, `backend-patterns`.

- [x] Completed [FRONTEND/COMPONENTS] Harmonizar `src/components/conciliacao/StoreOrdensServicoView.tsx` e `src/components/conciliacao/PatioOsDetailModal.tsx` para delegar o recálculo de pátio à função canônica do banco ou usar a mesma fórmula padronizada, garantindo que `0` seja tratado como valor válido e não como ausência. **Verificação:** `npm run build` e validação de consistência estática. Referência: `frontend-design-pro`.

- [x] Completed [DADOS/SINCRONIZAR] Executar a rotina `recompute_patio_for_date_and_store` para a data `2026-09-28` e loja `st-03`, alinhando os registros persistidos: `reconciliations.na_loja_os = 3.159,42` e `daily_snapshots.total_patio = 69.544,26`. **Verificação:** Consultas SQL no Supabase confirmando a igualdade dos agregados e a ausência de impactos em contas OFX. Referência: `database`.

- [x] Completed [VERIFICAÇÃO/GATE] Executar o Quality Gate final: build completo de produção (`npm run build`), verificação visual de ausência de segredos e conferência do painel de conciliação e pátio para `st-03` em `2026-09-28`. **Verificação:** Terminal limpo com `npm run build` aprovado. Referências: `deploy-production`, `afrexai-nextjs-production`.
