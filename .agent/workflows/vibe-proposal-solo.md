---
description: Transforma requisitos em uma Especificação física completa (SDD) em modo SOLO (sem subagentes) — direto, rápido e com leitura obrigatória de Obsidian, Grafo e Código Legado, finalizando com Hard Stop.
---

<!-- OPENSPEC:START -->

**Objetivo:** Gerar `specs/<id>/proposal.md`, `design.md` e `spec-plan.md` diretamente com um único agente (sem subagentes). Ideal para bugs, refactors e features pontuais onde a orquestração multi-agente é desnecessária.

**Guardrails:**
- **NÃO ESCREVA CÓDIGO** nesta fase. Seu único output são arquivos `.md` dentro de `specs/`.
- **NÃO LANÇAR SUBAGENTES:** Este workflow roda em modo solo (sem `invoke_subagent`).
- **NÃO SUPONHA:** Inspecione o código legado e a memória antes de propor.
- **Context Budgeting:** Para arquivos grandes, leia apenas exports, interfaces e assinaturas.

---

## Step 0 — Leitura de Skills e Memória (Obsidian)

Leia obrigatoriamente antes de qualquer análise:
```
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md
```

Consulte `skills/INDEX.md` e carregue a skill do domínio da feature:
- Frontend: `view_file C:/Users/User/.gemini/config/skills/ui-components/SKILL.md`
- Backend: `view_file C:/Users/User/.gemini/config/skills/backend-patterns/SKILL.md`
- Banco: `view_file C:/Users/User/.gemini/config/skills/database/SKILL.md`

Leia os arquivos de memória relevantes em `.agent/memory/`:
- `view_file .agent/memory/ui.md` (se envolver telas/componentes)
- `view_file .agent/memory/supabase.md` (se envolver banco/RPC)
- `view_file .agent/memory/auth.md` (se envolver autenticação)
- `view_file .agent/memory/domain.md` (se envolver regras de negócio)

---

## Step 1 — Consulta ao Grafo e Código Legado (Anti-Alucinação)

Execute a consulta de dependências:
```bash
graphify query "<feature ou termo-chave>"
graphify explain "<modulo-central-impactado>"
```
*(Se o comando `graphify` não estiver no PATH, use `grep_search "from '.*<modulo>'" src/` para rastrear imports).*

**Inspeção Real do Código Legado (AST Skeleton Mode):**
- Abra os arquivos que serão tocados ou estendidos usando `view_file`.
- Copie as **interfaces TypeScript reais**, types exportados e assinaturas das funções existentes.
- **É TERMINANTEMENTE PROIBIDO supor tipos de cabeça ou criar mocks temporários.**
- Verifique se o código legado possui stubs ou funções vazias que possam retornar `undefined`.

**Se envolver banco:**
```bash
supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
  --sql "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '<tabela>' AND table_schema = 'public';"
```

---

## Step 2 — Bloqueio Anti-Duplicação

Cruze o que você encontrou com `spec/global/features.md` e a memória Obsidian:
- Se o componente, hook, tabela ou RPC já existe → **BLOQUEADO.** Reutilize o existente ou crie uma extensão mínima.

---

## Step 3 — Escrita dos 3 Arquivos de Spec

Crie os arquivos na pasta `specs/<id>/`:

### 1. `specs/<id>/proposal.md`
```markdown
# Proposal: <nome da feature> (<id>)

## Problema
O que está quebrando ou faltando, e por quê isso importa.

## Solução Proposta
O que será feito. Quais módulos serão tocados.

## Contratos de Dados
- Tabelas envolvidas, campos e tipos exatos (confrontados com o banco real)
- Mutações (INSERT/UPDATE/DELETE) e policies RLS

## API / Interface
- Endpoints, RPCs, hooks e componentes afetados (com assinaturas reais)

## Features Existentes Impactadas
(Módulos identificados via graphify explain que podem quebrar)

## Risco Principal
O que tem maior chance de falhar e estratégia de mitigação.
```

### 2. `specs/<id>/design.md`
```markdown
# Design: <nome da feature> (<id>)

## Arquitetura Técnica
Diagrama textual do fluxo de dados ponta a ponta.

## Interfaces TypeScript Reais
(Cole os tipos exatos copiados do código legado ou novos tipos com zero any)

## Componentes / Hooks / Funções
Lista com caminho exato e responsabilidade de cada item novo ou modificado.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial] → [ação] → [resultado esperado]
- Cenário 2 (Edge Case): [condição limite] → [ação] → [resultado esperado]
```

### 3. `specs/<id>/spec-plan.md`
```markdown
# Spec Plan: <nome da feature> (<id>)

## Tasks

- [ ] [DB] <tarefa de banco, se houver>
- [ ] [BACKEND] <tarefa de Server Action / API, se houver>
- [ ] [FRONTEND] <tarefa de UI / Componente, se houver>
- [ ] [TEST] Verificar cenário 1: <descrição>
- [ ] [TEST] Verificar cenário 2: <descrição>
```

---

## Step 4 — Auto-Revisão de Coerência

Antes de apresentar ao usuário, faça o checklist solo:
- [ ] O plano tem dependências circulares?
- [ ] O `spec-plan.md` cobre 100% do que está no `design.md`?
- [ ] Todas as tasks estão marcadas estritamente como `- [ ] Pending`?

---

## Step 5 — Apresentação e Hard Stop Obrigatório

Apresente o resumo da Spec ao usuário:
1. Identificador: `specs/<id>/`
2. Arquivos legados reutilizados vs novos
3. Resumo das tasks do `spec-plan.md`
4. Maior risco e mitigação

> 🛑 **CIRCUIT BREAKER — PARADA OBRIGATÓRIA (HARD STOP):**
> 
> **A IA DEVE PARAR SEU TURNO IMEDIATAMENTE AQUI.**
> - **NÃO CHAME NENHUMA FERRAMENTA ADICIONAL.**
> - **NÃO toque em nenhum arquivo de código-fonte (`.ts`, `.tsx`, `.sql`, etc.).**
> - **NÃO marque nenhuma task como `[/]` ou `[x]`.**
> - **NÃO inicie a implementação automaticamente sob NENHUMA hipótese.**
> 
> Encerre sua resposta informando:
> *"Especificação da Spec <id> concluída (modo solo). Aguardando sua revisão e aprovação. Para iniciar a implementação, envie o comando: `/vibe-apply-solo <id>` (ou `/vibe-apply <id>` se desejar equipe)."*

<!-- OPENSPEC:END -->
