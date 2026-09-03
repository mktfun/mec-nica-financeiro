---
description: Transformação de requisitos em uma Especificação física completa (SDD) antes de qualquer linha de código — com leitura obrigatória de Obsidian e Graphify, pesquisa profunda de codebase, bloqueio de duplicações, checklist atômico e save-state de memória.
---

<!-- OPENSPEC:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview`, delegar para equipe ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore um pedido de delegação para continuar executando sozinho.

**Guardrails**

- **NÃO ESCREVA CÓDIGO** nesta fase em nenhuma circunstância. Seu único output são arquivos `.md` dentro de `specs/`.
- **RACIOCÍNIO EXPLÍCITO OBRIGATÓRIO:** Nenhuma ação começa sem um bloco de raciocínio interno (`<think>`) explícito.
- **DEEP RESEARCH ANTES DE AGIR:** Use ferramentas simultâneas (`grep_search` + `list_dir`) para varrer o projeto. ZERO SUPOSIÇÕES sobre o que existe ou não existe.
- **Context Budgeting:** Para arquivos grandes, leia apenas assinaturas de funções, types/interfaces e docstrings.

---

## Phase 1: Leitura de Estado Global (Obsidian + Grafo)

**Step 1 — Ler Skills de Raciocínio:**

```
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md       ← protocolo de raciocínio e anti-loops
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md                  ← protocolo de leitura/escrita de memória
```

**Step 1b — Ler Memória Modular (Obsidian) — OBRIGATÓRIO por tipo de feature:**

| Se a feature envolve | Leia |
|---|---|
| UI / Componentes / Telas | `.agent/memory/ui.md` |
| Banco / Supabase / RPC | `.agent/memory/supabase.md` |
| Autenticação / Sessão | `.agent/memory/auth.md` |
| Deploy / VPS / DNS | `.agent/memory/infra.md` |
| Regras de negócio | `.agent/memory/domain.md` |
| Categoria específica | `.agent/memory/<categoria>.md` |

Se nenhum arquivo existir ainda, crie-os com o cabeçalho (ver `/setup`).

> **Por que:** A memória Obsidian contém decisões passadas, anti-patterns e regras que **não devem ser repetidas**. Ler antes evita propor o que já foi resolvido ou o que explicitamente não deve ser feito.

**Step 2 — Consulta ao Grafo (Graphify) — OBRIGATÓRIO:**

```bash
graphify explain "<modulo-central-da-feature>"        # entender dependências transitivas
graphify query "<termo-chave da feature>"             # localizar módulos relacionados
graphify path "<ComponenteA>" "<ComponenteB>"         # mapear hierarquia se relevante
```

> Graphify é Python. Instalar com: `uv tool install graphifyy`. Comando: `graphify` (um Y).
>
> **Por que:** O grafo revela quais arquivos dependem do que você vai tocar. Propor mudanças sem isso é propor às cegas — você não sabe o que vai quebrar.

**Step 3 — Varredura Paralela da Codebase (AST Skeleton Mode):**

Execute simultaneamente:
- `list_dir` na raiz e nas pastas relevantes (`src/`, `components/`, `lib/`, `supabase/`)
- `grep_search` pelos termos-chave da feature (nome do módulo, nome da tabela, nome do hook)
- Para arquivos grandes: leia apenas as primeiras 30-50 linhas (exports, types, interfaces)

**Step 4 — Criar/Validar `spec/global/`:**

Garanta que os 4 arquivos globais existem:
- `spec/global/overview.md` — Descrição do produto, público-alvo, propósito
- `spec/global/architecture.md` — Stack, padrões de pastas, contratos de módulos
- `spec/global/features.md` — **MAPA VIVO DE FEATURES JÁ EXISTENTES**
- `spec/global/constraints.md` — Regras imutáveis do projeto

**Step 5 — Bloqueio Anti-Duplicação (Obsidian + Features):**

Cruze 3 fontes antes de propor qualquer artefato:
1. `spec/global/features.md` — features implementadas
2. `.agent/memory/<categoria>.md` — regras e componentes registrados
3. `graphify query "<artefato>"` — onde esse artefato aparece no código

Se o componente/hook/tabela/lógica JÁ EXISTE em qualquer das 3 fontes → **BLOQUEADO.** Use o existente ou crie um wrapper mínimo.

**Step 5b — Se envolver Supabase:**

Leia `skills/database/SKILL.md` e inspecione o schema real:
```bash
supabase db dump --linked --schema public > /tmp/schema_dump.sql
```
Nunca proponha criar tabela, coluna, RPC ou policy sem confirmar que não existe no dump.

---

## Phase 2: Pipeline SDD — Especificação Determinística

**Step 6 — Constitution Review:**

Valide o pedido do usuário contra:
- `spec/global/constraints.md` (regras imutáveis do projeto)
- `.agent/rules/ia.md` (regras globais da IA)

Se violar alguma constraint → notifique o usuário ANTES de continuar.

**Step 7 — Specify (`specs/<id>/proposal.md`):**

```markdown
# Proposal: <nome da feature> (<id>)

## Problema
O que está quebrando ou faltando, e por quê isso importa.

## Solução Proposta
O que será feito. Quais módulos serão tocados.

## Contratos de Dados
- Tabelas Supabase envolvidas (existentes ou novas)
- Campos e tipos exatos
- Mutações de estado (INSERT/UPDATE/DELETE)
- RLS policies necessárias

## API / Interface
- Endpoints ou RPCs que serão criados/modificados
- Props e eventos dos componentes React (se frontend)
- Hooks afetados

## Features Existentes Impactadas
(ref a spec/global/features.md — lista o que pode quebrar)
(ref ao graphify explain — dependências identificadas)

## Risco Principal
O que tem maior chance de dar errado e por quê.
```

**Step 8 — Clarify (Zero Ambiguidade):**

PAUSE e revise: Há algum ponto ambíguo que pode levar a interpretações diferentes?
- Se sim → liste as dúvidas explicitamente e peça esclarecimento ao usuário antes de continuar
- Só avance quando tiver 0 (zero) ambiguidades sobre o comportamento esperado

**Step 9 — Design (`specs/<id>/design.md`):**

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
Variáveis de ambiente necessárias no frontend e backend.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial] → [ação] → [resultado esperado]
- Cenário 2: [edge case] → [ação] → [resultado esperado]
```

**Step 10 — Tasks (`specs/<id>/spec-plan.md`):**

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

**Step 11 — Analyze (Dry-Run Mental):**

```
view_file C:/Users/User/.gemini/config/skills/deciqai-bayesian-reasoning/SKILL.md   ← avaliação de risco e probabilidade
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md            ← checklist de coerência final
```

Usando os frameworks lidos, simule mentalmente a execução do spec-plan:
- Se rodar do Step 1 ao último, algo quebra? Qual a P(falha) de cada task?
- Há dependências entre tasks que exigem ordem específica?
- O risco principal do `proposal.md` foi mitigado no plano?

---

## Phase 3: Aprovação e Handoff

**Step 12 — Apresentação ao Usuário:**

Apresente um resumo da spec (não cole os arquivos inteiros):
- Arquivos que serão criados/modificados
- O maior risco identificado
- A lista de tasks do `spec-plan.md`
- **O que o Obsidian revelou de relevante** (componentes reutilizáveis, anti-patterns a evitar)
- **O que o Graphify revelou** (dependências que podem ser impactadas)

**Step 13 — Aguardar Aprovação Explícita:**

**NÃO INICIE O `/vibe-apply` SEM APROVAÇÃO EXPLÍCITA DO USUÁRIO.**
Quando aprovado, instrua: *"Rode `/vibe-apply <id>` para implementar."*

---

## Infra Topology Proposal

Quando envolver deploy, domínio ou backend, propor explicitamente no `design.md`:
- Frontend publicado (ex: Lovable), topologia de subdomínios, variáveis de ambiente necessárias

## Visual QA Planning

Se envolver frontend com rotas protegidas por login, adicionar no `proposal.md`:
- Credenciais de teste necessárias (email/senha) para o VLM Loop do `/vibe-apply`

<!-- OPENSPEC:END -->
