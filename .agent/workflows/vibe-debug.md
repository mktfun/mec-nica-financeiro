---
description: Diagnostica bugs com pesquisa real — varre logs do Next.js, Supabase e Edge Functions, inspeciona banco de dados, cruza com memória Obsidian do módulo, propõe hipóteses bayesianas e executa repair com máximo 3 tentativas antes de rollback.
---

<!-- VIBREDEBUG:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview` ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione via `invoke_subagent`. NUNCA ignore.

**Objetivo**
Diagnosticar e corrigir bugs com pesquisa real nos artefatos do projeto — não tentativas aleatórias. Máximo 3 tentativas de repair antes de rollback e escalada ao usuário.

---

## Step 0 — Preparar Ambiente e Ler Contexto

**Skills obrigatórias:**
```
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md   ← protocolo de hipótese + retry
view_file C:/Users/User/.gemini/config/skills/database/SKILL.md             ← se o bug for de banco/RLS
view_file .agent/agents/bug-agent.md           ← protocolo completo do Bug Agent
```

**Carregar credenciais silenciosamente:**
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
$env:SUPABASE_PROJECT_ID   = "<valor do .env>"
```

**Ler memória do módulo com bug (Obsidian):**
```
view_file .agent/memory/<modulo-do-bug>.md
```

Se não existe arquivo para o módulo, crie com cabeçalho vazio.

---

## Step 1 — Capturar e Localizar

Capture o erro exato (stack trace, mensagem, linha, contexto) e localize:

```bash
grep_search "<função/componente citado no erro>" src/
grep_search "<mensagem de erro exata>" .
```

Depois consulte o grafo para entender dependências:
```bash
graphify explain "<modulo-com-bug>"
```

---

## Step 2 — Pesquisar Logs (em ordem de prioridade)

**1. Logs Next.js:**
- Output de `npm run build` ou `npm run dev`
- Arquivos em `.next/server/` se existirem

**2. Logs Supabase API (erros de query, RLS, permissão):**
```bash
supabase logs --project-ref $env:SUPABASE_PROJECT_ID --service api
```

**3. Logs Auth (falhas de login, JWT inválido):**
```bash
supabase logs --project-ref $env:SUPABASE_PROJECT_ID --service auth
```

**4. Logs Edge Function (se o bug for em Edge Function):**
```bash
supabase functions logs <nome-da-function> --project-ref $env:SUPABASE_PROJECT_ID
```

---

## Step 3 — Inspecionar o Banco (se erro de DB/RLS/Permissão)

```bash
# Verificar se a tabela existe com os campos corretos
supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
  --sql "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '<tabela>' AND table_schema = 'public';"

# Verificar políticas RLS ativas
supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
  --sql "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '<tabela>';"

# Verificar se RLS está ativado
supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
  --sql "SELECT relname, relrowsecurity FROM pg_class WHERE relname = '<tabela>';"

# Verificar usuários recentes (se bug de auth)
supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
  --sql "SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;"

# Verificar conexões ativas (se bug de performance/timeout)
supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
  --sql "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle' LIMIT 10;"
```

---

## Step 4 — Hipótese Bayesiana

Liste as **top 3 causas prováveis** com probabilidade estimada:

```markdown
**Hipótese 1** (P: X%) — [causa]
Evidência: [o que nos logs/banco aponta para isso]
Fix proposto: [o que será alterado]

**Hipótese 2** (P: Y%) — [causa]
Evidência: [...]
Fix proposto: [...]

**Hipótese 3** (P: Z%) — [causa]
Evidência: [...]
Fix proposto: [...]
```

---

## Step 5 — Repair (máximo 3 tentativas)

- **Tentativa 1:** Aplique o fix da Hipótese 1
  - Se resolveu → marque `[RESOLVED]` e avance para Step 6
  - Se falhou → reverta as mudanças da tentativa 1 antes de prosseguir

- **Tentativa 2:** Aplique o fix da Hipótese 2
  - Se resolveu → `[RESOLVED]`
  - Se falhou → reverta

- **Tentativa 3:** Tente abordagem alternativa documentada
  - Se resolveu → `[RESOLVED]`
  - Se falhou → **execute imediatamente:**

```bash
git reset --hard HEAD
```

Reporte ao usuário com diagnóstico completo. **NUNCA tente uma 4ª vez.**

---

## Step 6 — Registrar no Obsidian (se bug novo)

Após resolver, adicione a lição em `memory/<modulo>.md`:

```markdown
## [YYYY-MM-DD] — Bug: [nome curto]

**Contexto:** O que causou o bug e em qual contexto apareceu.

**Regra aprendida:** O que não deve ser feito ou esquecido neste módulo.

**Não fazer:** Anti-pattern identificado.
```

---

## Step 7 — Notificação Final

Avise o usuário:
- 🐛 Bug diagnosticado: [descrição]
- 🔍 Causa raiz identificada: [hipótese confirmada]
- 🛠️ Tentativas de repair: [N de 3]
- **[RESOLVED]** → continuidade normal do workflow
- **[ESCALATED]** → diagnóstico completo + `git reset --hard HEAD` executado

Se resolvido, retome de onde estava (marque task como `[x]` se estava no apply).

<!-- VIBREDEBUG:END -->
