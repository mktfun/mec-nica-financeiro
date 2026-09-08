---
description: Transformação de requisitos em Especificação Física (SDD) com Orquestração Multi-Agente de Deep Research, Bloqueio Anti-Duplicação Estrito, Reuso de Código/SQL/RPCs e Graphify.
---

<!-- OPENSPEC:START -->

**Guardrails de Proposal**
- **NÃO ESCREVA CÓDIGO DE IMPLEMENTAÇÃO** nesta fase em nenhuma circunstância. Seu único output são arquivos .md dentro de specs/<id>/.
- **PROIBIDO CRIAR O QUE JÁ EXISTE:** É terminantemente proibido criar novas tabelas, RPCs, componentes React ou hooks se já existir equivalente no projeto. Sua prioridade #1 é **REUTILIZAR E CORRIGIR/ESTENDER** o código existente.
- **RACIOCÍNIO EXPLÍCITO OBRIGATÓRIO:** Toda ação deve ser precedida por um pensamento estratégico analítico.
- **DEEP INVESTIGATION MULTI-AGENTE:** Invoque subagentes especialistas via `invoke_subagent` para varrer o projeto em paralelo e encontrar tudo o que já existe antes de desenhar a spec.

---

## Phase 1: Deep Research Multi-Agente & Bloqueio de Duplicações

**Step 1 — Carregar Memória Modular:**
Leia os arquivos relevantes em .agent/memory/:
- memory/supabase.md → regras de DB, RLS, schemas consolidados, RPCs existentes
- memory/ui.md → design system, componentes consolidados, Dark UI
- memory/domain.md → regras de negócio do domínio

**Step 2 — Disparo do Esquadrão de Investigação e Reuso (invoke_subagent):**
Invoque simultaneamente os 3 subagentes especialistas com ferramentas de leitura (`research` ou `self`):

```json
{
  "Subagents": [
    {
      "TypeName": "research",
      "Role": "Database & Backend Specialist",
      "Prompt": "Inspecione migrations/, supabase/, schema_dump.sql e memory/supabase.md. Execute queries em information_schema.columns e information_schema.routines. REQUISITO CRÍTICO: Identifique todas as tabelas, colunas e RPCs que já existem e podem ser REUTILIZADAS ou ALTERADAS via ALTER TABLE / CREATE OR REPLACE FUNCTION. Evite criar estruturas paralelas. Retorne o Contrato de Dados exato.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "Frontend & Component Specialist",
      "Prompt": "Inspecione src/components/, src/hooks/, spec/global/features.md e memory/ui.md. REQUISITO CRÍTICO: Mapeie todos os componentes visuais (tabelas, modais, cards, formulários) e hooks existentes (ex: useTransactions, useConciliacao) que já atendem 80% do requisito. Proponha apenas MODIFICAÇÕES [MODIFY] ou EXTENSÕES [EXTEND]. Garanta padrão Dark UI (Zinc-950) e estados de loading/empty/error. Retorne a árvore de componentes e props.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "Graphify & Risk Auditor",
      "Prompt": "Execute graphify query e graphify explain para mapear a teia de dependências do módulo. Identifique arquivos que importam os módulos afetados e o maior risco de regressão. Defina 2 cenários de teste críticos (SCAN -> INFER -> VERIFY -> FIX).",
      "Workspace": "inherit"
    }
  ]
}
```

*Nota: Enquanto os subagentes processam em paralelo, o Maestro aguarda o retorno dos 3 relatórios de reuso para realizar a síntese.*

---

## Phase 2: Pipeline SDD — Síntese e Especificação Física

Com as 3 análises recebidas, o Maestro elabora os arquivos oficiais:

**Step 3 — Escrever specs/<id>/proposal.md:**
Classifique cada arquivo explicitamente como `[MODIFY]`, `[EXTEND]` ou `[NEW]`. Justifique qualquer `[NEW]`:
```markdown
# Proposal: <nome da feature> (<id>)

## Problema
O que está quebrando ou faltando, e por quê isso importa.

## Solução Proposta (Foco em Reuso e Correção)
O que será feito. Quais arquivos existentes serão reaproveitados e alterados.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:** (ex: "Identificada a RPC `get_reconciliation_data` em `supabase/`, vamos reaproveitá-la alterando o retorno").
- **Componentes / Hooks Existentes Encontrados:** (ex: "O componente `OsVsRedeTable.tsx` já possui o grid visual, será adaptado").
- **Justificativa para Artefatos Novos (se houver):** Por que não foi possível reaproveitar o existente.

## Contratos de Dados & SQL (Supabase)
- Tabelas envolvidas e alterações de coluna (ALTER TABLE / ADD COLUMN)
- RLS Policies necessárias
- Definição exata de RPCs (parâmetros tipados, retorno)

## API & Componentes (Frontend)
- Componentes a modificar ou criar (com props e interfaces tipadas)
- Hooks afetados e mutações de estado

## Risco Principal e Mitigação
O maior ponto de falha previsto e o plano de mitigação.
```

**Step 4 — Escrever specs/<id>/design.md:**
```markdown
# Design: <nome da feature> (<id>)

## Arquitetura e Fluxo de Dados
Diagrama textual do fluxo ponta a ponta:
Componente (UI) → Hook → Supabase RPC/Action → Banco → Retorno

## Interfaces TypeScript
(Cole os tipos exatos em TypeScript que serão usados)

## Mutações em Arquivos Existentes [MODIFY]
- `src/components/...`: O que muda especificamente
- `src/hooks/...`: O que muda especificamente
- `supabase/...`: O que muda especificamente

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial] → [ação] → [resultado esperado]
- Cenário 2 (Edge case / Falha): [estado inicial] → [ação de erro] → [tratamento correto]
```

**Step 5 — Escrever specs/<id>/spec-plan.md (Checklist Atômico):**
Use ESTRITAMENTE o formato de save-state:
```markdown
# Spec Plan: <nome da feature> (<id>)

## Tasks

- [ ] [BACKEND] Alterar/criar RPC `<nome_rpc>` com verificação de tipo de dados
- [ ] [BACKEND] Aplicar migration/RLS no banco garantindo consistência
- [ ] [FRONTEND] Adaptar hook existente `use<Nome>` para suportar novos dados
- [ ] [FRONTEND] Atualizar componente `<Nome>` com loading, error e empty states (Dark UI)
- [ ] [TEST] Executar Cenário 1 e validar fluxo funcional
- [ ] [TEST] Executar Cenário 2 e realizar VLM Visual QA via Playwright
```

---

## Phase 3: Apresentação e Handoff

**Step 6 — Apresentar ao Usuário:**
Apresente o resumo da spec:
- Arquivos que serão modificados (destacando o reuso identificado pelos subagentes)
- O maior risco mitigado
- Checklist de tarefas do spec-plan.md

**Instrução final:**
*"Spec finalizada com sucesso. Quando estiver pronto para implementar, execute `/apply <id>` (ou `/vibe-apply <id>`)."*

<!-- OPENSPEC:END -->
