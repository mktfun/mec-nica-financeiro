---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v5 (2026 Edition — XML Protocol)

<constitution version="5.0" platform="Antigravity 2.0">

<override_supremo priority="critical">
Se o usuário mencionar `/teamwork-preview`, pedir análise conjunta ou delegar para equipe de IA: **PARE TUDO IMEDIATAMENTE**. Não conclua o step atual, não tente resolver sozinho. Acione os subagentes via `invoke_subagent` e siga o protocolo de delegação.
</override_supremo>

<circuit_breakers>
<breaker name="anti-auto-apply" phase="proposal_completion">
<rule>O workflow sdd-proposal / vibe-proposal é EXCLUSIVAMENTE de especificação e planejamento.</rule>
<enforcement>
- Ao finalizar proposal.md, design.md e spec-plan.md: PARE IMEDIATAMENTE.
- TERMINANTEMENTE PROIBIDO criar ou editar arquivos de código (src/, lib/, supabase/) após o proposal.
- TERMINANTEMENTE PROIBIDO marcar tasks no spec-plan.md sem comando explícito.
- O turno DEVE terminar aguardando a aprovação do usuário com o comando /vibe-apply <id> ou /sdd-apply <id>.
</enforcement>
</breaker>

<breaker name="anti-auto-archive" phase="apply_completion">
<rule>O workflow sdd-apply / vibe-apply é EXCLUSIVAMENTE de implementação e verificação local.</rule>
<enforcement>
- Ao concluir as tasks, rodar o Visual QA e obter [AUDIT_PASSED]: PARE IMEDIATAMENTE.
- TERMINANTEMENTE PROIBIDO avançar automaticamente para o archive, rodar git commit/push ou mover specs/.
- O usuário DEVE testar a aplicação em localhost/preview antes de qualquer arquivamento.
- O turno DEVE terminar solicitando o teste humano e aguardando o comando /vibe-archive <id> ou /sdd-archive <id>.
</enforcement>
</breaker>
</circuit_breakers>

<core_principles>
<principle name="sdd_first">
Nenhuma feature ou refatoração estrutural começa sem especificação física prévia em specs/<id>/.
</principle>

<principle name="modular_memory">
A memória reside em arquivos .agent/memory/<categoria>.md (Obsidian), nunca no contexto transitório da IA. Leia antes de propor, consulte antes de aplicar e escreva no archive.
</principle>

<principle name="headless_cli">
Operação 100% headless. Jamais use comandos que exijam login interativo no navegador. Injete GH_TOKEN e SUPABASE_ACCESS_TOKEN via ambiente silenciosamente.
</principle>

<principle name="doe_self_annealing">
Erros de execução e bugs são fontes obrigatórias de endurecimento do sistema. Toda resolução em sdd-debug atualiza a memória Obsidian e eleva regras universais para prevenir repetição.
</principle>

<principle name="clean_workspace">
Arquivos temporários e dumps de dados residem exclusivamente em .tmp/ e NUNCA são commitados no repositório. Entregáveis residem em specs/, src/ e supabase/.
</principle>

<principle name="cli_fallbacks">
- Se git não estiver no PATH: use C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe
- Se PowerShell acusar erro de Execution Policy: envolva em cmd.exe /c "<comando>"
- Em caso de "Author identity unknown": configure git config user.email "ai@clawhub.com" antes de commitar.
</principle>
</core_principles>

<anti_hallucination>
<directive>ANTES de criar qualquer código, pesquise o código legado, consulte a memória e execute o grafo topológico.</directive>

<domain_checks>
<check domain="Frontend">
Leia .agent/memory/ui.md e consulte spec/global/features.md.
Carregue: skills/ui-components/SKILL.md e skills/ui-motion/SKILL.md (se houver animações).
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
Graphify é uma ferramenta Python (pacote graphifyy com dois Y's, comando graphify com um Y):
- Consultar: graphify query "<termo>" e graphify explain "<modulo>"
- Atualizar: graphify update
- NUNCA use npx @baml/graphify.
</check>
</domain_checks>
</anti_hallucination>

<workflows_and_skills>
<mode name="Solo" type="Direct Execution">
Ideal para bugs pontuais, refatores locais e tarefas diretas com 1 único agente:
- /vibe-proposal-solo: Planejamento direto com leitura de legado e grafo -> Hard Stop.
- /vibe-apply-solo: Implementação sequencial com build local e Visual QA -> Hard Stop.
</mode>

<mode name="Team" type="Multi-Agent Orchestrated">
Ideal para features completas, módulos novos e arquiteturas full-stack:
- /vibe-proposal (ou /sdd-proposal): Orchestrator despacha Research Agents por domínio e valida com Validator Agent -> Hard Stop.
- /vibe-apply (ou /sdd-apply): Orchestrator delega tasks para agentes especialistas, valida com Validator e audita com Auditor Agent -> Hard Stop.
</mode>

<lifecycle_closing>
- /vibe-archive (ou /sdd-archive): Quality Gate, escrita no Obsidian, /learn, graphify update e git commit controlado.
- /vibe-debug (ou /sdd-debug): Diagnóstico forense com logs reais, inspeção SQL e repair bayesiano em até 3 tentativas.
</lifecycle_closing>
</workflows_and_skills>

<specialized_agents>
Os agentes especializados residem em .agent/agents/:
- research-agent.md: Pesquisa profunda multi-domínio, inspeção de código legado (AST Skeleton) e Grafo.
- frontend-agent.md: Implementação UI/React/shadcn com ui-components e ui-motion.
- backend-agent.md: Server Actions tipadas, validação Zod e fluxos de Auth.
- database-agent.md: Schema Supabase, migrations SQL e policies RLS.
- validator-agent.md: Revisão independente de specs e outputs de código antes do merge.
- auditor-agent.md: Auditoria de final de ciclo (7 dimensões) antes do archive.
- bug-agent.md: Investigação de falhas em logs e banco com hipóteses bayesianas.
</specialized_agents>

<skill_catalog>
Consulte sempre skills/INDEX.md para o roteamento de contexto:
- saas-scaffold: Criação de projetos SaaS do zero (Next.js + Supabase + shadcn).
- ui-components: Componentes universais, Dark UI Zinc-950 e landing pages cinematográficas.
- ui-motion: Animações Magic UI e micro-interações.
- database: Padrões de banco, RLS multi-tenant e migrations.
- auth: Autenticação segura SSR Supabase JWT.
- backend-patterns: Server Actions tipadas ActionResult<T>.
- deploy-production: Prontidão para produção e Core Web Vitals.
- obsidian: Gestão da memória modular persistente do projeto.
- council-debate: Conselho multi-agente para stress-test de decisões arquiteturais.
</skill_catalog>

</constitution>