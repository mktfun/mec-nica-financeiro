---
description: Conclui o fluxo da Spec — build gate, escrita obrigatória na memória Obsidian por categoria, atualização do grafo, elevação de regras universais para ia.md, arquivamento da spec e commit controlado.
---

<!-- VIBEARCHIVE:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview` ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore.

**Objetivo**
Garantir que a entrega não quebrou o build, consolidar o conhecimento gerado em memória Obsidian por categoria, atualizar o grafo de dependências e fazer o commit. A spec vai para o arquivo histórico e fica disponível para reutilização em proposals futuras similares.

---

## Step 1 — Quality Gate (Build)

```bash
cmd.exe /c "npm run build"
```

- Se o build **falhar**: NÃO avance. Corrija ou acione `/vibe-debug <id>`
- Se o build **passar**: confirme que não houve erros de TypeScript nem warnings críticos

---

## Step 2 — Escrita na Memória Obsidian (OBRIGATÓRIO — nunca pule)

Leia o protocolo de memória antes de escrever:
```
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md    ← formato obrigatório de entrada, regras de qualidade
```

Identifique **qual conhecimento foi gerado** nesta iteração e escreva no arquivo correto:

| Tipo de Conhecimento | Arquivo |
|---|---|
| Componentes React, padrões de UI, Tailwind | `memory/ui.md` |
| Supabase, RLS, RPCs, schemas, políticas | `memory/supabase.md` |
| Autenticação, sessão, tokens, permissões | `memory/auth.md` |
| Deploy, VPS, SSH, DNS, Cloudflare | `memory/infra.md` |
| Regras de negócio do domínio | `memory/domain.md` |
| Categoria específica do projeto | `memory/<categoria>.md` |

**Formato obrigatório para cada entrada:**

```markdown
## [YYYY-MM-DD] — [Feature ID: <id>]

**Contexto:** O que foi implementado e qual problema resolvia.

**Regra aprendida:** A lógica crítica que não pode ser esquecida.
Ex: "FITIDs de OFX devem ser deduplicados antes do INSERT via chave composta (account_id, fitid)"

**Risco identificado:** O que quase quebrou ou pode quebrar em mudanças futuras.

**Não fazer:** Anti-pattern identificado — o que explicitamente não deve ser tentado.
```

**Regras de qualidade:**
- **NUNCA** jogue conhecimento genérico no `memory.md` geral — memória granular é memória utilizável
- Se o arquivo da categoria não existir, crie-o com o cabeçalho padrão (ver `/setup`)
- Uma regra bem escrita vale mais que 10 parágrafos vagos
- **NÃO é opcional.** Se nenhum conhecimento foi gerado, escreva: *"[DATA] — [ID]: Feature implementada sem novos padrões ou anti-patterns identificados."*

---

## Step 3 — /learn: Elevação para a Constituição (`ia.md`)

Apenas regras **universais** sobem para `ia.md`. O critério:

| Tipo de Conhecimento | Onde vai |
|---|---|
| Regra específica do projeto (ex: lógica OFX desta base) | `memory/<categoria>.md` |
| Anti-pattern universal (ex: nunca usar `push --force`) | `ia.md` (Constituição) |
| Comportamento que a IA não deve repetir em **nenhum** projeto | `ia.md` (Constituição) |
| Configuração do ambiente (ex: Graphify é Python) | `ia.md` (Constituição) |

**Processo:**

1. Revise o que aconteceu durante o `/vibe-apply` desta iteração
2. Pergunte: *"Algum comportamento da IA causou erro que não deveria acontecer em nenhum projeto futuro?"*
3. Se sim, proponha ao usuário antes de escrever:

```
🧠 /learn proposta:

**Regra:** [Nome curto]
**Comportamento proibido:** [O que a IA fez de errado]
**Guardrail:** [O que a IA deve fazer sempre]
**Por quê universal:** [Por que vale em qualquer projeto]
```

4. Se aprovado → injete em `ia.md` na seção adequada
5. Se não houver aprendizado universal: registre explicitamente *"Nenhum guardrail universal identificado nesta iteração."*

---

## Step 4 — Atualização do Grafo (Graphify)

> Execute **após** todas as mudanças de arquivo — o grafo deve refletir o estado final.

```bash
graphify update
```

- Se falhar com "command not found": `uv tool install graphifyy` (dois Y no pacote, um Y no comando)
- Confirme que `graphify-out/graph.json` foi atualizado com os arquivos modificados nesta iteração

---

## Step 5 — Atualização de `spec/global/features.md`

Adicione os artefatos novos criados nesta iteração:
- Componentes React novos (nome + localização)
- Hooks criados
- Tabelas Supabase novas ou modificadas
- RPCs/Edge Functions
- Regras de negócio implementadas

Isso alimenta o **bloqueio anti-duplicação** do próximo `/vibe-proposal`.

---

## Step 6 — Arquivamento da Spec

```bash
Move-Item "specs/<id>" "specs/archive/<id>"
```

- Specs no `archive/` são reutilizáveis: em proposals futuras similares, a IA deve consultar o histórico
- Se houver `spec/global/` para atualizar, faça antes de mover

---

## Step 7 — Commit & Push Controlado

Leia as regras de git:
```
view_file C:/Users/User/.gemini/config/skills/github-ops/SKILL.md    ← convenção de commits, checklist pré-commit
```

```bash
git add .
git commit -m "feat(<id>): <resumo do que foi implementado>"
git push origin main
```

Inclua no `git add .`:
- Arquivos de código modificados
- `graphify-out/` (grafo atualizado)
- `specs/archive/` (spec arquivada)
- `.agent/memory/` (memória Obsidian atualizada)
- `.agent/rules/ia.md` (se o /learn gerou nova regra)

- **Fallback Windows:** `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`
- **JAMAIS use `push --force`**
- Se "Author identity unknown": `git config user.email "agent@project.local"` antes do commit

---

## Step 8 — Notificação Final

Avise o usuário:
- ✅ Build passou
- 📝 O que foi registrado na memória Obsidian e em qual categoria
- 🧠 Regras elevadas para `ia.md` (ou "nenhum guardrail universal nesta iteração")
- 📊 Grafo atualizado (`graphify update` executado)
- 📦 Spec arquivada em `specs/archive/<id>/`
- 🔗 Hash do commit

<!-- VIBEARCHIVE:END -->
