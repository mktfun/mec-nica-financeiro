---
description: Validação universal de ideias (Stress-Test). Invoca o Council of Elrond nativo com 8 personas para debater, criticar e validar ideias de negócios, vida pessoal, estratégias criativas ou código.
---

<!-- VIBECOUNCIL:START -->

**Objetivo**
Garantir que QUALQUER ideia (não apenas de software) sobreviva a um escrutínio massivo antes de ser executada. O workflow usa o Agente Mestre para "spawnar" simultaneamente 8 subagentes concorrentes via `invoke_subagent`.

**Skills a utilizar**
- **Obrigatório:** Leia o `.agent/skills/antigravity-council/SKILL.md` para entender como montar os prompts universais e as personas.

**Steps**

1. **Invocação Massiva (The Assembly):**
   - Faça uma chamada única da ferramenta `invoke_subagent` com um array de 8 instâncias. 
   - Insira no campo `Prompt` e `Role` as instruções exatas da skill para cada um (Skeptic, Optimist, Pessimist, Pragmatist, Innovator, Devils Advocate, Analyst, Mediator).
   - O `{topico}` a ser substituído nos prompts é a ideia/dúvida/decisão do usuário.

2. **Wait (Standby):**
   - Pare de usar ferramentas. Finalize o seu turno e aguarde a resposta de todos os 8 subagentes. Eles chegarão no seu inbox de mensagens. 
   - *Nota: NÃO faça loop de polling.*

3. **Synthesis (O Veredito do Moderador):**
   - Quando receber o retorno dos 8 subagentes, leia cuidadosamente todas as perspectivas.
   - Crie o artefato `council-report.md` com a seguinte estrutura estrita:
     - **Consensus:** A síntese geral da discussão adaptada ao contexto da ideia.
     - **Agreement Level:** Porcentagem estimada (0 a 100%) de viabilidade e concordância.
     - **Key Agreements:** Em que pontos centrais os agentes concordaram fortemente?
     - **Blockers / Red Flags:** Quais foram as objeções intransponíveis (NO-GOs)?
     - **Verdict:** Escolha um único portão (Gate): `GO` (Ideia validada), `NO-GO` (Descarte a ideia), ou `NEEDS-HUMAN` (Necessita refinamento).

4. **Transição Livre:**
   - O workflow termina com o veredito. O usuário fica livre para tomar sua decisão ou pedir para transformá-la em um `/vibe-proposal` (caso seja um projeto de software).

<!-- VIBECOUNCIL:END -->
