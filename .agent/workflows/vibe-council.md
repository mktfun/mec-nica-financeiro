---
description: Validação universal de ideias (The True Council). Invoca um conselho deliberativo real multi-agente, orquestrado em rodadas de posição, refutação mútua e síntese final para stress-test de projetos.
---

<!-- VIBECOUNCIL:START -->

**Objetivo**
Garantir que QUALQUER ideia sobreviva a um escrutínio rigoroso através de uma deliberação estruturada real (não apenas opiniões isoladas, mas atrito de argumentos).

**Protocolo (Orquestração Mestre):**
1. O Agente Mestre deve invocar a skill nativa `council-debate`.
2. Para executar o Conselho, abra e leia o arquivo `skills/council-debate/SKILL.md`.
3. Siga ESTRITAMENTE as instruções do `SKILL.md` passo a passo:
   - Extração do tópico e criação do estado (`shared_memory.json`).
   - ROUND 1: Invocação inicial isolada dos 4 subagentes (`architect`, `engineer`, `analyst`, `contrarian`).
   - Merge na memória via utilitário Python (`merge_memory.py`).
   - ROUND 2: Segunda invocação dos subagentes forçando a leitura da memória e o **Rebuttal** obrigatório (citação e refutação das falas do Round 1).
   - Merge final na memória.
   - ROUND 3: Invocação do subagente `synthesizer` para arbitrar o veredito.
4. Entregue o veredito final ao usuário de forma estruturada.

**Guardrails:**
- NÃO crie os prompts da sua própria cabeça. Use as personas oficiais presentes em `skills/council-debate/agents/`.
- O Mestre apenas orquestra o pipeline usando `invoke_subagent` e roda o script de JSON. Ele não participa opinando no debate.

<!-- VIBECOUNCIL:END -->
