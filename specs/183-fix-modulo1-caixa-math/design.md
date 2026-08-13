# Design: Correção de Cálculo de Caixa Atual e Divergência na Conciliação Diária (183)

## Arquitetura Técnica
`ResumoDiaPanel.tsx` → `calculateGlobalConciliacao` (`modulo1Calculations.ts`) → UI da Conciliação Diária (`/conciliacao`)

- Alteração da fórmula do `caixa_atual` na camada de utilitários financeiros do frontend.
- O campo `na_loja_os` permanecerá sendo exibido como métrica informativa no painel (Card "NA LOJA OS"), porém sem compor o saldo operacional nem o Fluxo de Caixa.

## Interfaces TypeScript
Mantidas as mesmas assinaturas e interfaces (`GlobalConciliacaoInput`, `GlobalConciliacaoCalculated`).

## Componentes / Hooks / Funções
- `src/lib/modulo1Calculations.ts`:
  - `calculateGlobalConciliacao`:
    ```typescript
    // ANTES: const caixa_atual = saldo + dinheiro_mp + a_receber + na_loja;
    // DEPOIS:
    const caixa_atual = saldo + dinheiro_mp + a_receber;
    ```
  - `calculateModulo1Saldo`:
    ```typescript
    // ANTES: const g17 = g13 + g14 + g15 + g16;
    // DEPOIS:
    const g17 = g13 + g14 + g15;
    ```

## Fluxo de UI
1. Usuário seleciona o dia na Conciliação Diária (ex: 10/08/2026).
2. O card "NA LOJA OS" exibe R$ 1.502.709,92 como informativo do valor no pátio.
3. O card "CAIXA ATUAL" calcula puramente: Saldo Banco (2.634,23) + Dinheiro MP (38.681,00) + A Receber (0,00) = R$ 41.315,23.
4. O Fluxo de Caixa fica em R$ 41.315,23.
5. A Diferença Final é calculada corretamente sem a contaminação de 1.5 milhão.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Carregar dia 10/08/2026 na tela de Conciliação Diária → Verificar se o Caixa Atual é a soma exata de (Banco + MP + A Receber) e se a Diferença Final não apresenta o rombo falso de -1.4M.
- **Cenário 2:** Build da aplicação sem erros de compilação TypeScript.
