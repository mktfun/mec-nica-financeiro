---
description: Executa a implementação técnica baseada nos 3 arquivos de spec gerados no /vibe-proposal — com leitura obrigatória da spec, skills por tipo de task, save-state contínuo, auto-healing com rollback e VLM Visual QA.
---

<!-- VIBEAPPLY:START -->

**Objetivo**
Executar o checklist de specs/<id>/spec-plan.md com extrema precisão. A spec é a lei — não improvise, não extrapole além do que está nos arquivos de spec.

---

## Step 0 — Leitura Obrigatória dos 3 Arquivos de Spec (NUNCA PULE)

Antes de escrever qualquer linha de código, leia os arquivos na seguinte ordem:

**Skills base (ler SEMPRE, independente do tipo de task):**
```
view_file C:/Users/admin/.gemini/config/skills/adaptive-reasoning/SKILL.md
```

1. **specs/<id>/proposal.md** — Entenda o problema, os contratos de dados e o risco principal
2. **specs/<id>/design.md** — Entenda a arquitetura exata, os tipos TypeScript e os cenários de verificação
3. **specs/<id>/spec-plan.md** — Identifique qual task está `[ ] Pending` e comece por ela

Adicionalmente:
- Leia a memória modular relevante (ex: memory/supabase.md, memory/ui.md, memory/domain.md)
- Se envolver módulos existentes: `graphify explain "<Modulo>"` antes de editar qualquer arquivo
- Carregue silenciosamente as credenciais do .env sem prompts interativos:
  ```powershell
  $env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
  $env:GH_TOKEN = "<valor do .env>"
  ```

---

## Step 1 — Execução Task por Task (Skills Ativas por Tipo)

Para cada `- [ ] Pending` no `spec-plan.md`, marque como `- [/] In Progress`, execute e só então marque `- [x] Completed`.

**Se a task é [FRONTEND] — UI/React/Tailwind:**
Consulte as skills antes de codar:
```
view_file C:/Users/admin/.gemini/config/skills/frontend-design-pro/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/frontend-design-3/SKILL.md
```
- Respeite SEMPRE: Dark UI sólida (Zinc-950, #050711), sem glassmorphism, tipografia Inter/Outfit
- Estados obrigatórios em componentes interativos: Default, Hover, Loading/Skeleton, Error e Empty
- Nunca quebre a API pública de componentes existentes (props, eventos, exports)

**Se a task é [BACKEND] — Supabase/RPCs/Migrations:**
Consulte as skills antes de qualquer operação:
```
view_file C:/Users/admin/.gemini/config/skills/supabase/SKILL.md
view_file C:/Users/admin/.gemini/config/skills/backend/SKILL.md
```
- Confirme os tipos reais de colunas antes de criar parâmetros de RPC (Anti-Alucinação de Schema)
- RLS obrigatório em toda tabela nova — nunca crie sem policy
- Sempre prefira ALTER TABLE / CREATE OR REPLACE FUNCTION em estruturas existentes

**Se a task é [TEST] — Verificação de Cenários & Visual QA:**
- Execute os cenários definidos em design.md
- **VLM Visual QA com Playwright (Obrigatório se tocou em UI):**
  ```bash
  npx playwright screenshot http://localhost:8080/rota tela.png
  ```
  Inspecione a imagem: CSS vazou? Layout quebrou? Dark UI respeitada?

---

## Step 2 — Auto-Healing & Rollback Estrito

Se ocorrerem erros de build, testes falhando ou divergência do design.md:
- **Tentativa 1:** Analise o erro. Corrija na causa raiz, não no sintoma.
- **Tentativa 2:** Releia o design.md e o proposal.md. O erro é de implementação ou de contrato?
- **Tentativa 3 (última):** Tente uma abordagem alternativa documentada.
- **Se a 3ª falhar:** Execute `git reset --hard`. Notifique o usuário com o diagnóstico exato. NÃO tente uma 4ª vez.

---

## Conclusão

Quando todos os itens do `spec-plan.md` estiverem `[x] Completed`, avise o usuário:
*"Implementação concluída. Rode `/archive <id>` (ou `/vibe-archive <id>`) para atualizar a memória, o grafo e fazer o commit."*

<!-- VIBEAPPLY:END -->
