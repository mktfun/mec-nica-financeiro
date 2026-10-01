# Spec-Plan: Corrigir a Seleção de Saldo OFX e Impedir Sucesso Falso (Spec 462)

## Domínio 1: [DB] Banco de Dados & Procedimentos Armazenados (Skill: `database`)

- [x] Completed: Criar migration `supabase/migrations/20261001000003_fix_apply_ofx_balance_selection_and_idempotency.sql`
  - Reimplementar `public.apply_ofx_balance_selection` com:
    - Remoção estrita de `updated_at` do `INSERT` e `ON CONFLICT DO UPDATE` em `public.reconciliations`.
    - Preservação da atualização de `bank_total` via `EXCLUDED.bank_total`.
    - Idempotência em `public.ofx_balance_rules`: verificar se já existe regra ativa com mesmos atributos (`account_key`, `source_kind`, `memo_normalized`, `store_id`) para evitar incrementar versão em retries idênticos.
    - Idempotência em `public.ofx_balance_selection_events`: auditar apenas quando a seleção ou valor forem diferentes da seleção anterior.
    - Soma algébrica por loja (`GROUP BY sel.store_id`) cobrindo saldos positivos, negativos e nulos.
    - Atualização transacional de `daily_snapshots.saldo_bancario` e invocação de `get_daily_reconciliation_summary(p_target_date::text, true)`.
  - Verificação Terminal: Migration aplicada no Supabase e validada execução da RPC sem erro 42703.

---

## Domínio 2: [FRONTEND-HOOK] Camada de Dados e Invalidação de Cache (Skill: `backend-patterns`)

- [x] Completed: Atualizar hook `src/hooks/useOfxBalanceMappings.ts`
  - Tipar retorno de `applyMutation` e garantir lançamento de erro detalhado.
  - Invalidação abrangente de caches no TanStack Query (`ofx_balance_rules`, `ofx_balance_selections`, `reconciliations`, `daily-reconciliation-summary`, `daily_snapshots`, `conciliacao-backend`, `stores`).
  - Verificação Terminal: `npm run build` confirma compatibilidade de tipos.

---

## Domínio 3: [FRONTEND-WIZARD] Wizard de Importação, Auditoria JSON & Retry Isolado (Skill: `frontend-design-pro`)

- [x] Completed: Atualizar `src/components/importacoes/CentralImportWizard.tsx`
  - Capturar erro em `applyOfxBalanceSelection` no bloco de persistência.
  - Armazenar estado de erro estruturado `ofxBalanceSelectionError` com código, mensagem, data e contas afetadas.
  - Marcar o agente OFX (`importStages[2]`) com status `'error'` e mensagem descritiva.
  - Bloquear a mensagem enganosa `"✅ TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO!"` quando o saldo falhar.
  - Adicionar o erro ao payload exportável do JSON de auditoria (`auditData.ofxBalanceSelectionError`).
  - No Step 8, renderizar banner de aviso com botão de ação prioritário **"Repetir Aplicação de Saldo OFX"**.
  - O retry manual executa unicamente a RPC `applyOfxBalanceSelection` para o payload da sessão, sem reimportar arquivos nem duplicar vínculos de OS ou despesas.
  - Ao obter sucesso no retry: marcar estágio como `'success'`, limpar estado de erro, notificar o usuário com toast e revalidar resumos.
  - Verificação Terminal: `npm run build` passa sem erros e sem classes arbitrárias.

---

## Domínio 4: [TEST & VERIFICATION] Testes Automatizados & Quality Gate (Skill: `database` & `security`)

- [x] Completed: Criar suíte de testes de integração `tests/integration/ofx-balance-selection.test.mjs`
  - Testar chamada à RPC `apply_ofx_balance_selection` confirmando ausência de erro 42703.
  - Testar soma contábil correta com 2 contas na mesma filial (saldo positivo + saldo negativo).
  - Testar idempotência: executar retry consecutivo e comprovar que `ofx_balance_rules` não cria versão duplicada.
  - Testar persistência de regra somente quando `remember_rule = true`.
- [x] Completed: Criar teste unitário `tests/unit/import-stage-outcome.test.mjs`
  - Validar lógica de bloqueio de sucesso integral quando qualquer estágio crítico/financeiro falhar.
  - Executar `npm run build` garantindo zero erros de compilação.
  - Verificação Terminal: `node tests/integration/ofx-balance-selection.test.mjs` e `node tests/unit/import-stage-outcome.test.mjs` com 100% de aprovação.
