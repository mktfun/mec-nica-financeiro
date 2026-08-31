# Spec Plan: Matching Automático de Saídas OFX × Contas a Pagar e Filtro Estrito de Órfãos (325)

## Tasks

- [x] [FRONTEND] Corrigir `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx` eliminando o fallback que reinjetava saídas já casadas e garantindo exibição estrita de apenas `dbOutflows` não-vinculados (com empty state gracioso)
- [x] [FRONTEND] Atualizar `src/hooks/useTransactions.ts` removendo `ignoreDuplicates: true` do upsert de `ofx_transactions` para garantir atualização de `target_date` e campos de conciliação
- [x] [FRONTEND] Implementar pré-matching em memória em `src/components/importacoes/CentralImportWizard.tsx` (ou helper de matching) para marcar `matched_bill_id` preliminarmente nos resultados de OFX
- [x] [TEST] Executar Cenário 1: Ingestão de arquivos da pasta `31-08`, validação de que os 44 débitos casados não aparecem e que apenas os órfãos reais são listados no Passo 5
- [x] [TEST] Executar Cenário 2: Validação de justificativa de débito órfão residual com toggle de Contas a Pagar e build com `npm run build` limpo
