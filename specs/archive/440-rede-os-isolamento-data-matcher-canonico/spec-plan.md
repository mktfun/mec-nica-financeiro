# Plano de Execução — Spec 440: Rede × OS Isolamento Temporal e Matcher Canônico

- [x] Completed [FORENSE/AUDITORIA] Inspecionar no banco de dados os registros de `pos_transactions` e `patio_os` / `estoque_os_pendente` de 22/09 a 24/09 para a filial da OS #40394. Identificar o estado real da OS #40394 (`credit_value`, `paid_value`, `status`, `store_id`) e transações de R$ 2.286,00. **Verificação:** Script de consulta SQL de leitura sem mutações. Referência: `database`.

- [x] Completed [PARSER/IMPORT] Corrigir a atribuição de `target_date` em `src/components/importacoes/CentralImportWizard.tsx:1507` para usar `effectivePosDate` (data real da venda), mantendo o lote rastreado no metadado. Garantir que arquivos com datas mistas distribuam os registros corretamente. **Verificação:** Executar `npm run build` e teste unitário com lote multi-data. Referências: `backend-patterns`, `spreadsheets`.

- [x] Completed [DB/RPC] Criar migration `supabase/migrations/20260928000001_canonical_rede_os_matcher_and_date_isolation.sql` atualizando a RPC `auto_match_daily_transactions` para:
  1. Comparar `gross_amount` (bruto) com a parcela de cartão da OS (`credit_value`, `debit_value`, `credit_debit_value`) com tolerância de até R$ 0,05.
  2. Atualizar `patio_os.paid_value` com base no `gross_amount` (somente se a OS não estiver finalizada).
  3. Não alterar `settlement_status` (preservar `'a_compensar'`).
  4. Garantir suspensão em caso de colisão (`v_count_candidates > 1`).
  5. Atualizar `match_stage2_rede_os` para seguir a mesma regra de não forçar `settlement_status = 'entrou'`.
  **Verificação:** Executar testes SQL de match único, colisão e idempotência via `npx supabase db push` ou query controlada. Referência: `database`.

- [x] Completed [FRONTEND/UI] Ajustar `src/components/conciliacao/StoreCartaoMaquininhaView.tsx` para filtrar estritamente por `target_date.eq.${date}`, eliminando a sobreposição de vendas passadas. Em `src/components/conciliacao/ManualMatchOsModal.tsx`, exibir rótulos discriminados de Bruto, Taxa MDR e Líquido, e alinhar classes de estilo aos tokens semânticos Zinc-950 de `DESIGN.md`. **Verificação:** Executar `npm run build` sem erros de TypeScript e validar componentes. Referência: `frontend-design-pro`.

- [x] Completed [DADOS/SANEAR] Após aprovação da auditoria forense e do relatório oficial da Rede, executar script transacional de saneamento restrito aos IDs auditados de 22/09 a 24/09 (ajustando `target_date` para a data da venda e recalculando o auto-match canônico), com backup prévio em `.tmp/`. **Verificação:** Consulta de fechamento confirmando que não há vendas de 22/23 na tela de 24/09 e que a OS #40394 foi devidamente resolvida. Referência: `database`.

- [x] Completed [VERIFICAÇÃO/GATE] Executar o Quality Gate final: build completo de produção (`npm run build`), verificação de integridade e conferência dos totais de vendas e liquidação das lojas em 22, 23 e 24/09. **Verificação:** Terminal limpo com `npm run build` aprovado. Referências: `deploy-production`, `afrexai-nextjs-production`.
