# Política: Regras de Ativação de Skills

## Quando uma skill deve ser ativada

Uma skill é ativada quando:
1. O usuário a menciona explicitamente
2. O workflow invocado (`/vibe-proposal`, `/route-task`, etc.) recomenda o bundle
3. O tipo de tarefa corresponde a um `activation_trigger` no `skill-manifest.yaml`

## Regras de supressão

Uma skill **NÃO deve ser ativada** quando:
- A tarefa não corresponde ao escopo descrito na skill
- O contexto já está pesado (ver `context-budget.md`)
- Existe um `suppression_trigger` correspondente no manifesto

## Prioridade de ativação

```
1. Skills do bundle explicitamente solicitado pelo usuário
2. Skills recomendadas pelo workflow ativo (/vibe-apply, /route-task)
3. Skills com activation_trigger correspondente à tarefa
4. Skills de suporte (lint-and-validate ao final de qualquer apply)
```

## Regra anti-acúmulo
Se a sessão tem >5 skills ativas:
1. Rodar `/skill-audit` para listar skills ativas
2. Desativar as que não correspondem à fase atual da tarefa
3. Manter apenas o bundle mínimo necessário

## Regra de transição de fase

| De → Para | Desativar | Ativar |
|-----------|-----------|--------|
| planning → implementation | brainstorming, architecture-review | lint-and-validate, supabase-best-practices |
| implementation → ship | frontend-design, react-components | create-pr, code-review |
| any → debugging | tudo exceto debugging-strategies | debugging-strategies |
| debugging → implementation | debugging-strategies | bundle da tarefa original |

## Skills sempre seguras de manter ativas
- `lint-and-validate` — leve e sempre útil
- `debugging-strategies` — leve, ativa por padrão em erros

## Skills que requerem decisão consciente para ativar
- `test-driven-development` — alto peso, muda o fluxo de trabalho completamente
- `security-auditor` — mudar o foco para segurança pode divergir da tarefa
- `architecture-review` — pode induzir paralisia de análise se ativada sem necessidade
