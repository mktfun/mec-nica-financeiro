---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v5 (2026 Edition)

## 0. ⛔ OVERRIDE SUPREMO (Prioridade Máxima — acima de tudo)

**Se o usuário mencionar `/teamwork-preview`, pedir uma análise conjunta ou delegar para equipe de IA: PARE TUDO IMEDIATAMENTE.** Não conclua o step atual, não tente resolver sozinho, não ignore. Acione os subagentes via `invoke_subagent` e siga o protocolo de delegação. Isto se aplica em qualquer workflow.

## 1. Core Principles

- **Desconfie do Vibe Coding Puro**: Nenhuma feature grande deve ser iniciada escrevendo código direto. Toda mudança estrutural precisa de uma Especificação (Proposal) com arquivos físicos em `specs/` antes.
- **Memória Modular (Obsidian)**: O agente deve aprender categoricamente. Antes de qualquer task, leia os arquivos relevantes em `.agent/memory/`. O que for aprendido em `/vibe-apply` deve ser consolidado por categoria em `/vibe-archive` — nunca num `memory.md` geral.
- **Headless CLI Enforcement**: JAMAIS use comandos interativos que exijam browser ou input no terminal. Para autenticação no Github ou Supabase, carregue silenciosamente do `.env` usando SOMENTE variáveis de ambiente (`GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`).
- **CLI Fallback Obrigatório**: Se o comando `git` não for encontrado no `PATH`, use o caminho absoluto do MinGit: `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`.
- **Regras Estritas de PowerShell**: NUNCA utilize o operador `&` para encadear comandos no PowerShell. Use `;` ou execute um por vez. Se houver erro de Execution Policy com scripts `.ps1`, envolva em CMD: `cmd.exe /c "seu comando aqui"`.
- **Git Identity Override**: Caso ocorra "Author identity unknown", configure antes do commit: `git config user.email "ai@clawhub.com"` e `git config user.name "ClawHub Agent"`.

## 2. ⛔ Regra Anti-Alucinação — Obsidian + Grafo ANTES de qualquer ação

**ANTES de criar qualquer coisa nova, você DEVE pesquisar o que já existe, ler a Memória e consultar o Grafo.**

- **Sempre leia o INDEX antes de escolher skills:**
  ```
  view_file skills/INDEX.md
  ```

- **No Frontend**: Leia `memory/ui.md`. Consulte `spec/global/features.md`. Leia as skills:
  ```
  view_file C:/Users/User/.gemini/config/skills/ui-components/SKILL.md
  view_file C:/Users/User/.gemini/config/skills/ui-motion/SKILL.md         ← se envolver animações
  view_file C:/Users/User/.gemini/config/skills/deploy-production/SKILL.md ← se envolver SSR/deploy
  ```

- **No Backend**: Leia `memory/supabase.md`. Verifique o schema existente. Leia as skills:
  ```
  view_file C:/Users/User/.gemini/config/skills/backend-patterns/SKILL.md
  view_file C:/Users/User/.gemini/config/skills/auth/SKILL.md              ← se envolver autenticação
  ```

- **No Banco**: Leia `memory/supabase.md`. Leia as skills:
  ```
  view_file C:/Users/User/.gemini/config/skills/database/SKILL.md
  view_file skills/database/references/rls-patterns.md  ← se envolver RLS
  ```

- **Graphify (Anti-Alucinação):** O Graphify é **Python** (não NPM). Comandos corretos:
  - Instalar: `uv tool install graphifyy` (dois Y's no pacote, um Y no comando)
  - Consultar: `graphify query "<feature>"` ou `graphify explain "<Modulo>"`
  - Atualizar: `graphify update`
  - NUNCA use `npx @baml/graphify` — esse pacote não existe

- **Geral**: Se já existe → USE. Crie um wrapper se precisar, NÃO duplique. NUNCA crie tabela, RPC, ou política sem verificar o que existe no banco e na memória.

## 3. Workflows Oficiais

Toda iteração passa exclusivamente por estes comandos:

1. `/setup`: Configura ambiente headless, cria `.agent/memory/*.md` (Obsidian bootstrap) e indexa o grafo (`graphify .`).
2. `/vibe-proposal "Feature name"`: Planejamento multi-agente. Lê Obsidian + consulta Graphify, lança agentes especializados com skills injetadas, valida com Validator Agent. Cria `specs/<id>/proposal.md`, `design.md` e `spec-plan.md`.
3. `/vibe-apply <id>`: Implementação via Orchestrator multi-agente. Cada domínio (DB, Backend, Frontend) é executado por um subagente com suas skills e memória Obsidian injetadas. Validator Agent revisa antes de marcar como concluído.
4. `/vibe-archive <id>`: Build gate, escrita obrigatória na memória Obsidian por categoria, **/learn** (eleva guardrails universais para `ia.md`), `graphify update`, arquiva spec, commit + push.
5. `/vibe-debug <id-ou-modulo>`: Bug Agent com pesquisa real — logs Next.js + Supabase, inspeção de banco, hipótese bayesiana, repair em 3 tentativas antes de rollback.
6. `/learn` (manual): Eleva uma aprendizagem crítica para `ia.md` fora do ciclo normal de archive.

## 4. Agentes Especializados (usar via invoke_subagent nos workflows)

Os agentes especializados ficam em `.agent/agents/`. Sempre leia o arquivo do agente antes de lançá-lo — ele contém o protocolo, skills e memória que devem ser injetados no prompt:

| Arquivo | Quando usar |
|---|---|
| `.agent/agents/frontend-agent.md` | Tasks `[FRONTEND]` — UI/React/shadcn |
| `.agent/agents/backend-agent.md` | Tasks `[BACKEND]` — Server Actions/Auth |
| `.agent/agents/database-agent.md` | Tasks `[DB]` — Schema/RLS/Migrations |
| `.agent/agents/validator-agent.md` | Validar output de todos os agentes antes de marcar `[x]` |
| `.agent/agents/bug-agent.md` | Qualquer erro de build/runtime — acionado antes de qualquer tentativa manual |

## 5. Skills Disponíveis

Todas as skills estão em `skills/`. Consulte `skills/INDEX.md` para saber qual usar. Os workflows já contêm as instruções `view_file` no momento certo — **não pule essas leituras**:

- **Raciocínio**: `adaptive-reasoning`, `deciqai-bayesian-reasoning`
- **UI**: `ui-components` (consolida todos os blocos), `ui-motion` (animações)
- **Backend**: `backend-patterns`, `auth`
- **Banco**: `database`
- **Scaffold**: `saas-scaffold` (criar projeto do zero)
- **Deploy**: `deploy-production`
- **DevOps**: `github-ops`
- **Memória**: `obsidian`
- **Debate**: `council-debate`