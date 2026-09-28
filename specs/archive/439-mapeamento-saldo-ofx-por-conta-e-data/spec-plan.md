# Plano de implementação — Spec 439

Todos os itens seguem `Pending` até a aprovação da spec.

## Parser e contratos

- [x] Completed **[PARSER; backend-patterns]** Estender `OfxParseResult`/`NormalizedOfxResult` com conta canônica e candidatos datados de MEMO, LEDGERBAL, AVAILBAL e PRVBAL; tornar a classificação de saldo mutuamente exclusiva. Verificar com `node --test tests/ofxBalanceCandidates.test.mjs` e `npx tsc --noEmit`.
- [x] Completed **[PARSER; backend-patterns]** Testar os quatro padrões reais com fixtures sintéticas, inclusive saldo negativo, zero, diferença de R$ 0,02, MEMO igual em datas diferentes e `DTASOF` diferente do nome do arquivo. Verificar que nenhuma linha de saldo entra em `transactions`.
- [x] Completed **[IMPORT; backend-patterns]** Propagar candidatos em `centralImportManager`, inclusive deduplicação e caminho PDF/manual; manter compatibilidade do retorno legado sem usá-lo para gravar saldo. Verificar `npm run build`.

## Banco e regra financeira

- [x] Completed **[DB; database/supabase]** Inspecionar schema remoto, índices e políticas; criar migration idempotente de candidatos, regras, seleção e eventos com RLS restrita, unicidade e versão concorrente. Verificar migration local, `supabase db diff`/revisão SQL e tipos gerados.
- [x] Completed **[DB; database/security]** Criar RPC transacional de prévia e aplicação que valide usuário, conta, loja, data e candidato por ID; consolidar `reconciliations.bank_total` por conta sem duplicação; recalcular resumo/snapshot com trilha antes/depois. Verificar testes de idempotência, acesso negado, data divergente e rollback.
- [x] Completed **[DB; database/security]** Implementar correção posterior de data fechada com revisão recuperável e regra de concorrência, preservando o valor anterior em falha. Verificar duas edições sequenciais e restauração auditada.

## Interface e integração

- [x] Completed **[FRONTEND; frontend-design-pro/ui-components]** Estender a tabela OFX de `CentralImportWizard` com opções por conta, fonte/MEMO/data/valor, validação e ação “lembrar”; bloquear confirmação de saldo ambíguo. Verificar estados vazio/loading/erro e `npm run build`.
- [x] Completed **[FRONTEND; frontend-design-pro/ui-components]** Permitir no `SaldoBancosDetailModal` trocar regra e seleção de data já importada, com prévia do impacto e histórico. Verificar teclado, foco, feedback inline e lint direcionado.
- [x] Completed **[INTEGRATION; backend-patterns]** Trocar as escritas diretas de `ofx.bankBalance` em `CentralImportWizard` pelo resultado confirmado da RPC; alinhar caminho manual, invalidar consultas e consumir só o resumo canônico. Verificar `npm run build` e teste E2E de importação/reaplicação.

## Segurança, regressão e revisão

- [x] Completed **[SECURITY/TEST; security/database]** Confirmar que operador sem permissão não altera regra ou saldo e que conteúdo OFX real, CPF/CNPJ e arquivos brutos não entram em fixtures/logs. Verificar RLS e inspeção de diff.
- [x] Completed **[TEST; backend-patterns]** Criar `tests/e2e/tier2_boundary/ofx_balance_selection.test.mjs` para as quatro contas, datas 25/27, múltiplas contas por loja, arquivo repetido, valor zero/negativo e mudança posterior. Verificar `node --test` direcionado.
- [x] Completed **[VERIFY]** Rodar `npx tsc --noEmit`, `npm run build`, lint direcionado e testes de parser/E2E; revisar diff, grafo de dependências e plano de rollback antes de executar qualquer migração remota.
