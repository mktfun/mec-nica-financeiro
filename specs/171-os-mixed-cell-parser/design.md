# Design: Resilient Mixed Cell OS Parser (171)

## Arquitetura Técnica
A alteração ocorre puramente no Frontend durante o parsing do arquivo Excel:
1. `CentralImportWizard.tsx` invoca `processOsFiles` (de `useOsImportProcessor.ts`).
2. `useOsImportProcessor.ts` lê o arquivo linha a linha.
3. Ao extrair os valores financeiros (`paidValue`, `totalValue`, `openValue`), ao invés de usar o parser local `parseFloat`, ele chamará a função exportada `extractNumber(val)` de `src/lib/parsers/numberUtils.ts`.
4. Ao extrair a string da forma de pagamento, ele vai concatenar a coluna dedicada de pagamento e a coluna de valor pago, submetendo essa super-string ao Regex de detecção (ex: `/PIX|DINHEIRO|.../i`).

## Interfaces TypeScript
Nenhuma mudança de interface TypeScript.

## Componentes / Hooks / Funções
- `src/hooks/useOsImportProcessor.ts`: 
  - Atualização do parser interno para utilizar `extractNumber`.
  - Atualização da captura do `payment_method_str` para concatenar valores textuais das células.

## Fluxo de UI (se frontend)
Transparente ao usuário. Apenas a métrica de "OS (Pátio)" nos cards do Preview deixará de vir zerada quando a planilha contiver lixo textual ("Pago PIX 1500") misturado com números.

## Infra / Deploy (se aplicável)
Deploy padrão via Lovable. Não há alterações de banco de dados nem de Edge Functions.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Célula "Valor Pago" contém string pura com número, ex: `"Pago no Pix 1.500,00"`.
  - **Resultado Esperado:** `extractNumber` converte para `1500.00`. O regex de pagamento localiza "PIX", alocando `parsed_pix_transfer = 1500.00`.
- **Cenário 2:** Célula "Valor Pago" contém apenas número `1500.00` e a coluna "Forma de PG" contém `"PIX"`.
  - **Resultado Esperado:** O comportamento atual é mantido, e a concatenação não quebra a lógica existente.
