---
description: Executa a implementação técnica em modo SOLO (sem subagentes) — um único agente executa as tasks sequencialmente, com save-state contínuo no spec-plan.md, auto-healing e hard stop final.
---

<!-- VIBEAPPLY:START -->

**Objetivo:** Executar o checklist de `specs/<id>/spec-plan.md` diretamente com um único agente (sem subagentes). Ideal para execuções rápidas, correções de bugs pontuais e ajustes diretos.

**Guardrails:**
- **NÃO LANÇAR SUBAGENTES:** Este workflow roda em modo solo (sem `invoke_subagent`).
- **A SPEC É A LEI:** Execute estritamente o que está nos arquivos de spec. Não invente, não extrapole.
- **SAVE-STATE CONTÍNUO:** Marque `- [/] In Progress` ao iniciar uma task e `- [x] Completed` ao concluir.
- **NUNCA AUTO-ARQUIVAR:** O turno termina após o build; o archive depende de comando explícito do usuário.

---

## Step 0 — Leitura da Spec e Carregamento de Ambiente

Leia os 3 arquivos de spec na ordem:
1. `view_file specs/<id>/proposal.md`
2. `view_file specs/<id>/design.md`
3. `view_file specs/<id>/spec-plan.md`

Carregue credenciais do `.env` silenciosamente:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
$env:SUPABASE_PROJECT_ID   = "<valor do .env>"
$env:GH_TOKEN              = "<valor do .env>"
```

Leia as skills base:
```
view_file C:/Users/User/.gemini/config/skills/adaptive-reasoning/SKILL.md
view_file C:/Users/User/.gemini/config/skills/obsidian/SKILL.md
```

---

## Step 1 — Execução Sequencial Task por Task

Para cada task `- [ ] Pending` no `spec-plan.md`, atualize o arquivo para `- [/] In Progress` e execute conforme o domínio:

### Se a task é [DB] — Banco de Dados / Supabase
- Leia: `view_file C:/Users/User/.gemini/config/skills/database/SKILL.md`
- Se envolver RLS: `view_file skills/database/references/rls-patterns.md`
- Inspecione as colunas existentes antes de alterar:
  ```bash
  supabase db execute --project-ref $env:SUPABASE_PROJECT_ID \
    --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '<tabela>' AND table_schema = 'public';"
  ```
- Crie a migration em `supabase/migrations/<timestamp>_<nome>.sql` e aplique.

### Se a task é [BACKEND] — Server Actions / APIs
- Leia: `view_file C:/Users/User/.gemini/config/skills/backend-patterns/SKILL.md`
- Se envolver auth: `view_file C:/Users/User/.gemini/config/skills/auth/SKILL.md`
- Use sempre `getUser()` no server (nunca `getSession()` para autorização).
- Retorno tipado obrigatório: `ActionResult<T>`.

### Se a task é [FRONTEND] — Telas e Componentes React
- Leia: `view_file C:/Users/User/.gemini/config/skills/ui-components/SKILL.md`
- Se envolver animações: `view_file C:/Users/User/.gemini/config/skills/ui-motion/SKILL.md`
- Respeite: Dark UI sólida (Zinc-950), sem glassmorphism, tipografia Inter/Outfit.
- `'use client'` apenas nas folhas da árvore de componentes.

Após concluir a implementação da task, atualize o `spec-plan.md` para `- [x] Completed`.

---

## Step 2 — Auto-Healing & Rollback Estrito

Se ocorrer erro de compilação, erro de TypeScript ou teste quebrando:
- **Tentativa 1:** Corrija na causa raiz (releia a interface no `design.md`).
- **Tentativa 2:** Abordagem alternativa documentada.
- **Tentativa 3:** Se falhar na 3ª tentativa, execute imediatamente:
  ```bash
  git reset --hard HEAD
  ```
  Pare a execução e reporte o diagnóstico exato ao usuário. **NÃO tente uma 4ª vez.**

---

## Step 3 — VLM Visual QA (se tocou em Frontend)

Se a feature alterou qualquer tela ou componente de UI:
```bash
npx playwright screenshot <url-local-ou-preview> screenshot.png
```
Inspecione visualmente o screenshot:
- O layout quebrou?
- Houve vazamento de CSS ou desalinhamento?
- Se houver defeito visual, corrija antes de concluir.

---

## Step 4 — Quality Gate Local (Build)

Execute o build para garantir que a tipagem e o bundle estão 100% íntegros:
```bash
cmd.exe /c "npm run build"
```
Se o build falhar, trate imediatamente no auto-healing.

---

## Step 5 — Conclusão e Hard Stop (Proibição Absoluta de Auto-Archive)

Quando todas as tasks do `spec-plan.md` estiverem `[x] Completed` e o build passar:

> 🛑 **CIRCUIT BREAKER — PARADA OBRIGATÓRIA (HARD STOP):**
> 
> **A IA DEVE PARAR SEU TURNO IMEDIATAMENTE AQUI.**
> - **NÃO inicie o `/vibe-archive` sob NENHUMA hipótese.**
> - **NÃO execute `git commit`, `git push` ou `git add`.**
> - **NÃO mova pastas de `specs/` para `specs/archive/`.**
> - **NÃO escreva nos arquivos de memória `.agent/memory/` dentro do apply.**
> - **ENCERRE SEU TURNO AGORA.** O usuário precisa testar em localhost antes de commitar.

Apresente o resumo final ao usuário:
1. Resumo das tasks concluídas (todas `[x] Completed`)
2. Confirmação do build limpo
3. Mensagem padrão:
   *"Implementação concluída em modo solo com sucesso! Por favor, teste a aplicação no seu ambiente. Quando estiver satisfeito e pronto para consolidar a memória e commitar, envie o comando: `/vibe-archive <id>`."*

<!-- VIBEAPPLY:END -->
