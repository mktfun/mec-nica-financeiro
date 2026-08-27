# Spec Plan: Novo Wizard Modular de Importação e Conciliação (310)

## Tasks

- [x] [BACKEND/TYPES] Atualizar `src/lib/llm-matcher.ts` para padronizar `gemini-3.5-flash-lite` como modelo default.
- [x] [FRONTEND/TYPES] Criar `src/components/importacoes/wizard/types.ts` com interfaces de transações pendentes (`PendingUnmatchedTransaction`), payload de vínculo direto (`LinkTransactionToOsPayload`), justificativas e cofre do Daniel.
- [x] [FRONTEND] Criar hook `src/hooks/useReconciliationWizardState.ts` com auto-save em `localStorage`.
- [x] [FRONTEND] Criar tela de entrada unificada `src/components/importacoes/wizard/Stage0UnifiedIngestion.tsx` (dropzone multi-arquivos para OFX, Rede, OS e Contas + inputs manuais de odômetro e despesas).
- [x] [FRONTEND] Criar `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` com lista de PIX/Rede sem lançamento na OS e modal para selecionar a OS correspondente da filial, aplicando compulsoriamente o valor e a forma de pagamento que já vieram da transação (1 clique).
- [x] [FRONTEND] Criar `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx` (classificador contábil por loja com suporte completo para editar e cancelar).
- [x] [FRONTEND] Criar `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx` (pergunta sobre recolhimento do Daniel e baixa em lote de cofre).
- [x] [FRONTEND] Criar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` (auditoria dos 5 pilares, IA matcher `gemini-3.5-flash-lite` e fechamento blindado).
- [x] [FRONTEND] Integrar o novo Wizard na rota `/importacoes`.
- [x] [TEST] Compilação completa com `node node_modules/vite/bin/vite.js build`.
- [x] [TEST] Validação visual do vínculo direto de transação à OS e fluxo do Wizard com Playwright.
