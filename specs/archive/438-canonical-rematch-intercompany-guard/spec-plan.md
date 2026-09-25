# Plano de implementação — Spec 438

Execução concluída e validada via Terminal Gate e testes E2E.

## Banco e contratos
- [x] Completed **[DB]** Criar migration transacional que registre o preflight, saneie os vínculos automáticos de 24/09 por data/valor/contraparte/OS, preserve `matched_manual` e não faça ajuste cego de agregados. Validar com `supabase db diff` e revisão SQL da migration.
- [x] Completed **[DB]** Recriar `auto_match_daily_transactions(text)` com preclassificação intercompany, Rede x OS, PIX estrito, `auto_match_saidas` e retorno idempotente de contadores/auditoria. Confirmar por consulta de definição que não restam fallbacks de total/residual/unicidade.
- [x] Completed **[DB]** Endurecer `auto_match_receivables(text)` para impedir qualquer escrita de `matched_os_number` sem parcela PIX, identidade e filial válidas, e para não reintroduzir os três casos auditados. Verificar com fixtures de recebível por valor coincidente.
- [x] Completed **[DB]** Encadear `get_daily_reconciliation_summary(p_date, true)` após todas as mutações e registrar o snapshot final somente nessa etapa. Verificar que os campos dos cinco pilares e `diferenca_final` refletem o estado pós-match.
- [x] Completed **[DB]** Consolidar no resumo a fórmula em centavos para `dif_entradas`, `dif_saidas` e `diferenca`, com ledger explícito de justificativas incluídas/excluídas e sem dupla contagem. Validar os casos Kennedy e totais iguais.

## Backend e frontend
- [x] Completed **[BACKEND]** Alinhar `isStrictPixOsMatch`, o caminho de recebíveis e os filtros de `useConciliacao` ao contrato da RPC; remover fallback de valor único, total ou método genérico. Validar com testes unitários/estáticos dos predicados.
- [x] Completed **[FRONTEND]** Reordenar `CentralImportWizard` para não salvar snapshot antes do rematch, evitar chamada desprotegida de `auto_match_receivables` e invalidar consultas após a conclusão. Verificar a sequência no fluxo de importação de um dia.
- [x] Completed **[FRONTEND]** Remover de `ConciliacaoLojasView`, `StoreCardModulo1` e `ResumoDiaPanel` toda derivação/fallback de diferença (`orfas*`, `diferencaFinalCalculada`, `ofx - conciliado` e troca de sinal). Consumir apenas os campos canônicos ou mostrar `N/D`.
- [x] Completed **[BACKEND]** Regenerar `src/integrations/supabase/types.ts` somente se a assinatura/payload final mudar e manter a persistência de `matched_os_number` compatível com o resultado estrito.
- [x] Completed **[BACKEND]** Ajustar `useBackendConciliacao` para preservar zero válido, `null` e campos `dif_*` sem cascatas de `??`; adicionar teste de contrato para não transformar diferença zero em residual.

## Segurança e testes
- [x] Completed **[SECURITY]** Auditar que limpeza e rematch não alteram vínculos `matched_manual`, `daily_revenue_adjustments` ou valores agregados sem proveniência. Registrar motivos de rejeição e falhas parciais.
- [x] Completed **[TEST]** Implementar `tests/e2e/tier2_boundary/m8_canonical_rematch.test.mjs` para ordem das fases, bloqueio intercompany, ausência de fallback, idempotência e proteção de recebíveis.
- [x] Completed **[TEST]** Implementar `tests/e2e/tier4_real_world/rematch_20260924_audit.test.mjs` com as contrapartes/valores reais, OS #619/#1894 e HD Centro R$ 5.000,00; verificar estado físico e resumo final.
- [x] Completed **[TEST]** Cobrir cálculo de justificativas e igualdade exata: R$ 2.003,00 do caso Kennedy reduz o residual uma vez; OFX = conciliado gera `0,00` para entradas e saídas; sinal visual não altera o valor canônico.
- [x] Completed **[VERIFY]** Auditar o bundle para que nenhum componente ativo contenha `diferencaFinalCalculada`, `ofx - conciliado` ou fallback de campo de diferença; rodar os testes SSOT existentes e os novos testes de cards.
- [x] Completed **[VERIFY]** Rodar os testes E2E direcionados, revisão de diff SQL/TypeScript e build/lint aplicável; anexar os resultados à revisão antes de qualquer execução em produção.
