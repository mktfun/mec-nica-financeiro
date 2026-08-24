# Spec Plan: Correção de Parâmetro da RPC de Maquininhas e Diagnóstico Contábil de Contas a Pagar (265)

## Tasks

- [x] [FRONTEND] Corrigir parâmetro de `p_date` para `p_target_date` em `src/hooks/useBackendConciliacao.ts` na chamada `get_store_pos_triple_reconciliation`
- [x] [FRONTEND] Ajustar card de Contas no `src/components/conciliacao/ResumoDiaPanel.tsx` para exibir explicitamente o breakdown: Base da Planilha + Extras Manuais + Juros Rede = Subtotal Contas
- [x] [BACKEND] Criar migration com overload de `get_store_pos_triple_reconciliation(p_date date)` para blindar compatibilidade retroativa e futura
- [x] [TEST] Testar chamada da RPC via script Node.js e verificar retorno com dados da Rede
- [x] [TEST] Executar `npm run build` para garantir zero erros de compilação TypeScript
