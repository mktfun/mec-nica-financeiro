# Spec Plan: Wizard de Conciliação Passo a Passo Pós-Ingestão (311)

## Tasks

### Fase 0 — Limpeza (Desfazer Spec 310)
- [x] [FRONTEND] Deletar `src/components/importacoes/wizard/UnifiedReconciliationWizard.tsx`
- [x] [FRONTEND] Deletar `src/components/importacoes/wizard/Stage0UnifiedIngestion.tsx`
- [x] [FRONTEND] Deletar `src/hooks/useReconciliationWizardState.ts`
- [x] [FRONTEND] Restaurar `importacoes.tsx`: remover import de UnifiedReconciliationWizard, restaurar `<CentralImportWizard initialDate={selectedDate} />` na aba diario

### Fase 1 — CentralImportWizard: Novo Estado Pós-Ingestão
- [x] [FRONTEND] Adicionar estado `reconciliationStep: null | 'A' | 'B' | 'C' | 'D'` no CentralImportWizard
- [x] [FRONTEND] No Step 3: substituir botão "Confirmar e Gravar Importação" por "Avançar para Conciliação →" que faz setReconciliationStep('A')
- [x] [FRONTEND] Adicionar Stepper visual (A→B→C→D) no header quando reconciliationStep !== null
- [x] [FRONTEND] Adicionar renderização condicional das Telas A/B/C/D baseada em reconciliationStep

### Fase 2 — Refatorar Tela A (Step1UnregisteredPayments)
- [x] [FRONTEND] Remover dependência de useReconciliationWizardState
- [x] [FRONTEND] Aceitar props: results, mapping, targetDate, stores, onNext, onBack
- [x] [FRONTEND] Implementar busca de patio_os em aberto via supabase para lojas mapeadas
- [x] [FRONTEND] Cruzar transações Rede/OFX sem matched_os_number com OSs da mesma loja
- [x] [FRONTEND] Ação 1 clique: UPDATE patio_os + INSERT conciliation_matches via supabase (sem dropdowm de valor/método — herdar da transação)
- [x] [FRONTEND] Badge contador de progresso "N de M resolvidos"

### Fase 3 — Refatorar Tela B (Step2NonRevenueJustifications)
- [x] [FRONTEND] Remover dependência de useReconciliationWizardState
- [x] [FRONTEND] Aceitar props: results, mapping, targetDate, stores, onNext, onBack
- [x] [FRONTEND] Filtrar entradas OFX sem caminho faturamento (sem match OS e sem match Rede)
- [x] [FRONTEND] Select de categoria + textarea editável/cancelável por item
- [x] [FRONTEND] Persistir em daily_manual_bills (external_code = NULL)

### Fase 4 — Refatorar Tela C (Step3CashVaultDaniel)
- [x] [FRONTEND] Remover dependência de useReconciliationWizardState
- [x] [FRONTEND] Aceitar props: targetDate, onNext, onBack
- [x] [FRONTEND] Radio SIM/NÃO + tabela de store_cash_vault em_transito com checkboxes
- [x] [FRONTEND] UPDATE store_cash_vault status = 'depositado' nos selecionados

### Fase 5 — Refatorar Tela D (Step4FinalAuditAndClose)
- [x] [FRONTEND] Remover dependência de useReconciliationWizardState
- [x] [FRONTEND] Aceitar props: results, mapping, targetDate, manualInputs, missingOsList, isSaving, onFinish, onBack
- [x] [FRONTEND] Chamar RPC get_daily_reconciliation_summary para 5 pilares
- [x] [FRONTEND] Semáforo ±R — VERDE habilita botão; VERMELHO exibe aviso mas permite override
- [x] [FRONTEND] Botão "Analisar com IA" → gemini-3.5-flash-lite
- [x] [FRONTEND] Botão "Confirmar e Gravar" → chamar onFinish() → handleConfirm() do CentralImportWizard

### Fase 6 — Verificação
- [x] [TEST] Build de produção (node node_modules/vite/bin/vite.js build) — deve compilar com exit code 0
- [x] [TEST] Cenário 1: Carregar arquivos, mapear lojas, ir ao Step 3, clicar "Avançar para Conciliação", verificar Tela A com stepper visível
- [x] [TEST] Cenário 2: Clicar "← Voltar" na Tela A, verificar que Step 3 retorna com dados intactos
