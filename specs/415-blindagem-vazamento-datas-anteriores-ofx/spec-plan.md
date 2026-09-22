# 📝 Spec Plan: Blindagem contra Vazamento de Datas Anteriores do OFX (Spec 415)

> **Regra Canônica:** Todas as tarefas iniciam estritamente como `- [ ] Pending`. Nenhuma tarefa deve ser marcada como concluída durante a fase de proposal.

---

### [DB] Banco de Dados & RPCs

- [x] Completed **Task 1: Saneamento fiduciário de target_date e blindagem estrita na RPC get_daily_reconciliation_summary**
  - Arquivo: `supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql`
  - Descrição: Criar migração que realinha `target_date = occurred_at::date` para as 17 transações com `occurred_at < '2026-09-16'` que foram marcadas indevidamente como `2026-09-17`, e atualiza a RPC `get_daily_reconciliation_summary` para filtrar estritamente por `t.target_date = v_target_date::date`, eliminando o bypass cego de `import_batch_id`.
  - Skill: `database`
  - Verificação: Script Node chamando a RPC para `2026-09-17` confirmando que Piraporinha (`st-05`) retorna Entradas R$ 3.430,00 e Saídas R$ 5.000,00, mantendo as demais 9 filiais inalteradas.

---

### [BACKEND] Normalização na Ingestão e Hooks

- [x] Completed **Task 2: Blindar atribuição de datas multi-dias no CentralImportWizard e useTransactions.ts**
  - Arquivo: `src/components/importacoes/CentralImportWizard.tsx` e `src/hooks/useTransactions.ts`
  - Descrição: No `CentralImportWizard.tsx`, impedir que transações de datas anteriores a D-1 (ex: D-2, D-3) sejam convertidas para `targetDate`; elas devem manter sua própria data natural (`parsedTxDate`). No `useTransactions.ts`, remover `import_batch_id` cego do filtro `dateFilter` para garantir que a consulta por data não puxe dias passados do mesmo lote.
  - Skill: `backend-patterns`
  - Verificação: `npm run build` passa sem erros de tipagem.

---

### [FRONTEND] Escopo Estrito na Tela de Detalhes da Loja

- [x] Completed **Task 3: Isolar visualização dia_alvo no StoreExtratoBancarioView**
  - Arquivo: `src/components/conciliacao/StoreExtratoBancarioView.tsx`
  - Descrição: No `StoreExtratoBancarioView.tsx`, quando `viewScope === 'dia_alvo'`, filtrar estritamente `rawTransactions` e o loop `dayGroups` para a data da conciliação (`target_date === date`), impedindo que transações e accordions de datas passadas (como 14/09 e 15/09) apareçam na lista de fechamento do dia ou inflem os KPIs locais.
  - Skill: `frontend-design-pro`
  - Verificação: Teste local via script verificando que no escopo `dia_alvo` da filial `st-05` em `2026-09-17` são retornadas exatamente as 4 transações do dia.

---

### [SECURITY/TEST] Validação Integrada e Quality Gate

- [x] Completed **Task 4: Quality Gate final de build e validação das 10 filiais**
  - Arquivo: N/A
  - Descrição: Executar script de validação de ponta a ponta contra o Supabase remoto confirmando valores batidos em todas as 10 filiais no dia `2026-09-17`, limpar resíduos em `.tmp/` e executar `npm run build`.
  - Skill: `security`
  - Verificação: Terminal limpo, exit code 0 em `npm run build`.
