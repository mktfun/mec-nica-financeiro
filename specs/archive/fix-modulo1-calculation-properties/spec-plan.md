# Spec Plan: Correção dos Nomes de Propriedade do Módulo 1 na Conciliação Diária (fix-modulo1-calculation-properties)

## Tasks

- [ ] [FRONTEND] Corrigir `src/routes/conciliacao.index.tsx`:
  - [ ] Integrar `useModulo1StoresData(selectedDate)` para obter os dados completos calculados por loja (banco Itaú, recebíveis a receber e OSs pendentes no pátio).
  - [ ] Mapear as chaves exatas da interface `StoreSaldoState` (`saldo_banco_itau`, `a_receber`, `na_loja_os`, `faturamento_atual`, `limite_credito`).
  - [ ] Passar o array `storesState` corrigido para o componente `<ResumoDiaPanel />`.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
