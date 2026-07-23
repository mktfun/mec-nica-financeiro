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

## Step 3 — Atualização do Grafo (Graphify)

```bash
graphify update
```

- Se falhar com "command not found": instale com `uv tool install graphifyy` (Python, dois Y's no pacote, um Y no comando — **nunca `npx @baml/graphify`**)
- Confirme que `graphify-out/graph.json` foi atualizado com os arquivos modificados nesta iteração

---

## Step 4 — Atualização de `spec/global/features.md`

Adicione os artefatos novos criados nesta iteração:
- Componentes React novos (nome + localização)
- Hooks criados
- Tabelas Supabase novas ou modificadas
- RPCs/Edge Functions
- Regras de negócio implementadas

Isso alimenta o **bloqueio anti-duplicação** do próximo `/vibe-proposal`. Sem isso, a IA vai criar o mesmo componente novamente na próxima semana.

---

## Step 5 — Arquivamento da Spec

```bash
# Mova a pasta de spec ativa para o arquivo histórico
Move-Item "specs/<id>" "specs/archive/<id>"
```

- Specs no `archive/` são reutilizáveis: em proposals futuras similares, a IA deve consultar o histórico antes de criar do zero
- Se houver `spec/global/` para atualizar, faça antes de mover

---

## Step 6 — Commit & Push Controlado

```bash
git add .
git commit -m "feat(<id>): <resumo do que foi implementado>"
git push origin main
```

- Inclua no `git add .`: arquivos modificados, `graphify-out/`, `specs/archive/`, `.agent/memory/`
- **Fallback Windows:** Se `git` não estiver no PATH, use `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`
- **JAMAIS use `push --force`**
- Se ocorrer "Author identity unknown": `git config user.email "ai@clawhub.com"` e `git config user.name "ClawHub Agent"` antes do commit

---

## Step 7 — Notificação Final

Avise o usuário:
- ✅ Build passou
- 📝 O que foi registrado na memória e em qual categoria
- 📦 Spec arquivada em `specs/archive/<id>/`
- 🔗 Hash do commit

<!-- VIBEARCHIVE:END -->
