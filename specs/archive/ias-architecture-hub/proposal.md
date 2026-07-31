# Proposal: Central de Agentes IAS (ias-architecture-hub)

## Problema
Atualmente, o projeto utiliza um sistema de IA funcional (Oficina GPT) fortemente acoplado a _system prompts_ fixos no código (`ai-chat/index.ts`) e a RAGs limitados a buscas semânticas padrão. Conforme a aplicação cresce para atender cenários complexos (conciliação avançada, marketing, CRM e auditoria de integrações), torna-se indispensável:
1. Extrair e versionar _system prompts_ e políticas de segurança de LLMs do código fonte.
2. Permitir que o modelo "raciocine" sobre caminhos lógicos (Knowledge Graph) da codebase e das regras de negócio, não apenas blocos isolados.
3. Incorporar ciclos de "Reflexão" e auditoria contínua de "dead-ends" (becos sem saída da IA) para melhoria contínua.

Sem essa orquestração, a escalabilidade dos agentes, a visibilidade (observabilidade) do porquê certas ações são tomadas e o controle de segurança das operações autônomas ficam comprometidos.

## Solução Proposta
Implementar a **Central de Agentes IAS (Intelligent Agent System)**, consolidando duas plataformas core como motor cognitivo:
1. **Claritas (Policy & Prompt Registry):** Uma base estruturada no Supabase para catalogar e governar as "Leis", _system prompts_ e heurísticas de validação dos LLMs, garantindo transparência.
2. **Graphify (Context Engine & Auto RAG):** Um serviço que expõe o Grafo de Conhecimento (código, domínios, arquitetura) gerado pelo Graphify. Ao invés de usar apenas embeddings semânticos, a IA fará Auto RAG navegando pelos vértices e arestas do grafo.
3. **Memória de Longo Prazo Bifurcada:**
   - **Transacional:** O histórico do que foi feito (conversas, logs de sessão).
   - **Estrutural:** Regras de Claritas e do Grafo, mutáveis apenas via governança.
4. **Ciclo de Reflexão (Critical Thinking):** Agentes reportarão o sucesso ou falha da resolução ao grafo, atualizando o peso das decisões e ferramentas utilizadas.

## Contratos de Dados
**Novas Tabelas (Supabase):**
- `claritas_prompts`: Gerenciamento de prompts (`id`, `agent_role`, `content`, `version`, `is_active`).
- `claritas_policies`: Políticas e heurísticas de segurança (`id`, `policy_name`, `rule_definition`, `severity`).
- `agent_reflections`: Logs de reflexão do agente (`id`, `conversation_id`, `tool_used`, `outcome_success`, `reflection_notes`, `policy_evaluations`).

**Mutações:**
- INSERT/UPDATE em `agent_reflections` após cada ciclo completo de pensamento do LLM (registrando dead-ends ou sucessos).

**RLS Policies:**
- `claritas_prompts` e `claritas_policies`: Leituras (`SELECT`) permitidas para a role `authenticated` ou `service_role`. Escritas apenas por Admin.
- `agent_reflections`: `INSERT` pela service role via Edge Function.

## API / Interface
- **Edge Function:** `supabase/functions/ias-hub/index.ts` — O maestro. Consome `claritas_prompts`, usa MCP/Proxy para consultar o `graphify`, e decide qual ferramenta local acionar.
- **Frontend (Opcional):** Painel interno `/admin/claritas` para gestão de políticas de IA.
- **Integração MCP (Graphify Proxy):** Expansão do `mcp-proxy` para aceitar requisições de RAG que convertem queries em buscas no `graphify-out/graph.json`.

## Features Existentes Impactadas
- O hub atual de chat (`ai-chat`) passará a ser roteado ou complementado pelo `ias-hub`.
- Fluxo de contexto das Edge Functions (terá latência ligeiramente superior no 1º turno devido à validação de policies do Claritas).

## Risco Principal
- **Latência de Orquestração:** Consultar o Grafo, puxar as Políticas do Claritas e forçar o LLM a um ciclo de Critical Thinking antes de agir pode aumentar o Time to First Token (TTFT). Precisaremos otimizar usando cache de políticas no Deno Edge e buscas ultrarrápidas no Grafo.
- **Disponibilidade do Graphify:** Como Graphify é uma CLI Python local, sua exposição ao Edge Runtime na nuvem requer que o grafo exportado (`graph.json`) seja lido pelo Deno diretamente do repositório, ou via um serviço Python dedicado na infraestrutura. Optaremos por carregar o JSON estruturado diretamente ou via Supabase Storage para acesso Edge sem servidor Python 24/7.
