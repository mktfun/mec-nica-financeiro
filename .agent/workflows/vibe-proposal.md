---
description: Transformação de requisitos em uma Especificação Guiada por Cenário (SDD) estrita, garantindo reuso de componentes, planejamento rigoroso e continuidade de memória.
---

<!-- OPENSPEC:START -->

**Guardrails**

- **NÃO ESCREVA CÓDIGO** nesta fase em nenhuma circunstância. Seu objetivo é estruturar o projeto logicamente.
- Você DEVE seguir estritamente o pipeline de 4 fases do SDD (Specification-Driven Development).
- Nenhuma feature pode ser proposta sem antes mapear componentes existentes em `spec/global/features.md`.

**Skills a utilizar**
- **obrigatório**: invoque a skill `sdd-global-init` para assegurar que a fundação global (`spec/global`) existe.
- **obrigatório**: invoque a skill `obsidian` para ler o contexto passado e integrar com as especificações.
- **obrigatório**: invoque `adaptive-reasoning` e `deciqai-bayesian-reasoning` na fase de Análise para mensurar riscos.
- **obrigatório**: certifique-se de que o fluxo respeitará as bases do `sdd-dev-workflow`, `sdd-executing-plans`, e `sdd`.

**Steps (Pipeline SDD Estrito)**

**Phase 1: Global State & Architecture Initialization (`sdd-global-init`)**
1. Verifique se o diretório `spec/global/` existe. Se não, determine a criação do diretório global (`overview.md`, `architecture.md`, `features.md`, `constraints.md`).
2. **Reuso Obrigatório:** Leia `spec/global/features.md`. Mapeie a nova requisição. Se houver componentes ou estruturas semelhantes já documentadas, bloqueie a criação de novos componentes e determine o uso do existente.

**Phase 2: The Deterministic 7-Step Pipeline (`sdd-dev-workflow`)**
3. **Constitution Review:** Valide o pedido do usuário contra as regras rígidas em `spec/global/constraints.md` ou na constituição do projeto.
4. **Specify:** Defina os limites da API, contratos de dados, mutações de estado e arquitetura da interface (`specs/<id>/proposal.md` e `specs/<id>/design.md`).
5. **Clarify:** O sistema deve PAUSAR e solicitar esclarecimentos se houver ambiguidades nos requisitos ou fluxo de dados (Zero Suposições).
6. **Plan:** Modele a arquitetura técnica exata da funcionalidade.
7. **Tasks:** Quebre o plano em tarefas atômicas e sequenciais.
8. **Analyze:** Utilize `bayesian-reasoning` e `adaptive-reasoning` para fazer um "dry-run" mental da lógica para garantir que não haja efeitos colaterais.
9. **Implement:** A implementação do código final só é destravada via `/vibe-apply` após os itens acima estarem 100% corretos e documentados.

**Phase 3: Automated Plan Execution & Memory Continuity (`sdd-executing-plans`)**
10. Todo o resultado da fase "Tasks" (passo 7) deve ser documentado obrigatoriamente num checklist rígido em `specs/<id>/spec-plan.md`.
11. Este `spec-plan.md` guiará a próxima fase com checkpoints do tipo `- [ ]`. Ele será a âncora de continuidade de estado (Save-State).

**Phase 4: Scenario-Driven Logic Verification (`sdd`)**
12. Prepare na documentação de design os cenários que deverão ser testados no ciclo `SCAN -> INFER -> VERIFY -> FIX`. Foco na precisão lógica (ex: transições de estado, tokens UI), não apenas em evitar crashs sistêmicos.

13. Valide a coerência do plano final e peça a aprovação do usuário explícita antes que o `/vibe-apply` comece a escrever código e alterar o `spec-plan.md`.

<!-- OPENSPEC:END -->
