# Spec 439 — Seleção e mapeamento editável do saldo de cada OFX

## Problema e evidência nos arquivos

A Central de Importação já deixa associar um arquivo/conta a uma loja por `useStoreFileMappings` e `store_file_mappings`. Ela não deixa escolher **qual saldo do próprio OFX** será o saldo oficial daquela conta para a data conciliada. `parseOFXFile` retorna apenas `previousBalance`, `closingDayBalance` e `bankBalance`; ele prioriza `closingDayBalance` extraído de um `<STMTTRN>` pelo MEMO e só usa `<LEDGERBAL><BALAMT>` como fallback. As linhas de saldo são descartadas da lista de transações e seus MEMOs, valores e datas não são persistidos como candidatos. O wizard soma `bankBalance` por loja e grava `reconciliations.bank_total` e o snapshot. Depois da importação, não há como trocar a fonte sem reabrir o OFX e refazer o fluxo.

Os quatro arquivos reais de `C:\Users\admin\Downloads` foram lidos em modo somente leitura. Todos têm `SALDO ANTERIOR` em 24/09, `SALDO TOTAL DISPONÍVEL DIA` em 25/09 e `<LEDGERBAL>` datado de 27/09. As transações financeiras presentes têm `DTPOSTED` em 25/09; o saldo de MEMO fecha exatamente `saldo anterior + movimento líquido de 25/09`. O `<LEDGERBAL>` representa outra data e, em três contas, outro valor:

| Conta (arquivo de 27/09) | Loja já mapeada no projeto | MEMO de 25/09 | LEDGERBAL de 27/09 | Diferença entre fontes |
| --- | --- | ---: | ---: | ---: |
| 7386 / 166586 | Planalto - BRASICAR | -R$ 66.094,98 | -R$ 62.894,98 | +R$ 3.200,00 |
| 0263 / 811531 | Rudge Ramos - CAP | R$ 2.328,05 | R$ 2.328,05 | R$ 0,00 |
| 2783 / 070820 | Mauá - MHE | -R$ 2.827,77 | -R$ 2.509,97 | +R$ 317,80 |
| 7386 / 162601 | Piraporinha - EMPORIO | R$ 6.634,36 | R$ 6.634,38 | +R$ 0,02 |

Logo, o nome do arquivo `27-09-2026` não determina sozinho o saldo de 25/09; e o MEMO de 25/09 não determina o saldo de 27/09. A divergência de R$ 3.200,00 em Planalto mostra o risco de escolher uma fonte sem expor a data e o valor ao operador.

Há ainda uma ambiguidade no parser: `SALDO DO DIA` pertence tanto à regra de saldo anterior quanto à de encerramento, e a regra anterior é testada primeiro. Esse rótulo deve ser classificado por contexto, nunca pela ordem das expressões.

## Solução proposta

1. **Extrair todos os candidatos de saldo**, mantendo a origem: linha `<STMTTRN>` com `MEMO`, `TRNAMT`, `TRNTYPE`, `DTPOSTED` e FITID; `<LEDGERBAL>`/`<AVAILBAL>` com `BALAMT` e `DTASOF`; e `<PRVBAL>` quando presente. Preservar valor bruto, valor normalizado em centavos, data bancária, tipo da fonte e nome do arquivo. Candidato de saldo nunca vira crédito/débito em `ofx_transactions` nem entra nos totais de movimento.
2. **Na tabela de auditoria OFX do wizard**, mostrar uma linha por conta com loja, data de conciliação, todos os saldos candidatos (nome/MEMO, origem, data e valor), checagem `saldo anterior + entradas - saídas`, e um seletor “Saldo oficial desta conta”. Escolher o valor do arquivo e decidir se a escolha vale só para esta importação ou se deve ser lembrada para aquela conta. O valor serve para o operador conferir a escolha atual; a regra futura casa por conta + fonte/MEMO normalizado + papel temporal, nunca pelo valor fixo.
3. **Persistir dois conceitos distintos**: o mapeamento conta → loja já existente continua em `store_file_mappings`; um novo mapeamento conta → regra de saldo e os candidatos/seleções por conta/data ficam no banco. A regra pode ser trocada a qualquer hora. A troca passa a valer nas próximas importações e a UI oferece reaplicação explícita a uma data já importada, com prévia do saldo anterior/novo e das métricas afetadas.
4. **Resolver por data e sem adivinhação**: automático somente quando há um candidato único para a conta com data de saldo igual à data conciliada e compatível com a regra ativa. Para 25/09, o MEMO de 25/09 é elegível; para 27/09, o `<LEDGERBAL>` de 27/09 é elegível. Fonte de outra data pode ser escolhida manualmente com aviso e motivo registrado, mas não é usada automaticamente. Se faltarem candidatos, houver duas linhas concorrentes ou a conta estiver sem loja, mostrar “Saldo pendente de escolha” e impedir o fechamento daquele saldo como se fosse zero.
5. **Aplicar a seleção no backend** por operação atômica e auditada: validar conta, loja e data, guardar o candidato escolhido e a regra ativa, consolidar todas as contas vinculadas à loja em `reconciliations.bank_total`, recalcular `get_daily_reconciliation_summary` e atualizar a versão do snapshot do dia. Histórico fechado recebe registro de correção com antes/depois; não se reescreve silenciosamente o valor antigo. A tela consome o resultado canônico, sem recomputar dinheiro no React.
6. **Alinhar as duas entradas de importação**: `CentralImportWizard` é o fluxo principal e `Fase3OfxReconciliation` também chama `parseCentralImports`; ambas devem preservar os candidatos e não introduzir um caminho que volte a aceitar `bankBalance` escolhido implicitamente. O parser PDF Itaú continua compatível pelo mesmo contrato de candidatos quando houver saldo datado.

## Skills especializadas consultadas

`sdd-proposal`, `frontend-design-pro`, `ui-components`, `backend-patterns`, `database` e `supabase`. A interface usa o wizard e o modal de saldo existentes; não se propõe tela ou componente novo. O projeto é Vite/TanStack com Supabase, portanto a mutação tipada apropriada é uma RPC transacional com RLS, não uma Server Action de Next.js.

## Contratos físicos e tipos existentes

- `OfxTransaction` e `OfxParseResult` em `src/lib/parsers/ofxParser.ts`; `NormalizedOfxResult` e `CentralImportResults` em `src/lib/parsers/centralImportManager.ts`.
- `store_file_mappings(file_alias, store_id, store_name)` mapeia alias/conta para loja; não contém regra de saldo.
- `reconciliations(store_id, date, bank_total, previous_balance)` guarda o saldo consolidado por loja e dia, não por conta.
- `daily_snapshots(date, saldo_bancario, metadata, is_closed)` e `get_daily_reconciliation_summary` alimentam o fechamento.
- `profiles(role, can_import, can_edit_data)` fornece a autorização existente a ser validada no servidor para alterações de saldo.

Novos contratos propostos: `OfxBalanceCandidate` (`accountKey`, `storeId`, `fileFingerprint`, `sourceKind`, `memoRaw`, `memoNormalized`, `postedDate`, `amountCents`, `rawAmount`, `reconciliationDate`, `validationDeltaCents`) e `OfxBalanceRule` (`accountKey`, `storeId`, `sourceKind`, `memoNormalized`, `dateRole`, `isActive`, `version`). A migration deve verificar os tipos SQL reais antes de fixar colunas e índices; o schema remoto não foi consultado nesta fase.

## Arquivos afetados

### Existentes reutilizados/modificados

- `src/lib/parsers/ofxParser.ts`: candidatos datados e classificação exclusiva de saldos.
- `src/lib/parsers/centralImportManager.ts`: propagar candidatos e deduplicar arquivos sem perder a seleção.
- `src/lib/parsers/itauPdfParser.ts`: adaptar o resultado PDF ao contrato comum, quando houver saldo disponível.
- `src/hooks/useStoreFileMappings.ts`: manter a associação conta → loja, sem embutir nela a escolha do saldo; expor a conta canônica.
- `src/components/importacoes/CentralImportWizard.tsx`: seletor por conta, prévia e envio da seleção ao backend; substituir usos diretos de `bankBalance` para gravar `bank_total`/snapshot.
- `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`: respeitar o mesmo contrato no caminho manual.
- `src/components/conciliacao/SaldoBancosDetailModal.tsx`: consulta e edição posterior por conta/data, com histórico da seleção.
- `src/hooks/useBackendConciliacao.ts` e `src/hooks/useDailyReconciliationSummary.ts`: invalidar/ler resumo canônico após troca; preservar saldo zero e saldo negativo válidos.
- `src/integrations/supabase/types.ts`: regenerar tipos das tabelas/RPC novas.

### Novos

- `supabase/migrations/<timestamp>_ofx_balance_candidates_and_rules.sql`: candidatos, regras, histórico de seleção, RLS, índices e RPC de aplicação/reaplicação.
- `src/hooks/useOfxBalanceMappings.ts`: leitura/mutação tipada das escolhas e regras, com invalidação de cache.
- `tests/ofxBalanceCandidates.test.mjs` e `tests/e2e/tier2_boundary/ofx_balance_selection.test.mjs`: parser, datas, múltiplas contas, correção posterior e invariantes.

## Risco principal, segurança e rollback

O risco é alterar um fechamento histórico com saldo de outra data ou duplicar contas da mesma loja. A RPC deve bloquear seleção automática fora da data, exigir usuário com permissão de edição/importação, ter chave única por conta/data/fingerprint e registrar ator, momento, regra, candidato anterior/novo e diferenças antes/depois. Não copiar os OFX reais nem seus dados pessoais para fixtures ou logs; usar fixtures sintéticas com a mesma estrutura de saldos.

Rollback: desativar a regra nova e restaurar a seleção anterior pelo evento auditado; a RPC recalcula `bank_total` e o resumo da data afetada a partir dos candidatos preservados. A migration não remove `store_file_mappings` nem saldos históricos. Se a aplicação falhar, manter o saldo anterior marcado como “revisão pendente”, sem sobrescrever com zero ou soma de movimentos.

## Critérios de aceite verificáveis

- Para cada um dos quatro OFX, o seletor mostra exatamente as duas fontes relevantes (MEMO 25/09 e LEDGERBAL 27/09), com os valores da tabela acima; `SALDO ANTERIOR` aparece apenas como referência de validação, não como fechamento padrão.
- Ao conciliar 25/09, a sugestão automática nunca usa `<LEDGERBAL>` datado de 27/09; ao conciliar 27/09, nunca usa automaticamente o MEMO datado de 25/09.
- Planalto e Mauá exibem aviso de divergência entre as fontes; Rudge exibe valores iguais com datas/origens distintas; Piraporinha preserva os dois centavos de diferença sem arredondar a escolha para o outro valor.
- A regra salva para a conta reaparece em outro navegador e é reaplicada a um OFX posterior pelo MEMO/fonte, embora o saldo numérico tenha mudado. Trocar a regra depois da importação mostra prévia, registra auditoria e atualiza banco, resumo e tela sem recarregar manualmente.
- Duas contas da mesma loja somam seus **saldos selecionados uma vez cada**; arquivo duplicado, conta não mapeada e fonte ambígua não alteram `bank_total` silenciosamente.
- Saldo `0,00` e saldo negativo são valores válidos; ausência de saldo é `null`/pendência. Nenhuma linha de saldo é gravada como transação de receita/despesa.
- `npm run build`, lint direcionado e testes do parser/RPC passam; nenhum arquivo OFX real entra no repositório.
