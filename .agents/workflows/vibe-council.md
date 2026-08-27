---
description: Convocação do Grande Conselho Multi-Agente — Debate simultâneo entre 4 personas com refutação cruzada e síntese de decisão técnica.
---

<!-- VIBECOUNCIL:START -->

**Objetivo**
Deliberar sobre decisões arquiteturais complexas, refatorações críticas ou impasses de produto através de um debate real entre subagentes antagônicos.

---

## Step 1 — Disparo do Conselho de Especialistas (invoke_subagent)

O Maestro convoca 4 subagentes concorrentes via invoke_subagent:

```json
{
  "Subagents": [
    {
      "TypeName": "research",
      "Role": "The Pragmatist (Custo x Benefício)",
      "Prompt": "Analise o tema proposto com foco estrito em simplicidade, tempo de entrega, facilidade de manutenção e menor quantidade de código. Identifique a solução mais elegante e rápida.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "The Skeptic (Caçador de Falhas)",
      "Prompt": "Analise o tema procurando todas as brechas de performance, gargalos de banco, problemas de concorrência e riscos de segurança. Aponte onde isso vai quebrar em produção.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "The Architect (Escalabilidade & Padrões)",
      "Prompt": "Analise o tema sob a ótica de padrões modernos (Supabase, Next.js, Type-safety, DRY). Garanta que a arquitetura não crie débitos técnicos futuros.",
      "Workspace": "inherit"
    },
    {
      "TypeName": "research",
      "Role": "The Devil's Advocate (Contraponto Radical)",
      "Prompt": "Tente destruir a premissa inicial do usuário. Apresente uma alternativa completamente diferente que questione se realmente precisamos implementar isso dessa forma.",
      "Workspace": "inherit"
    }
  ]
}
```

---

## Step 2 — Rodada de Refutação Cruzada

O Maestro recebe os 4 posicionamentos e solicita uma réplica rápida entre as visões mais conflitantes para expor contradições.

---

## Step 3 — Síntese & Registro da Decisão (decision.md)

O Maestro consolida o veredito e escreve em .council/<tema>-decision.md:
```markdown
# Decisão do Conselho: <Tema>

## 1. O Impasse / Pergunta Central
## 2. Visões do Conselho (Resumo dos Argumentos)
## 3. A Decisão Vencedora (Consenso Arquitetural)
## 4. Plano de Ação Recomendado (Próximos Passos no /proposal)
## 5. Riscos Aceitos e Mitigações
```

Apresente o resultado ao usuário de forma executiva e direta.

<!-- VIBECOUNCIL:END -->
