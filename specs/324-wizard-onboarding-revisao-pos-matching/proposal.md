# Proposal: Wizard Onboarding Pós-Matching — Revisão de Órfãos e Validação de Diferença Final (324)

## Problema

Após o motor de conciliação (auto_match_transactions + auto_match_saidas + run_autonomous_reconciliation_loop) terminar, o sistema **pula diretamente para a tela de conclusão (Step 8 / painel executivo)** sem exibir o wizard de revisão manual. O usuário não consegue:

1. **Ver os PIX e vendas de Rede órfãos** para vincular manualmente a OSs da loja
2. **Ver a diferença de fechamento** (Valor Disponível − Subtotal Contas = Diferença Final) antes de confirmar
3. **Voltar e corrigir** algo se a diferença estiver errada
4. **Clicar em "Conciliar"** de forma consciente para selar o dia e ir para /conciliacao

---

## Root Cause (3 bugs)

### Bug 1 — Step 8 não avança automaticamente para o Wizard
handleConfirm(true) seta setStep(8) (painel executivo) no início. Quando tudo termina (setSaveFinished(true)), o painel parece ser a tela final — sem avanço automático para o wizard de revisão.

### Bug 2 — Step 4 é pulado quando unmatchedTransactions.length === 0
Quando o motor casa 100% das OSs, realUnmatched.length === 0 → sistema pula direto para setStep(5). O usuário nunca vê a tela de PIX/Rede órfãos, mesmo que haja saídas para justificar.

### Bug 3 — Não existe tela de "Validação de Diferença + Confirmar Conciliação"
O Step 7 (Step4FinalAuditAndClose) sela o dia diretamente sem dar ao usuário a chance de revisar a diferença e voltar para corrigir.

---

## Solução Proposta

### Fluxo Correto Após o Motor

Upload → [Motor Auto-Match] → Step 8 (progresso)
         ↓ Ao terminar: avança AUTOMATICAMENTE (sem clique extra)
Step 4: PIX/Rede Órfãos → Vincular OS  [SEMPRE mostrar, mesmo vazio]
         ↓ "Próximo →"
Step 5: Justificativas (Saídas + Entradas Órfãs) [reativo do DB]
         ↓ "Próximo →"
Step 6: Cofre Daniel
         ↓ "Próximo →"
Step 7: Preview dos 5 Pilares + Diferença Final
         → "← Voltar" (qualquer step anterior para corrigir)
         → "Conciliar e Selar" → sela + redirect /conciliacao/$date

---

## Componentes Reutilizados (Sem artefatos novos)

- Step4FinalAuditAndClose.tsx — já possui useDailyReconciliationSummary e DRE. Refatorar como Preview Pré-Seal.
- Step1UnregisteredPayments.tsx — já possui ManualMatchOsModal. Adicionar estado vazio com checkmark.
- ManualMatchOsModal — funciona para PIX + Rede com score.

---

## Contratos de Dados

Nenhuma migration. RPCs existentes:
- get_daily_reconciliation_summary(p_date) → 5 pilares + diferenca_final + is_conforme
- close_daily_snapshot(p_date, p_notes, p_metadata) → sela o dia

---

## Mudanças por Arquivo

### [MODIFY] CentralImportWizard.tsx

1. Auto-avanço via useEffect: quando saveFinished && advanceToWizard → aguarda 1.5s → setStep(4)
2. Remover bifurcação setStep(4) vs setStep(5): SEMPRE ir para setStep(4)
3. Corrigir ref de advanceToWizard (usar useRef para não capturar closure stale)

### [MODIFY] Step4FinalAuditAndClose.tsx

- Remover props: results, mapping, stores, manualInputs, missingOsList
- Manter: targetDate, isSaving, onFinish, onBack
- Adicionar botão "Recalcular" (refetch da query)
- Semáforo: verde <= R$ 50 | amarelo <= R$ 200 | vermelho > R$ 200
- Label do botão: "Conciliar e Selar o Dia" (em vez de "Finalizar Fechamento")

### [MODIFY] Step1UnregisteredPayments.tsx

- Aceitar unmatchedTransactions = [] sem crash
- Estado vazio: "Motor de IA conciliou 100% das transações automaticamente!"
- Sempre exibir botão "Próximo →" habilitado

---

## Risco e Mitigação

**Risco:** RPC retorna diferenca_final com cache desatualizado após matches manuais nos steps 4 e 5.

**Mitigação:**
- No Step 7, chamar refetch() automaticamente ao entrar
- Badge "Dados atualizados em HH:MM:SS" com botão "Recalcular"
- Queries invalidadas no handleSaveOutflow/handleSaveInflow (já implementado Spec 323)

---

## Verificação

### Cenário 1 — Fluxo Completo Feliz
1. "Processar e Conciliar com IA" → Step 8 progresso
2. Após ~15s, avança automaticamente para Step 4
3. Step 4 → 5 → 6 → 7 (Preview DRE com diferença = R$ 2,30 → verde)
4. "Conciliar e Selar" → redirect /conciliacao/2026-08-31

### Cenário 2 — Divergência e Retorno
1. Step 7 mostra Diferença = R$ -2.100 → vermelho
2. Usuário volta para Step 5, justifica despesa avulsa de R$ 2.100
3. Volta ao Step 7 → "Recalcular" → diferença = R$ 0,00 → verde
4. "Conciliar e Selar"
