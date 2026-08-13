# Design: Sanitização Global de Ponto Flutuante (188-sanitizacao-ponto-flutuante)

## Arquitetura Técnica
A camada de utilitários central (`numberUtils.ts`) ganhará uma função pura, `roundCurrency`, que aplica a heurística IEEE 754 de soma de epsilon para garantir que decimais .5 exatos subam corretamente e evitem truncamento impreciso do motor V8. 
O pipeline inteiro consumirá essa função. Como o `extractNumber` já é o núcleo comum de extração, ele será a porta de entrada. Em cálculos derivados nos parsers que usam somas literais no JS, o resultado final da soma será encapado pelo `roundCurrency`.

## Interfaces TypeScript
```typescript
// Em src/lib/parsers/numberUtils.ts
export function roundCurrency(value: number): number {
  if (isNaN(value)) return 0;
  // (value + Number.EPSILON) garante precisão antes de multiplicar
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
```

## Componentes / Hooks / Funções
1. **`src/lib/parsers/numberUtils.ts`**:
   - Adição do `roundCurrency(value)`.
   - Modificação em `extractNumber` para retornar `roundCurrency(parsed)`.
2. **`src/lib/parsers/redeParser.ts`**:
   - Garantir que `interest = roundCurrency(grossAmount - netAmount)`.
3. **`src/lib/parsers/ofxParser.ts`**:
   - Garantir que somas e conversões de limite, transferências e extrações manuais de extrato que usam `parseFloat` passem também por `roundCurrency` (ou idealmente via `extractNumber`).
4. **`src/lib/parsers/marcoZeroParser.ts`**:
   - Revisar se usa `parseFloat` cru (vimos que usa na linha 40/43). Substituir por `extractNumber` (que já arredonda) ou passar por `roundCurrency`.

## Fluxo de Execução
1. O usuário faz o upload de arquivos via `<ExtratosImportacaoModal>` ou `<MarcoZeroWizard>`.
2. Os parsers (Ofx, Rede, MarcoZero) varrem o binário/texto.
3. Toda string que vira float passa por `extractNumber` (já arredondado) ou por `.replace(',', '.')` seguido por `parseFloat` e encapado por `roundCurrency`.
4. Os arrays de entidades populados (`pos_transactions`, `patio_os`, etc.) são enviados na chamada do Supabase contendo exatos e apenas dois decimais.
5. O Supabase insere o valor contábil purificado no tipo `numeric`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Testar a função isoladamente no console ou script: `roundCurrency(2358.5519000000004)` deve retornar `2358.55`. `roundCurrency(1.005)` deve retornar `1.01`.
- **Cenário 2:** Validar importação simulada. Se um cálculo faz `12.34 - 10.01` (que no JS resulta em `2.329999999999999`), a gravação final do parser tem que salvar `2.33`.
