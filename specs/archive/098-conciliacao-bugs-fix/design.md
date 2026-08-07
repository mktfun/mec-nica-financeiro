# Design: Fix de Múltiplos Bugs Financeiros (098)

## 1. `modulo1Calculations.ts` (Core Engine)
Na funçÁo `calculateGlobalConciliacao`:
```typescript
const valor_contas = Math.abs(Number(input.juros_rede || 0)) + Math.abs(Number(input.contas_a_pagar || 0));
```
Isso garante que `valor_contas` será sempre absoluto e positivo, mantendo o operador de deduçÁo `valor_disp_contas - valor_contas` matematicamente preciso.

## 2. `useConciliacao.ts` (Buscador de OSs)
Atualizar a funçÁo de filtro de OSs pendentes (`isPendingOs`):
```typescript
const isPendingOs = (status: string) => {
  const s = String(status || '').toLowerCase().trim();
  return ['em_aberto', 'pago_parcial', 'pendente', 'aberta', 'aberto', 'em andamento'].includes(s);
};
```
Aplicar esse filtro em todas as varreduras de `storeOs` no arquivo.

## 3. `ResumoDiaPanel.tsx` (Tela e Override de Caixa Anterior)
- Alterar o UI na seçÁo do "Caixa atual vs ConciliaçÁo Anterior".
- Adicionar um pequeno input numérico discreto (`caixa_anterior_manual`) caso `caixaAnteriorGlobal` nativo retorne 0. Se o usuário digitar algo, essa prop passa para a funçÁo `calculateGlobalConciliacao` (substituindo o 0).
- Estado novo: `[manualCaixaAnterior, setManualCaixaAnterior] = useState<number | null>(null)`.
- No input da funçÁo: `caixa_anterior: manualCaixaAnterior !== null ? manualCaixaAnterior : caixaAnteriorGlobal`.
