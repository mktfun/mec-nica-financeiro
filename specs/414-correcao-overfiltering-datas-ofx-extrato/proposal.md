# 📋 Proposal — Spec 414: Correção do Over-filtering de Datas do OFX (Cards e Extrato Zerados no Fechamento do Dia 17)

## 1. Problema Diagnosticado e Causa-Raiz Real

O usuário realizou a conciliação oficial no dia **17/09/2026** através do Wizard de Importação (`CentralImportWizard`), importando o extrato OFX bancário, as contas manuais e os saldos das 10 filiais.

Entretanto, ao abrir a tela de conciliação do dia 17/09/2026 (`/conciliacao?date=2026-09-17`):
- Os cards da direita (`StoreCardModulo1`: OFX Entradas, Saídas OFX, Conciliados) ficaram **cravados em R$ 0,00**.
- A aba de extrato bancário (`StoreExtratoBancarioView`) ficou **vazia** em `Apenas Fechamento do Dia (0)`.
- Apenas as despesas de contas manuais (`Contas / Boletos`) carregaram valores (ex.: R$ 440,00 em Dom Pedro, R$ 829,80 em Jabaquara, R$ 275,38 em Jorge Beretta), gerando divergências negativas artificiais.

### Causa-Raiz Técnica Descoberta:
1. **Sequestro Temporal de Data na Ingestão do OFX:**
   - O lote de importação `ba78e983-1222-4839-94e5-2521eee4f7ba` foi criado legitimamente para `target_date = '2026-09-17'`.
   - Os saldos bancários em `reconciliations` foram gravados para `date = '2026-09-17'` (ex.: Saldo Dom Pedro = R$ 21.311,28).
   - As contas em `daily_manual_bills` foram gravadas para `date = '2026-09-17'` (Dom Pedro = R$ 440,00, Jabaquara = R$ 829,80, Jorge Beretta = R$ 275,38).
   - **Porém**, a correção anterior contra vazamento de datas forçou em `useTransactions.ts` (linha 620) e no `CentralImportWizard.tsx` (linha 1378):
     `target_date: (t.occurred_at ? t.occurred_at.split('T')[0] : ...)`
   - Como os extratos bancários do Itaú disponibilizados na manhã do dia 17 contêm transações com `occurred_at` carimbado pelo banco no dia anterior (`2026-09-16`), **todas as 50 transações bancárias da conciliação do dia 17 foram gravadas no banco com `target_date = '2026-09-16'`**!
2. **Desacoplamento do Lote de Conciliação:**
   - A conciliação que o usuário fez no dia 17 ficou órfã de transações OFX porque o sistema as transferiu para o dia 16.
   - Quando a tela e a RPC `get_daily_reconciliation_summary` buscam `WHERE target_date = '2026-09-17'`, encontram **0 transações**, exibindo cards zerados em R$ 0,00.
   - Os valores das saídas bancárias batem ao centavo com as contas do dia 17 (Dom Pedro: R$ 440,00; Jabaquara: R$ 829,80; Jorge Beretta: R$ 275,38), provando que pertencem indubitavelmente ao fechamento de 17/09.

---

## 2. Solução Proposta

1. **Saneamento Imediato no Banco de Dados (`ofx_transactions` e `transactions`):**
   - Realinhar `target_date = '2026-09-17'` para as 50 transações do batch `ba78e983-1222-4839-94e5-2521eee4f7ba` que pertencem ao fechamento executado pelo usuário no dia 17.
2. **Ponte Fiduciária de Lote na RPC SSOT (`get_daily_reconciliation_summary`):**
   - Atualizar o predicado temporal nas CTEs de agregação para incluir a correspondência por lote de importação:
     ```sql
     WHERE (
         target_date = v_target_date::date
         OR import_batch_id IN (SELECT id FROM import_batches WHERE target_date = v_target_date::date)
         OR (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
         OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
     )
     ```
   - Isso blinda o fechamento diário mesmo se houver defasagem entre o carimbo horário do banco e o dia da conciliação.
3. **Blindagem na Ingestão do Wizard (`CentralImportWizard.tsx` e `useTransactions.ts`):**
   - Ao importar transações bancárias para uma data de conciliação explícita (`targetDate`), as transações ativas do extrato devem herdar o `targetDate` do lote, sem serem sequestradas para dias passados.
4. **Resgate Fiduciário na Listagem de Extrato (`useTransactions.ts`):**
   - `useStoreExtratoBancario` e `useTransactionsPorDataELoja` devem buscar tanto por `target_date` quanto por `import_batch_id` associado à data da conciliação.

---

## 3. Skills Especializadas Aplicadas
- `database`: Saneamento ACID de `target_date` em `ofx_transactions` e blindagem da RPC `get_daily_reconciliation_summary`.
- `backend-patterns`: Respeito à soberania de `targetDate` em `useTransactions.ts` e `CentralImportWizard.tsx`.
- `frontend-design-pro`: Restauração dos cards com zero tolerância a valores fantasmas.
- `security`: Idempotência de updates e sem quebra de integridade referencial.

---

## 4. Contratos de Dados Afetados
- `ofx_transactions`: `target_date` alinhado à conciliação da filial.
- `import_batches`: `id`, `target_date`.
- RPC `get_daily_reconciliation_summary(p_date, p_force_dynamic)`.
- Hook `useStoreExtratoBancario(date, storeId)`.

---

## 5. Arquivos Afetados
### Arquivos Existentes Modificados:
- `supabase/migrations/20260917000003_fix_ofx_extrato_daterange_sargability.sql` [NOVO]
- `src/components/importacoes/CentralImportWizard.tsx` [MODIFICADO]
- `src/hooks/useTransactions.ts` [MODIFICADO]

---

## 6. Plano de Rollback
Reverter alterações em `src/` via `git checkout -- src/components/importacoes/CentralImportWizard.tsx src/hooks/useTransactions.ts`.
A migração SQL opera de forma idempotente e segura.

---

## 7. Risco Principal e Mitigação
- **Risco:** Reintroduzir vazamento de lançamentos antigos de dias passados presentes no mesmo arquivo OFX.
- **Mitigação:** Atribuir `targetDate` da conciliação apenas às transações recentes do lote (D ou D-1), preservando transações antigas (com histórico fechado) em suas respectivas datas de competência.
