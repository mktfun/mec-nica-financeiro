# 📝 Spec Plan: Correção do Over-filtering de Datas do OFX (Cards e Extrato Zerados no Fechamento do Dia 17)

> **Regra Canônica:** Todas as tarefas iniciam estritamente como `- [ ] Pending`. Nenhuma tarefa deve ser marcada como concluída durante a fase de proposal.

---

### [DB] Banco de Dados & RPCs

- [x] Completed **Task 1: Saneamento de target_date no lote do dia 17 e blindagem da RPC SSOT**
  - Arquivo: `supabase/migrations/20260917000003_fix_ofx_extrato_daterange_sargability.sql`
  - Descrição: Criar migração que realinha `target_date = '2026-09-17'` para as 50 transações do batch `ba78e983-1222-4839-94e5-2521eee4f7ba` (fechamento de 17/09) e adiciona na RPC `get_daily_reconciliation_summary` a cláusula de busca por `import_batch_id` para garantir que o lote de conciliação sempre irrigue o dia correspondente.
  - Skill: `database`
  - Verificação: Script Node chamando a RPC para `2026-09-17` confirmando retorno ativo para Dom Pedro (R$ 440,00 saídas), Jabaquara (R$ 829,80 saídas) e Jorge Beretta (R$ 275,38 saídas).

---

### [BACKEND] Hooks & Camada de Ingestão

- [x] Completed **Task 2: Blindar atribuição de target_date no Wizard e em useTransactions.ts**
  - Arquivo: `src/components/importacoes/CentralImportWizard.tsx` e `src/hooks/useTransactions.ts`
  - Descrição: Assegurar que ao importar transações para um `targetDate` de conciliação, as transações fiduciárias do fechamento recebam o `target_date` da conciliação em vez de serem sequestradas para dias passados pelo `split('T')[0]`.
  - Skill: `backend-patterns`
  - Verificação: `npm run build` passa sem erros de tipagem.

- [x] Completed **Task 3: Refatorar consultas em useStoreExtratoBancario para resgatar lote da data**
  - Arquivo: `src/hooks/useTransactions.ts`
  - Descrição: Em `useStoreExtratoBancario`, permitir que `targetDateTxs` filtre por `target_date.eq.${date}` ou por transações vinculadas ao lote de conciliação da data.
  - Skill: `backend-patterns`
  - Verificação: Script de teste verificando que a filial Dom Pedro retorna 3 transações na data `2026-09-17`.

---

### [SECURITY/TEST] Validação e Quality Gate

- [x] Completed **Task 4: Validação integrada via terminal e verificação de build**
  - Arquivo: N/A
  - Descrição: Executar script de validação contra o Supabase remoto confirmando valores batidos em todas as filiais no dia `2026-09-17` e rodar `npm run build` garantindo zero erros.
  - Skill: `security`
  - Verificação: Terminal limpo, exit code 0 em `npm run build`.
