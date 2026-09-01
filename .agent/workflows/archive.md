---
description: Conclui o fluxo da Spec — build gate, memória modular por categoria, atualização do grafo, arquivamento da spec para reutilização futura e commit controlado.
---

<!-- VIBEARCHIVE:START -->

**Objetivo**
Garantir que a entrega não quebrou o build, consolidar o conhecimento gerado em memória modular por categoria, atualizar o grafo de dependências e fazer o commit.

---

## Step 1 — Quality Gate (Build)

```bash
cmd.exe /c "npm run build"
```
- Se o build falhar: NÃO avance. Corrija o erro imediatamente.
- Se o build passar: confirme ausência de erros de tipagem e warnings críticos.

---

## Step 2 — Atualização da Memória Modular (OBRIGATÓRIO)

Identifique qual categoria de conhecimento foi gerada e escreva no arquivo correto em `.agent/memory/`:
- `memory/supabase.md` → Supabase, RLS, RPCs, schemas, políticas
- `memory/ui.md` → Componentes React, padrões de UI, Tailwind
- `memory/domain.md` → Regras de negócio do domínio (ex: conciliação, maquininha)
- `memory/ofx.md` → Parsing OFX, XLSX, CSV, arquivos de importação
- `memory/infra.md` → Deploy, VPS, SSH, DNS, Cloudflare

**Formato de Registro:**
```markdown
## [YYYY-MM-DD] — [Feature ID: <id>]
**Contexto:** O que foi implementado e qual problema resolvia.
**Regra aprendida:** A lógica crítica que não pode ser esquecida em iterações futuras.
**Risco identificado / Anti-pattern:** O que explicitamente NÃO deve ser feito.
```

---

## Step 3 — Atualização do Grafo (Graphify)

```bash
graphify update
```
Confirme que `graphify-out/graph.json` foi atualizado com os arquivos modificados.

---

## Step 4 — Atualização de `spec/global/features.md`

Registre os artefatos novos ou alterados nesta iteração para alimentar o bloqueio anti-duplicação de proposals futuras.

---

## Step 5 — Arquivamento da Spec & Commit Controlado

```bash
# Arquiva a spec
Move-Item "specs/<id>" "specs/archive/<id>" -Force

# Commit limpo
git add .
git commit -m "feat(<id>): <resumo claro da entrega>"
git push origin main
```

---

## Step 6 — Notificação Final

Avise o usuário:
- ✅ Build validado
- 📝 Memórias atualizadas em `.agent/memory/`
- 🕸️ Grafo Graphify atualizado
- 📦 Spec arquivada em `specs/archive/<id>/`
- 🚀 Hash do commit gerado

<!-- VIBEARCHIVE:END -->
