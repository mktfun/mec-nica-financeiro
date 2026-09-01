# Design: Refatoração do Fluxo do Wizard e Sincronização da Rede (333)

## Arquitetura e Fluxo Linear do Wizard
```
Step 1: Upload (Arquivos)
  ↓
Step 2: Mapeamento de Filiais (Dropdowns)
  ↓
Step 3: Entradas Manuais (Odômetro, Dinheiro MP, A Receber)
  ↓ [Botão "Avançar para Auditoria"]
Step 4: Saídas vs Contas a Pagar (Vinculação manual de débitos)
  ↓ [Botão "Avançar"]
Step 5: Cartões & Rede vs OFX (Conferência de lotes e taxas)
  ↓ [Botão "Avançar"]
Step 6: PIX vs OFX (Pareamento de PIX com OSs)
  ↓ [Botão "Avançar"]
Step 7: Resumo Final dos 5 Pilares & Aprovação
  ↓ [Botão "Gravar e Concluir Fechamento"]
Step 8: Execução do Batch no Supabase (Gravação atômica de todas as tabelas e matches)
  ↓ [Conclusão com Sucesso]
Navegação direta para /conciliacao?date=YYYY-MM-DD
```

## Mutações em Arquivos Existentes [MODIFY]
- `src/components/importacoes/CentralImportWizard.tsx`:
  - Modificar o botão do Step 3: em vez de chamar `handleConfirm()` que disparava `setStep(8)`, mudar para `setStep(4)` (início das etapas de auditoria).
  - Centralizar a chamada de `handleConfirm()` exclusivamente no botão de conclusão do `Step 7 (Step4FinalAuditAndClose)`.
  - Coletar as vinculações manuais de `Step1SaidasVsContasPagar`, `Step2RedeVsOfx`, `Step3PixVsOfx` e repassá-las para a gravação no Step 8.
  - Garantir que `pos_transactions` receba `target_date = targetDate`.
- `src/hooks/useTransactions.ts`:
  - No `useBulkInsertTransactions`, assegurar que `posTxs` usem `target_date = t.target_date || targetDate` e respeitem o `store_id` da filial.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Fluxo do Wizard):** Arrastar arquivos $\rightarrow$ Mapear $\rightarrow$ Clicar em Avançar $\rightarrow$ Entrar em Step 4 (Saídas) $\rightarrow$ Step 5 (Rede) $\rightarrow$ Step 6 (PIX) $\rightarrow$ Step 7 (Final) $\rightarrow$ Gravar $\rightarrow$ O banco só é alterado após a aprovação no Step 7.
- **Cenário 2 (Maquininha na Loja):** Ao concluir a importação, navegar para `/conciliacao/st-01?date=2026-09-01` $\rightarrow$ A aba "1. Cartão / Maquininha" exibe as transações de cartão e calcula o match com o extrato.
