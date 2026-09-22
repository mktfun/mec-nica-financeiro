---
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v7 (Native AGY Edition — 2026)

<constitution version="7.0" platform="Antigravity 2.0">

<execution_doctrine mode="direct_single_agent">
O Antigravity opera em **SINGLE-AGENT DIRETO (CONCURRENCY: 1)**. 
A engenharia de software, especificação, implementação e validação são executadas pelo próprio agente raiz.
- Proibido o uso de debates multi-agente para tarefas de código (elimina a amplificação de erros e o efeito telefone sem fio).
- Subagentes via invoke_subagent são restritos estritamente a pesquisas paralelas de LEITURA (grep, busca na web, análise de documentação) quando explicitamente solicitado.
- Subagentes JAMAIS podem editar código, commitar, rodar push ou fazer rollbacks.
- O Council Debate multi-agente é reservado EXCLUSIVAMENTE para stress-tests arquiteturais pontuais quando o usuário chamar /council.
</execution_doctrine>

<output_policy anti_waffling="true">
- Tom de comunicação: Especialista para especialista, direto, conciso e técnico.
- ZERO prosa desnecessária, zero pedidos de desculpas, zero monólogos filosóficos.
- Entregue diagnósticos objetivos, planos em bullet points, diffs cirúrgicos e relatórios de verificação de terminal.
</output_policy>

<circuit_breakers>
<breaker name="plan-first" phase="before_code_mutation">
<rule>NENHUM arquivo de código (src/, lib/, supabase/, componentes) pode ser criado, modificado ou deletado sem PLANO APROVADO.</rule>
<enforcement>
1. Antes de qualquer escrita de código, gere um checklist em bullet points contendo:
   - Causa-raiz diagnosticada.
   - Blast Radius: Lista exata dos arquivos que serão tocados e dependências filhas afetadas (consulte o grafo).
   - Comando de verificação de terminal (build/typecheck/teste).
2. PARE IMEDIATAMENTE e aguarde a aprovação explícita do usuário (via Planning Mode do Antigravity ou comando /sdd-apply).
3. Modificações fora dos arquivos listados no plano aprovado são CATEGORICAMENTE BLOQUEADAS.
</enforcement>
</breaker>

<breaker name="terminal-gate-and-rollback" phase="after_code_mutation">
<rule>Toda mutação de código deve ser verificada imediatamente no terminal.</rule>
<enforcement>
1. Após aplicar uma alteração, execute o comando de verificação rápida (build / typecheck). Zero testes de browser/frontend.
2. Se a verificação FALHAR: execute ROLLBACK IMEDIATO da alteração antes de tentar outra hipótese.
3. TERMINANTEMENTE PROIBIDO fazer "conserto sobre conserto" acumulando erros em cascata.
4. Ao passar no teste: PARE IMEDIATAMENTE para validação do usuário antes de qualquer arquivamento ou commit.
</enforcement>
</breaker>
</circuit_breakers>

<surgical_mutation_rules>
- Use sempre edições cirúrgicas pontuais (substituição exata de blocos via replace_file_content).
- PROIBIDO reescrever arquivos inteiros para consertar bugs locais.
- Preserve 100% dos imports, contratos de interface, helpers e comentários existentes não relacionados à mudança.
- Não faça "faxina" ou refatoração cosmética não solicitada em arquivos vizinhos.
</surgical_mutation_rules>

<ui_design_guardrails standard="shadcn_zinc950">
Este projeto segue rigorosamente o padrão de Design System do DESIGN.md (Shadcn/ui + Tailwind com CSS Variables):
1. ZERO ARBITRARY CLASSES:
   - PROIBIDO o uso de classes arbitrárias: nunca use hexadecimais soltos (ex.: bg-[#09090b], text-[#121212]) ou tamanhos arbitrários (w-[320px]).
   - Use estritamente as classes utilitárias da escala Tailwind e os tokens semânticos.
2. TOKENS SEMÂNTICOS OBRIGATÓRIOS:
   - Backgrounds: Use EXCLUSIVAMENTE bg-background, bg-card, bg-muted ou bg-secondary.
   - Textos: Use EXCLUSIVAMENTE text-foreground, text-muted-foreground e text-primary.
   - Bordas: Use EXCLUSIVAMENTE border-border ou border-border/40.
3. REGRA DO DARK MODE E "NO PURE BLACK":
   - PROIBIDO o uso de preto puro (#000000, bg-black) no código dos componentes. O fundo padrão é Zinc-950 (bg-background).
   - O controle de preto total/OLED é feito centralizadamente nas CSS Variables em globals.css, garantindo que toda a UI escureça de forma idêntica.
   - Hierarquia de elevação de superfícies:
     - Nível 0 (Canvas): bg-background (Zinc-950)
     - Nível 1 (Cards e Painéis): bg-card border border-border/50 (Zinc-900)
     - Nível 2 (Popovers e Modais): bg-popover border border-border
</ui_design_guardrails>

<graphify_intelligence>
O Graphify é a ferramenta de inteligência topológica do projeto:
- No Proposal: Execute graphify explain "<modulo>" ou graphify query "<termo>" para mapear o Blast Radius real antes de propor edições.
- No Archive: Execute graphify update para sincronizar o grafo com o código entregue e execute a limpeza de resíduos temporários (.tmp/, logs).
- O comando de terminal é graphify (um Y), pacote Python graphifyy.
</graphify_intelligence>

<core_workflows>
- /sdd-proposal: Gera a tríade SDD (proposal.md, design.md, spec-plan.md) com mapeamento de Blast Radius via Graphify e aplica Hard Stop imediato.
- /sdd-apply: Executa as tasks aprovadas de forma cirúrgica e sequencial, roda o Terminal Gate (build limpo) e aplica Hard Stop para teste humano.
- /sdd-archive: Executa o Quality Gate final, limpa resíduos transitórios (.tmp/, logs), atualiza o grafo (graphify update), salva memória duradoura e realiza commit atômico controlado.
- /sdd-debug: Diagnóstico forense em logs reais e banco via SQL, com teste e rollback em caso de falha.
- /council: Deliberação multi-agente pontual para decisões de arquitetura sob demanda.
</core_workflows>

<clean_workspace>
- Arquivos temporários e dumps de dados residem exclusivamente em .tmp/ e NUNCA são commitados.
- Se git não estiver no PATH: use C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe.
- Se PowerShell acusar erro de Execution Policy: envolva em cmd.exe /c "<comando>".
</clean_workspace>

<mcp_tools>
O Antigravity 2.0 possui 4 MCPs instalados e ativos. Use-os conforme o contexto — nunca os ignore silenciosamente.

### 1. lazyweb — Pesquisa Competitiva de UX (42 tools)
- **Quando usar:** SEMPRE que a task envolver criação de nova tela, componente de UI, paywall, pricing, landing page ou dashboard. Consulte ANTES de propor qualquer estrutura visual.
- **Lembre ao usuário que essa opção existe** se o contexto for de UI e Lazyweb não foi mencionado.
- **Tools principais:** `lazyweb_search_screens` (refs de mercado), `lazyweb_generate_report` (relatório de otimização a partir de screenshot), `lazyweb_propose_ui_changes` (proposta interativa de mudanças), `lazyweb_search_experiments` (A/B tests reais).
- **REGRA CRÍTICA:** Nunca copiar schemas, regras de scoring ou lógica de produto do Lazyweb para skills ou regras. Os MCPs são a fonte de verdade; as skills apenas descrevem *quando* e *como* chamá-los.

### 2. chrome-devtools-mcp — Browser Real & QA Visual (29 tools)
- **Quando usar:** Validação visual pós-implementação, audit de Lighthouse, inspeção de erros de console/network, performance profiling.
- **Não substitui** o Terminal Gate (`npm run build`). É uma **camada adicional** após o build passar.
- **Tools principais:** `take_screenshot`, `lighthouse_audit`, `list_console_messages`, `list_network_requests`, `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight`.

### 3. supabase — DDL & Operações Diretas (27 tools)
- **Quando usar:** Via primária para migrações, inspeção de schema, logs e Edge Functions em projetos Supabase conectados.
- **Sequência obrigatória para DDL:** `list_tables` (inspecionar) → `execute_sql` (rascunho/verificação) → `apply_migration` (DDL definitivo com nome em snake_case).
- **Para diagnóstico:** `query_logs` + `get_advisors` antes de qualquer mudança no schema.
- **Fallback:** CLI local (`npx supabase db push --linked`) quando não houver `project_id` disponível.

### 4. lovable — App Builder Programático (40 tools)
- **Quando usar:** Projetos hospedados no Lovable (não para projetos locais de scratch/).
- **Tools principais:** `send_message` (instrui o agente Lovable), `get_diff` (inspeciona mudanças), `set_project_knowledge` (injeta contexto persistente), `list_projects`.
- **Projeto ativo configurado:** Financeiro/Conciliação (ver `.agent/memory/infra.md` para IDs).
</mcp_tools>

</constitution>