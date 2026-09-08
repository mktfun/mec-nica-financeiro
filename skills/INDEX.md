# 🧭 Universal SaaS Builder Skills Index (Dispatcher)

Este índice é o ponto de entrada central para o agente. Identifique a intenção da tarefa e carregue **APENAS** as skills correspondentes (respeitando o limite de no máximo 2-3 skills por tarefa / ≤15k tokens).

---

## 🎯 Mapa de Despacho Rápido por Intenção

| Intenção da Tarefa | Skills a Carregar | Referências Específicas (On-Demand) |
|---|---|---|
| **Criar projeto SaaS do zero** | `saas-scaffold/SKILL.md` + `database/SKILL.md` | `saas-scaffold/references/01-project-setup.md`, `03-lovable-compat.md` |
| **Construir Telas / UI / Componentes** | `ui-components/SKILL.md` | `ui-components/references/dashboard-layout.md`, `forms.md`, `data-table.md`, `landing-page.md`, `cinematic-landing-page.md` |
| **Landing Pages Cinematográficas (Luxo/Awwwards)** | `ui-components/SKILL.md` + `ui-motion/SKILL.md` | `ui-components/references/cinematic-landing-page.md` (4 presets estéticos, micro-UIs, ruído SVG) |
| **Adicionar Animações / Efeitos Visuais** | `ui-motion/SKILL.md` | `ui-motion/SKILL.md` (Magic UI & Tailwind animations) |
| **Autenticação & Proteção de Rotas** | `auth/SKILL.md` | `auth/references/auth-patterns.md` |
| **Banco de Dados / Schema / Migrations / RLS** | `database/SKILL.md` | `database/references/rls-patterns.md`, `schema-patterns.md` |
| **Server Actions / APIs / Edge Functions** | `backend-patterns/SKILL.md` | `backend-patterns/references/server-action-templates.md` |
| **Deploy / SEO / Performance / Prod Readiness** | `deploy-production/SKILL.md` | `deploy-production/references/checklist-launch.md` |
| **Git Headless / Branches / PRs / CI-CD** | `github-ops/SKILL.md` | `github-ops/SKILL.md` |
| **Raciocínio Adaptativo / Prevenção de Loops** | `adaptive-reasoning/SKILL.md` | Sempre disponível para validações críticas |

---

## 🔄 Ciclo de Vida SDD (Antigravity 2.0 Native Skills)

| Fase do Ciclo | Skill Canônica | Ativação Semântica (2.0) | Slash Command Legado |
|---|---|---|---|
| **Setup & Bootstrap** | `sdd-setup/SKILL.md` | "configurar ambiente", "setup" | `/setup` |
| **Planejamento & Spec** | `sdd-proposal/SKILL.md` | "planejar feature", "criar spec" | `/vibe-proposal` |
| **Implementação & QA** | `sdd-apply/SKILL.md` | "implementar spec", "executar spec" | `/vibe-apply` |
| **Auditoria & Commit** | `sdd-archive/SKILL.md` | "arquivar spec", "finalizar feature" | `/vibe-archive` |
| **Diagnóstico Forense** | `sdd-debug/SKILL.md` | "corrigir bug", "investigar erro" | `/vibe-debug` |

---

## 🛑 Regras Rígidas de Context Budget

1. **Nunca leia todas as skills de uma vez**: Leia apenas o `SKILL.md` da intenção atual.
2. **Carregamento Lazy de Referências**: Carregue arquivos em `references/` somente quando precisar copiar um template estrutural.
3. **Limite por Tarefa**: No máximo 2 skills simultâneas + 1 arquivo de referência.
