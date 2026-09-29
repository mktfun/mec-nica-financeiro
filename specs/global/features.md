# 🌐 Mapa Global de Features & Componentes Canônicos

Este arquivo é o registro mestre de tudo o que já existe no ecossistema Antigravity 2.0.
Toda nova spec DEVE consultar este catálogo para **REUTILIZAR** em vez de duplicar.

---

## 1. Workflows & Ciclo de Vida SDD
- `/sdd-proposal`: Planejamento determinístico e mapeamento de Blast Radius via Graphify.
- `/sdd-apply`: Implementação cirúrgica com build gate no terminal e rollback automático.
- `/sdd-archive`: Quality gate, atualização do grafo topológico, limpeza de resíduos e commit seletivo.
- `/sdd-debug`: Diagnóstico forense com inspeção de logs reais e SQL.
- `/council`: Deliberação multi-agente pontual sob demanda explícita.

---

## 2. Skills Canônicas Ativas (11 Skills)
1. `frontend-design-pro`: Hub de Design Engineering, Dark UI Zinc-950, 48 guidelines do Rauno e anti-slop.
2. `ui-components`: Catálogo de componentes Shadcn/Tailwind semânticos.
3. `ui-motion`: Micro-interações e animações Magic UI (≤ 200ms).
4. `backend-patterns`: Server Actions tipadas `ActionResult<T>`, Zod e revalidação de cache.
5. `database`: Padrões PostgreSQL/Supabase, multi-tenant RLS e migrations idempotentes.
6. `auth`: Autenticação SSR segura, PKCE, `getUser()` no server.
7. `deploy-production`: 4 camadas de cache App Router, SEO metadata e Core Web Vitals.
8. `security`: AppSec, Taint Analysis (Sentry), Pentest (Cloudflare) e OWASP Top 10.
9. `github-ops`: Git headless e GitHub CLI token-driven.
10. `agy-bridge`: Integração com agy CLI para workers assíncronos.
11. `council-debate`: Deliberação multi-agente em 3 rodadas para stress-test arquitetural.

---

## 3. Design System & Theming
- `DESIGN.md`: Dicionário de tokens semânticos (`bg-background`, `bg-card`, `border-border`, `text-foreground`).
- Controle central de tema dark/preto absoluto via CSS variables no `globals.css`.

---

## 4. Engenharia de Fluxo (GitHub Flow & CI)
- **Issues & PRs**: Criação de issue obrigatória (`gh issue create`), branch por tarefa (`feat/id` ou `fix/id`) e PR (`gh pr create`) sempre referenciando `Closes #ID`.
- **PR Template**: `.github/PULL_REQUEST_TEMPLATE.md` padronizando Resumo, Issue, Alterações e Checklist de Testes.
- **CI Quality Gate**: `.github/workflows/quality.yml.example` com lint, typecheck, tests e build verification.

---

## 5. Padrões de Motion & Micro-UX
- **Skeleton Loading**: Obrigatório para todos os estados de carregamento assíncrono (evita layout shift).
- **Transições GPU-accelerated**: Keyframes `slideIn` (240ms ease-out) e saída suave (`scale(0.96)`, 200ms ease-in). Respeito estrito a `prefers-reduced-motion`.

---

## 6. Observabilidade & Telemetria
- **Sentry Breadcrumbs**: Emissão de breadcrumbs estruturados antes de qualquer operação crítica de negócio (campanhas, pagamentos, mutações).
- **Contextual Capture**: Captura enriquecida com `tags` (feature, entityId) e `extra` seguro (sem PII) em blocos `catch`.

---

## 7. MCPs Instalados & Ativos

| MCP | Tools | Quando Usar |
|---|:---:|---|
| `lazyweb` | 42 | Nova UI, paywall, pricing, dashboard — pesquisa competitiva de mercado pré-proposal. |
| `chrome-devtools-mcp` | 29 | Validação visual pós-build: Lighthouse, performance trace, console/network errors. |
| `supabase` | 27 | DDL, migrations, Edge Functions, logs, RLS em projetos com `project_id` configurado. |
| `lovable` | 40 | Projetos Lovable: create, send_message, get_diff, set_project_knowledge. |

**Skill dedicada de browser QA:** `skills/browser-qa/SKILL.md`.
**Projeto Lovable/Supabase ativo:** Financeiro/Conciliação (ver `.agent/memory/infra.md`).

---

## 8. Motores de Conciliação Canônicos (Spec 436)
- `autoMatchingEngine.ts`: Motor estrito com os 4 únicos fluxos de conciliação autorizados (`Rede x OS`, `PIX x OS` com duplo fator cumulativo de cliente e forma de pagamento, `Contas x Saídas`, `Intercompany`).
- `isStrictPixOsMatch`: Validador canônico exportado para duplo fator de PIX x OS com filtro negativo eliminatório de adquirentes e rendimentos.
- `run_autonomous_reconciliation_loop`: RPC de fechamento blindada contra auto-injeção de receitas em `daily_revenue_adjustments`.

---

## 9. Padrões de Apresentação Contábil (Spec 437)
- `ResumoDiaPanel.tsx` e `StoreCardModulo1.tsx`:
  - **Bipolaridade cromática estrita:** Números normais (estáticos/patrimoniais) sempre em `text-white font-mono`.
  - **Cálculos/Deltas:** `text-emerald-400 font-mono` para conformidade/superávit e `text-rose-400 font-mono` para divergência/déficit.
  - **Exceções:** `valor_disp_contas` e `contas_manual` permanecem em branco normal (`text-white font-mono`). Saldo bancário de filial é branco se positivo e vermelho se devedor.

---

## 10. Blindagem de Conciliação PIX x OS & Intercompany (Specs 438 & 439)
- `StoreExtratoBancarioView.tsx`: Isolamento de herança histórica de OS estritamente via `histByFitid` (eliminado fallback de chave fraca por valor/título).
- `useConciliacao.ts`: Eliminação de casamento cego por unicidade de valor ("Prioridade C"). Validação estrita por tokens de nome do cliente.
- `autoMatchingEngine.ts`: Eliminação de bypass por total da OS (`osTotal`); correspondência documental CPF/CNPJ e bloqueio de remetentes PJ (14 dígitos) sem correspondência forte; ampliação de stopwords corporativas (`RECEBIMENTO`, `CENTRO`, etc.).
- `auto_match_daily_transactions` & `auto_match_receivables` (Migration `20260924160000`):
  - Roteamento compulsório de transações intercompany (`MP AUTO MECANICA`, `MP JABAQUARA`, `EMPORIO`, `HOLDING`, etc.) para `Transferência Entre Lojas [Apenas Conciliar]` com `matched_os_number = NULL`.
  - Eliminação de fases cegas (2B e 2C) por saldo residual sem identidade.
  - Exclusão de adquirentes e transferências de empresas do grupo do auto-match de recebíveis.
- Saneamento forense e reprocessamento canônico do dia 24/09/2026.

---

## 11. Componentes Canônicos de KPI em Modais (Spec 440)
- `ModalKpiCard.tsx`: Componente atômico para cards de métricas de topo em modais analíticos.
  - Padrão visual baseado no Cofre (`bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1`).
  - Suporte a variantes (`dot` e `border-l`), indicadores semânticos (`amber`, `emerald`, `rose`, `blue`, `purple`, `red`, `default`), estado de atenção (`danger={true}` para cheque especial/passivos), interatividade e subtítulos dinâmicos.
  - Adotado em `PatioOsDetailModal.tsx`, `SaldoBancosDetailModal.tsx` e `CashVaultCompositionModal.tsx`.

---

## 12. Edição Manual de Caixa Atual e Caixa Anterior (Spec 442)
- `ResumoDiaPanel.tsx`:
  - Edição interativa controlada dos campos **Caixa Atual** e **Caixa Anterior** durante modo de edição (`isEditing === true`).
  - Inputs com tokens Zinc-950 (`bg-[var(--bg-surface)]`, `border-zinc-700`, `text-white font-mono`).
  - Ação rápida "Restaurar" para retornar ao valor derivado automaticamente dos 5 Pilares (`caixaAtualCalculado`) ou D-1 (`caixaAnteriorGlobal`).
  - Reatividade imediata de `fluxo_caixa`, `valor_disp_contas` e `diferenca_final`.
- `useBackendConciliacao.ts`: Preservação de `caixa_atual` gravado no snapshot sem sobrescrita involuntária pelo cálculo dinâmico bruto em dias fechados.
- `get_daily_reconciliation_summary` (Migration `20260925000001_allow_caixa_manual_override_in_rpc.sql`):
  - Suporte a `is_caixa_atual_override` e priorização de `metadata.caixa_anterior` no Ramal 2 (dia aberto/dinâmico).

---

## 13. Saneamento Canônico de Fechamento por Filial & Guarda Intercompany (Spec 438)
- `get_daily_reconciliation_summary` (Migration `20260925000002_canonical_rematch_intercompany_guard.sql`):
  - Apuração canônica de saídas: quando `ofx_saidas_total == contas_loja_total`, a diferença é rigorosamente `0.00`. Eliminação de dupla subtração por despesas manuais.
  - Eliminação de dupla contagem em entradas justificadas: transações com `matched_os_number` não são re-somadas em justificativas avulsas.
- `auto_match_receivables` (Migration `20260925000003_drop_overloaded_auto_match_receivables.sql`):
  - Remoção de sobrecargas de tipos no PostgreSQL, consolidando assinatura canônica única `(p_date text, p_store_id text)`.
- `StoreCardModulo1.tsx` e `ConciliacaoLojasView.tsx`:
  - Consumo direto dos campos canônicos `dif_entradas`, `dif_saidas` e `diferenca` sem derivação local de `orfas*`.
  - Remoção de injeção forçada de sinais `-` ou `+`. Exibição de `0,00` em verde quando dentro da tolerância (`<= 0.05`).
- `CentralImportWizard.tsx`:
  - Reordenamento do pipeline de importação: pareamento bancário e de recebíveis executam antes da consolidação do snapshot diário.

---

## 14. Âncora no Saldo do Dia (`SALDO TOTAL DISPONÍVEL DIA`) do OFX (Spec 444)
- `ofxParser.ts`:
  - Decodificação dual resiliente de buffer (UTF-8 com fallback para Windows-1252 SGML).
  - Normalização sem acentos (`normalizeMemoText`) protegendo contra caracteres corrompidos.
  - Scanner de encerramento (`isClosingDayBalanceMemo`) avaliado prioritariamente antes do filtro JUNK, capturando `SALDO TOTAL DISPONÍVEL DIA`, `DISPONÍVEL DIA`, `SALDO DO DIA` e `SDO FINAL`.
  - Atribuição do saldo do dia oficial como `bankBalance` canônico com precedência absoluta sobre `<LEDGERBAL>` (`balanceSource: 'saldo_total_disponivel_dia'`).
  - Isolamento de `<LEDGERBAL>`: o saldo bruto de D+0 é retido exclusivamente em `ledgerBalance` e descartado do saldo contábil da data de conciliação.
  - Fallback fiduciário para derivação a partir de `SALDO ANTERIOR` + movimentações quando a linha de saldo do dia não estiver presente.
- `centralImportManager.ts` & `useCentralImport.ts`:
  - Propagação de `targetDate` para filtragem temporal de movimentações e validação de `<DTASOF>`.
- `CentralImportWizard.tsx`:
  - Exibição de badge semântico Zinc-950 `✓ Saldo do Dia` na coluna de saldo bancário (Step 1).

---

## 15. Seleção e Mapeamento Editável de Saldo OFX por Conta e Data (Spec 439)
- `ofxParser.ts` & `itauPdfParser.ts`:
  - Extração de candidatos datados de saldo de extrato (`STMTTRN_MEMO`, `<LEDGERBAL>`, `<AVAILBAL>`, `<PRVBAL>`) em `balanceCandidates` com `accountKey` canônica.
  - Classificação mutuamente exclusiva entre saldos de abertura e fechamento; nenhuma linha de saldo contamina o array `transactions` operacional.
  - Suporte a saldo zero (`R$ 0,00`) e saldo devedor/cheque especial negativo sem descarte prematuro.
- `centralImportManager.ts`:
  - Deduplicação idempotente de candidatos de saldo entre múltiplos arquivos enviados para a mesma conta.
- Tabelas & RPCs Supabase (Migration `20260927000001_ofx_balance_candidates_and_rules.sql`):
  - `ofx_balance_candidates`: Armazena todos os candidatos de saldo extraídos dos extratos.
  - `ofx_balance_rules`: Regras ativas e versionadas por conta (`account_key`), associando-a à fonte preferencial (`source_kind`, `memo_normalized`).
  - `ofx_balance_selections`: Seleção efetiva única por conta e data de conciliação (`reconciliation_date`).
  - `ofx_balance_selection_events`: Trilha append-only de auditoria com saldos antes/depois, usuário e motivo do ajuste.
  - RPCs atômicas: `preview_ofx_balance_selection`, `apply_ofx_balance_selection`, `get_ofx_balance_rules`, `get_ofx_account_history`.
- `useOfxBalanceMappings.ts`:
  - Hook unificado para consulta de regras, seleções gravadas, cálculo de prévia de impacto e mutação transacional com invalidação de cache.
- `CentralImportWizard.tsx`:
  - Seletor de candidatos de saldo por conta na Etapa 1 com badges de data correspondente/divergente e opção "Lembrar regra".
- `OfxAccountBalanceModal.tsx` & `SaldoBancosDetailModal.tsx`:
  - Modal analítico para inspeção de contas por filial, troca de regras, ajuste retrospectivo de saldo com prévia de impacto e histórico de auditoria completo. Célula de saldo bancário interativa.

---

## 16. Isolamento Temporal de Vendas Rede e Matcher Canônico Bruto (Spec 440)
- `CentralImportWizard.tsx`: Atribuição estrita de `target_date = effectivePosDate` (data real da venda), impedindo contaminação temporal de vendas passadas em fechamentos posteriores.
- `auto_match_daily_transactions` & `match_stage2_rede_os` (Migration `20260928000001_canonical_rede_os_matcher_and_date_isolation.sql`):
  - Comparação do valor bruto (`pos.gross_amount`) com a parcela de cartão da OS (`os.credit_value`, `os.debit_value`, `os.credit_debit_value`) com tolerância de até R$ 0,05.
  - Vínculo da OS sem alteração de `settlement_status` (preservando `'a_compensar'`).
  - Atualização atômica de `paid_value` da OS pelo montante bruto.
  - Suspensão do vínculo automático em caso de colisão entre múltiplas OSs de mesmo valor.
- `StoreCartaoMaquininhaView.tsx` & `ManualMatchOsModal.tsx`:
  - Filtro estrito por `target_date.eq.${date}`.
  - Exibição discriminada de Bruto, Taxa MDR e Líquido com tokens semânticos Zinc-950 de `DESIGN.md`.

---

## 17. Baixa Atômica de Rede na OS e Recálculo de Pátio (Spec 441)
- `recompute_patio_for_date_and_store` (Migration `20260928000002_recompute_patio_and_atomic_rede_os_settlement.sql`):
  - Função canônica no PostgreSQL para recálculo atômico de saldos em aberto no pátio, atualizando `reconciliations.na_loja_os`, `metadata.stores[store_id].na_loja_os` e `daily_snapshots.total_patio`.
- `link_manual_rede_to_os` & `unlink_manual_os_match`:
  - RPCs atômicas que realizam o vínculo/desvinculação, atualizam `paid_value` e invocam o recálculo canônico com payload de retorno discriminado.
- `useManualMatch.ts`: Invalidação reativa unificada de todas as chaves dependentes do pátio (`['store-ordens-servico']`, `['patio-os-detail-modal']`, `['daily-reconciliation-summary']`, `['daily_snapshots']`, `['reconciliations']`).
- `StoreOrdensServicoView.tsx` & `PatioOsDetailModal.tsx`: Tratamento padronizado de saldo zero como valor numérico contábil válido.

---

## 18. Preservação de MEMO de Boletos e SISPAG e Limpeza de Alias (Spec 442)
- `ofx_transactions` (Migration `20260928000003_add_ofx_raw_fields_and_preserve_memo.sql`):
  - Adicionadas colunas `raw_memo`, `raw_name`, `bank_reference` e `original_fitid`.
- `ofxParser.ts`: Extração de `<NAME>`, `<CHECKNUM>` / `<REFNUM>` e `<FITID>` original sem alterar o hash determinístico de deduplicação `fitid`.
- `CentralImportWizard.tsx`, `useTransactions.ts`, `Fase3OfxReconciliation.tsx`:
  - Proibição de uso de `ofx.alias` / `ITAU - {conta}` como fallback para `counterpart_name`.
  - Persistência unificada das tags brutas do extrato.
- `StoreExtratoBancarioView.tsx` & `TransactionDetailModal.tsx`:
  - Descarte inteligente de aliases de conta bancária e dígitos numéricos soltos em `counterpart_name` e `subtitle`.
  - Priorização de `bank_name` / `raw_memo`.
  - Preservação de rótulos bancários úteis ("SISPAG Fornecedores", "SISPAG Salários", "Boleto Pago <código>") evitando stripping que resultava em dígitos desconexos soltos.
  - Exibição de badge para referência bancária (`#CHECKNUM`) e enriquecimento da ficha técnica de detalhes.

---

## 19. Restaurar Fechamento por Filial, Rede a Compensar e Vínculo Rede × OS (Spec 443)
- `reconciliationContract.ts`: Contrato Zod formal com validação tipada de filiais e fechamento macro (`StoreReconciliationSchema`, `DailyReconciliationSchema`, `SafeDailyReconciliationSummary`).
- `useBackendConciliacao.ts`:
  - Eliminação do limiar arbitrário de corte de R$ 40k em `cartoes_a_compensar`.
  - Suporte a status `sem_movimento` e flags de integridade (`is_empty_store`, `has_ofx_movement`, `has_rede_movement`, `has_bills_movement`).
- `get_daily_reconciliation_summary` & `close_daily_snapshot` (Migrations `20260928000004_restore_daily_summary_and_rede_os_match.sql` e `20260928000005_fix_close_daily_snapshot_coalesce.sql`):
  - Autocura de snapshots diários fechados prematuramente que continham cartões zerados quando existiam vendas pendentes de liquidação.
  - Identificação precisa de filiais vazias com `status: sem_movimento` e bloqueio de fechamento de dias vazios sem movimentação prévia.
  - Blindagem com `COALESCE` para todas as colunas `NOT NULL` de `daily_snapshots`.
  - Rastreamento de `revision` a cada homologação de fechamento.
- `match_stage2_rede_os`:
  - Janela do ciclo de vida da OS estendida para captura de ordens ativas e pagas (`opened_at <= target_date` e `closed_at >= target_date - 7 days`).
  - Vínculo informativo de OSs quitadas (ex.: OS #4427 de R$ 1.811,46) sem alteração de `paid_value` da OS e sem alteração indevida de `settlement_status` para `'entrou'`.
- `StoreCardModulo1.tsx`:
  - Substituição do falso selo "100% Conciliado" em filiais sem movimentação por `SEM MOVIMENTO` (com barra cinza e badges `Sem Mov. Entradas` e `Sem Mov. Saídas`).
  - Ajuste de rótulo para `REDE LÍQUIDO` com tooltip explicativo.
- `CentralImportWizard.tsx`:
  - Feedback e logs transparentes com contagens reais, revisões de snapshot e eliminação de toasts incondicionais de sucesso.
  - Ancoragem estrita de `pos_transactions.target_date` no `targetDate` do lote contábil da conciliação (em vez de `item.date` da adquirente), mantendo `occurred_at` com o carimbo temporal da venda física.
  - Cálculo resiliente de `cartoesACompensarTotal` e `devolucoesRedeTotal` com suporte unificado a camelCase (`netAmount`, `grossAmount`, `feeAmount`) e snake_case.
  - Enriquecimento prévio do snapshot com busca canônica de `stores` via `get_daily_reconciliation_summary(targetDate, true)` antes da mutação de `saveSnapshot`.

---

## 20. Motor Direto de Match Rede × OS por Loja e Prova Negativa de Órfãos (Spec 445)
- `match_stage2_rede_os` & `auto_match_daily_transactions` (Migrations `20260929000001_evolve_match_stage2_rede_os.sql` e `20260929000002_delegate_auto_match_fase1_to_stage2.sql`):
  - Remoção de filtros temporais rígidos de 7 dias (`closed_at >= target - 7d`), permitindo que OSs de todo o período ativo da loja casem com vendas de cartão.
  - Pareamento direto por loja (`store_id = store_id`): **Valor Bruto da Transação Rede $\leftrightarrow$ Lançamento de Cartão da OS (`credit_value`, `debit_value`, `credit_debit_value`) ou saldo pendente `(total_value - paid_value)`**.
  - Proteção anti-colisão: quando há múltiplas OSs com o mesmo valor na mesma loja, não chuta e registra a lista de candidatas no retorno.
  - Prova negativa de inexistência (`exhausted_orphan`): quando nenhuma OS na loja possui o valor, carimba formalmente no log e na UI que a venda não possui OS no sistema.
  - Preservação do saldo bancário: o vínculo mantém estritamente `settlement_status = 'a_compensar'`.
  - Unificação da FASE 1 do `auto_match_daily_transactions` para delegar diretamente à `match_stage2_rede_os`.
- `Fase2RedeVsOsReview.tsx`:
  - Totalizadores de topo discriminando `CASADAS`, `COLISÕES` e `ÓRFÃOS PROVADOS`.
  - Badges semânticos de status por transação: verde para casada, amarelo para colisão e cinza (`bg-zinc-800 border-zinc-700`) para `Provado Sem OS na Loja`.

---

## 21. Unificação do Cálculo de Diferença Final e Subtotal Contas (Spec 451)
- `useBackendConciliacao.ts`:
  - Blindagem de dias fechados (`isSnapshotClosed = Boolean(snapshotData?.is_closed && !forceDynamic)`).
  - Em dias fechados, o hook respeita soberanamente a autoridade do snapshot congelado e da RPC (`contas_a_pagar`, `subtotal_contas`, `valor_disp_contas`, `diferenca_final`), proibindo o recálculo dinâmico baseado em `daily_manual_bills` com dados parciais.
  - Arredondamento monetário estrito em 2 casas decimais (`toFixed(2)`).
- `ResumoDiaPanel.tsx`:
  - Harmonização de `contasManualValor` e `canonicalDiferencaFinal` para manter 100% de coerência entre a fórmula dos cards e o valor exibido.
  - Eliminação da reversão de cálculo pós-salvamento: a tela exibe consistentemente a diferença homologada (ex.: R$ 3.660,03 no dia 2026-09-29) tanto em Modo Visualização quanto em Modo Edição e pós-salvamento.
- Testes automatizados em `tests/e2e/tier2_boundary/spec451_dashboard_reconciliation_math.test.mjs`.