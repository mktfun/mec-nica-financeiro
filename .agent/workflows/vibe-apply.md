---
description: Executa a implementação técnica de forma rápida e direta por um único agente (sem subagentes) — implementa sequencialmente as tasks da spec, com auto-healing, Visual QA, build gate e Hard Stop final.
---

<!-- VIBEAPPLY:START -->

<workflow name="vibe-apply" execution_mode="single_agent_direct">

<overview>
Implementação técnica sequencial conduzida diretamente pelo agente principal. Elimina overhead e latência de subagentes, garantindo fidelidade total aos arquivos de spec.
</overview>

<guardrails>
- <rule type="execution">Execução direta por UM ÚNICO AGENTE. Não use invoke_subagent.</rule>
- <rule type="mandatory">A spec é a lei. Implemente exatamente o acordado em proposal.md e design.md.</rule>
- <rule type="save_state">Atualize spec-plan.md: [- [/] In Progress] ao iniciar e [- [x] Completed] ao finalizar cada task.</rule>
- <rule type="circuit_breaker">PARADA OBRIGATÓRIA (HARD STOP) no final. Proibido auto-arquivar ou commitar.</rule>
</guardrails>

<steps>
<step number="0" name="Leitura da Spec e Injeção de Ambiente">
Leia a spec em `specs/<id>/` (`proposal.md`, `design.md`, `spec-plan.md`).
Injete variáveis silenciosamente:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
$env:SUPABASE_PROJECT_ID   = "<valor do .env>"
$env:GH_TOKEN              = "<valor do .env>"
```
</step>

<step number="1" name="Execução Sequencial das Tasks">
Para cada task pendente `- [ ]` no `spec-plan.md`, atualize para `- [/]` e execute:
- **Se Banco [DB]:** Use `skills/database/SKILL.md`, inspecione colunas reais e crie migration.
- **Se Backend [BACKEND]:** Use `skills/backend-patterns/SKILL.md`, crie Server Actions tipadas com Zod e `getUser()`.
- **Se Frontend [FRONTEND]:** Use `skills/ui-components/SKILL.md`, construa os componentes React com Dark UI Zinc-950.

Ao finalizar a task, marque imediatamente como `- [x] Completed` no `spec-plan.md`.
</step>

<step number="2" name="Auto-Healing em Caso de Erro">
Se houver falha de compilação ou testes:
- Tentativa 1: Correção cirúrgica na causa raiz.
- Tentativa 2: Abordagem alternativa documentada.
- Tentativa 3: Se persistir, `git reset --hard HEAD` e alerte o usuário. Nunca tente uma 4ª vez.
</step>

<step number="3" name="Visual QA & Build Gate">
1. **Se alterou UI:** `npx playwright screenshot <url-local> screenshot.png` e valide visualmente.
2. **Build Gate obrigatório:**
   ```bash
   cmd.exe /c "npm run build"
   ```
   Zero erros de TypeScript e zero falhas de compilação.
</step>

<step number="4" name="Conclusão e Hard Stop Obrigatório">
Apresente o resumo das tasks concluídas e confirmação do build limpo.

<hard_stop>
<directive>
PARE IMEDIATAMENTE AQUI.
- NÃO inicie o archive sob nenhuma hipótese.
- NÃO execute git commit ou git push.
- NÃO mova pastas de specs/ para specs/archive/.
- Finalize sua resposta exclusivamente informando:
  "Implementação concluída e verificada com sucesso! Teste a aplicação no seu ambiente. Quando estiver pronto para arquivar e commitar, envie: /vibe-archive <id>."
</directive>
</hard_stop>
</step>
</steps>

</workflow>
<!-- VIBEAPPLY:END -->
