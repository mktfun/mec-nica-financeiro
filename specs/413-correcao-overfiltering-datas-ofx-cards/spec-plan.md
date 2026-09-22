# 📝 Spec Plan: Correção do Over-filtering de Datas do OFX (Cards Zerados na Conciliação)

> **Regra Canônica:** Todas as tarefas iniciam estritamente como `- [ ] Pending`. Nenhuma tarefa deve ser marcada como concluída durante a fase de proposal.

---

### [DB] Banco de Dados & RPCs

- [x] Completed **Task 1: Criar migration de atualização da RPC SSOT e View Transactions**
  - Arquivo: `supabase/migrations/20260917000002_fix_ofx_daterange_sargability.sql`
  - Descrição: Refatorar `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)` com cálculo de limites temporais sargables em UTC e Brasília (`America/Sao_Paulo`), aplicação do predicado nas CTEs `ofx_entradas_agg`, `ofx_saidas_agg`, `rede_agg` e consultas de faturamento e contas, além da exportação completa das chaves de Split Dual no JSON de lojas. Recriar a view `transactions` com derivação fuso-horária segura de `target_date`.
  - Skill: `database`
  - Verificação: Execução da RPC via script Node/SQL verificando retorno não-zerado de `ofx_entradas_total` e `saidas_ofx` em `2026-09-16`.

---

### [BACKEND] Hooks & Camada de Integração

- [x] Completed **Task 2: Normalizar leitura de propriedades em useBackendConciliacao.ts**
  - Arquivo: `src/hooks/useBackendConciliacao.ts`
  - Descrição: Assegurar que `useDailyReconciliationSummary` mapeie corretamente `ofx_entradas_total`, `entradas_conciliadas`, `saidas_ofx` e `contas_loja` sem inversão entre realizado e previsto. Atualizar `useGlobalOfxOut` com predicado temporal abrangente.
  - Skill: `backend-patterns`
  - Verificação: `npm run build` passa sem erros de tipagem.

- [x] Completed **Task 3: Refatorar queries temporais em useTransactions.ts**
  - Arquivo: `src/hooks/useTransactions.ts`
  - Descrição: Atualizar `useTransactionsPorDataELoja` e `useStoreExtratoBancario` para utilizar filtro OR cobrindo `target_date` e o intervalo de `occurred_at` para a data alvo selecionada.
  - Skill: `backend-patterns`
  - Verificação: Teste de query REST via Node verificando retorno das transações da data.

---

### [FRONTEND] Telas & Componentes

- [x] Completed **Task 4: Alinhar mapeamento de cards em ConciliacaoLojasView.tsx**
  - Arquivo: `src/components/conciliacao/ConciliacaoLojasView.tsx`
  - Descrição: Garantir que a extração de `ofxEntradas`, `concEntradas`, `ofxSaidas` e `concSaidas` consuma prioritariamente as chaves canônicas retornadas pela RPC, eliminando o fallback para valores incorretos ou zerados.
  - Skill: `frontend-design-pro`
  - Verificação: `npm run build` passa sem erros de tipagem.

---

### [SECURITY/TEST] Validação e Quality Gate

- [x] Completed **Task 5: Validação integrada via terminal e verificação de build**
  - Arquivo: N/A
  - Descrição: Executar script de teste chamando a RPC atualizada no banco remoto Supabase para validar que os cards de todas as filiais com movimentação contêm valores positivos e consistentes. Rodar `npm run build` para garantir zero erros de compilação.
  - Skill: `security`
  - Verificação: Terminal limpo, exit code 0 em `npm run build`.
