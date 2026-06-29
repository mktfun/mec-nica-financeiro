---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v4 (ClawHub Edition - AI Engineering)

## 1. Arquitetura Cognitiva e Orquestração (Core Principles)

- **Raciocínio Oculto Obrigatório (Thought Blocks):** Antes de invocar QUALQUER ferramenta que modifique estado (ex: criar arquivo, rodar comando), você deve estruturar seu raciocínio mental. Jamais codifique sem antes desenhar a *Decision Tree*.
- **Paralelismo de Ferramentas (Maximum Concurrency):** NUNCA execute leituras ou buscas sequenciais. Se precisar ler 3 arquivos ou buscar 2 referências, invoque as ferramentas (`view_file`, `grep_search`, `list_dir`) todas em uma mesma iteração.
- **Leitura Mandatória de Skills (Skill-First):** É EXPRESSAMENTE PROIBIDO iniciar a codificação de uma feature sem antes utilizar `view_file` nos arquivos `SKILL.md` (no ambiente de plugins) relevantes para capturar quirks de renderização e limites do sistema.
- **Desconfie do Vibe Coding Puro:** Nenhuma feature grande deve ser iniciada sem o workflow `/vibe-proposal`. A Especificação é o coração da operação.

## 2. Padrões Estritos de UI/UX e Frontend (Aesthetics Overhaul)

- **Dogma do Design Premium:** Toda UI gerada deve ter estética "Premium". Isso exige *micro-animações*, *glassmorphism* (quando aplicável) e paletas baseadas em HSL.
- **Semantic Design Tokens:** É PROIBIDO o uso de classes de cores "hardcoded" (ex: `text-red-500`, `bg-[#fff]`). O código Tailwind DEVE utilizar design tokens semânticos (ex: `text-foreground`, `bg-background`).
- **Engenharia React (Gemini Rules):** 
  - Imports devem estar no topo do arquivo. É proibido destructuring de imports grandes.
  - Prevenção rigorosa de Infinite Loops em `useEffect` (dependências de `useCallback` devem ser controladas).
- **Proibição de Browser Storage:** Em aplicações web reais (artefatos interativos), NUNCA use `localStorage`. Em artefatos dinâmicos criados no chat, prefira a API nativa `window.storage` para consistência e persistência hierárquica.

## 3. Segurança de Sistema, Limitações e Memória

- **Memória Semântica:** A memória do agente deixou de ser um dump genérico. Consulte e armazene informações segmentadas (ex: `.agent/policies/ui-rules.md`).
- **Defesas de Sistema Operacional (Windows CLI Fallback):** 
  - Se houver erro de Execution Policy com scripts `.ps1` (como `npm.ps1`), envolva o comando OBRIGATORIAMENTE em um subshell CMD: `cmd.exe /c "seu comando aqui"`.
  - NUNCA utilize o operador `&` para encadear comandos no PowerShell. Use `;`.
  - NUNCA execute `git push --force`. O commit só ocorre com permissão. Use HEREDOCs para mensagens longas.
- **Headless & MCP Constraints:** Comandos devem ser puramente CLI (variáveis de ambiente `GH_TOKEN`). Se for usar Integrações de MCP (Model Context Protocol), SEMPRE verifique o registro antes (`search_mcp_registry`) e sugira proativamente. NUNCA alucine *mock interfaces*.

## 4. ⛔ Regra Anti-Alucinação e Pesquisa Profunda (Deep Research)

**ANTES de criar qualquer coisa nova, você DEVE pesquisar o que já existe E ler a Memória.**
- **A Regra:** Use `list_dir` e `grep_search` agressivamente na fase de mapeamento (`/vibe-proposal`) para assegurar que componentes base não estão sendo duplicados. Zero suposições.

## 5. Workflows Oficiais

Toda iteração passa exclusivamente por estes comandos:

1. `/setup`: Configura o repositório base.
2. `/config-antigravity`: Injeta as regras e políticas de nível Sênior no projeto (A Bíblia da Engenharia).
3. `/vibe-council "Ideia"`: (Passo Crítico Opcional) Invoca o Conselho de 8 personas para fazer o stress-test e achar blockers lógicos.
4. `/vibe-proposal "Feature name"`: Deep Research, SDD Checklist e modelagem arquitetural.
5. `/vibe-apply <id>`: Execução do código baseada nos estados rigorosos do Checklist `[ ]` -> `[x]`.
6. `/vibe-archive <id>`: Consolida memórias semânticas, cria *git commit* e *push*.

## 6. Skills Integradas (ClawHub)
Você opera sob a jurisdição de 8 skills fundamentais (Bayesian Reasoning, Frontend-Design-Pro, Supabase, etc). Aplique-as sempre em harmonia com estas regras globais.