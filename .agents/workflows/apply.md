---
description: Execução Técnica Multi-Agente com distribuição paralela de tasks (Backend, Frontend, QA), Auto-Healing com Rollback e Visual QA.
---

<!-- VIBEAPPLY:START -->

**Objetivo**
Executar o checklist de specs/<id>/spec-plan.md orquestrando subagentes especialistas para desenvolvimento concorrente e validação contínua.

---

## Step 0 — Leitura Obrigatória da Spec & Skills Base

Antes de qualquer ação, o Maestro carrega as diretrizes:
```
view_file C:/Users/admin/.gemini/config/skills/adaptive-reasoning/SKILL.md
```
1. specs/<id>/proposal.md — Contratos e riscos
2. specs/<id>/design.md — Arquitetura e interfaces
3. specs/<id>/spec-plan.md — Mapa de tasks pendentes

Carregue silenciosamente as credenciais do .env sem prompts interativos:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<valor do .env>"
$env:GH_TOKEN = "<valor do .env>"
```

---

## Step 1 — Orquestração de Execução Concorrente (invoke_subagent)

O Maestro analisa as tarefas pendentes (- [ ] Pending) no spec-plan.md e dispara os especialistas simultaneamente:

```json
{
  "Subagents": [
    {
      "TypeName": "self",
      "Role": "Backend Developer",
      "Prompt": "Execute as tasks marcadas com [BACKEND] no specs/<id>/spec-plan.md. Consulte C:/Users/admin/.gemini/config/skills/supabase/SKILL.md e C:/Users/admin/.gemini/config/skills/backend/SKILL.md. Crie as migrations, RPCs e policies de RLS necessárias. Teste as queries localmente.",
      "Workspace": "share"
    },
    {
      "TypeName": "self",
      "Role": "Frontend Developer",
      "Prompt": "Execute as tasks marcadas com [FRONTEND] no specs/<id>/spec-plan.md. Consulte C:/Users/admin/.gemini/config/skills/frontend-design-pro/SKILL.md e C:/Users/admin/.gemini/config/skills/frontend-design-3/SKILL.md. Crie os componentes React e Hooks seguindo a paleta Dark UI (Zinc-950).",
      "Workspace": "share"
    }
  ]
}
```

*O Maestro monitora o progresso dos subagentes e atualiza o spec-plan.md à medida que as tarefas são entregues.*

---

## Step 2 — QA, Build Gate & VLM Visual QA

Assim que Backend e Frontend finalizarem suas entregas:

1. **Build Gate:**
```bash
cmd.exe /c "npm run build"
```
Se falhar: acione o protocolo de Auto-Healing imediatamente.

2. **Subagente de Testes e VLM Visual QA:**
Dispare o especialista em QA para validar os cenários visuais e funcionais:
```bash
npx playwright screenshot http://localhost:8080/rota-da-feature tela_qa.png
```
O agente inspeciona a imagem gerada:
- CSS vazou ou quebrou layout?
- Paleta Zinc-950 e contrastes respeitados?
- Estados de loading/empty/error funcionando?

---

## Step 3 — Auto-Healing & Rollback Estrito

Se houver erro de compilação, quebra visual ou divergência do design.md:
- **Tentativa 1:** Identificar e corrigir na causa raiz.
- **Tentativa 2:** Reavaliar contratos de interfaces e tipos.
- **Tentativa 3 (Última):** Abordagem alternativa documentada.
- **Se falhar a 3ª:** Execute git reset --hard. Notifique o usuário com o diagnóstico exato.

---

## Conclusão

Com todos os itens marcados como [x] Completed no spec-plan.md e build verde:
*"Implementação concluída com sucesso. Execute /archive <id> (ou /vibe-archive <id>) para consolidar a memória, atualizar o grafo e commitar."*

<!-- VIBEAPPLY:END -->
