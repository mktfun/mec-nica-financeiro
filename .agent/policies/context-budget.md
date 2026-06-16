# Política: Context Budget

## Princípio
O contexto cognitivo do agente é um recurso finito. Carregar muitas skills simultaneamente degrada a qualidade das respostas e aumenta o risco de contradições entre regras.

## Regras de orçamento

### Sempre ativo (imutável)
Estes arquivos são carregados automaticamente e não podem ser removidos:
- `.agent/rules/ia.md` — regras de orquestração (fonte da verdade)
- `.antigravity/rules.md` — espelho das regras

**Peso estimado**: ~5KB total. Aceitável.

### Skills simultâneas: máximo 5
Nunca ativar mais de 5 skills ao mesmo tempo.

| Situação | Skills recomendadas |
|----------|---------------------|
| Tarefa simples/bug fix | 1-2 skills |
| Feature média | 3-4 skills (bundle core) |
| Feature grande | 4-5 skills (bundle fullstack-dev parcial) |
| Crise de produção | 1 skill: debugging-strategies |

### Skills pesadas (usar com critério)
Estas skills têm conteúdo extenso e devem ser ativadas apenas quando explicitamente necessárias:

| Skill | Tamanho | Quando justificar |
|-------|---------|-------------------|
| `test-driven-development` | ~10KB | Só quando há suíte de testes a escrever |
| `brainstorming` | ~5KB | Sempre que for planejar algo novo |
| `architecture-review` | ~4KB | Decisões estruturais apenas |

### Skills leves (podem ser sempre ativas)
| Skill | Tamanho |
|-------|---------|
| `debugging-strategies` | ~2KB |
| `lint-and-validate` | ~1KB |
| `create-pr` | ~2KB |

## Sinais de contexto sobrecarregado
- Agente esquece regras do ia.md no meio da tarefa
- Respostas contraditórias entre mensagens
- Agente ignora guardrails da skill ativa

**Ação corretiva**: usar `/skill-audit` para identificar e desativar skills desnecessárias.

## Estratégia de ativação seletiva
```
Pergunta: "Qual é o core job desta tarefa?"
→ Planejamento: planning-mode (sem skills de debug/ship)
→ Implementação: fullstack-dev parcial
→ UI visual: stitch-visual (sem skills de backend)
→ Debugging: apenas debugging-strategies
→ Commit: ship-mode (design/debug desativados)
```
