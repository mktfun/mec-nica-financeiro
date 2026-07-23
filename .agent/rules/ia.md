---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v4 (2026 Edition)

## 0. ⛔ OVERRIDE SUPREMO (Prioridade Máxima — acima de tudo)

**Se o usuário mencionar `/teamwork-preview`, pedir uma análise conjunta ou delegar para equipe de IA: PARE TUDO IMEDIATAMENTE.** Não conclua o step atual, não tente resolver sozinho, não ignore. Acione os subagentes via `invoke_subagent` e siga o protocolo de delegação. Isto se aplica em qualquer workflow.

## 1. Core Principles

- **Desconfie do Vibe Coding Puro**: Nenhuma feature grande deve ser iniciada escrevendo código direto. Toda mudança estrutural precisa de uma Especificação (Proposal) com arquivos físicos em `specs/` antes.
- **Memória Modular**: O agente deve aprender categoricamente. Antes de qualquer task, leia os arquivos relevantes em `.agent/memory/` (ex: `memory/supabase.md`, `memory/ui.md`, `memory/ofx.md`). O que for aprendido em `/vibe-apply` deve ser consolidado por categoria em `/vibe-archive` — não jogar tudo num `memory.md` geral.
- **Headless CLI Enforcement**: JAMAIS use comandos interativos que exijam browser ou input no terminal. Para autenticação no Github ou Supabase, carregue silenciosamente do `.env` usando SOMENTE e EXCLUSIVAMENTE variáveis de ambiente (`GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`).
- **CLI Fallback Obrigatório**: Se o comando `git` não for encontrado no `PATH`, use o caminho absoluto do MinGit: `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`.
- **Regras Estritas de PowerShell**: NUNCA utilize o operador `&` para encadear comandos no PowerShell. Use `;` ou execute os comandos um por vez. Se houver erro de Execution Policy com scripts `.ps1` (como `npm.ps1`), envolva o comando em um subshell CMD: `cmd.exe /c "seu comando aqui"`.
- **Git Identity Override**: Caso ocorra o erro "Author identity unknown" no momento do commit, configure imediatamente as propriedades locais antes de commitar: `git config user.email "ai@clawhub.com"` e `git config user.name "ClawHub Agent"`.

## 2. ⛔ Regra Anti-Alucinação e Repetição

**ANTES de criar qualquer coisa nova, você DEVE pesquisar o que já existe, ler a Memória e consultar o Grafo.**

- **No Frontend**: Leia `memory/ui.md`. Consulte `spec/global/features.md`. Ative as skills `frontend-design-pro` e `afrexai-nextjs-production`.
- **No Backend**: Leia `memory/supabase.md`. Verifique o schema existente. Ative as skills `supabase` (com RLS) e `backend`.
- **Graphify (Anti-Alucinação):** O Graphify é uma ferramenta **Python** (não NPM). Comandos corretos:
  - Instalar: `uv tool install graphifyy` (dois Y's no pacote, um Y no comando)
  - Consultar: `graphify query "<feature>"` ou `graphify explain "<Modulo>"`
  - Atualizar: `graphify update`
  - NUNCA use `npx @baml/graphify` — esse pacote não existe
- **Geral**: Se já existe → USE. Crie um wrapper se precisar, NÃO duplique. NUNCA crie tabela, RPC, ou política sem verificar o que existe no banco e na memória.

## 3. Workflows Oficiais

Toda iteração passa exclusivamente por estes comandos:

1. `/setup`: Cria as pastas locais, memory.md e inicializa as integrações com ClawHub no projeto atual.
2. `/vibe-proposal "Feature name"`: Planejamento guiado. Lê a memória com `obsidian`, raciocina com `bayesian-reasoning` e `adaptive-reasoning`.
3. `/vibe-apply <id>`: Implementação hardcore baseada na Proposal e nos checklists. Usa as skills especialistas (React, Supabase, etc).
4. `/vibe-archive <id>`: Atualiza a memória, roda o build e faz `git commit` + `push`.

## 4. Skills Integradas (ClawHub)
Você opera sob a jurisdição de 8 skills fundamentais. Elas não precisam ser ativadas via bundles porque os workflows já invocam as combinações exatas no momento certo:
- Raciocínio: `deciqai-bayesian-reasoning`, `adaptive-reasoning`
- Engenharia: `frontend-design-pro`, `frontend-design-3`, `afrexai-nextjs-production`, `backend`, `supabase`
- Memória e DevOps: `obsidian`, `github`