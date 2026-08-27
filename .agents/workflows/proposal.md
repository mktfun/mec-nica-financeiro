---
description: Transformação de requisitos em Especificação Física (SDD) com Orquestração Multi-Agente Nativa (DB, UI, Riscos em paralelo), pesquisa profunda e save-state.
---

<!-- OPENSPEC:START -->

**Guardrails de Proposal**
- **NÃO ESCREVA CÓDIGO DE IMPLEMENTAÇÃO** nesta fase em nenhuma circunstância. Seu único output são arquivos .md dentro de specs/<id>/.
- **RACIOCÍNIO EXPLÍCITO OBRIGATÓRIO:** Toda ação é precedida por um pensamento estratégico claro.
- **ORQUESTRAÇÃO MULTI-AGENTE NATIVA:** Para análises profundas, delegue frentes em paralelo para subagentes especializados via invoke_subagent.

---

## Phase 1: Orquestração Paralela de Deep Research

**Step 1 — Carregar Memória & Identificar Escopo:**
Leia os arquivos relevantes em .agent/memory/:
- memory/supabase.md → regras de DB, RLS, schemas
- memory/ui.md → padrões de design, componentes consolidados
- memory/domain.md → regras de negócio do domínio

**Step 2 — Disparo do Esquadrão de Pesquisa (invoke_subagent):**
Invoque simultaneamente os subagentes especialistas com ferramentas de leitura (research ou self):

```json
{
  "Subagents": [
    {
      "TypeName": "research",
      "Role": "Database & Backend Architect",
      "Prompt": "Inspecione a pasta supabase/, migrations, RPCs existentes e memory/supabase.md. Mapeie quais tabelas e colunas precisam ser criadas ou alteradas para a feature pedida, quais RLS policies são necessárias e se já existe alguma estrutura parecida na base. Retorne o Contrato de Dados exato.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "Frontend & Design Architect",
      "Prompt": "Inspecione src/components/, src/hooks/ e memory/ui.md. Mapeie quais componentes React e Hooks já existem e quais precisarão ser criados/modificados. Garanta padrão Dark UI (Zinc-950), tipagem estrita de props e estados de loading/empty/error. Retorne a árvore de componentes e contratos de interface.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "Risk & Edge-Case Auditor",
      "Prompt": "Leia spec/global/features.md e graphify (se existir). Identifique dependências ocultas, efeitos colaterais em outras telas e o maior risco de regressão desta feature. Defina 2 cenários de teste críticos (SCAN -> INFER -> VERIFY -> FIX).",
      "Workspace": "inherit"
    }
  ]
}
```

*Nota: Enquanto os subagentes processam em paralelo, o Maestro aguarda o retorno dos relatórios para síntese.*

---

## Phase 2: Síntese Determinística e Geração da Spec (SDD)

Após receber as análises dos 3 subagentes, o Maestro consolida e escreve os artefatos:

**Step 3 — Escrever specs/<id>/proposal.md:**
```markdown
# Proposal: <nome da feature> (<id>)

## Problema
O que está quebrando ou faltando, e por quê isso importa.

## Solução Proposta
O que será feito. Quais módulos serão tocados.

## Contratos de Dados (do Subagente Backend)
- Tabelas Supabase envolvidas (existentes ou novas)
- Campos e tipos exatos
- Mutações de estado (INSERT/UPDATE/DELETE)
- RLS policies necessárias

## API / Interface (do Subagente Frontend)
- Endpoints ou RPCs que serão criados/modificados
- Props e eventos dos componentes React
- Hooks afetados

## Features Existentes Impactadas (do Subagente Risco)
- Lista de fluxos que podem sofrer efeito colateral

## Risco Principal e Mitigação
O maior ponto de falha e como será prevenido.
```

**Step 4 — Escrever specs/<id>/design.md:**
```markdown
# Design: <nome da feature> (<id>)

## Arquitetura Técnica
Diagrama textual do fluxo de dados ponta a ponta.
Ex: Componente → Hook → Supabase RPC → Tabela → Retorno

## Interfaces TypeScript
(Cole os tipos exatos que serão criados em types.ts)

## Componentes / Hooks / Funções
Lista com nome, localização exata e responsabilidade.

## Fluxo de UI
Passo a passo da experiência visual (Dark UI sólida, Zinc-950, sem glassmorphism).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial] → [ação] → [resultado esperado]
- Cenário 2: [edge case] → [ação] → [resultado esperado]
```

**Step 5 — Escrever specs/<id>/spec-plan.md (Save-State de Execução):**
Checklist atômico estruturado por tags de especialidade para facilitar a delegação no /apply:
```markdown
# Spec Plan: <nome da feature> (<id>)

## Tasks

- [ ] [BACKEND] Criar migration/tabela <nome> com RLS policy para auth.uid()
- [ ] [BACKEND] Criar RPC <nome_rpc> com validação de payload
- [ ] [FRONTEND] Criar/atualizar hook use<Nome> tipado
- [ ] [FRONTEND] Criar componente <Nome> em src/components/<pasta>/
- [ ] [TEST] Executar cenário 1 e validar fluxo ponta a ponta
- [ ] [TEST] Executar cenário 2 (edge case) e VLM Visual QA
```

---

## Phase 3: Apresentação e Handoff

**Step 6 — Apresentar ao Usuário:**
Apresente um resumo executivo:
- Resumo da solução
- Maior risco mitigado
- Checklist de tarefas do spec-plan.md

**Instrução final:**
*"Spec finalizada com sucesso. Quando estiver pronto para a implementação paralela, execute /apply <id> (ou /vibe-apply <id>)."*

<!-- OPENSPEC:END -->
