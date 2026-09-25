# 📄 Proposta de Mudança — Spec 438: Canonical Rematch & Intercompany Guard

## 1. Contexto e Motivação
A conciliação diária de 24/09/2026 apresentou inconsistências críticas decorrentes de regras permissivas de automatch e cálculos residuais de UI:
1. **Falsos Positivos de PIX x OS por Falta de Identidade:** Vínculos automáticos indevidos foram gerados para créditos intercompany (como as transferências de R$ 1.510,00 e R$ 1.000,00 casando com OS #619 e #1894) e para a entrada de R$ 5.000,00 da HD Centro (casando com cliente PF sem documento/identidade coincidente).
2. **Cálculos e Fallbacks Descentralizados no Frontend:** Em `StoreCardModulo1` e `ConciliacaoLojasView`, o frontend computa diferenças locais (`orfas* = ofx - conciliado`, `diferencaFinalCalculada`) e injeta prefixos manuais de sinal (`-`), gerando anomalias visuais como `-R$ 850,00` quando tanto Saídas OFX quanto Contas são exatamente R$ 850,00 (Jorge Beretta - DHJV), ou não abatendo justificativas canônicas como no caso Kennedy - MP (R$ 2.003,00).
3. **Falta de Idempotência e Ordem Canônica:** O salvamento de snapshots e chamadas desprotegidas a `auto_match_receivables` ocorrem antes do término do rematch completo e da consolidação do resumo diário.

## 2. Escopo de Arquivos

### Novos
- `supabase/migrations/<timestamp>_canonical_rematch_intercompany_guard.sql` — redefinições das RPCs, saneamento auditado e resumo final.
- `tests/e2e/tier2_boundary/m8_canonical_rematch.test.mjs` — fronteiras da ordem, idempotência e bloqueios.
- `tests/e2e/tier4_real_world/rematch_20260924_audit.test.mjs` — auditoria dos dois vínculos intercompany e da entrada de R$ 5.000,00.

### Modificados
- `src/components/conciliacao/ConciliacaoLojasView.tsx` — remover derivação e fallbacks locais (`orfas*`), consumindo apenas campos canônicos da RPC.
- `src/components/conciliacao/StoreCardModulo1.tsx` — remover injeção manual de sinal `-`, derivações locais e respeitar o valor e status canônicos.
- `src/components/conciliacao/ResumoDiaPanel.tsx` — eliminar cálculos locais duplicados de diferença e confiar no payload do resumo canônico.
- `src/components/importacoes/CentralImportWizard.tsx` — reordenar fluxo para executar rematch antes de persistir snapshot e proteger chamadas a recebíveis.
- `src/hooks/useBackendConciliacao.ts` — preservar valores canônicos (`0`, `null`, `dif_*`) sem operadores `??` mascarando o zero legítimo.
- `src/utils/autoMatchingEngine.ts` (ou equivalentes) — reforçar predicados estritos de PIX x OS.

## 3. Plano de Rollback
Aplicar a migration em transação e guardar, no log de auditoria disponível, os campos anteriores de cada vínculo tocado. Se a validação falhar, restaurar somente `matched_os_number`, `matched_ofx_id`, categoria/status e linhas de `conciliation_matches` do snapshot; não restaurar agregados financeiros sem evidência. Reverter a definição da RPC e invalidar as consultas da UI. O snapshot diário não é restaurado automaticamente: ele deve ser refeito pelo fluxo canônico após a decisão de rollback.

## 4. Riscos e Mitigação
O filtro pode deixar mais entradas órfãs quando o banco não fornece nome ou documento. Elas permanecem visíveis para vínculo manual. Aliases de intercompany podem gerar falso positivo se usados isoladamente; por isso o bloqueio exige entidade/alias confiável e, quando possível, par entre lojas ou documento/chave conhecidos. Toda rejeição deve ser contável por motivo (parcela, identidade, filial, intercompany ou ambiguidade).

## 5. Critérios de Aceite
- A fonte da fase PIX não contém caminhos por `total_value`, saldo residual ou unicidade sem identidade.
- `pix_transfer_value <= 0`, entrada sem identidade forte, filial divergente ou marcador intercompany nunca gera `matched_os_number` automático.
- Após o saneamento de 24/09, as transferências de R$ 1.510,00 e R$ 1.000,00 permanecem classificadas como intercompany/pendentes e sem OS #619/#1894; a entrada HD Centro de R$ 5.000,00 permanece sem vínculo automático.
- `auto_match_receivables` não consegue reintroduzir esses vínculos.
- Duas execuções consecutivas produzem o mesmo resultado, sem duplicar `conciliation_matches` e sem alterar `matched_manual`.
- O snapshot é salvo depois do rematch e o resumo recalculado contém os cinco pilares e `diferenca_final` coerente.
- A tela não calcula diferenças financeiras no cliente. Com OFX e conciliado iguais, entradas e saídas mostram `R$ 0,00`; nenhum `??` pode substituir uma diferença canônica por outra métrica.
- Uma justificativa de R$ 2.003,00 aparece uma única vez no ledger do resumo e reduz o residual exatamente uma vez; o caso Kennedy é coberto por teste com `4.006,29`, `2.003,29` e a justificativa correspondente.
- O sinal exibido para saída não transforma uma diferença já negativa em outra diferença nem cria `-R$ 850,00` quando OFX e contas são ambos R$ 850,00.
- O fluxo não altera `daily_revenue_adjustments` nem injeta faturamento artificial.
