# Spec Plan: Central de Agentes IAS (ias-architecture-hub)

## Tasks

- [x] [BACKEND] Criar arquivo de migration SQL para tabela `claritas_prompts` com `id, agent_role, content, version, is_active`.
- [x] [BACKEND] Criar arquivo de migration SQL para tabela `claritas_policies` com `id, policy_name, rule_definition, severity`.
- [x] [BACKEND] Criar arquivo de migration SQL para tabela `agent_reflections` com `id, conversation_id, tool_used, outcome_success, reflection_notes, policy_evaluations`.
- [x] [BACKEND] Aplicar RLS policies nessas 3 tabelas (Leitura liberada para auth.uid(), Escrita via service_role).
- [x] [BACKEND] Criar Supabase Storage Bucket `knowledge_graph` para armazenar o `graph.json` do Graphify.
- [x] [BACKEND] Criar Edge Function `ias-hub/index.ts` contendo a arquitetura de orquestração (Busca no Claritas + Critical Thinking loop).
- [x] [BACKEND] Implementar a ferramenta (`tool`) `query_knowledge_graph` dentro da Edge Function, capaz de ler o arquivo do bucket Supabase e retornar nós e arestas conectados.
- [x] [BACKEND] Implementar módulo de inserção assíncrona em `agent_reflections` no término ou falha da invocação da Edge Function.
- [x] [FRONTEND] Expandir a interface do Chat (opcionalmente) para exibir os "Thoughts/Reflections" do modelo enquanto carrega.
- [x] [TEST] Verificar cenário 1 (Busca bem-sucedida e aplicação de regra de Claritas).
- [x] [TEST] Verificar cenário 2 (Dead-end capturado e salvo no reflection).
