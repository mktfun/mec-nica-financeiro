---
name: sdd-apply
description: "Implementação técnica determinística rápida e direta para Antigravity 2.0. Um único agente executa as tasks sequencialmente, com save-state contínuo no spec-plan.md, auto-healing em até 3 tentativas, Visual QA, build gate e Hard Stop final (sem subagentes)."
triggers: [apply, implementar spec, executar spec, codificar spec, sdd-apply, vibe-apply]
---

# ⚙️ SDD Apply — Implementação Rápida, Direta & Verificação Real

<skill>
<overview>
Executa o checklist de `specs/<id>/spec-plan.md` diretamente com um único agente (sem latência ou overhead de múltiplos subagentes). Implementa as tasks de forma sequencial e atômica, valida o build, inspeciona UI via Visual QA e finaliza com Hard Stop obrigatório.
</overview>

<guardrails>
- <rule type="execution">Execução direta por UM ÚNICO AGENTE. Não lance subagentes por tarefa (zero invoke_subagent).</rule>
- <rule type="mandatory">A spec é a lei. Implemente estritamente o que foi acordado no proposal.md e design.md.</rule>
- <rule type="save_state">Atualize o spec-plan.md: [- [/] In Progress] ao iniciar e [- [x] Completed] ao finalizar cada task.</rule>
- <rule type="circuit_breaker">PARADA OBRIGATÓRIA (HARD STOP) no final. Proibido auto-arquivar, commitar ou mover specs.</rule>
</guardrails>

<workflow_steps>
<step number="0" name="Leitura da Spec e Carregamento de Ambiente">
Leia rapidamente a spec em `specs/<id>/`:
1. `proposal.md` (problema, contratos de dados)
2. `design.md` (interfaces TypeScript e arquitetura)
3. `spec-plan.md` (lista de tasks pendentes)

Carregue variáveis do `.env` silenciosamente no terminal:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
$env:SUPABASE_PROJECT_ID   = "<valor do .env>"
$env:GH_TOKEN              = "<valor do .env>"
```
</step>

<step number="1" name="Execução Sequencial das Tasks">
Para cada task `- [ ] Pending` no `spec-plan.md`, atualize para `- [/] In Progress` e execute:

<domain type="Database">
Se envolver Banco/Supabase:
- Carregue: `skills/database/SKILL.md`
- Inspecione as colunas existentes via SQL antes de criar novas.
- Escreva e aplique a migration em `supabase/migrations/<timestamp>_<nome>.sql`.
</domain>

<domain type="Backend">
Se envolver Server Actions / APIs / Auth:
- Carregue: `skills/backend-patterns/SKILL.md` (e `skills/auth/SKILL.md` se envolver sessão).
- Implemente Server Actions tipadas com retorno `ActionResult<T>`.
- Use `getUser()` no server (nunca `getSession()` para segurança).
</domain>

<domain type="Frontend">
Se envolver Telas / Componentes React:
- Carregue: `skills/ui-components/SKILL.md` (e `skills/ui-motion/SKILL.md` se houver animação).
- Respeite Dark UI sólida (Zinc-950), tipografia Inter/Outfit e `'use client'` apenas nas folhas interativas.
</domain>

Após concluir cada task, marque imediatamente no `spec-plan.md` como `- [x] Completed`.
</step>

<step number="2" name="Auto-Healing & Validação Rápida">
Se ocorrer erro de compilação ou teste:
- Tentativa 1: Correção direta na causa raiz revisando o `design.md`.
- Tentativa 2: Abordagem alternativa documentada.
- Tentativa 3: Se persistir, execute `git reset --hard HEAD`, pare e alerte o usuário. **Nunca tente uma 4ª vez.**
</step>

<step number="3" name="Visual QA & Quality Gate de Build">
1. **Se tocou em UI:** Execute `npx playwright screenshot <url-local> screenshot.png` e verifique contraste, alinhamento e ausência de vazamento de estilos.
2. **Build Gate obrigatório:**
   ```bash
   cmd.exe /c "npm run build"
   ```
   Garanta zero erros de TypeScript e zero falhas de bundling.
</step>

<step number="4" name="Conclusão e Hard Stop Obrigatório">
Apresente o resumo das tasks concluídas e o status do build.

<hard_stop>
<directive>
PARE IMEDIATAMENTE AQUI.
- NÃO inicie o archive sob nenhuma hipótese.
- NÃO execute git commit ou git push.
- NÃO mova pastas de specs/ para specs/archive/.
- Finalize sua resposta exclusivamente informando:
  "Implementação concluída e verificada com sucesso! Teste a aplicação no seu ambiente. Quando estiver pronto para arquivar e commitar, envie: /vibe-archive <id> (ou /sdd-archive <id>)."
</directive>
</hard_stop>
</step>
</workflow_steps>
</skill>
