# 📋 SDD Proposal: Blindagem contra Vazamento de Datas Anteriores do OFX (Spec 415)

## 1. Problema Diagnosticado

### A. Vazamento Fiduciário de Transações de Dias Anteriores (14/09 e 15/09) na Conciliação de 17/09
No fechamento do dia **17/09/2026**, a filial **Piraporinha - EMPORIO (`st-05`)** teve seus valores completamente inflados e desregulados nos cards da conciliação e na tela de detalhes:
- **Card Principal (`StoreCardModulo1`):**  
  Exibe **OFX Entradas: R$ 22.646,75** e **Saídas OFX: R$ 20.387,06**, gerando uma falsa divergência de **-R$ 14.387,06** em saídas.  
  O valor real do fechamento do dia é **R$ 3.430,00 em Entradas** (Tamires R$ 2.930 + Leordina R$ 500) e **R$ 5.000,00 em Saídas** (Rei do Módulo R$ 1.000 + Brasicar R$ 4.000). A soma exata com o saldo anterior de R$ 3.964,12 resulta em **R$ 2.394,12**, que é o saldo real em conta corrente.
- **Tela de Detalhes da Loja (`StoreExtratoBancarioView`):**  
  Aparecem accordions de **Segunda-feira (14/09/2026)** com 10 lançamentos (+R$ 16.053,74 / -R$ 3.275,63) e **Terça-feira (15/09/2026)** com 7 lançamentos (+R$ 3.163,01 / -R$ 12.111,43), mesmo quando selecionado o escopo `Apenas Fechamento do Dia`.

### B. Causa-Raiz Técnica Comprovada
1. **Coerção de Datas Multi-Dia no Wizard de Importação (`CentralImportWizard.tsx`):**  
   Ao importar arquivos OFX do Itaú que cobrem um intervalo de 3 ou 7 dias, a expressão `Math.abs(...) <= 3 * 86400000` forçou `target_date = targetDate` para todas as transações dos últimos 3 dias. Lançamentos ocorridos em 14/09 e 15/09 receberam `target_date = '2026-09-17'`.
2. **Cláusula Cega na RPC SSOT (`get_daily_reconciliation_summary`):**  
   A condição `OR import_batch_id IN (SELECT id FROM import_batches WHERE target_date = v_target_date::date)` somou indiscriminadamente todas as 21 transações do lote, sem checar se a movimentação bancária pertencia ao dia da conciliação.
3. **Filtro PostgREST Amplo em `useTransactions.ts`:**  
   Em `useStoreExtratoBancario` e `useTransactionsPorDataELoja`, a presença de `import_batch_id.eq.${batchId}` na cláusula `.or()` fez com que a query de `targetDateTxs` retornasse as transações de 14/09 e 15/09.
4. **Agrupamento sem Escopo no Frontend (`StoreExtratoBancarioView.tsx`):**  
   O loop `dayGroups` iterava sobre todas as transações retornadas e gerava accordions por `occurred_at`, exibindo dias passados dentro da visualização de fechamento diário.

---

## 2. Solução Proposta

1. **Saneamento no Banco de Dados (`supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql`):**
   - Realinhar o `target_date` das 17 transações de 14/09 e 15/09 para suas datas reais:
     ```sql
     UPDATE ofx_transactions 
     SET target_date = occurred_at::date 
     WHERE occurred_at < '2026-09-16 00:00:00+00' 
       AND target_date = '2026-09-17';
     ```
   - Atualizar a RPC `get_daily_reconciliation_summary` removendo a cláusula cega de `import_batch_id` e filtrando estritamente por `t.target_date = v_target_date::date`.
2. **Blindagem do Wizard de Ingestão (`CentralImportWizard.tsx`):**
   - Em arquivos OFX com extrato multi-dias, transações de dias anteriores a D-1 (ex: D-2, D-3) devem manter sua própria data (`target_date = parsedTxDate`). Apenas transações da competência do fechamento (D-1 ou mesmo dia) recebem `target_date = targetDate`.
3. **Blindagem dos Hooks (`src/hooks/useTransactions.ts`):**
   - Em `useTransactionsPorDataELoja` e `useStoreExtratoBancario`, o filtro de `targetDateTxs` deve ser estritamente `target_date.eq.${date}`, sem bypass irrestrito por `import_batch_id`.
4. **Blindagem da Tela de Detalhes (`src/components/conciliacao/StoreExtratoBancarioView.tsx`):**
   - No escopo `dia_alvo`, garantir que `rawTransactions` e `dayGroups` contenham **exclusivamente** as transações pertencentes ao fechamento do dia alvo (`target_date === date`). Transações de outras datas só aparecem se o usuário alternar voluntariamente para `Extrato Completo do OFX`.

---

## 3. Skills Especializadas Aplicadas

- `database`: Migração cirúrgica e idempotente no Supabase PostgreSQL, preservando RLS e integridade de chave primária.
- `backend-patterns`: Normalização fiduciária de datas em hooks e RPCs, mantendo o PostgreSQL como Single Source of Truth (SSOT).
- `frontend-design-pro`: Garantia de integridade visual na separação entre `dia_alvo` e `lote_ofx` no Accordion e nos KPIs fiduciários.
- `security`: Validação estrita de queries sem injeção de parâmetros e sem acúmulo de artefatos temporários fora de `.tmp/`.

---

## 4. Contratos de Dados

### Tabela `ofx_transactions`
- `target_date`: Coluna canônica que define a competência da conciliação. Para 17/09, contém apenas as 50 transações fiduciárias do fechamento (4 de Piraporinha, 3 de Dom Pedro, 10 de Jabaquara, etc.). As transações de 14/09 e 15/09 ficam com `target_date = '2026-09-14'` e `'2026-09-15'`.

### RPC `get_daily_reconciliation_summary`
- Retorno JSONB com agregação estrita por `t.target_date = v_target_date::date`, sem vazamento de lotes multi-dias.

---

## 5. Arquivos Afetados

### [Arquivos Novos]
- [`supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql)

### [Arquivos Existentes Modificados]
- [`src/components/importacoes/CentralImportWizard.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx)
- [`src/hooks/useTransactions.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useTransactions.ts)
- [`src/components/conciliacao/StoreExtratoBancarioView.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/StoreExtratoBancarioView.tsx)

---

## 6. Plano de Rollback

Caso ocorra regressão, o rollback é executado via:
```bash
git checkout -- src/components/importacoes/CentralImportWizard.tsx src/hooks/useTransactions.ts src/components/conciliacao/StoreExtratoBancarioView.tsx
```

---

## 7. Risco Principal e Mitigação

- **Risco:** Alguma filial perder os dados bancários na tela se o `target_date` não bater exatamente com a data da conciliação.
- **Mitigação:** As 50 transações do fechamento já possuem `target_date = '2026-09-17'`. O saneamento altera apenas as 17 transações com `occurred_at < '2026-09-16'`, preservando 100% das transações legítimas do dia 17.
