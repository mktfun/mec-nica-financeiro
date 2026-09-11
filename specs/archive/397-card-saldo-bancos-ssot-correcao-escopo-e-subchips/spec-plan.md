# Spec Plan: Correção Card Saldo Bancos — SSOT com Modal Raio-X (397)

## Tasks

- [x] **Task 1: [BACKEND] Corrigir escopo de `posData` no hook `useBackendConciliacao.ts`**
  - [x] 1.1 Adicionar `let posQuerySuccess = false;` antes do `try` block de `pos_transactions` (antes da linha 264).
  - [x] 1.2 Dentro do `try`, após verificar `posData.length > 0`, atribuir `posQuerySuccess = true;`.
  - [x] 1.3 Substituir a referência `posData ?` na linha 289 por `posQuerySuccess ?`.
  - [x] 1.4 Substituir a referência `posData ?` na linha 308 por `posQuerySuccess ?`.

- [x] **Task 2: [FRONTEND] Limpar fallback chain do card em `ResumoDiaPanel.tsx`**
  - [x] 2.1 Simplificar `saldoBancosValor` (linha 240-242): remover fallbacks para `total_saldo_banco` (NET), usar apenas `derivedBankTotals.totalPositivoConsolidado`.
  - [x] 2.2 Simplificar o `<AnimatedNumber>` do card principal (linha 667-669): renderizar diretamente `derivedBankTotals.totalPositivoConsolidado` sem fallback para `total_saldo_banco_positivo` (inflado) ou `saldoBancosValor` (NET).
  - [x] 2.3 Garantir que os sub-chips (OFX Positivo, Dinheiro, A Compensar, Cheque Esp.) usam exclusivamente `derivedBankTotals.*` sem fallback para campos escalares errados da RPC.

- [x] **Task 3: [TEST] Validação de Terminal (Build Gate) & Verificação Numérica**
  - [x] 3.1 Executar `npm run build` para garantir zero erros de tipagem TypeScript.
  - [x] 3.2 Executar script de verificação numérica: card deve exibir OFX=146.160,23 + Dinheiro=880 + Rede=4.642,10 = Total 151.682,33.
  - [x] 3.3 Confirmar que os 4 sub-chips (OFX Positivo, Dinheiro, A Compensar, Cheque Esp.) renderizam com valores > 0.
