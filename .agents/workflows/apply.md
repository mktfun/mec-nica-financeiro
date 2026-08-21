---
description: Executa a implementação técnica baseada nos 3 arquivos de spec gerados no /vibe-proposal — com leitura obrigatória da spec, skills por tipo de task, save-state contínuo, auto-healing com rollback e VLM Visual QA.
---

<!-- VIBEAPPLY:START -->

> ⛔ **OVERRIDE SUPREMO:** Se o usuário mencionar `/teamwork-preview`, delegar para equipe ou pedir análise conjunta, PARE IMEDIATAMENTE. Acione os subagentes via `invoke_subagent`. NUNCA ignore um pedido de delegação.

**Objetivo**
Executar o checklist de `specs/<id>/spec-plan.md` com extrema precisão. A spec é a lei — não improvise, não extrapole além do que está nos arquivos de spec.

---

## Step 0 — Leitura Obrigatória dos 3 Arquivos de Spec (NUNCA PULE)

Antes de escrever qualquer linha de código, leia os 3 arquivos na seguinte ordem:

1. **`specs/<id>/proposal.md`** — Entenda o problema, os contratos de dados e o risco principal
2. **`specs/<id>/design.md`** — Entenda a arquitetura exata, os tipos TypeScript e os cenários de verificação
3. **`specs/<id>/spec-plan.md`** — Este é o seu mapa de execução. Identifique qual task está `[ ] Pending` e comece por ela

Adicionalmente:
- Leia a memória modular relevante (ex: `memory/supabase.md`, `memory/ui.md`, `memory/ofx.md`)
- Se envolver módulos existentes: `graphify explain "<Modulo>"` antes de editar qualquer arquivo
- Carregue silenciosamente as credenciais do `.env` **sem pedir nada ao usuário**:
  ```
  $env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
  $env:GH_TOKEN = "<valor do .env>"
  ```
  **É EXTREMAMENTE PROIBIDO pedir para o usuário fazer login, rodar supabase login ou qualquer comando de autenticação interativo.**

---

## Step 1 — Execução Task por Task (Skills Ativas por Tipo)

Para cada `- [ ] Pending` no `spec-plan.md`, marque como `- [/] In Progress`, execute e só então marque `- [x] Completed`.

**Se a task é [FRONTEND] — UI/React/Tailwind:**
- Invoque e siga as skills `frontend-design-pro`, `frontend-design-3` e `afrexai-nextjs-production`
- Respeite SEMPRE: Dark UI sólido (Zinc-950, `#050711`), sem glassmorphism, tipografia Inter/Outfit
- Consulte `spec/global/features.md` antes de criar qualquer componente novo — não duplique
- Nunca quebre a API pública de componentes existentes (props, eventos, exports) sem isso estar na spec

**Se a task é [BACKEND] — Supabase/RPCs/Migrations:**
- Invoque e siga as skills `backend` e `supabase`
- RLS obrigatório em toda tabela nova — nunca crie sem policy
- Nunca crie tabela, RPC, enum ou policy sem antes verificar que não existe equivalente
- Use `SUPABASE_SERVICE_ROLE_KEY` para webhooks e operações que precisam bypassar RLS

**Se a task é [INFRA] — Deploy/VPS/DNS:**
- Leia `.antigravity/state.json` para entender o impacto real (UI only, app+backend, infra only)
- Se `supabase.mode=self_hosted_vps`: acesso exclusivamente via SSH remoto — NUNCA container local
- Configure DNS Cloudflare via API (POST) se necessário — nunca via dashboard manual

**Se a task é [TEST] — Verificação de Cenários:**
- Execute os cenários definidos em `specs/<id>/design.md` (seção SCAN → INFER → VERIFY → FIX)
- Para cada cenário: descreva o estado inicial, execute a ação, verifique o resultado esperado
- Se o resultado divergir do esperado → acione o auto-healing (Step 2)

---

## Step 2 — Auto-Healing & Rollback Estrito

Se ocorrerem erros de build, testes falhando, ou resultado diferente do especificado no `design.md`:

- **Tentativa 1:** Analise o erro. Corrija na causa raiz, não no sintoma.
- **Tentativa 2:** Releia o `design.md` e o `proposal.md`. O erro é de implementação ou de spec?
- **Tentativa 3 (última):** Tente uma abordagem alternativa documentada na spec.
- **Se a 3ª falhar:** Execute `git reset --hard` imediatamente. Notifique o usuário com o diagnóstico exato. Anote o erro no `spec-plan.md`. **NÃO tente uma 4ª vez.**

---

## Step 3 — VLM Visual QA (Obrigatório se [FRONTEND])

É **PROIBIDO** dizer "não tenho olhos" ou "não consigo verificar visualmente" se a task tocou em UI.

```bash
npx playwright screenshot <url-de-preview-ou-localhost> tela.png
```

1. Se a rota for protegida por login: recupere as credenciais do `.env` isolado e autentique primeiro
2. Leia a imagem gerada e verifique contra os critérios do `design.md`:
   - CSS vazou para outros componentes?
   - Contraste e legibilidade estão corretos?
   - Z-index quebrou algum overlay?
   - A paleta Zinc-950 foi respeitada?
   - O layout está alinhado como especificado?
3. Se encontrar quebra visual → corrija o código e repita antes de marcar a task como `[x]`

---

## Conclusão

Quando **todos** os itens do `spec-plan.md` estiverem `[x] Completed`, avise o usuário:

*"Implementação concluída. Rode `/vibe-archive <id>` para atualizar a memória, o grafo e fazer o commit."*

<!-- VIBEAPPLY:END -->
