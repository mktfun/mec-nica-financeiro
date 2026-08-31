# Spec Plan: Idempotência do Motor de Conciliação, Conciliação de Saídas OFX x Contas e Justificativa de Despesas Órfãs (322)

## Tasks

- [x] [BACKEND] Criar migration com RPCs atômicas `public.resolve_orphan_saida_ofx` e `public.close_daily_snapshot`
- [x] [FRONTEND] Atualizar `Step2NonRevenueJustifications.tsx` para incluir aba de Saídas Órfãs do OFX, corrigir gravação de entradas e adicionar toggle de impacto no Contas
- [x] [FRONTEND] Atualizar `CentralImportWizard.tsx` criando `handleFinalizeClosing` atômico para o fechamento no Step 7 sem repetição de batch
- [x] [TEST] Executar Cenário 1: Resolução de saída órfã como Despesa Extra no Contas a Pagar
- [x] [TEST] Executar Cenário 2: Resolução de saída órfã como Transferência Financeira e validação da idempotência do fechamento
