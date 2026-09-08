---
name: adaptive-reasoning
description: Força raciocínio adaptativo e iterativo antes de agir — previne loop de erros, garante coerência entre spec e implementação, e exige reavaliação quando algo quebra.
---

# Adaptive Reasoning — Guia Operacional para IA

## O que é e quando usar

Aplicar este modo de raciocínio **sempre que**:
- A task é complexa e envolve múltiplas dependências
- Algo deu errado e você está tentando corrigir
- Você está prestes a tomar uma decisão irreversível (DROP TABLE, push, deploy)
- O erro persiste depois da 1ª tentativa de correção

## Protocolo Obrigatório (4 Steps)

### Step 1 — Pause & Reflect (antes de agir)
Antes de executar qualquer ação não trivial, responda mentalmente:
- **O que exatamente estou tentando fazer?** (em 1 frase)
- **Qual é o efeito colateral mais provável?** (o que pode quebrar)
- **Já li todos os arquivos relevantes?** (spec, memória modular, schema)
- **Há alguma ambiguidade que pode me levar por um caminho errado?**

Se houver ambiguidade → PAUSE. Pergunte ao usuário. Não assuma.

### Step 2 — Hypothesis Before Action
Antes de executar um comando ou escrever código, declare a hipótese:
> *"Acredito que o problema é X porque Y. Vou tentar Z e espero que o resultado seja W."*

Se o resultado for diferente de W → reavalie a hipótese (não repita a mesma ação).

### Step 3 — Resultado Divergente = Nova Hipótese (não repetição)
Se a 1ª correção não resolver:
- ❌ Nunca repita a mesma abordagem esperando resultado diferente
- ✅ Leia o erro completo, identifique a causa raiz diferente da que assumiu
- ✅ Forme nova hipótese e declare antes de tentar novamente
- ✅ Máximo 3 tentativas. Na 3ª falha → git reset + notificar usuário

### Step 4 — Checklist de Coerência Final
Antes de declarar uma task concluída, verifique:
- [ ] O resultado bate com o que a `spec/<id>/design.md` especificava?
- [ ] Os cenários de verificação do `design.md` foram testados?
- [ ] Nenhum arquivo além do escopo foi modificado?
- [ ] O build passa sem erros de TypeScript?

## Aplicação no Contexto do Projeto

**No `/vibe-proposal`:**
- Use adaptive reasoning para questionar se a solução proposta é mesmo a mais simples
- Pergunte: "Existe algo já implementado que resolve 80% disso?"

**No `/vibe-apply`:**
- Use para identificar se um erro de build é de implementação ou de spec
- Se for de spec → pause, volte ao proposal, não tente contornar no código

**No Supabase:**
- Antes de qualquer migration: "Esta coluna/tabela realmente não existe?"
- Execute a query de inspeção (ver skill supabase Seção 2) antes de assumir

## Anti-Patterns a Evitar

| ❌ Comportamento | ✅ Correto |
|---|---|
| Tentar a mesma solução 3x esperando resultado diferente | Nova hipótese a cada tentativa |
| Assumir que a tabela não existe sem verificar | Sempre rodar SELECT de inspeção |
| Ignorar erros de TypeScript "pra depois" | Resolver no momento, nunca acumular |
| Continuar depois do 3º erro sem notificar | Reset + notificar usuário |
| Corrigir sintoma sem entender causa raiz | Ler o stack trace completo primeiro |
