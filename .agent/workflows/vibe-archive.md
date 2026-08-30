---
description: Conclui o fluxo da Spec — build gate, memória modular por categoria, atualização do grafo, arquivamento da spec para reutilização futura e commit controlado.
---

<!-- VIBEARCHIVE:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview` ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore.

**Objetivo**
Garantir que a entrega não quebrou o build, consolidar o conhecimento gerado em memória modular por categoria, atualizar o grafo de dependências e fazer o commit. A spec vai para o arquivo histórico e fica disponível para reutilização em proposals futuras similares.

---

## Step 1 — Quality Gate (Build)

```bash
cmd.exe /c "npm run build"
```

- Se o build **falhar**: NÃO avance. Corrija o erro ou volte ao `/vibe-apply` (acione o auto-healing se ainda tiver tentativas)
- Se o build **passar**: confirme que não houve erros de TypeScript nem warnings críticos

---

## Step 2 — Atualização da Memória Modular (OBRIGATÓRIO — nunca pule)

Antes de escrever na memória, leia o protocolo:
```
view_file C:/Users/User/.gemini/config/C:/Users/User/.gemini/config/skills/obsidian/SKILL.md    ← formato obrigatório de entrada, regras de qualidade
```

Identifique qual categoria de conhecimento foi gerada nesta iteração e escreva **no arquivo correto** em `.agent/memory/`:

| Tipo de Conhecimento | Arquivo |
|---|---|
| Parsing OFX, XLSX, CSV, arquivos de importação | `memory/ofx.md` |
| Supabase, RLS, RPCs, schemas, políticas | `memory/supabase.md` |
| Componentes React, padrões de UI, Tailwind | `memory/ui.md` |
| Autenticação, sessão, tokens, permissões | `memory/auth.md` |
| Deploy, VPS, SSH, DNS, Cloudflare | `memory/infra.md` |
| Regras de negócio do domínio (ex: conciliação, maquininha) | `memory/domain.md` |

**Formato obrigatório para cada entrada:**
```markdown
## [YYYY-MM-DD] — [Feature ID: <id>]

**Contexto:** O que foi implementado e qual problema resolvia.

**Regra aprendida:** A lógica crítica que não pode ser esquecida.
Ex: "FITIDs de OFX devem ser deduplicados por chave composta antes do INSERT para evitar FK error em conciliation_matches."

**Risco identificado:** O que quase quebrou ou que pode quebrar em mudanças futuras.

**Não fazer:** O que explicitamente não deve ser tentado (anti-pattern identificado).
```

**Regras:**
- **NUNCA** jogue conhecimento genérico no `memory.md` geral — memória granular é memória utilizável
- Se o arquivo da categoria não existir, crie-o
- Uma regra bem escrita vale mais que 10 parágrafos vagos

---

## Step 3 — /learn: Elevação para a Constituição (`ia.md`)

Apenas regras **universais** sobem para `ia.md`. O critério é claro:

| Tipo de Conhecimento | Onde vai |
|---|---|
| Regra específica do projeto (ex: lógica OFX desta base) | `memory/<categoria>.md` |
| Anti-pattern universal (ex: nunca usar `push --force`) | `ia.md` (Constituição) |
| Comportamento que a IA não deve repetir em **nenhum** projeto | `ia.md` (Constituição) |
| Configuração do ambiente (ex: Graphify é Python) | `ia.md` (Constituição) |

**Processo obrigatório:**

1. Revise o que aconteceu durante o `/vibe-apply` desta iteração
2. Pergunte: *"Algum comportamento da IA causou erro que não deveria acontecer em nenhum projeto futuro?"*
3. Se sim, proponha a regra ao usuário com este formato ANTES de escrever no arquivo:

```
🧠 /learn proposta:

**Regra:** [Nome curto da regra]
**Comportamento proibido:** [O que a IA fez de errado]
**Guardrail:** [O que a IA deve fazer sempre]
**Por quê universal:** [Por que isso vale em qualquer projeto]
```

4. Se o usuário aprovar (ou se for óbvio que deve ser universal), injete a regra no arquivo `ia.md` sob a seção mais adequada:
   - Anti-alucinação → Seção `## 2`
   - CLI / Ambiente → Seção `## 1. Core Principles`
   - Regra de raciocínio / workflow → Crie uma nova seção enumerada
5. Se não houver aprendizado universal nesta iteração, registre explicitamente: *"Nenhum guardrail universal identificado nesta iteração."* e continue.

**Não eleve para `ia.md`:**
- Regras específicas de uma tabela, componente ou módulo do projeto
- Preferências estéticas do usuário (ficam em `memory/ui.md`)
- Detalhes de implementação que só fazem sentido neste contexto

---

## Step 4 — Atualização do Grafo (Graphify)

```bash
graphify update
```

- Se falhar com "command not found": instale com `uv tool install graphifyy` (Python, dois Y's no pacote, um Y no comando — **nunca `npx @baml/graphify`**)
- Confirme que `graphify-out/graph.json` foi atualizado com os arquivos modificados nesta iteração

---

## Step 5 — Atualização de `spec/global/features.md`

Adicione os artefatos novos criados nesta iteração:
- Componentes React novos (nome + localização)
- Hooks criados
- Tabelas Supabase novas ou modificadas
- RPCs/Edge Functions
- Regras de negócio implementadas

Isso alimenta o **bloqueio anti-duplicação** do próximo `/vibe-proposal`. Sem isso, a IA vai criar o mesmo componente novamente na próxima semana.

---

## Step 6 — Arquivamento da Spec

```bash
# Mova a pasta de spec ativa para o arquivo histórico
Move-Item "specs/<id>" "specs/archive/<id>"
```

- Specs no `archive/` são reutilizáveis: em proposals futuras similares, a IA deve consultar o histórico antes de criar do zero
- Se houver `spec/global/` para atualizar, faça antes de mover

---

## Step 7 — Commit & Push Controlado

Antes do commit, leia as regras de git:
```
view_file C:/Users/User/.gemini/config/C:/Users/User/.gemini/config/skills/github/SKILL.md    ← convenção de commits, fallback Windows, checklist pré-commit
```

```bash
git add .
git commit -m "feat(<id>): <resumo do que foi implementado>"
git push origin main
```

- Inclua no `git add .`: arquivos modificados, `graphify-out/`, `specs/archive/`, `.agent/memory/`, `.agent/rules/ia.md` (se o /learn gerou alguma regra nova)
- **Fallback Windows:** Se `git` não estiver no PATH, use `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`
- **JAMAIS use `push --force`**
- Se ocorrer "Author identity unknown": `git config user.email "ai@clawhub.com"` e `git config user.name "ClawHub Agent"` antes do commit

---

## Step 8 — Notificação Final

Avise o usuário:
- ✅ Build passou
- 📝 O que foi registrado na memória e em qual categoria
- 🧠 Regras elevadas para `ia.md` (ou "nenhum guardrail universal nesta iteração")
- 📦 Spec arquivada em `specs/archive/<id>/`
- 🔗 Hash do commit

<!-- VIBEARCHIVE:END -->
