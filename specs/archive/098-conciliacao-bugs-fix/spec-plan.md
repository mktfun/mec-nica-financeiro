# Spec Plan: Fix de Bugs na Matemática do Pátio (098)

## Tasks

- [x] [ENGINE] Editar `src/lib/modulo1Calculations.ts`
  - Aplicar `Math.abs()` na consolidação de `valor_contas` em relação a `juros_rede` e `contas_a_pagar`.
- [x] [ENGINE] Editar `src/hooks/useConciliacao.ts`
  - Substituir o filtro literal de status `'em_aberto' || 'pago_parcial'` por uma checagem tolerante (lowercase/trim) que suporte `'pendente'`, `'aberta'`, `'aberto'`, `'em andamento'`, etc.
- [x] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx`
  - Adicionar o estado `manualCaixaAnterior`.
  - Passar `manualCaixaAnterior ?? caixaAnteriorGlobal` para a Engine.
  - Renderizar um `<input type="number">` discreto do lado ou no lugar do "0,00" na linha de Conciliação Anterior para permitir a ancoragem (seeding) inicial do Fluxo de Caixa.
