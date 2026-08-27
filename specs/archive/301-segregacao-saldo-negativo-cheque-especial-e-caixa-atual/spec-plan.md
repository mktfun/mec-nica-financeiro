# Spec Plan: Segregação do Saldo Negativo (Cheque Especial) e Dedução Explícita no Caixa Atual (301)

## Tasks

- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` para calcular e retornar explicitamente `saldo_bancos_positivo` e `saldo_negativo_itau` sem abater o negativo previamente no card de bancos.
- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para renderizar o sub-card destacado de `Saldo Negativo (Cheque Especial)` no Pilar 1 de Bancos e abater no cálculo do Caixa Atual.
- [x] [FRONTEND] Atualizar `SaldoBancosDetailModal.tsx` para exibir os cards de resumo separando contas com saldo positivo e contas em cheque especial.
- [x] [TEST] Executar teste automatizado ao vivo para 27/08 e 26/08 validando a consistência dos saldos positivos, negativos e Caixa Atual.
- [x] [TEST] Executar `npm run build` garantindo zero erros de tipagem e integridade da build.
