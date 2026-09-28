# Plano de Execução — Spec 442: Preservar e Exibir o MEMO de Boletos e SISPAG do OFX

- [x] Completed [DIAGNÓSTICO/BACKUP] Gerar backup em JSON de amostra de linhas de `ofx_transactions` que possuem `counterpart_name` correspondente a alias de conta bancária em `.tmp/backup_ofx_counterpart_pre_442.json`. Verificar schema e constraints de `ofx_transactions`. **Verificação:** Script de consulta SQL sem mutações. Referência: `database`.

- [x] Completed [DB/MIGRATION] Criar migration `supabase/migrations/20260928000003_add_ofx_raw_fields_and_preserve_memo.sql` adicionando colunas `raw_memo`, `raw_name`, `bank_reference` e `original_fitid` em `public.ofx_transactions`. Aplicar via Supabase MCP e atualizar tipos TypeScript. **Verificação:** Inspeção de colunas no Supabase. Referência: `database`.

- [x] Completed [PARSER/OFX] Atualizar `src/lib/parsers/ofxParser.ts` para capturar `<NAME>`, `<CHECKNUM>` e `<FITID>` bancário original, preenchendo os novos campos de `OfxTransaction` sem alterar a geração do hash determinístico de deduplicação `fitid`. **Verificação:** Executar `npm run build` e validação com fixture OFX. Referência: `backend-patterns`.

- [x] Completed [IMPORTADORES/UNIFICAR] Atualizar `src/components/importacoes/CentralImportWizard.tsx`, `src/hooks/useTransactions.ts` e `src/components/importacoes/manual/Fase3OfxReconciliation.tsx` para persistir os campos brutos e garantir que o alias da conta bancária nunca seja gravado em `counterpart_name`. **Verificação:** Executar `npm run build` sem erros de TypeScript. Referência: `backend-patterns`.

- [x] Completed [FRONTEND/EXTRATO] Atualizar `getCleanTransactionDisplay` em `src/components/conciliacao/StoreExtratoBancarioView.tsx` para descartar aliases de conta em `counterpart_name`, exibir `bank_name` / `raw_memo` preservando o rótulo da operação (ex.: "SISPAG FORNECEDORES") e exibir a referência bancária em badge discreta. **Verificação:** Executar `npm run build`. Referência: `frontend-design-pro`.

- [x] Completed [SANEAMENTO/DADOS] Executar script SQL seguro para limpar `counterpart_name` quando for igual ao alias da conta (ex.: `ITAU - 8813994293`), restaurando a visualização de `bank_name` ("SISPAG FORNECEDORES") nas transações de 24/09 sem alterar valores ou vínculos. **Verificação:** Consulta SQL confirmando que as transações exibem a descrição bancária correta. Referência: `database`.

- [x] Completed [VERIFICAÇÃO/GATE] Executar o Quality Gate final: build completo de produção (`npm run build`), validação visual no extrato bancário de `st-08` em `2026-09-24` e teste de ausência de segredos. **Verificação:** Terminal limpo com `npm run build` aprovado. Referências: `deploy-production`, `afrexai-nextjs-production`.
