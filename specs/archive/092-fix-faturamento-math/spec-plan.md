# Spec Plan: Faturamento Baseado em ConciliaçÁo Real (OFX Vinculado) (092-fix-faturamento-math)

## Tasks

- [x] [FRONTEND] No arquivo `src/hooks/useConciliacao.ts` (hook `useModulo1StoresData`), adicionar a busca de `conciliation_matches` pela data.
- [x] [FRONTEND] Ainda no hook, calcular `pix_os_expected` (total irrestrito de PIX das OSs) e extraí-lo no retorno.
- [x] [FRONTEND] Ainda no hook, calcular `faturamento_real_ofx` (soma de transações do OFX "in" que estÁo contidas nos `ofx_transaction_id` do match) e extraí-lo no retorno.
- [x] [FRONTEND] No arquivo `src/routes/conciliacao.index.tsx`, atribuir `faturamento_atual` para `faturamento_real_ofx` e `pix_os` para `pix_os_expected`.
- [x] [FRONTEND] No arquivo `src/components/conciliacao/ResumoDiaPanel.tsx`, zerar `faturamentoOutrosAutomatico`. Ajustar o cálculo de `Diferença` caso o sinal esteja invertido, para garantir a lógica `(Maquininha + PIX) - Faturamento`.
- [x] [TEST] Verificar visualmente o código Typescript.
