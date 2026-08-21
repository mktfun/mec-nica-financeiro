---
description: Workflow Global de Auditoria e Implementação da "Bíblia da IA". Verifica a saúde do agente, força a leitura de SKILLs locais, audita diretórios de memória semântica e recalibra as heurísticas cognitivas de projeto.
---

<!-- CONFIG-ANTIGRAVITY:START -->

**Objetivo**
Este comando atua como o "Reboot Cognitivo" do Agente. Se o agente esquecer suas heurísticas, este comando reinstaura os padrões sênior de Orquestração, Paralelismo, Deep Research, Design Aesthetics Premium e Segurança Estrita no projeto.

**Passos Iniciais Obrigatórios (Audit Cycle):**

1. **Validação Estrutural de Memory Continuum:**
   - Verifique a existência de `.agent/policies/`. Se não existir, instancie a pasta. 
   - Certifique-se de que os aprendizados passados estejam segmentados (ex: `ui-rules.md`, `backend-rules.md`, `security.md`) para não haver amnésia sistêmica ou dumping massivo em `memory.md`.

2. **Skill-First Initialization Check:**
   - Use `list_dir` para mapear os plugins instalados no sistema (ex: `C:\Users\admin\.gemini\config\plugins\`) ou em repositórios vizinhos.
   - Force o carregamento mental de qualquer `SKILL.md` pertinente que o agente esteja ignorando. O agente NUNCA deve iniciar codificação web sem ler o skill `modern-web-guidance-plugin` e `frontend-design` equivalentes.

3. **Injeção de Thought Blocks & Concurrency:**
   - Faça um auto-diagnóstico (`bayesian-reasoning`). Avalie se, na última interação, as chamadas de ferramentas foram sequenciais ou paralelas. Configure seu "System Prompt" interno para MAXIMIZAR paralelismo (não rodar um `view_file` e esperar acabar para rodar outro `view_file`).

4. **Auditoria de Aesthetics (UI Premium) & React Rules:**
   - Analise se o projeto já possui dependências de UI injetadas. Imponha mentalmente as regras do Gemini (imports ESM no topo) e v0/Lovable (Sem arbitrary classes no Tailwind, use Design Tokens). 
   - Notifique o usuário sobre qualquer débito técnico UI identificado e sugira uma Spec de melhoria se necessário.

5. **Fallbacks de Segurança Prontos para Uso:**
   - Tenha em mente os fallbacks absolutos para Windows: `cmd.exe /c "npm ..."` e o `git` MinGit fallback. Em ambientes onde `npm.ps1` é barrado por Execution Policies, use SEMPRE O CMD.

**Finalização:**
Ao final do `/config-antigravity`, liste para o usuário em um log sucinto (via chat) os módulos que foram auditados e confirmados, declarando que o "Sistema Antigravity está online, armado com heuristics Sênior de SDD, Paralelismo Máximo e Aesthetics Engine ativa".

<!-- CONFIG-ANTIGRAVITY:END -->
