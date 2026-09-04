# Proposal: Correção de Erros de Console, Ícone Car e Desambiguação de RPCs (369)

## Problema
Durante a execução do fluxo de conciliação e auditoria pericial na tela de Importações, múltiplos erros graves foram registrados no console do navegador e nas chamadas RPC do Supabase:

1. **`ReferenceError: Car is not defined` no Frontend:**
   - Ocorre em `Step4FinalAuditAndClose.tsx` (linha 416) ao renderizar o card do "CANAL 2: BALANÇO DE PRODUÇÃO & WIP (PÁTIO ΔP4)". O componente `<Car />` é instanciado no JSX, mas não foi importado de `lucide-react`, resultando no travamento do ciclo de renderização do React.
2. **`PostgreSQL 42725: function public.get_daily_reconciliation_summary(text) is not unique`:**
   - Coexistem no PostgreSQL (`pg_proc`) duas sobrecargas ativas:
     - `get_daily_reconciliation_summary(p_target_date text)` (1 parâmetro text)
     - `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)` (2 parâmetros com default no 2º)
   - Ao receber uma chamada com apenas o parâmetro de data (tanto via PostgREST quanto internamente em PL/pgSQL), o planejador do PostgreSQL não consegue desempatar os candidatos e aborta a query com o erro `42725`.
3. **`HTTP 400 Bad Request` na RPC `run_autonomous_reconciliation_loop`:**
   - O loop autônomo pericial de auto-healing invoca internamente `v_summary := public.get_daily_reconciliation_summary(p_date);`. Devido à ambiguidade descrita no item 2, a transação inteira do loop é cancelada pelo PostgreSQL, retornando erro 400 ao cliente.
4. **`PostgreSQL 22P02: invalid input syntax for type numeric: 'LUIS FELIPE DA CASA'` em `auto_match_daily_transactions`:**
   - Na RPC `auto_match_daily_transactions`, a variável `v_os_record` foi declarada como `public.patio_os%ROWTYPE`. Ao executar as queries da Fase 2 (pareamento de OFX/PIX):
     ```sql
     SELECT id, os_number, total_value, paid_value, status, client_name INTO v_os_record ...
     ```
     O PostgreSQL mapeia os campos por ordem física posicional (e não pelos nomes do SELECT). A 6ª coluna de `public.patio_os` é `total_value` (`NUMERIC`), enquanto o SELECT enviou `client_name` (`TEXT` com o valor `'LUIS FELIPE DA CASA'`). A tentativa de converter o nome do cliente em número causa a falha imediata da RPC com o erro `22P02`.

---

## Solução Proposta (Foco em Reuso e Correção)
Reutilizar estritamente os componentes e funções já existentes, aplicando correções cirúrgicas sem criar nenhuma tabela, RPC paralela ou componente duplicado:

1. **Frontend (`Step4FinalAuditAndClose.tsx`):**
   - Adicionar `Car` na desestruturação de `lucide-react`.
   - Passar `forceDynamic = true` na chamada do hook `useDailyReconciliationSummary(targetDate, true)` para garantir que a auditoria final reflita os dados dinâmicos recalculados das importações do dia.
2. **Hook de Dados (`src/hooks/useBackendConciliacao.ts`):**
   - Atualizar `useDailyReconciliationSummary(date: string, forceDynamic: boolean = false)` para enviar `p_force_dynamic: forceDynamic` ao Supabase e incorporar `forceDynamic` na `queryKey`.
3. **Database / Migration SQL (`supabase/migrations/20260904000032_unify_reconciliation_summary_and_fix_auto_match.sql`):**
   - **Expurgo das sobrecargas:** Executar `DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(...)` para todas as assinaturas prévias (`text`, `(text, boolean)`, `date`, etc.).
   - **RPC Canônica Unificada:** Recriar `public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)` com suporte bicanal consolidado (Spec 359).
   - **RPC Auto-Healing:** Recriar `public.run_autonomous_reconciliation_loop(p_date text)` garantindo a invocação com 2 argumentos explícitos: `public.get_daily_reconciliation_summary(p_date, false)`.
   - **RPC Auto-Match (Correção 22P02):** Recriar `public.auto_match_daily_transactions(p_date text)` substituindo o SELECT posicional incompleto por `SELECT * INTO v_os_record FROM public.patio_os ...`, alinhando perfeitamente todas as 24 colunas nativas do tipo composto `patio_os%ROWTYPE` e prevenindo tanto o erro `22P02` quanto o `55000`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Database & Backend Specialist:**
  - Identificou as 2 entradas conflitantes em `pg_proc` (OIDs 31829 e 31827).
  - Confirmou a causa raiz do `22P02` na ordem física ordinal da tabela `patio_os` (`id`, `store_id`, `os_number`, `plate`, `opened_at`, `total_value`).
  - Desenvolveu a migration unificada idempotente mantendo 100% da lógica de negócio e segurança `SECURITY DEFINER`.
- **Frontend & Component Specialist:**
  - Inspecionou todos os 27 componentes de `src/components/importacoes/` e constatou que apenas `Step4FinalAuditAndClose.tsx` tinha um ícone não importado.
  - Identificou que o hook `useDailyReconciliationSummary` omitia o parâmetro `p_force_dynamic`, fazendo com que auditorias em dias com snapshot fechado lessem dados congelados em vez de dinâmicos.
- **Graphify & Risk Auditor:**
  - Mapeou os 10 consumidores de `get_daily_reconciliation_summary` e traçou a árvore de dependências síncronas entre `auto_match_daily_transactions` $\rightarrow$ `run_autonomous_reconciliation_loop` $\rightarrow$ `get_daily_reconciliation_summary` $\rightarrow$ `Step4FinalAuditAndClose.tsx`.
  - Formulou 2 cenários de teste críticos (Same-Amount Hazard e Falso Positivo de Auto-Healing).

---

## Contratos de Dados & SQL (Supabase)

### RPC 1: `public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`
- **Permissões:** `GRANT EXECUTE TO authenticated, service_role, anon;`
- **Retorno (`jsonb`):** Objeto com os 5 Pilares (`saldo_bancos_ofx`, `dinheiro_lojas`, `cartoes_a_compensar`, `dinheiro_mp`, `a_receber`, `na_loja_os`, `caixa_atual`, `caixa_anterior`, `fluxo_caixa`), DRE (`faturamento_periodo`, `contas_a_pagar`, `diferenca_final`, `status_geral`), `stores_detail` e extensões bicanais (`caixa_tesouraria`, `status_tesouraria`, `patio_wip`, `variacao_patio_delta_p4`, `fast_path_eligible`).

### RPC 2: `public.auto_match_daily_transactions(p_date text)`
- **Correção:** `v_os_record public.patio_os%ROWTYPE;` alimentado exclusivamente via `SELECT * INTO v_os_record FROM public.patio_os ...`.

### RPC 3: `public.run_autonomous_reconciliation_loop(p_date text)`
- **Correção:** Chamada explícita `v_summary := public.get_daily_reconciliation_summary(p_date, false);`.

---

## API & Componentes (Frontend)
- `[MODIFY] src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:
  - Inclusão do import `Car` de `lucide-react`.
  - Invocação `useDailyReconciliationSummary(targetDate, true)`.
  - Acesso direto e tipado a `summary?.caixa_tesouraria` e `summary?.patio_wip`.
- `[MODIFY] src/hooks/useBackendConciliacao.ts`:
  - Suporte ao argumento `forceDynamic: boolean = false` e passagem de `p_force_dynamic` ao RPC.

---

## Risco Principal e Mitigação
- **Risco:** O `DROP FUNCTION` quebrar clientes legados que chamavam a versão antiga de 1 parâmetro.
- **Mitigação:** O 2º parâmetro `p_force_dynamic` possui `DEFAULT false`. Assim, chamadas antigas passando apenas `p_date` continuam sendo atendidas com 100% de compatibilidade, mas sem qualquer ambiguidade de candidatos no catálogo PostgreSQL.
