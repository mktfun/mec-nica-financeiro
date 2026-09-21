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

## 7. Motores de Conciliação Bancária & Ingestão
- **Funil de Match PIX / OS (`matchTransactionsV2`)**: `src/lib/matchers/matchTransactionsV2.ts` — Heurística de dois passos (Step 1 Hard Match numérico e temporal; Step 2 Tie-breaker por similaridade de strings decisiva), isolando falsos positivos e órfãos.
- **Sandbox Local In-Memory (`/teste/import`)**: `src/routes/teste.import.tsx` — Ambiente isolado para teste e depuração de conciliação bancária sem chamadas ao Supabase.
- **Geração Automática de Recebíveis de OSs**: `src/hooks/useOsImportProcessor.ts` e `useImportProcessor.ts` — Extração de boletos/transferências com nome limpo do cliente e número de OS, com idempotência estrita por filial (`store_id + os_number`).
- **Parser de Cartoes Rede (redeParser.ts - Spec 419)**: Fallback automatico para grossAmount quando a coluna de valor liquido apresentar traco ("-") ou vazio, e criterio seguro de descarte de lote apenas quando totalNet <= 0 && totalGross <= 0.
- **Idempotencia Global de Cofre/Dinheiro (store_cash_vault - Spec 420)**: Busca global por store_id e os_number_ref no motor de ingestao (useImportProcessor.ts), impedindo que OSs ja baixadas como depositado sejam reabertas como em_transito em importacoes de datas subsequentes. Reatividade total com invalidacao de queries no wizard (Step3CashVaultDaniel.tsx).
- **Janela Contabil de Fechamento OFX (CentralImportWizard.tsx & reconciliadorRedeOfx.ts - Spec 423)**: Extensao do calculo de competencia contabil de extratos para janela de ate 4 dias retroativos (diffDays <= 4), harmonizando transacoes bancarias de fim de semana (sexta a segunda) na mesma competencia contabil (target_date = targetDate) enquanto preserva occurred_at original e pareia creditos da adquirente.
- **Isolamento de Datas Efetivas e Blindagem de Caixa Anterior (useDailySnapshot.ts - Spec 424)**: useAvailableConciliacaoDates desvinculado de patio_os.opened_at, listando estritamente datas com acoes contabeis efetivas e eliminando dias nao trabalhados do seletor. usePreviousDaySnapshot e queries de fechamento com filtro estrito .eq('is_closed', true), garantindo que apenas snapshots consolidados sirvam como baseline D-1 de caixa.
