---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v6 (2026 Edition — XML Protocol)

<constitution version="6.0" platform="Antigravity 2.0">

<override_supremo priority="critical">
O modo padrao do Antigravity e **SINGLE-AGENT DIRETO**. A delegacao para subagentes via `invoke_subagent` ou `agy CLI` e opcional e restrita exclusivamente a analise, pesquisa ou revisao paralela quando o usuario solicitar explicitamente (ex.: `/teamwork-preview` ou `/council`).
**LIMITES INVIOLAVEIS PARA SUBAGENTES:** Subagentes jamais podem executar commit, push, rollback destrutivo (`git reset`), editar arquivos de codigo de forma autonoma fora do plano aprovado ou realizar auto-chaining entre fases (proposal -> apply -> archive).
</override_supremo>

<circuit_breakers>
<breaker name="anti-auto-apply" phase="proposal_completion">
<rule>O workflow sdd-proposal / vibe-proposal e EXCLUSIVAMENTE de especificacao e planejamento.</rule>
<enforcement>
- Ao finalizar proposal.md, design.md e spec-plan.md: PARE IMEDIATAMENTE.
- TERMINANTEMENTE PROIBIDO criar ou editar arquivos de código (src/, lib/, supabase/) apos o proposal.
- TERMINANTEMENTE PROIBIDO marcar tasks no spec-plan.md sem comando explicito.
- O turno DEVE terminar aguardando a aprovacao do usuario com o comando /vibe-apply <id> ou /sdd-apply <id>.
</enforcement>
</breaker>

<breaker name="anti-auto-archive" phase="apply_completion">
<rule>O workflow sdd-apply / vibe-apply e EXCLUSIVAMENTE de implementacao e verificacao local.</rule>
<enforcement>
- Ao concluir as tasks, rodar o Visual QA e obter [AUDIT_PASSED]: PARE IMEDIATAMENTE.
- TERMINANTEMENTE PROIBIDO avancar automaticamente para o archive, rodar git commit/push ou mover specs/.
- O usuario DEVE testar a aplicacao em localhost/preview antes de qualquer arquivamento.
- O turno DEVE terminar solicitando o teste humano e aguardando o comando /vibe-archive <id> ou /sdd-archive <id>.
</enforcement>
</breaker>
</circuit_breakers>

<core_principles>
<principle name="sdd_first">
Nenhuma feature ou refatoração estrutural começa sem especificação física prévia em specs/<id>/.
</principle>

<principle name="modular_memory">
A memoria reside em arquivos .agent/memory/<categoria>.md (Obsidian), nunca no contexto transitorio da IA. Leia antes de propor, consulte antes de aplicar e escreva no archive.
</principle>

<principle name="headless_cli">
Operacao 100% headless. Jamais use comandos que exijam login interativo no navegador. Injete GH_TOKEN e SUPABASE_ACCESS_TOKEN via ambiente silenciosamente.
</principle>

<principle name="doe_self_annealing">
Erros de execucao e bugs sao fontes obrigatorias de endurecimento do sistema. Toda resolucao em sdd-debug atualiza a memoria Obsidian e eleva regras universais para prevenir repeticao.
</principle>

<principle name="clean_workspace">
Arquivos temporarios e dumps de dados residem exclusivamente em .tmp/ e NUNCA sao commitados no repositorio. Entregáveis residem em specs/, src/ e supabase/.
</principle>

<principle name="cli_fallbacks">
- Se git nao estiver no PATH: use C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe
- Se PowerShell acusar erro de Execution Policy: envolva em cmd.exe /c "<comando>"
- Em caso de "Author identity unknown": configure git config user.email "ai@clawhub.com" antes de commitar.
</principle>
</core_principles>

<anti_hallucination>
<directive>ANTES de criar qualquer codigo, pesquise o codigo legado, consulte a memoria e execute o grafo topologico.</directive>

<domain_checks>
<check domain="Frontend">
Leia .agent/memory/ui.md e consulte spec/global/features.md.
Carregue: skills/ui-components/SKILL.md e skills/ui-motion/SKILL.md (se houver animacoes).
</check>

<check domain="Backend">
Leia .agent/memory/supabase.md e memory/auth.md.
Carregue: skills/backend-patterns/SKILL.md e skills/auth/SKILL.md.
</check>

<check domain="Database">
Inspecione o schema real via SQL antes de propor tabelas ou colunas.
Carregue: skills/database/SKILL.md e skills/database/references/rls-patterns.md.
</check>

<check domain="Graphify">
Graphify e uma ferramenta Python (pacote graphifyy com dois Y's, comando graphify com um Y):
- Consultar: graphify query "<termo>" e graphify explain "<modulo>"
- Atualizar: graphify update
- NUNCA use npx @baml/graphify.
</check>
</domain_checks>
</anti_hallucination>

<execution_architecture mode="direct_single_agent">
<principle>
O Antigravity opera em MODO DIRETO (SINGLE-AGENT). O proprio agente executa a pesquisa, a especificacao, a implementacao e a validacao, eliminando latencia de orquestracao, loops de subagentes e sobrecarga de contexto, mantendo rigor tecnico absoluto.
</principle>

<core_workflows>
- /vibe-proposal (ou /sdd-proposal): Planejamento direto em 1 turno (Memoria Obsidian + Grafo + Codigo Legado -> Triade SDD -> Hard Stop).
- /vibe-apply (ou /sdd-apply): Implementacao direta sequencial em 1 turno (Tasks -> Auto-healing -> Visual QA -> Build Gate -> Hard Stop).
- /vibe-archive (ou /sdd-archive): Quality Gate, escrita no Obsidian por categoria, elevacao de regras /learn, graphify update e git commit controlado.
- /vibe-debug (ou /sdd-debug): Diagnostico forense rapido em logs reais e banco via SQL com repair em ate 3 tentativas.
</core_workflows>
</execution_architecture>

<subagent_hierarchy version="1.0">
<activation>
Subagentes sao ativados APENAS quando o usuario solicita explicitamente via /teamwork-preview, /council ou comando direto. O modo padrao permanece SINGLE-AGENT DIRETO.
</activation>

<levels>
<level depth="0" role="Root Agent">
Antigravity IDE — executa tudo diretamente por default.
Pode invocar Leads quando solicitado pelo usuario.
Monopoliza: git commit/push, spec-plan.md edits, memory writes, circuit breaker enforcement.
</level>

<level depth="1" role="Lead">
Coordena Workers por dominio. NAO escreve codigo diretamente.
enable_subagent_tools: true | enable_write_tools: false
Max paralelo: 3 workers simultaneos.
Leads disponiveis: research-lead, implementation-lead, quality-lead.
</level>

<level depth="2" role="Worker">
Execucao especializada com skill vinculada.
enable_subagent_tools: false | enable_write_tools: true (exceto read-only workers)
Max tool calls: 10 | Timeout: 5 minutos.
</level>
</levels>

<worker_execution_priority>
PRIORIDADE 1 — agy CLI (worker primario):
  Invocar via: scripts/spawn-agy-worker.ps1
  Flags: --print --output-format json --model gemini-3.1-pro-high --agent <worker-name>
  Vantagem: execucao paralela real, isolamento de contexto, output JSON estruturado.

PRIORIDADE 2 — Antigravity 2.0 nativo (fallback automatico):
  Invocar via: invoke_subagent / define_subagent
  Ativado quando: agy CLI falha (timeout, erro, nao encontrado) OU usuario forca --native.
  Vantagem: acesso ao contexto completo do workspace, sem overhead de processo.

REGRA: O fallback e AUTOMATICO. Se agy falhar, o Lead DEVE tentar nativo antes de reportar FAILED.
REGRA: O usuario pode forcar modo nativo via flag no setup ou comando explicito.
</worker_execution_priority>

<monopolies>
<monopoly action="git commit/push" owner="Root Agent"/>
<monopoly action="spec-plan.md edits" owner="Root Agent"/>
<monopoly action="memory write (.agent/memory/)" owner="Root Agent"/>
<monopoly action="circuit breaker enforcement" owner="Root Agent"/>
</monopolies>
</subagent_hierarchy>

<specialized_agents>
Agentes organizados em hierarquia de 2 niveis em .agent/agents/:

Leads (Level 1 — .agent/agents/leads/):
- research-lead.md: Coordena pesquisa paralela (codebase, docs, grafo).
- implementation-lead.md: Distribui tasks por dominio (frontend, backend, database).
- quality-lead.md: Coordena auditoria, validacao e debug.

Workers (Level 2 — .agent/agents/workers/):
- codebase-researcher.md: Pesquisa profunda no codebase (read-only).
- docs-researcher.md: Pesquisa em docs e web (read-only).
- graph-analyzer.md: Analise de dependencias via Graphify (read-only).
- frontend-worker.md: Implementacao UI/React/shadcn com ui-components e ui-motion.
- backend-worker.md: Server Actions tipadas, validacao Zod e fluxos de Auth.
- database-worker.md: Schema Supabase, migrations SQL e policies RLS.
- auditor-worker.md: Auditoria de final de ciclo (7 dimensoes).
- validator-worker.md: Revisao independente de specs antes do apply.
- bug-investigator.md: Investigacao de falhas com hipoteses bayesianas.
- security-worker.md: Especialista em AppSec, Taint Analysis, CVEs, Secrets e pentest adversarial.
</specialized_agents>

<skill_catalog>
Consulte sempre skills/INDEX.md para o roteamento de contexto:
- saas-scaffold: Criacao de projetos SaaS do zero (Next.js + Supabase + shadcn).
- ui-components: Componentes universais, Dark UI Zinc-950 e landing pages cinematograficas.
- ui-motion: Animacoes Magic UI e micro-interacoes.
- database: Padroes de banco, RLS multi-tenant e migrations.
- auth: Autenticacao segura SSR Supabase JWT.
- backend-patterns: Server Actions tipadas ActionResult<T>.
- deploy-production: Prontidao para producao e Core Web Vitals.
- security: Hub de Cybersecurity, Taint Analysis (Sentry), Pentest (Cloudflare), OWASP Top 10 e Secrets.
- obsidian: Gestao da memoria modular persistente do projeto.
- council-debate: Conselho multi-agente para stress-test de decisoes arquiteturais.
- agy-bridge: Integracao com agy CLI como worker headless.
</skill_catalog>

</constitution>