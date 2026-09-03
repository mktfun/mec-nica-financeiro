---
description: Executa a implementação técnica como Orchestrator multi-agente — lê spec-plan.md, injeta skills + memória Obsidian em subagentes especializados por domínio, valida com Validator Agent e aciona Bug Agent automaticamente em caso de erro.
---

<!-- VIBEAPPLY:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview` ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore.

**Objetivo**
Executar o checklist de `specs/<id>/spec-plan.md` via subagentes especializados, cada um recebendo suas skills e memória Obsidian injetadas. A spec é a lei — não improvise, não extrapole.

---

## Step 0 — Leitura Obrigatória (Orchestrator)

**Skills base do Orchestrator:**
```
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md
```

**Arquivos de spec (ler nesta ordem):**
1. `specs/<id>/proposal.md` — problema, contratos de dados, risco principal
2. `specs/<id>/design.md` — arquitetura, tipos TypeScript, cenários de verificação
3. `specs/<id>/spec-plan.md` — mapa de execução (tasks `[ ] Pending`)

**Carregar credenciais silenciosamente:**
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
$env:SUPABASE_PROJECT_ID   = "<valor do .env>"
$env:GH_TOKEN              = "<valor do .env>"
```

---

## Step 1 — Leitura da Memória Obsidian (Orchestrator)

Antes de lançar qualquer subagente, leia as memories que serão injetadas:

```
view_file .agent/memory/ui.md         ← se há tasks [FRONTEND]
view_file .agent/memory/supabase.md   ← se há tasks [DB] ou [BACKEND]
view_file .agent/memory/auth.md       ← se há tasks de autenticação
view_file .agent/memory/domain.md     ← se há lógica de negócio
```

Salve o conteúdo desses arquivos — você vai injetar nos prompts dos subagentes.

---

## Step 2 — Consulta ao Grafo (Orchestrator)

Para cada módulo que será tocado pelas tasks:

```bash
graphify explain "<modulo-central>"   ← dependências do módulo
```

Salve o output — você vai incluir no prompt dos agentes relevantes.

---

## Step 3 — Agrupamento e Execução por Domínio

Identifique os domínios das tasks pendentes no `spec-plan.md` e agrupe:

| Domínio | Agente | Skills Injetadas | Memory Injetada |
|---|---|---|---|
| `[DB]` | Database Agent | `database/SKILL.md` | `memory/supabase.md` |
| `[BACKEND]` | Backend Agent | `backend-patterns/SKILL.md` + `auth/SKILL.md` | `memory/auth.md` + `memory/supabase.md` |
| `[FRONTEND]` | Frontend Agent | `ui-components/SKILL.md` + `ui-motion/SKILL.md` | `memory/ui.md` |
| `[TEST]` | Test (via Orchestrator) | `adaptive-reasoning/SKILL.md` | todos os memory relevantes |

**Ordem de execução obrigatória:**
1. `[DB]` primeiro — banco deve existir antes do backend
2. `[BACKEND]` segundo — Server Actions dependem das tabelas
3. `[FRONTEND]` terceiro — UI consome as Server Actions
4. `[TEST]` por último — valida o que foi implementado

**Para cada grupo, leia o arquivo do agente antes de lançá-lo:**
```
view_file .agent/agents/database-agent.md
view_file .agent/agents/backend-agent.md
view_file .agent/agents/frontend-agent.md
```

**Construa o prompt do subagente com este template:**

```markdown
[CONTEXTO DO AGENTE]
Você é o <Tipo> Specialist Agent do vibe-apply.
Feature em execução: <nome da feature> (<id>)
Leia .agent/agents/<tipo>-agent.md para entender seu papel e protocolo completo.

[MEMÓRIA DO PROJETO — via Obsidian]
<cole o conteúdo dos arquivos memory relevantes aqui>

[CONTEXTO DO GRAFO — via Graphify]
<cole o output do graphify explain aqui>

[TASKS QUE SÃO SUAS]
<lista das tasks [TIPO] do spec-plan.md>

[SPEC DE REFERÊNCIA]
- proposal.md: <cole os Contratos de Dados e o Risco Principal>
- design.md: <cole as Interfaces TypeScript e os Cenários de Verificação>
```

Marque as tasks como `[/] In Progress` no `spec-plan.md` ao lançar o agente.

---

## Step 4 — Validação (Validator Agent)

Após cada grupo de agentes retornar seus relatórios, **leia o Validator Agent e lance-o:**

```
view_file .agent/agents/validator-agent.md
```

**Construa o prompt do Validator com:**

```markdown
[CONTEXTO DO VALIDATOR]
Você é o Validator Agent independente.
Leia .agent/agents/validator-agent.md para o protocolo completo.

[SPEC DE REFERÊNCIA]
<cole os 3 arquivos de spec>

[MEMÓRIA DO PROJETO]
<cole as memories relevantes>

[RELATÓRIOS DOS AGENTES]
<cole os relatórios retornados pelos agentes especializados>
```

**Processar o veredito do Validator:**

- `[PASS]` → Marque tasks como `[x] Completed` no spec-plan. Avance.
- `[FAIL: <AgentX>]` → Relance APENAS o agente problemático com o motivo do FAIL no prompt. Máximo **3 iterações totais**.
- `[CONFLICT]` → Relance os agentes em conflito, explicitando o conflito no prompt.
- `[ESCALATE]` → Pare. Reporte ao usuário com o diagnóstico completo. **Não tente de novo.**

---

## Step 5 — Auto-Healing com Bug Agent

Se um agente retornar `Status: FAILED` por erro de build, runtime ou teste:

```
view_file .agent/agents/bug-agent.md
```

**Lançar Bug Agent com:**

```markdown
[CONTEXTO DO BUG AGENT]
Leia .agent/agents/bug-agent.md para o protocolo completo.

[ERRO REPORTADO]
<cole o erro exato do relatório do agente>

[MEMÓRIA DO MÓDULO]
<cole o conteúdo de memory/<modulo>.md>

[CONTEXTO DO GRAFO]
<cole o graphify explain do módulo com bug>

[ARQUIVOS MODIFICADOS ANTES DO ERRO]
<lista dos arquivos que foram tocados>
```

O Bug Agent executa até 3 tentativas de repair. Se `[ESCALATE]`:
```bash
git reset --hard HEAD
```
Reporte ao usuário com diagnóstico completo.

---

## Step 6 — VLM Visual QA (Obrigatório se [FRONTEND])

É **PROIBIDO** dizer "não tenho olhos" se a task tocou em UI.

```bash
npx playwright screenshot <url-de-preview-ou-localhost> screenshot.png
```

1. Se rota protegida: recupere credenciais do `.env` e autentique primeiro
2. Leia a imagem e verifique contra `design.md`:
   - CSS vazou para outros componentes?
   - Paleta Zinc-950 respeitada?
   - Layout alinhado como especificado?
3. Se encontrar quebra visual → corrija e repita antes de marcar `[x]`

---

## Step 7 — Auditoria Final de Ciclo (Auditor Agent — OBRIGATÓRIO)

Após todas as tasks estarem marcadas como `[x]` e o Visual QA concluído, **o Orchestrator DEVE acionar o Auditor Supremo** antes de liberar a entrega:

```
view_file .agent/agents/auditor-agent.md
```

**Lançar o Auditor Agent com o prompt:**

```markdown
[CONTEXTO DO AUDITOR]
Você é o Auditor Supremo de final de ciclo.
Sua missão é realizar a auditoria técnica implacável antes do arquivamento e commit da Spec <id>.
Leia .agent/agents/auditor-agent.md para o checklist completo de 7 dimensões.

[SPEC DE REFERÊNCIA]
- proposal.md: <conteúdo>
- design.md: <conteúdo>
- spec-plan.md: <conteúdo com todas as tasks marcadas>

[ARQUIVOS MODIFICADOS/CRIADOS (git status)]
<cole a saída de git status -s>

[MEMÓRIA DO PROJETO]
<cole as memories relevantes de .agent/memory/>

Execute o checklist das 7 dimensões:
1. Fidelidade à Spec
2. Regressão e Grafo (execute graphify explain nos módulos modificados)
3. Build e Tipagem Estrita (execute npm run build)
4. Segurança e Vazamento de Segredos
5. Conformidade com a Memória Obsidian
6. Visual QA & UI
7. Limpeza do Workspace

Retorne o relatório estruturado com o Veredito: [AUDIT_PASSED | AUDIT_FAILED].
```

**Tratar o Veredito do Auditor:**
- `[AUDIT_PASSED 🟢]` → A implementação está verdadeiramente blindada. Avance para a Conclusão.
- `[AUDIT_FAILED 🔴]` → **ENTREGA BLOQUEADA.** O Orchestrator deve analisar os blockers apontados, corrigi-los (ou acionar o subagente correspondente) e re-submeter ao Auditor. **NUNCA avance para o `/vibe-archive` com auditoria reprovada.**

---

## Conclusão

Quando todos os itens do `spec-plan.md` estiverem `[x] Completed`, o Validator tiver emitido `[PASS]` e o Auditor tiver emitido `[AUDIT_PASSED]`:

*"Implementação concluída e auditada com sucesso [AUDIT_PASSED]. Rode `/vibe-archive <id>` para consolidar a memória Obsidian, atualizar o grafo e fazer o commit."*

<!-- VIBEAPPLY:END -->
