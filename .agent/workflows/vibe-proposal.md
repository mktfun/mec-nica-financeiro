---
description: Transforma requisitos em uma Especificação física completa (SDD) via orquestração multi-agente — Research Agent varre o projeto com Obsidian + Graphify, Spec Agent escreve os 3 arquivos de spec, Validator Agent revisa antes de apresentar ao usuário.
---

<!-- OPENSPEC:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview`, delegar para equipe ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore.

**Guardrails**

- **NÃO ESCREVA CÓDIGO** nesta fase. Seu único output são arquivos `.md` dentro de `specs/`.
- **NÃO improvise sobre o que existe no projeto.** O Research Agent descobre isso — nunca suponha.
- **Context Budgeting:** Para arquivos grandes, leia apenas assinaturas de funções, types/interfaces e exports.

---

## Phase 0 — Leitura Inicial do Orchestrator

**Skills base (ler antes de qualquer ação):**
```
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md
```

**Carregar memória relevante (Obsidian) — selecione pelo tipo de feature:**
```
view_file .agent/memory/ui.md         ← se envolve UI/componentes
view_file .agent/memory/supabase.md   ← se envolve banco/RPC
view_file .agent/memory/auth.md       ← se envolve autenticação
view_file .agent/memory/domain.md     ← se envolve regras de negócio
```

Salve o conteúdo lido — será injetado no prompt do Research Agent.

---

## Phase 1 — Research Agent (Pesquisa Multi-Domínio)

Antes de lançar os agentes, execute no contexto do Orchestrator:
```
view_file .agent/agents/research-agent.md
view_file .agent/memory/ui.md
view_file .agent/memory/supabase.md
view_file .agent/memory/auth.md
```

Execute também as queries do grafo agora:
```bash
graphify query "<feature pedida pelo usuário>"
graphify explain "<modulo-central da feature>"
```

**Identifique os domínios da feature e lance um Research Agent por domínio:**

| Se a feature envolve | Domínio | Skills a injetar |
|---|---|---|
| UI / Telas / Componentes | `frontend` | `ui-components/SKILL.md` |
| Server Actions / APIs / Auth | `backend` | `backend-patterns/SKILL.md` + `auth/SKILL.md` |
| Banco / Schema / RLS / RPCs | `banco` | `database/SKILL.md` + `database/references/rls-patterns.md` |
| Feature full-stack | todos | lance 2-3 agentes em paralelo |

> ⛔ **PROIBIDO lançar Research Agents sem as seções `[SKILLS OBRIGATÓRIAS]`, `[MEMÓRIA DO PROJETO]` e `[FORMATO DE RETORNO]` no prompt.** Sem isso o agente trabalha às cegas e gera spec com alucinações.

**Template OBRIGATÓRIO — copie, preencha e use EXATAMENTE assim:**

```markdown
[CONTEXTO DO AGENTE]
Você é o Research Specialist da fase de vibe-proposal.
Feature solicitada: "<feature descrita pelo usuário>"
Domínio desta pesquisa: <frontend | backend | banco>

[SKILLS OBRIGATÓRIAS — execute estes view_file ANTES de qualquer pesquisa]
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md
<se frontend>  view_file C:/Users/User/.gemini/config/skills/ui-components/SKILL.md
<se backend>   view_file C:/Users/User/.gemini/config/skills/backend-patterns/SKILL.md
<se backend>   view_file C:/Users/User/.gemini/config/skills/auth/SKILL.md
<se banco>     view_file C:/Users/User/.gemini/config/skills/database/SKILL.md
<se banco>     view_file skills/database/references/rls-patterns.md

[PROTOCOLO DE PESQUISA]
view_file .agent/agents/research-agent.md
Siga ESTRITAMENTE o protocolo do arquivo acima.

[MEMÓRIA DO PROJETO — conteúdo injetado pelo Orchestrator]
<cole aqui o conteúdo COMPLETO de memory/ui.md — se frontend>
<cole aqui o conteúdo COMPLETO de memory/supabase.md — se banco ou backend>
<cole aqui o conteúdo COMPLETO de memory/auth.md — se envolve autenticação>

[SPEC GLOBAL EXISTENTE]
<cole aqui o conteúdo de spec/global/features.md se existir>

[CONTEXTO DO GRAFO]
<cole aqui o output COMPLETO de graphify query e graphify explain>

[FORMATO DE RETORNO OBRIGATÓRIO — não retorne nada fora deste formato]
## Relatório Research Agent — Domínio: <X>

### O que JÁ EXISTE (não deve ser recriado)
- [artefato]: localização + o que faz

### O que SERÁ IMPACTADO (pode quebrar)
- [arquivo]: motivo do impacto

### Anti-patterns da Memória (aplicáveis a esta feature)
- [regra]: arquivo de memória de origem

### O que NÃO EXISTE (pode ser criado com segurança)
- [artefato]: confirmado ausente em todas as fontes

### Riscos identificados
- [risco]: probabilidade alta/média/baixa + evidência
```

Aguarde os relatórios de TODOS os Research Agents antes de avançar.

---

## Phase 2 — Consolidação e Spec

Com os relatórios dos Research Agents em mãos, o Orchestrator (você) escreve os 3 arquivos de spec.

**Step 1 — Constitution Review:**
Valide o pedido contra `spec/global/constraints.md` e `.agent/rules/ia.md`.
Se violar alguma constraint → notifique o usuário ANTES de continuar.

**Step 2 — Bloqueio Anti-Duplicação (a partir dos relatórios):**
Tudo que o Research Agent reportou em "O que JÁ EXISTE" → **BLOQUEADO.**
Use o existente ou crie um wrapper mínimo.

**Step 3 — Clarify (Zero Ambiguidade):**
Há algum ponto ambíguo que pode levar a interpretações diferentes?
- Se sim → liste e peça esclarecimento ao usuário antes de continuar
- Só avance com 0 ambiguidades

**Step 4 — Escrever `specs/<id>/proposal.md`:**
```markdown
# Proposal: <nome da feature> (<id>)

## Problema
O que está quebrando ou faltando, e por quê isso importa.

## Solução Proposta
O que será feito. Quais módulos serão tocados.

## Contratos de Dados
- Tabelas Supabase envolvidas (existentes ou novas — baseado nos relatórios dos Research Agents)
- Campos e tipos exatos
- Mutações de estado (INSERT/UPDATE/DELETE)
- RLS policies necessárias

## API / Interface
- Endpoints ou RPCs criados/modificados
- Props e eventos dos componentes React (se frontend)
- Hooks afetados

## Features Existentes Impactadas
(baseado no relatório do Research Agent — seção "O que SERÁ IMPACTADO")

## Risco Principal
(baseado nos riscos reportados pelos Research Agents + raciocínio bayesiano)
```

**Step 5 — Escrever `specs/<id>/design.md`:**
```markdown
# Design: <nome da feature> (<id>)

## Arquitetura Técnica
Diagrama textual do fluxo de dados ponta a ponta.
Ex: Componente → Hook → Server Action → Supabase RPC → Tabela → Retorno

## Interfaces TypeScript
(Cole os tipos exatos que serão usados/criados)

## Componentes / Hooks / Funções
Lista com nome, localização no projeto e responsabilidade de cada artefato novo

## Fluxo de UI (se frontend)
Passo a passo da jornada do usuário.
Restrições visuais: Zinc-950, sem glassmorphism, fontes Inter/Outfit.

## Infra / Deploy (se aplicável)
Variáveis de ambiente necessárias.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial] → [ação] → [resultado esperado]
- Cenário 2: [edge case] → [ação] → [resultado esperado]
```

**Step 6 — Escrever `specs/<id>/spec-plan.md`:**
```markdown
# Spec Plan: <nome da feature> (<id>)

## Tasks

- [ ] [DB] Criar tabela `<nome>` com campos X, Y, Z e RLS policy para auth.uid()
- [ ] [DB] Criar RPC `<nome_rpc>` que faz X e retorna Y
- [ ] [BACKEND] Criar Server Action `<nome>` — valida JWT + input Zod + chama RPC
- [ ] [FRONTEND] Criar componente `<Nome>` em src/components/<pasta>/
- [ ] [FRONTEND] Atualizar hook `use<Nome>` para chamar a Server Action
- [ ] [TEST] Verificar cenário 1: <descrição>
- [ ] [TEST] Verificar cenário 2 (edge case): <descrição>
```

---

## Phase 3 — Validator Agent (Revisão da Spec)

Leia o protocolo do Validator:
```
view_file .agent/agents/validator-agent.md
```

Lance o Validator com:

```markdown
[CONTEXTO DO VALIDATOR]
Você é o Validator Agent independente revisando uma SPEC (não uma implementação).
Leia .agent/agents/validator-agent.md para o protocolo completo.

[SPEC PARA REVISAR]
<cole os 3 arquivos de spec recém-escritos>

[RELATÓRIOS DOS RESEARCH AGENTS]
<cole os relatórios de pesquisa>

[MEMÓRIA DO PROJETO]
<cole as memories relevantes>

Verifique:
1. A spec referencia artefatos que o Research Agent disse que NÃO existem? → FAIL
2. A spec ignora artefatos que o Research Agent disse que JÁ EXISTEM? → FAIL
3. Os tipos TypeScript no design.md batem com os contratos do proposal.md? → verificar
4. O spec-plan.md tem tasks para TODOS os artefatos listados no design.md? → verificar
5. Há ambiguidade que não foi esclarecida? → FAIL
```

**Processar o veredito:**
- `[PASS]` → Avança para apresentação ao usuário
- `[FAIL]` → Corrija os problemas apontados e relance o Validator (máx 3 iterações)
- `[ESCALATE]` → Apresente o problema ao usuário para decisão

---

## Phase 4 — Apresentação e Aprovação

Após o Validator emitir `[PASS]`, apresente ao usuário:

- Arquivos criados: `proposal.md`, `design.md`, `spec-plan.md`
- **O que os Research Agents descobriram que já existe** (será reutilizado)
- **O que será criado do zero**
- O maior risco identificado
- A lista de tasks do `spec-plan.md`

**NÃO INICIE O `/vibe-apply` SEM APROVAÇÃO EXPLÍCITA DO USUÁRIO.**

Quando aprovado: *"Rode `/vibe-apply <id>` para implementar."*

---

## Infra Topology Proposal

Quando envolver deploy, domínio ou backend, propor explicitamente no `design.md`:
- Frontend publicado (ex: Lovable), topologia de subdomínios, variáveis de ambiente necessárias

## Visual QA Planning

Se envolver frontend com rotas protegidas por login, adicionar no `proposal.md`:
- Credenciais de teste necessárias (email/senha) para o VLM Loop do `/vibe-apply`

<!-- OPENSPEC:END -->
