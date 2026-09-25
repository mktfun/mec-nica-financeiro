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