---
name: deciqai-bayesian-reasoning
description: Raciocínio probabilístico para tomada de decisão sob incerteza — avalia impacto, riscos e alternativas antes de propor ou implementar mudanças estruturais.
---

# Bayesian Reasoning — Guia Operacional para IA

## O que é e quando usar

Aplicar raciocínio bayesiano **sempre que**:
- Você precisa decidir entre 2+ abordagens técnicas
- O impacto de uma ação é incerto ou potencialmente irreversível
- Você está no `/vibe-proposal` avaliando riscos
- Um erro persistente pode ter múltiplas causas possíveis

## Framework de Decisão (3 Perguntas)

Antes de qualquer decisão técnica significativa, responda:

### 1. Qual é a probabilidade de sucesso de cada abordagem?
Seja honesto. Atribua probabilidades relativas:
- Abordagem A: 70% → por quê? Quais evidências?
- Abordagem B: 20% → por quê? Quais riscos?
- Abordagem C: 10% → descarte se muito improvável

### 2. Qual é o custo de estar errado?
- **Custo baixo** (reversível, isolado): execute, monitore, ajuste
- **Custo médio** (afeta outras partes): documente na spec antes de executar
- **Custo alto** (irreversível, afeta dados de produção): PAUSE, peça confirmação do usuário

### 3. Qual informação adicional reduziria a incerteza?
Antes de executar: existe um comando, query ou leitura de arquivo que me daria mais certeza?
- Se sim → execute essa verificação primeiro
- Se não → declare a incerteza explicitamente e siga com a mais provável

## Aplicação no `/vibe-proposal`

Ao propor uma solução, use o seguinte formato de avaliação de risco:

```
Risco Principal: [o que pode dar errado]
Probabilidade: [baixa / média / alta]
Impacto: [reversível / parcialmente reversível / irreversível]
Mitigação: [o que fazemos se acontecer]
```

## Aplicação no `/vibe-apply`

Ao encontrar um bug ou erro:
1. Liste as hipóteses possíveis (ex: "pode ser RLS, pode ser tipo incorreto, pode ser FK violada")
2. Ordene por probabilidade com base nas evidências disponíveis
3. Teste a mais provável primeiro
4. Se falhar → descarte e teste a segunda

## Aplicação no Supabase

Antes de criar uma migration, avalie:
- **P(tabela já existe) = ?** → Inspecione com `db dump` antes
- **P(RLS bloqueia a operação) = ?** → Verifique as policies existentes
- **P(FK violação) = ?** → Verifique se os dados do INSERT satisfazem as constraints

## Anti-Patterns

| ❌ Viés Cognitivo | Manifestação | Correção |
|---|---|---|
| Anchoring | Fixar na primeira solução que veio à mente | Sempre avaliar ao menos 2 alternativas |
| Confirmation Bias | Interpretar erros como confirmação da hipótese original | Atualizar a hipótese com cada novo dado |
| Overconfidence | "Tenho certeza que é isso" sem verificar | Sempre rodar a query/comando de verificação |
| Sunk Cost | Continuar abordagem errada pq já "investiu" nela | Na 3ª falha, resetar e reconsiderar do zero |
