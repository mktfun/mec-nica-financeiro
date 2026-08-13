# Spec Plan: Correção de Cálculo de Caixa Atual e Divergência na Conciliação Diária (183)

## Tasks

- [ ] [FRONTEND] Modificar `calculateGlobalConciliacao` em `src/lib/modulo1Calculations.ts` removendo `na_loja` da fórmula de `caixa_atual`.
- [ ] [FRONTEND] Modificar `calculateModulo1Saldo` em `src/lib/modulo1Calculations.ts` ajustando a soma de `g17` (`saldo_total_g17`) para não somar `g16` (`na_loja_g16`).
- [ ] [TEST] Executar `npm run build` para garantir que não há erros de tipagem.
- [ ] [TEST] Verificar visualmente o recálculo do dia na Conciliação Diária.
