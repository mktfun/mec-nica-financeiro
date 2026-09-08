# Spec Plan: Correção Canônica de Conciliado vs OFX por Filial e Desreversão de Lotes (376)

## Tasks Atômicas

- [x] `[PARSER]` **Classificação de Folha de Pagamento em `contasPagarParser.ts`**
  - Adicionar termos de folha (`SALARIO`, `SALÁRIO`, `FOLHA`, `RESCISAO`, `FERIAS`, `VALE`) em `classifyExpense` atribuindo `category = 'retirada_socios'`.
  - *Critério de Verificação*: Títulos de salários em `BuscaContasAPagar.xls` são categorizados como `retirada_socios` em vez de `outros`.

- [x] `[MATCHING-CORE]` **Motor de Pareamento Combinatório (Subset Sum) em `expenseMatcher.ts`**
  - Implementar busca combinatória de subconjuntos de títulos de salários que somem exatamente o valor do débito SISPAG.
  - *Critério de Verificação*: No dia 08/09/2026, os lotes de SISPAG de Jabaquara (R$ 4.477,44 = Vanessa + Gustavo), Jorge Beretta (R$ 2.960,61 = Marcelo + Erik), Piraporinha (R$ 4.753,00 = Vagner + Glicelio + Maria) e Rudge Ramos (R$ 5.053,00) são pareados com sucesso.

- [x] `[DB-MIGRATION]` **Criação da Migration `20260908000036_fix_store_canonical_matching_and_anti_hijack.sql`**
  - Descontaminação: reverter `matched_os_number = NULL` em transações de adquirentes (`REDE`, `CARD`) no `ofx_transactions`.
  - Atualizar `public.auto_match_daily_transactions`: bloquear expressamente adquirentes de serem associados a OS como PIX.
  - Atualizar `public.auto_match_saidas`: incorporar subset sum matching para lotes SISPAG.
  - Atualizar `public.get_daily_reconciliation_summary`:
    - `saidas_conciliadas` = soma dos débitos com `matched_bill_id IS NOT NULL OR manual_category IS NOT NULL OR match_status IN (...)`.
    - `dif_saidas` = `ofx_saidas_total - saidas_conciliadas`.
    - `pix_total` em `ofx_entradas_agg` excluindo expressamente adquirentes.
  - *Critério de Verificação*: A migration é aplicada via script headless com exit code 0.

- [x] `[TEST-BACKEND]` **Validação das RPCs no PostgreSQL**
  - Executar `auto_match_daily_transactions('2026-09-08')` e `auto_match_saidas('2026-09-08')`.
  - Chamar `get_daily_reconciliation_summary('2026-09-08')` e confirmar que:
    - Dom Pedro: `entradas_conciliadas = R$ 1.352,36` e `dif_entradas = R$ 0,11`.
    - Jabaquara: `dif_entradas` e `dif_saidas` refletem a verdade contábil exata.
    - Zero débitos órfãos mascarados.
  - *Critério de Verificação*: Script de teste confirma valores exatos para todas as 10 filiais.

- [x] `[UI]` **Revisão e Saneamento dos Componentes Frontend**
  - Confirmar consumo correto em `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx`.
  - Ajustar `StoreExtratoBancarioView.tsx` para sincronizar e refletir imediatamente vínculos do banco sem dependência exclusiva de clique manual no botão verde.
  - *Critério de Verificação*: Acessar `http://localhost:8080/conciliacao/st-01?date=2026-09-08` e verificar que o banner e cards exibem a conciliação real.

- [x] `[BUILD-GATE]` **Auditoria de Build e Integridade TypeScript**
  - Executar `cmd.exe /c "npm run build"` e garantir exit code 0 com zero erros de tipos.
  - *Critério de Verificação*: Build completa com sucesso em menos de 10 segundos.
