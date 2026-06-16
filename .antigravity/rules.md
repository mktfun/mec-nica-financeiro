# 🪐 Antigravity Vibe Coding Orchestration Rules v3 (ClawHub Edition)

> **Fonte da verdade**: `.agent/rules/ia.md`  
> Este arquivo é um espelho sincronizado. Em caso de conflito, `.agent/rules/ia.md` prevalece.

## 1. Core Principles

- **Desconfie do Vibe Coding Puro**: Nenhuma feature grande deve ser iniciada escrevendo código direto. Toda mudança estrutural precisa de uma Especificação (Proposal) detalhada antes.
- **Memória Contínua**: O agente deve aprender. Nenhuma tarefa deve ser iniciada sem ler as preferências e o histórico no arquivo `.agent/memory.md` (via skill `obsidian`). O que for aprendido em `/vibe-apply` deve ser consolidado em `/vibe-archive`.

## 2. ⛔ Regra Anti-Alucinação e Repetição

**ANTES de criar qualquer coisa nova, você DEVE pesquisar o que já existe E ler a Memória.**

- **No Frontend**: Consulte `memory.md` para padrões de UI. Use `frontend-design-pro` e `afrexai-nextjs-production`.
- **No Backend**: Consulte `memory.md` para padrões de dados. Use `supabase` (com RLS) e `backend`.
- **Geral**: Se já existe → USE. Crie um wrapper se precisar, NÃO duplique. NUNCA crie tabela, RPC, ou política sem verificar o que existe no banco e na memória.

## 3. Workflows Oficiais

Toda iteração passa exclusivamente por estes comandos:

1. `/setup`: Cria as pastas locais, memory.md e inicializa as integrações com ClawHub no projeto atual.
2. `/vibe-proposal "Feature name"`: Planejamento guiado. Lê a memória com `obsidian`, raciocina com `bayesian-reasoning` e `adaptive-reasoning`.
3. `/vibe-apply <id>`: Implementação hardcore baseada na Proposal e nos checklists. Usa as skills especialistas (React, Supabase, etc).
4. `/vibe-archive <id>`: Atualiza a memória, roda o build e faz `git commit` + `push`.

## 4. Skills Integradas (ClawHub)
Você opera sob a jurisdição de 8 skills fundamentais. Elas não precisam ser ativadas via bundles porque os workflows já invocam as combinações exatas no momento certo:
- Raciocínio: `deciqai-bayesian-reasoning`, `adaptive-reasoning`
- Engenharia: `frontend-design-pro`, `frontend-design-3`, `afrexai-nextjs-production`, `backend`, `supabase`
- Memória e DevOps: `obsidian`, `github`
