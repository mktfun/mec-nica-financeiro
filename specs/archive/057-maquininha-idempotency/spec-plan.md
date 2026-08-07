# Spec Plan: Idempotência e Ingestão Completa da Maquininha (057)

## Tasks

- [x] [FRONTEND] Remover do dicionário `REDE_STORE_MAPPING` em `src/lib/parsers/storeMapping.ts` todas as chaves `"visa"`, `"mastercard"`, `"-"`, `"elo"`, `"mhe mp"`, `"kennedy mp"`, `"brasicar mp"`, `"emporio mp"`, `"rei do modulo mp"`, `"hd mp"`, `"dom pedro mp"`, `"jorge beretta mp"` (pois elas passarão a ser mantidas caso o usuário queira identificá-las manualmente).
- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, criar a função `generateSyntheticFitId` para gerar a hash determinística usando base64 simples ou underscore-concat.
- [x] [FRONTEND] Em `CentralImportWizard.tsx`, aplicar `fitid: generateSyntheticFitId(...)` nas transações Maquininha fallback (linha 355+ aprox).
- [x] [FRONTEND] Em `CentralImportWizard.tsx`, aplicar `fitid: generateSyntheticFitId(...)` no bloco que gera as transações `source: 'rede'` e `source: 'rede_taxa'`.
- [x] [FRONTEND] Em `src/components/importacoes/WizardImportacao.tsx`, replicar a lógica do `fitid` para as transações de Maquininha da interface alternativa, garantindo uniformidade em toda a aplicação.
- [x] [TEST] Verificar visualmente o fluxo: O código não deve quebrar durante a geração do batch e os imports repetidos devem disparar a query de Upsert em `useTransactions.ts` protegendo contra duplicadas.
