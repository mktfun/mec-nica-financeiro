# Design: Isolamento de Data do Marco Zero e Ajuste de Matemática Incremental na Conciliação (185)

## Arquitetura Técnica
`MarcoZeroWizard.tsx` → `daily_snapshots` & `patio_os` → `ResumoDiaPanel.tsx` → `calculateGlobalConciliacao` (`modulo1Calculations.ts`) → UI Conciliação Diária

## Interfaces TypeScript
Mantidas as mesmas assinaturas e interfaces (`GlobalConciliacaoInput`, `GlobalConciliacaoCalculated`).

## Componentes / Hooks / Funções

1. **`src/components/importacoes/MarcoZeroWizard.tsx`:**
   - Na gravação de OSs em `patio_os` e `estoque_os_pendente`, forçar o campo `opened_at` / `data_os` para `targetDate`:
     ```typescript
     opened_at: targetDate, // Garante que dias anteriores ao targetDate não recebam essas OSs
     ```

2. **`src/components/conciliacao/ResumoDiaPanel.tsx`:**
   - Atualizar a definição de `faturamentoAnteriorGlobal` e `caixaAnteriorGlobal`:
     ```typescript
     const faturamentoAnteriorGlobal = previousSnapshot?.faturamento 
       ?? currentSnapshot?.metadata?.faturamento_anterior 
       ?? 0;

     const caixaAnteriorGlobal = previousSnapshot?.caixa_atual 
       ?? currentSnapshot?.metadata?.caixa_anterior 
       ?? 0;
     ```

3. **`src/lib/modulo1Calculations.ts`:**
   - Ajustar o cálculo na função `calculateGlobalConciliacao`:
     ```typescript
     const caixa_atual = saldo + dinheiro_mp + a_receber + na_loja;
     const fluxo_cx = caixa_atual - Number(input.caixa_anterior || 0);

     // Faturamento incremental do período
     const faturamento_periodo = Number(input.faturamento_atual || 0) - Number(input.faturamento_anterior || 0);
     
     // Valor disponível para contas = faturamento do período - fluxo de caixa
     const valor_disp_contas = faturamento_periodo - fluxo_cx;

     const valor_contas = Math.abs(Number(input.juros_rede || 0)) + Math.abs(Number(input.contas_a_pagar || 0));
     const diferenca = valor_disp_contas - valor_contas;
     ```

## Fluxo de UI
1. Usuário importa Marco Zero para 10/08/2026.
2. Dias 01/08 a 09/08 permanecem limpos, sem contaminação por OSs do Marco Zero.
3. Ao navegar até o dia 10/08/2026 na Conciliação Diária:
   - Faturamento Ant: R$ 208.268,09
   - Caixa Atual: R$ 222.798,65
   - Fluxo Caixa: R$ 36.402,91
   - Valor Disp Contas: R$ 12.340,03
   - Subtotal Contas: R$ 12.340,30
   - **Diferença Final: -R$ 0,27** (correspondência de 100% com o preview da planilha).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Navegar até dias 01/08 a 09/08 → Confirmar que não há contaminação de OSs do Marco Zero.
- **Cenário 2:** Abrir a Conciliação Diária do dia 10/08/2026 → Confirmar se a Diferença Final é exatamente -R$ 0,27.
