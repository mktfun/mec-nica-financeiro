# 🤖 Antigravity Agents — Hierarquia Leads/Workers

## Visao Geral

Os agentes estao organizados em hierarquia de 2 niveis:

```
Root Agent (Antigravity IDE)
├── Leads (Level 1) — Coordenam, NAO escrevem codigo
│   ├── research-lead       → codebase-researcher, docs-researcher, graph-analyzer
│   ├── implementation-lead → frontend-worker, backend-worker, database-worker
│   └── quality-lead        → auditor-worker, validator-worker, bug-investigator
└── Workers (Level 2) — Executam, com skills vinculadas
```

## Regras de Execucao

| Regra | Valor |
|---|---|
| **Modo padrao** | Single-Agent Direto (sem subagentes) |
| **Ativacao** | Apenas via /teamwork-preview, /council ou comando explicito |
| **Worker primario** | agy CLI (`gemini-3.1-pro-high`) |
| **Fallback** | Antigravity 2.0 nativo (`invoke_subagent`) |
| **Max recursao** | 2 (Root → Lead → Worker) |
| **Max workers paralelos** | 3 por Lead |
| **Timeout por worker** | 5 minutos |
| **Git commit/push** | Monopolio do Root Agent |

## Estrutura de Diretorios

```
.agent/agents/
├── leads/
│   ├── research-lead.md
│   ├── implementation-lead.md
│   └── quality-lead.md
├── workers/
│   ├── codebase-researcher.md
│   ├── docs-researcher.md
│   ├── graph-analyzer.md
│   ├── frontend-worker.md
│   ├── backend-worker.md
│   ├── database-worker.md
│   ├── auditor-worker.md
│   ├── validator-worker.md
│   └── bug-investigator.md
└── README.md (este arquivo)
```

## Cadeia de Fallback

```
1. Tentar agy CLI (spawn-agy-worker.ps1 --agent <worker>)
   ├─ Sucesso → Usar output JSON
   └─ Falha (timeout/erro/agy nao encontrado)
       └─ 2. invoke_subagent (Antigravity 2.0 nativo)
           ├─ Sucesso → Usar output
           └─ Falha → Reportar FAILED, aguardar intervencao humana
```

## Mapa Skill → Worker

| Skill | Worker | Lead |
|---|---|---|
| `obsidian` + `adaptive-reasoning` | `codebase-researcher` | `research-lead` |
| `obsidian` (web search) | `docs-researcher` | `research-lead` |
| `graphify-windows` | `graph-analyzer` | `research-lead` |
| `ui-components` + `ui-motion` | `frontend-worker` | `implementation-lead` |
| `backend-patterns` + `auth` | `backend-worker` | `implementation-lead` |
| `database` + `supabase` | `database-worker` | `implementation-lead` |
| `deploy-production` + `adaptive-reasoning` | `auditor-worker` | `quality-lead` |
| `sdd-proposal` | `validator-worker` | `quality-lead` |
| `sdd-debug` + `bayesian-reasoning` | `bug-investigator` | `quality-lead` |
