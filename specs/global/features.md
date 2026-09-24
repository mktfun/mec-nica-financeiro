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