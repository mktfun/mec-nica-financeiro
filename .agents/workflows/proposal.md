---
description: Transformação de requisitos em Especificação Física (SDD) com Investigação Profunda Obrigatória, Bloqueio Anti-Duplicação Estrito, Reuso de Código/SQL/RPCs e Graphify.
---

<!-- OPENSPEC:START -->

**Guardrails de Proposal**
- **NÃO ESCREVA CÓDIGO DE IMPLEMENTAÇÃO** nesta fase em nenhuma circunstância. Seu único output são arquivos .md dentro de specs/<id>/.
- **PROIBIDO CRIAR O QUE JÁ EXISTE:** É terminantemente proibido criar novas tabelas, RPCs, componentes React ou hooks se já existir equivalente no projeto. Sua prioridade #1 é **REUTILIZAR E CORRIGIR/ESTENDER** o código existente.
- **RACIOCÍNIO EXPLÍCITO OBRIGATÓRIO:** Toda ação deve ser precedida por um pensamento estratégico analítico.
- **DEEP INVESTIGATION ANTES DE ESCREVER SPEC:** Execute varreduras completas no banco (Supabase), na árvore de componentes (React) e no grafo ontológico (Graphify).

---

## Phase 1: Deep Research, Varredura Ontológica & Bloqueio de Duplicações

**Step 1 — Carregar Memória Modular:**
Leia os arquivos relevantes em .agent/memory/:
- memory/supabase.md → regras de DB, RLS, schemas consolidados, RPCs existentes
- memory/ui.md → design system, componentes consolidados, Dark UI
- memory/ofx.md, memory/domain.md, etc. → regras de negócio do domínio

**Step 2 — Leitura Obrigatória de Skills do Domínio:**
Consulte as skills na íntegra para alinhar os padrões arquiteturais:
```
view_file C:/Users/admin/.gemini/config/skills/supabase/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/backend/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/frontend-design-pro/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/frontend-design-3/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/adaptive-reasoning/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/deciqai-bayesian-reasoning/SKILL.md
```

**Step 3 — Investigação do Banco de Dados (Supabase / PostgreSQL):**
Antes de sugerir qualquer tabela ou RPC:
1. Inspecione migrations/, supabase/ e schema_dump.sql (se existir).
2. Verifique se já existe tabela ou coluna que atenda ao requisito:
   ```sql
   SELECT table_name, column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
3. Verifique se já existe alguma RPC ou View parecida antes de criar uma nova:
   ```sql
   SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
   ```
> ⚠️ **REGRA DE OURO SQL:** Se a função ou tabela já existe com lógica parecida, faça `[MODIFY] ALTER TABLE` ou `[MODIFY] CREATE OR REPLACE FUNCTION` na existente. NUNCA crie tabelas/RPCs paralelas para fazer a mesma coisa.

**Step 4 — Investigação de Componentes & Hooks (Frontend / React):**
1. Faça grep_search e list_dir em src/components/ e src/hooks/.
2. Verifique se já existe componente visual (tabela, modal, card, filtro, wizard) que possa ser reutilizado com props ou estendido.
3. Verifique se já existe hook de consulta (ex: useTransactions, useConciliacao, useImportProcessor) antes de propor um hook novo.

**Step 5 — Consulta Obrigatória ao Grafo (Graphify):**
Se graphify-out/graph.json existir:
```bash
graphify query "<feature ou modulo central>"
graphify explain "<Modulo>"        # para mapear dependências e não quebrar imports
graphify path "<ComponenteA>" "<ComponenteB>"
```

**Step 6 — Validação de Features Globais (spec/global/features.md):**
Leia spec/global/features.md e spec/global/constraints.md.
- Verifique se a funcionalidade já foi catalogada em iterações anteriores.
- Garanta que a solução respeita Dark UI sólida (Zinc-950, #050711), sem glassmorphism, tipografia Inter/Outfit.

---

## Phase 2: Pipeline SDD — Elaboração da Especificação Física

**Step 7 — Escrever specs/<id>/proposal.md:**
Classifique cada arquivo explicitamente como `[MODIFY]`, `[EXTEND]` ou `[NEW]`. Justifique qualquer `[NEW]`:
```markdown
# Proposal: <nome da feature> (<id>)

## Problema
O que está quebrando ou faltando, e por quê isso importa.

## Solução Proposta (Foco em Reuso e Correção)
O que será feito. Quais arquivos existentes serão reaproveitados e alterados.

## Investigação e Análise de Reuso (Obrigatório)
- **Tabelas / RPCs Existentes Encontradas:** (ex: "Identificada a RPC `get_reconciliation_data` em `supabase/`, vamos reaproveitá-la alterando o retorno").
- **Componentes / Hooks Existentes Encontrados:** (ex: "O componente `OsVsRedeTable.tsx` já possui 80% do layout necessário, será adaptado").
- **Justificativa para Artefatos Novos (se houver):** Por que não foi possível reaproveitar o existente.

## Contratos de Dados & SQL
- Tabelas envolvidas e alterações de coluna (ALTER TABLE / ADD COLUMN)
- RLS Policies necessárias
- Definição exata de RPCs (parâmetros tipados, retorno)

## API & Componentes
- Componentes a modificar ou criar (com props e interfaces tipadas)
- Hooks afetados e mutações de estado

## Risco Principal e Mitigação (Bayesian Reasoning)
O maior ponto de falha previsto e o plano de mitigação.
```

**Step 8 — Escrever specs/<id>/design.md:**
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

**Step 9 — Escrever specs/<id>/spec-plan.md (Checklist Atômico):**
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

**Step 10 — Apresentar ao Usuário:**
Apresente o resumo da spec:
- Arquivos que serão modificados (destacando o reuso)
- O maior risco mitigado
- Checklist de tarefas do spec-plan.md

**Instrução final:**
*"Spec finalizada com sucesso. Quando estiver pronto para implementar, execute `/apply <id>` (ou `/vibe-apply <id>`)."*

<!-- OPENSPEC:END -->
