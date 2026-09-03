---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v5 (2026 Edition)

## 0. ⛔ OVERRIDE SUPREMO (Prioridade Máxima — acima de tudo)

**Se o usuário mencionar `/teamwork-preview`, pedir uma análise conjunta ou delegar para equipe de IA: PARE TUDO IMEDIATAMENTE.** Não conclua o step atual, não tente resolver sozinho, não ignore. Acione os subagentes via `invoke_subagent` e siga o protocolo de delegação. Isto se aplica em qualquer workflow.

## 0.1 🛑 TRAVA INVIOLÁVEL 1: PROIBIÇÃO ABSOLUTA DE AUTO-APPLY NO PROPOSAL

**O workflow `/vibe-proposal` é EXCLUSIVAMENTE de Especificação e Planejamento.**
- Ao finalizar a escrita de `specs/<id>/proposal.md`, `design.md` e `spec-plan.md`: **PARE IMEDIATAMENTE.**
- **É TERMINANTEMENTE PROIBIDO** começar a codificar, editar arquivos de código (`src/`, `lib/`, `supabase/`, etc.) ou marcar tasks do `spec-plan.md` após o proposal.
- A IA **JAMAIS** pode "engatar" a implementação automaticamente sem o usuário enviar explicitamente o comando `/vibe-apply <id>` em uma nova mensagem.
- O turno da IA **DEVE TERMINAR** com a apresentação da Spec e a frase: *"Aguardando aprovação. Digite `/vibe-apply <id>` para implementar."* — **SEM NENHUMA CHAMADA DE FERRAMENTA POSTERIOR.**

## 0.2 🛑 TRAVA INVIOLÁVEL 2: PROIBIÇÃO ABSOLUTA DE AUTO-ARCHIVE NO APPLY

**O workflow `/vibe-apply` é EXCLUSIVAMENTE de Implementação e Verificação Local.**
- Ao concluir todas as tasks do `spec-plan.md`, rodar o Visual QA e obter `[AUDIT_PASSED]`: **PARE IMEDIATAMENTE.**
- **É TERMINANTEMENTE PROIBIDO** avançar automaticamente para o `/vibe-archive`, rodar `git commit`, `git push`, mover pastas para `specs/archive/` ou escrever nos arquivos `.agent/memory/` dentro do apply.
- O usuário **DEVE** ter a oportunidade de testar o app em `localhost` ou preview antes que qualquer arquivo seja arquivado ou commitado.
- A IA **JAMAIS** pode auto-arquivar. O turno da IA **DEVE TERMINAR** reportando a aprovação do Auditor e a frase: *"Implementação concluída e auditada com sucesso. Teste suas alterações e, quando estiver pronto, digite `/vibe-archive <id>` para consolidar e commitar."* — **SEM NENHUMA CHAMADA DE FERRAMENTA POSTERIOR.**

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
  view_file C:/Users/User/.gemini/config/skills/database/references/rls-patterns.md  ← se envolver RLS
  ```

- **Graphify (Anti-Alucinação):** O Graphify é **Python** (não NPM). Comandos corretos:
  - Instalar: `uv tool install graphifyy` (dois Y's no pacote, um Y no comando)
  - Consultar: `graphify query "<feature>"` ou `graphify explain "<Modulo>"`
  - Atualizar: `graphify update`
  - NUNCA use `npx @baml/graphify` — esse pacote não existe

- **Geral**: Se já existe → USE. Crie um wrapper se precisar, NÃO duplique. NUNCA crie tabela, RPC, ou política sem verificar o que existe no banco e na memória.

## 3. Workflows Oficiais

Toda iteração passa exclusivamente por estes comandos, separados por modo de operação:

### Modo Solo (Rápido, Direto — Sem Subagentes):
Use para bugs pontuais, refatores locais, correções de parsers ou quando preferir que um único agente faça tudo direto com menos consumo de tokens e sem latência de subagentes:
- `/vibe-proposal-solo "Nome"`: Planejamento direto por um único agente. Lê skills, memória Obsidian, roda Grafo e extrai tipos reais do código legado. Cria `specs/<id>/` e **para no Hard Stop**.
- `/vibe-apply-solo <id>`: Implementação direta sequencial por um único agente. Executa as tasks do `spec-plan.md` passo a passo, roda Visual QA e build local, e **para no Hard Stop** (sem auto-archive).

### Modo Equipe / Multi-Agente (Orquestração Especializada):
Use para features completas, módulos novos, arquitetura full-stack ou quando quiser pesquisa profunda paralela e validação cruzada independente:
- `/vibe-proposal` (ou `/vibe-proposal-team`): Orquestrador lança Research Agents especializados por domínio (com skills e memória injetadas), escreve a spec e submete ao Validator Agent. **Para no Hard Stop**.
- `/vibe-apply` (ou `/vibe-apply-team`): Orquestrador delega tasks para Frontend Agent, Backend Agent e Database Agent, valida com Validator Agent, executa Auditor Agent no final, e **para no Hard Stop**.

### Ciclo de Encerramento e Diagnóstico:
- `/vibe-archive <id>`: Quality Gate, escrita obrigatória na memória Obsidian por categoria, **/learn** (eleva guardrails para `ia.md`), `graphify update`, arquiva spec e faz o commit + push.
- `/vibe-debug <id-ou-modulo>`: Diagnóstico cirúrgico de bugs com varredura de logs (Next.js/Supabase/Edge), inspeção SQL do banco e repair bayesiano em até 3 tentativas.
- `/learn` (manual): Eleva uma aprendizagem crítica para `ia.md` fora do ciclo normal de archive.

## 4. Agentes Especializados (usar via invoke_subagent nos workflows)

Os agentes especializados ficam em `.agent/agents/`. Sempre leia o arquivo do agente antes de lançá-lo — ele contém o protocolo, skills e memória que devem ser injetados no prompt:

| Arquivo | Quando usar |
|---|---|
| `.agent/agents/research-agent.md` | Deep research multi-domínio no `/vibe-proposal` (Obsidian + Grafo) |
| `.agent/agents/frontend-agent.md` | Tasks `[FRONTEND]` — UI/React/shadcn |
| `.agent/agents/backend-agent.md` | Tasks `[BACKEND]` — Server Actions/Auth |
| `.agent/agents/database-agent.md` | Tasks `[DB]` — Schema/RLS/Migrations |
| `.agent/agents/validator-agent.md` | Validar output de todos os agentes antes de marcar `[x]` |
| `.agent/agents/auditor-agent.md` | Auditoria Suprema de Final de Ciclo (Fidelidade à Spec, Regressão/Grafo, Build, Segurança) antes do Archive |
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