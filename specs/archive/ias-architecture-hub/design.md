# Design: Central de Agentes IAS (ias-architecture-hub)

## Arquitetura Técnica

**Fluxo de Dados Ponta a Ponta (Auto RAG + Claritas + Reflexão):**

1. **Trigger:** Usuário (ou automação) envia uma requisição para a Edge Function `ias-hub`.
2. **Retrieve Policies (Claritas):** `ias-hub` consulta o banco (`claritas_prompts` e `claritas_policies`) com cache via Deno KV para obter a "Constituição" aplicável ao agente atual.
3. **Context Graph Engine (Graphify):** A Edge Function consulta o `graph.json` hospedado (auto RAG). Ao invés de buscar apenas no texto, o agente usa uma *tool* `query_knowledge_graph` para navegar nas dependências e entender o contexto sistêmico do problema (ex: fluxo de conciliação).
4. **Critical Thinking Loop:**
   - O LLM analisa as regras de Claritas + o Contexto do Grafo.
   - Gera um plano (Chain of Thought).
5. **Ação:** O LLM invoca ferramentas (Supabase RPCs, APIs de terceiros).
6. **Reflexão:** Após a ação (sucesso ou falha/dead-end), a Edge Function grava um registro assíncrono em `agent_reflections` consolidando a experiência (o que funcionou vs o que violou políticas), alimentando o aprendizado.

## Interfaces TypeScript

```typescript
// Banco: claritas_prompts
export interface ClaritasPrompt {
  id: string;
  agent_role: string;
  content: string; // Ex: "Você é um agente financeiro..."
  version: string;
  is_active: boolean;
  created_at: string;
}

// Banco: claritas_policies
export interface ClaritasPolicy {
  id: string;
  policy_name: string; // Ex: "Strict_Confidentiality"
  rule_definition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Banco: agent_reflections
export interface AgentReflection {
  id: string;
  conversation_id: string;
  tool_used: string | null;
  outcome_success: boolean;
  reflection_notes: string;
  policy_evaluations: any; // JSONB
  created_at: string;
}
```

## Componentes / Hooks / Funções
1. **[BACKEND] Edge Function `ias-hub`:** Controlador central. Substitui ou envolve a inteligência atual.
2. **[BACKEND] Supabase Migrations:** Para criação das 3 tabelas (`claritas_prompts`, `claritas_policies`, `agent_reflections`).
3. **[FRONTEND] Componente `<ClaritasPolicyList />`:** (Opcional/Admin) Interface headless para visualizar as regras e políticas ativas.
4. **[BACKEND] Tool `GraphifyQuery`:** Ferramenta MCP anexada ao LLM permitindo que ele consulte nós e arestas do grafo pré-processado (`graph.json`).

## Fluxo de UI
A integração é majoritariamente **Backend / Edge**. Contudo, o usuário poderá perceber o ciclo de "Critical Thinking" através de logs expostos no frontend do Chat (UI já existente), mostrando _"Consultando políticas..."_ ou _"Validando grafo de conhecimento..."_ antes da resposta final.

## Infra / Deploy
- As tabelas e policies residirão no Supabase (`database`).
- O `graph.json` gerado pelo comando CLI do Graphify será movido para o **Supabase Storage** (bucket `knowledge_graph`) a cada CI/CD (ou manualmente via workflow), permitindo que o Deno Edge acesse o grafo dinamicamente e de forma escalável, sem precisar ler do File System do repositório em tempo de execução.
- Deno Edge Functions consumirão o Graphify via Fetch ao Storage.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Automação RAG com Políticas**
  - *Estado Inicial:* Usuário pergunta "Como funciona o fluxo de webhook da maquininha?".
  - *Ação:* O `ias-hub` injeta a política de Segurança Claritas, o LLM usa a tool do Grafo para achar o `webhook-rede.ts`, reflete sobre o achado, e responde de forma limpa.
  - *Resultado Esperado:* A resposta é baseada no código real mapeado pelo Grafo e a reflexão é logada na tabela `agent_reflections`.

- **Cenário 2: Dead-End Handling (Ciclo de Melhoria)**
  - *Estado Inicial:* LLM tenta usar uma ferramenta inexistente ou viola uma heurística de segurança Claritas.
  - *Ação:* A execução falha propositalmente (Guardrail trigger).
  - *Resultado Esperado:* A falha é interceptada, o usuário recebe um aviso elegante, e a tabela `agent_reflections` recebe um log detalhado apontando o `outcome_success: false` para auditoria humana e melhoria da prompt.
