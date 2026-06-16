---
description: Transformação de requisitos em uma Especificação Guiada por Cenário (SDD) estrita, garantindo Deep Research obrigatória, planejamento rigoroso com checklist de estado, e continuidade de memória.
---

<!-- OPENSPEC:START -->

**Guardrails**

- **RACIOCÍNIO EXPLÍCITO:** Nenhuma ação inicia sem um Thought Block (<think>).
- **DEEP RESEARCH ANTES DE AGIR:** Antes de propor algo, invoque ferramentas de listagem e busca (`list_dir`, `grep_search`) para varrer o projeto inteiro. ZERO SUPOSIÇÕES sobre os arquivos que não estão abertos.
- **NÃO ESCREVA CÓDIGO** nesta fase em nenhuma circunstância. Seu objetivo é estruturar o projeto logicamente em arquivos `.md`.

**Steps (Pipeline SDD Estrito - IA Sênior)**

**Phase 1: Deep Research & Global Initialization**
1. **Varredura Paralela:** Use ferramentas simultâneas (`grep_search` + `list_dir`) para auditar a codebase baseada no pedido do usuário e descobrir artefatos ocultos.
2. Invoque `sdd-global-init` para criar/validar `spec/global/` (`overview.md`, `architecture.md`, `features.md`, `constraints.md`).
3. **Reuso Absoluto:** Mapeie o que já existe em `features.md` ou na codebase. Bloqueie duplicações.

**Phase 2: The Deterministic Pipeline (`sdd-dev-workflow`)**
4. **Constitution Review:** Valide o pedido contra `spec/global/constraints.md` e as regras globais (`.agent/rules/ia.md`).
5. **Specify:** Limites da API, contratos e mutações (`specs/<id>/proposal.md` e `specs/<id>/design.md`).
6. **Clarify (Zero Ambiguity):** PAUSE e solicite esclarecimentos se houver risco (ex: limites de Copyright do Claude Fable 5, fallbacks Windows).
7. **Plan & Tasks:** Desenhe a arquitetura técnica exata e quebre-a em atômicas.

**Phase 3: Automated Plan Execution & State Save (`sdd-executing-plans`)**
8. Todo o resultado da fase "Tasks" DEVE ser documentado num checklist estrito em `specs/<id>/spec-plan.md`.
9. O arquivo usará transições de estado estritas: `- [ ] Pending`, `- [/] In Progress`, `- [x] Completed`. Isso âncora a Memória Contínua.
10. Defina a integração com MCPs (`search_mcp_registry`) no plano se necessário, mas não execute mock interfaces.
11. Se as tasks envolverem artefatos dinâmicos de Frontend, aponte o uso da API `window.storage` em vez de `localStorage`.

**Phase 4: Verification & Sign-off (`sdd`)**
12. Design de cenários para `SCAN -> INFER -> VERIFY -> FIX`.
13. Submeta o plano (`spec-plan.md`) para aprovação do usuário explícita antes que o `/vibe-apply` modifique a primeira linha de código real.

<!-- OPENSPEC:END -->
