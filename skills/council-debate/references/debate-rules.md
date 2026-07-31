# Regras do Debate Multi-Agente (The True Council)

## 1. Isolamento Inicial (Round 1)
No primeiro round, você expressará sua análise crua, focada exclusivamente na sua perspectiva (Persona). Não se preocupe em adivinhar o que os outros vão dizer. Seja cirúrgico, estruturado e fundamente cada ponto.

## 2. Obrigação de Refutação (Round 2)
Esta é a regra mais crítica: você **NÃO PODE** simplesmente repetir seu texto inicial.
Você é obrigado a reagir aos argumentos gerados no Round 1 presentes na `shared_memory.json`.
1. **Citação Exata:** Você deve abrir seu texto citando nominalmente pelo menos **DOIS** argumentos (claims) levantados por agentes de perfis opostos ao seu.
2. **Postura Específica:** Para cada claim citado, declare explicitamente se você:
   - **(AGREE)** Concorda.
   - **(REFINE)** Concorda parcialmente, mas adiciona um ajuste/condição.
   - **(REBUT)** Refuta, explicando logicamente por que a ideia falha na vida real.
3. **Revisão de Posição:** Atualize a sua recomendação final e o seu nível de confiança (0.0 a 1.0) com base no atrito dos argumentos. Você deve declarar no final se mudou de opinião ou manteve a postura original.
