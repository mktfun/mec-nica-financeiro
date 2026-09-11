---
name: sdd-apply
description: "Implementação técnica determinística rápida e direta para Antigravity 2.0. Um único agente executa as tasks sequencialmente, com save-state contínuo no spec-plan.md, auto-healing em até 3 tentativas, verificação rápida via terminal (build/typecheck/segurança) e Hard Stop final (sem browser/subagentes)."
triggers: [apply, implementar spec, executar spec, codificar spec, sdd-apply, vibe-apply]
---

# ⚙️ SDD Apply — Implementação Rápida, Direta & Verificação Real

<skill>
<overview>
Executa o checklist de `specs/<id>/spec-plan.md` diretamente com um único agente (sem latência ou overhead de múltiplos subagentes). Implementa as tasks de forma sequencial e atômica, valida 100% via terminal rápido (build gate, typecheck e segurança, sem testes de frontend/browser) e finaliza com Hard Stop obrigatório.
</overview>

<guardrails>
- <rule type="execution">Execução direta por UM ÚNICO AGENTE. Não lance subagentes por tarefa (zero invoke_subagent).</rule>
- <rule type="mandatory">A spec é a lei. Implemente estritamente o que foi acordado no proposal.md e design.md.</rule>
- <rule type="save_state">Atualize o spec-plan.md: [- [/] In Progress] ao iniciar e [- [x] Completed] ao finalizar cada task.</rule>
- <rule type="budgets">Limites operacionais rígidos: max_auto_healing_attempts = 3; max_tool_calls_per_task = 15; max_total_retries = 5. Se o budget for atingido, documente a justificativa técnica, interrompa a execução e consulte o usuário.</rule>
- <rule type="loop_prevention">Loop Scorer: Se a mesma ação, patch ou ferramenta falhar 2 vezes de forma idêntica sem mudança de estado, aborte a repetição imediatamente como [LOOP_DETECTED].</rule>
- <rule type="safe_rollback">NUNCA execute 'git reset --hard' automaticamente sem autorização humana. Crie backup em .tmp/ antes de qualquer reversão.</rule>
- <rule type="circuit_breaker">PARADA OBRIGATÓRIA (HARD STOP) no final. Proibido auto-arquivar, commitar ou mover specs.</rule>
</guardrails>

<workflow_steps>
<step number="0" name="Leitura da Spec e Carregamento de Ambiente">
Leia rapidamente a spec em `specs/<id>/`:
1. `proposal.md` (problema, contratos de dados, arquivos afetados, plano de rollback)
2. `design.md` (interfaces TypeScript, happy path, edge cases, critérios de aceitação)
3. `spec-plan.md` (lista de tasks atômicas pendentes)

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
- Carregue: `skills/database/SKILL.md` (e `references/rls-patterns.md` se criar/editar policies).
- Inspecione as colunas existentes via SQL antes de criar novas.
- Escreva e aplique a migration em `supabase/migrations/<timestamp>_<nome>.sql`.
- Toda tabela DEVE ter RLS habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) e policy multi-tenant.
</domain>

<domain type="Backend">
Se envolver Server Actions / APIs / Auth:
- Carregue: `skills/backend-patterns/SKILL.md` (e `skills/auth/SKILL.md` se envolver sessão).
- Implemente Server Actions tipadas com retorno `ActionResult<T>` e schemas de validação Zod.
- Use `getUser()` no server (nunca `getSession()` para segurança).
- Aplique Taint Analysis defensiva (`skills/security/references/sentry-taint-analysis.md`): sanitize inputs de formulários antes de passar para queries ou mutações.
</domain>

<domain type="Frontend">
Se envolver Telas / Componentes React:
- Carregue: `skills/frontend-design-pro/SKILL.md` e `skills/ui-components/SKILL.md` (e `skills/ui-motion/SKILL.md` se houver animação).
- Respeite estritamente `DESIGN.md`: Dark UI sólida (Zinc-950), superfícies por luminância (dark.design), tipografia Inter/Outfit e `'use client'` apenas nas folhas interativas.
- Bloqueio ativo de AI Slop: proibido gradientes borrados com blur(100px), icon tile stacks repetitivos ou animações > 200ms.
- Siga os princípios de Rauno Freiberg (`skills/frontend-design-pro/references/interface-guidelines.md`) para inputs, dados e micro-interações.
</domain>

Após concluir cada task, marque imediatamente no `spec-plan.md` como `- [x] Completed`.
</step>

<step number="2" name="Auto-Healing, Loop Detection & Safe Rollback">
Se ocorrer erro de compilação ou teste durante a task:
- **Loop Check:** Ação repetida idêntica sem evolução de erro? Se SIM, PARE imediatamente: emita `[LOOP_DETECTED]` e consulte o usuário.
- **Tentativa 1 (Budget 1/3):** Correção direta na causa raiz revisando o `design.md` e logs do erro.
- **Tentativa 2 (Budget 2/3):** Abordagem alternativa documentada com hipótese técnica explícita.
- **Tentativa 3 (Budget 3/3):** Tentativa final isolada. Se falhar:
  - **PROIBIDO:** `git reset --hard` automático desassistido.
  - **Safe Rollback Protocol:**
    1. Execute `git status --short` e grave o diff em `.tmp/rollback_backup_<timestamp>/changes.patch`.
    2. Registre o log forense do erro em `.tmp/rollback_backup_<timestamp>/error_log.txt`.
    3. Notifique o usuário com a causa do bloqueio, o caminho do backup criado e solicite autorização explícita antes de descartar modificações.
</step>

<step number="3" name="Quality Gate Rápido via Terminal (Build, Testes & Segurança)">
1. **Verificação 100% Headless via Terminal (Zero Overhead de Frontend/Browser):**
   - **PROIBIDO:** Abrir navegadores, rodar Playwright, tirar screenshots ou inicializar dev servers para inspeção de tela no apply. Isso elimina latência, lentidão desnecessária e alucinações de renderização.
   - O agente opera em modo 100% headless:
     `[VISUAL_QA_OFFLINE]: Testes de UI via browser/Playwright desativados por design. Verificação 100% focada em gates rápidos de terminal (build, typecheck, lint).`
   - **PROIBIDO:** Declarar falsamente que o Visual QA passou lendo apenas arquivos HTML/CSS estáticos.
   - A avaliação visual de telas pertence exclusivamente ao desenvolvedor humano no navegador em localhost antes de aprovar com `/vibe-archive`: marque como `[HUMAN_REVIEW_PENDING]`.
2. **Build & Typecheck Gate (Terminal Rápido):**
   Execute a compilação no terminal para garantir zero erros de TypeScript e zero quebras de bundling:
   ```bash
   cmd.exe /c "npm run build"
   ```
   (Se o projeto possuir testes unitários rápidos de backend/lógica, execute-os opcionalmente via terminal: `npm test -- --passWithNoTests`).
3. **Security Gate (Pre-Commit Secrets Blocker & Cadência de Auditoria):**
   - **Bloqueador Rígido de Segredos:** Inspecione os arquivos modificados. Se encontrar chaves reais (OpenAI `sk-`, Stripe `sk_live_`, Supabase `service_role`, AWS keys), **BLOQUEIE IMEDIATAMENTE**:
     `[SECURITY_BLOCKER]: Segredo detectado em <arquivo>. Remova credenciais e use variáveis de ambiente antes de continuar.`
   - **Cadência Preventiva (a cada 5 a 10 applies):**
     Emita no resumo final o alerta:
     ```text
     ================================================================================
      🛡️ [SECURITY HEALTH CHECK REMINDER]
      Múltiplas implementações foram concluídas neste repositório.
      Recomendado rodar uma auditoria preventiva de segurança:
        👉 /secrets-audit     -> Verificar se nenhuma chave vazou
        👉 /dependency-audit  -> Checar CVEs em dependências
        👉 /security-review   -> Auditar IDOR e autorização (AuthZ)
     ================================================================================
     ```
</step>

<step number="4" name="Conclusão e Hard Stop Obrigatório">
Apresente o resumo das tasks concluídas, o status do build gate no terminal e a aprovação técnica [AUDIT_PASSED].

<hard_stop>
<directive>
PARE IMEDIATAMENTE AQUI.
- NÃO inicie o archive sob nenhuma hipótese.
- NÃO execute git commit ou git push.
- NÃO mova pastas de specs/ para specs/archive/.
- Finalize sua resposta exclusivamente informando:
  "Implementação concluída e verificada via terminal com sucesso! Teste a aplicação no seu navegador em localhost. Quando estiver pronto para arquivar e commitar, envie: /vibe-archive <id> (ou /sdd-archive <id>)."
</directive>
</hard_stop>
</step>
</workflow_steps>
</skill>
