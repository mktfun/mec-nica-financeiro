---
name: council-debate
description: Dispara um conselho deliberativo real de múltiplos agentes para avaliar um tópico do usuário. Usa rodadas de posições, refutações e memória compartilhada antes da síntese final.
---

# Council Debate

**Objetivo:**
Orquestrar uma deliberação multiagente real (com memória de estado e turnos explícitos), garantindo que os agentes reajam aos argumentos uns dos outros antes de formar o consenso.

**Instruções para o Agente Mestre (Você):**

1. Extraia o `{topico}` a ser avaliado a partir da entrada do usuário.
2. Leia o arquivo `references/debate-rules.md` para entender as regras duras da deliberação.
3. Crie um arquivo `.council/shared_memory.json` na raiz do projeto contendo o tópico e os critérios.
4. **ROUND 1 (Positions):**
   - Use sua ferramenta `invoke_subagent` chamando os 4 agentes especialistas simultaneamente: `architect`, `engineer`, `analyst`, `contrarian`. 
   - Defina o prompt de cada um passando o `{topico}` e o conteúdo do seu respectivo arquivo `.md` presente em `agents/`.
   - Aguarde as 4 respostas e salve os textos recebidos em uma pasta temporária `.council/round_1/`.
   - Execute o utilitário Python `python skills/council-debate/scripts/merge_memory.py` para injetar os resultados no `shared_memory.json`.
5. **ROUND 2 (Rebuttal):**
   - Invoque **novamente** os mesmos 4 agentes via `invoke_subagent`, mas desta vez o prompt deve incluir obrigatoriamente a leitura do arquivo `.council/shared_memory.json`.
   - Exija que eles obedeçam à **Regra de Refutação** (citar no mínimo 2 claims de outros agentes).
   - Ao receber o retorno, salve em `.council/round_2/` e rode o script Python novamente.
6. **ROUND 3 (Synthesis):**
   - Finalmente, invoque o subagente `synthesizer` (com base em `agents/synthesizer.md`), passando o `shared_memory.json` final. O Synthesizer definirá os consensos, os impasses e a avaliação final (GO, NO-GO, NEEDS-HUMAN).
7. Transcreva a decisão do Synthesizer para o usuário.
