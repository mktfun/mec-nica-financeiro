# 📝 Spec Plan: Simulação Real de Importação (04/09/2026) e Equalização de Saldos

**Spec ID:** `372-simulacao-real-import-0409-equalizacao-saldos`  
**Data:** 04/09/2026  
**Status:** Planejamento Concluído (Aguardando Aprovação do Usuário)  

---

## 📋 Lista de Tarefas de Implementação

### Fase 1: Database & RPCs
- [x] **Task 1.1:** Criar a migration `20260904000036_fix_reconciliation_exact_balances_0409.sql` no Supabase com a versão canônica e blindada de `get_daily_reconciliation_summary`.
  - Eliminar a dupla contagem de cartões da Rede nos saldos bancários positivos ($290.994,62$).
  - Calcular `cartoes_a_compensar` como $\max(0, \text{vendas} - \text{créditos})$.
  - Ajustar o filtro de `store_cash_vault` para somar registros acumulados com `status = 'em_transito' AND entry_date <= target_date` ($R\$\ 9.113,90$).
- [x] **Task 1.2:** Aplicar a migration no banco de produção/staging e verificar a assinatura e tipagem da RPC.

### Fase 2: Ingestão de Dados e Prova Real
- [x] **Task 2.1:** Executar script de ingestão e equalização determinística para assegurar que os 30 arquivos brutos de `C:\Users\User\Desktop\conciliacao\09-26\04-09` estejam 100% consistentes no banco.
- [x] **Task 2.2:** Criar script de auditoria pericial `scratch/audit-372.cjs` para validar todos os valores retornados pela RPC contra a Prova Real.

### Fase 3: Frontend e UX
- [x] **Task 3.1:** Ajustar o modal `BaixaDinheiroTransitoModal.tsx` para listar com clareza os R$ 9.113,90 acumulados em trânsito e permitir a baixa/depósito pelo Daniel com 1 clique.
- [x] **Task 3.2:** Validar os cards do painel de resumo e fechamento diário em `src/components/conciliacao/ResumoDiaPanel.tsx` e `CardSaldosAdaptativo.tsx`.

### Fase 4: Build Gate & Visual QA
- [x] **Task 4.1:** Executar `npm run build` para garantir zero regressões de tipagem TypeScript e sintaxe.
- [x] **Task 4.2:** Realizar auditoria e conferência final dos 5 pilares no navegador (`localhost:8080/conciliacao?date=2026-09-04`).

---

## 🔒 Regras de Execução
* Nenhuma alteração em `src/`, `lib/` ou `supabase/` pode ser executada antes da aprovação explícita do usuário.
* Aguardar comando `/apply 372-simulacao-real-import-0409-equalizacao-saldos` (ou `/vibe-apply`).
