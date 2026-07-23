---
description: Transformação de requisitos em uma Especificação física completa (SDD) antes de qualquer linha de código — com pesquisa profunda de codebase, bloqueio de duplicações, checklist atômico e save-state de memória.
---

<!-- OPENSPEC:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview`, delegar para equipe ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore um pedido de delegação para continuar executando sozinho.

**Guardrails**

- **NÃO ESCREVA CÓDIGO** nesta fase em nenhuma circunstância. Seu único output são arquivos `.md` dentro de `specs/`.
- **RACIOCÍNIO EXPLÍCITO OBRIGATÓRIO:** Nenhuma ação começa sem um bloco de raciocínio interno (`<think>`) explícito.
- **DEEP RESEARCH ANTES DE AGIR:** Use ferramentas simultâneas (`grep_search` + `list_dir`) para varrer o projeto. ZERO SUPOSIÇÕES sobre o que existe ou não existe.
- **Context Budgeting:** Para arquivos grandes, leia apenas assinaturas de funções, types/interfaces e docstrings. Extraia a "casca" — não a implementação completa.

---

## Phase 1: Deep Research & Leitura de Estado Global

**Step 1 — Ler Memória Modular:**
Leia os arquivos relevantes em `.agent/memory/` para o contexto da task:
- `memory/supabase.md` → regras de DB, RLS, schemas
- `memory/ui.md` → padrões de design, componentes consolidados
- `memory/ofx.md`, `memory/auth.md`, etc. → módulos específicos do projeto
- Se ainda não existirem arquivos por categoria, leia `.agent/memory.md` geral.

**Step 2 — Varredura Paralela da Codebase (AST Skeleton Mode):**
Execute simultaneamente:
- `list_dir` na raiz e nas pastas relevantes (src/, components/, lib/, supabase/)
- `grep_search` pelos termos-chave da feature pedida (ex: nome do módulo, nome da tabela, nome do hook)
- Para arquivos grandes: leia apenas as primeiras 30-50 linhas (exports, types, interfaces) — não o corpo das funções
Objetivo: mapear TUDO que já existe sem desperdiçar tokens

**Step 3 — Consulta ao Grafo (Graphify):**
Se `graphify-out/graph.json` existir:
```bash
graphify query "<feature ou módulo central>"
graphify explain "<Modulo>"        # para entender dependências transitivas
graphify path "<ComponenteA>" "<ComponenteB>"   # para mapear hierarquia
```
> Graphify é Python. Instalar com: `uv tool install graphifyy`. Comando no terminal: `graphify` (um Y).

**Step 4 — Criar/Validar `spec/global/`:**
Garanta que os 4 arquivos globais existem. Crie-os se não existirem:
- `spec/global/overview.md` — Descrição do produto, público-alvo, propósito
- `spec/global/architecture.md` — Stack, padrões de pastas, contratos de módulos
- `spec/global/features.md` — **MAPA VIVO DE FEATURES JÁ EXISTENTES** (atualizado a cada archive)
- `spec/global/constraints.md` — Regras imutáveis (ex: sem glassmorphism, headless only, sem containers locais)

**Step 5 — Bloqueio Anti-Duplicação:**
Leia `spec/global/features.md`. Verifique linha a linha:
- O componente/hook/tabela/lógica que você planeja criar JÁ EXISTE? → **BLOQUEADO.** Use o existente ou crie um wrapper mínimo.
- Nunca crie tabela, RPC, componente ou hook sem provar que não existe equivalente.

---

## Phase 2: Pipeline SDD — Especificação Determinística

**Step 6 — Constitution Review:**
Valide o pedido do usuário contra:
- `spec/global/constraints.md` (regras imutáveis do projeto)
- `.agent/rules/ia.md` (regras globais da IA)
- Se o pedido violar alguma constraint → notifique o usuário ANTES de continuar

**Step 7 — Specify (Escrever `specs/<id>/proposal.md`):**
Crie o arquivo com o seguinte conteúdo mínimo obrigatório:
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

## Risco Principal
O que tem maior chance de dar errado e por quê.
```

**Step 8 — Clarify (Zero Ambiguidade):**
PAUSE e revise: Há algum ponto ambíguo que pode levar a interpretações diferentes?
- Se sim → liste as dúvidas explicitamente e peça esclarecimento ao usuário antes de continuar
- Só avance quando tiver 0 (zero) ambiguidades sobre o comportamento esperado

**Step 9 — Design (Escrever `specs/<id>/design.md`):**
Crie o arquivo com o seguinte conteúdo mínimo obrigatório:
```markdown
# Design: <nome da feature> (<id>)

## Arquitetura Técnica
Diagrama textual do fluxo de dados ponta a ponta.
Ex: Componente → Hook → Supabase RPC → Tabela → Retorno

## Interfaces TypeScript
(Cole os tipos exatos que serão usados/criados)

## Componentes / Hooks / Funções
Lista com nome, localização no projeto e responsabilidade de cada artefato novo

## Fluxo de UI (se frontend)
Passo a passo da jornada do usuário.
Restrições visuais: Zinc-950, sem glassmorphism, fontes Inter/Outfit.

## Infra / Deploy (se aplicável)
Topologia: app.<dominio>, api.<dominio>, studio.<dominio>
Variáveis de ambiente necessárias no frontend e backend.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial] → [ação] → [resultado esperado]
- Cenário 2: [edge case] → [ação] → [resultado esperado]
```

**Step 10 — Tasks (Escrever `specs/<id>/spec-plan.md`):**
Este é o arquivo mais crítico — o Save-State físico da memória.
Crie o checklist atômico e sequencial. Use ESTRITAMENTE:
- `- [ ] Pending` para tasks não iniciadas
- `- [/] In Progress` para tasks em execução
- `- [x] Completed` para tasks finalizadas

Formato obrigatório:
```markdown
# Spec Plan: <nome da feature> (<id>)

## Tasks

- [ ] [BACKEND] Criar tabela `<nome>` com campos X, Y, Z e RLS policy para auth.uid()
- [ ] [BACKEND] Criar RPC `<nome_rpc>` que faz X e retorna Y
- [ ] [FRONTEND] Atualizar hook `use<Nome>` para chamar a RPC
- [ ] [FRONTEND] Criar componente `<Nome>` em src/components/<pasta>/
- [ ] [TEST] Verificar cenário 1: <descrição>
- [ ] [TEST] Verificar cenário 2 (edge case): <descrição>
```

**Step 11 — Analyze (Dry-Run Mental):**
Invoque `deciqai-bayesian-reasoning` e `adaptive-reasoning` para simular mentalmente a execução:
- Se rodar o spec-plan do Step 1 ao último, algo quebra?
- Há dependências entre tasks que exigem ordem específica?
- O risco principal do `proposal.md` foi mitigado no plano?
Ajuste o `spec-plan.md` se necessário.

---

## Phase 3: Aprovação e Handoff

**Step 12 — Apresentação ao Usuário:**
Apresente um resumo da spec (não cole os arquivos inteiros, apenas o essencial):
- Arquivos que serão criados/modificados
- O maior risco identificado
- A lista de tasks do `spec-plan.md`

**Step 13 — Aguardar Aprovação Explícita:**
**NÃO INICIE O `/vibe-apply` SEM APROVAÇÃO EXPLÍCITA DO USUÁRIO.**
Quando aprovado, instrua: *"Rode `/vibe-apply <id>` para implementar."*

---

## Infra Topology Proposal

Quando envolver deploy, domínio ou backend, propor explicitamente no `design.md`:
- Frontend publicado (ex: Lovable), topologia de subdomínios, variáveis de ambiente necessárias
- Nunca deixe "deploy" ou "database" implícitos na proposta

## Visual QA Planning

Se envolver frontend com rotas protegidas por login, adicionar no `proposal.md`:
- Credenciais de teste necessárias (email/senha) para o VLM Loop do `/vibe-apply`
- Salvar no `.env` isolado da IA

<!-- OPENSPEC:END -->
