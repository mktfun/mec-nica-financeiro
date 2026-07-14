---
description: Executa a implementação baseada no plano, com separação explícita entre edições LITE e HEAVY.
---

<!-- VIBEAPPLY:START -->

**Regra Dourada:** A governança nunca deve impedir uma edição local simples.
Antes de escrever qualquer código, responda brevemente ao usuário: *"Entendi que preciso mudar X, Y e Z."*

**Modo de Operação (Defina baseado na complexidade da task)**

### MODO LITE (Gatilho: Bugfix, refactor local, < 3 arquivos alterados, typo)
- **Microplano:** Antes de agir, liste em até 3 linhas: arquivos alvo, mudança mínima e validação esperada.
- **Execução:** Faça a edição direta. Cumpra a Hierarquia Mestra (Resolva a task, não quebre nada, altere o mínimo possível). 
- **Sem Burocracia:** Não execute ferramentas pesadas de QA Visual (Playwright) nem varreduras extensas de Graphify. Vá direto ao ponto.
- **Exemplo de Edição Correta:** Ao editar um componente React, preserve a API pública, não renomeie props sem necessidade explícita, não recrie um componente que já existe, e altere o mínimo possível no arquivo alvo.

### MODO HEAVY (Gatilho: Nova feature, mudança em > 3 arquivos, migração DB, Auth, Infra, amplo impacto UI)
- **Check de Precedência (Graphify):** Execute `graphify explain "<Modulo>"` antes de criar para garantir que não vai duplicar código.
- **Qualidade UI/UX (ClawHub):** Para frontend, invoque e siga as skills de design. Componentes novos devem ser isolados e bem espaçados.
- **Multimodal Visual QA (Playwright):** Se impactou visualmente, é proibido dizer "não tenho olhos". Rode `npx playwright screenshot <url> tela.png`. Leia a imagem gerada (via VLM) para conferir se a UI quebrou.
- **Infra:** Se tocar em backend/deploy, avalie o impacto (ex: instâncias Supabase self-hosted, rotas DNS Cloudflare) lendo `.antigravity/state.json`.

**Auto-healing & Proteção (Para ambos os modos):**
Se durante a implementação ocorrerem erros de build ou testes, você tem **EXATAMENTE 3 tentativas** de correção. Na 3ª falha, PARE e rode `git reset --hard` para reverter as mudanças ao estado seguro. Avise o usuário e não tente uma 4ª vez na mesma execução.

<!-- VIBEAPPLY:END -->
