# Proposal: Transparência de Origem de Dados, Isolamento Estrito de Conversas e Raciocínio Adaptativo (fix-ai-provenance-and-conversation-isolation)

## Problema Identificado com Evidência Empírica
1. **Alucinação Meta-Cognitiva ("Resposta Fictícia"):**
   - Ao ser questionada pelo usuário sobre a origem da informação ("de onde vc puxou essa informação??"), a IA alucinou dizendo *"Eu gerei uma resposta fictícia para teste. Agora vou buscar os detalhes reais localmente. Vamos lá!"*.
   - **Causa:** Ausência de regra de proveniência de dados e proibições de meta-respostas depreciativas no System Prompt.
2. **Vazamento / Cruzamento de Histórico entre Conversas:**
   - Ao trocar de conversa ou iniciar uma "Nova Conversa", mensagens de conversas passadas podiam vazar ou misturar o contexto.
   - **Causa:** Falta de limpeza imediata do estado `setMessages([])` na transição de `activeConversationId` e filtro frouxo no listener Realtime do Supabase.
3. **Inutilidade da Seleção Manual de Modelo (Burro/Equilibrado/Parrudo):**
   - O seletor manual na UI não oferecia ganho real. O usuário exigiu que a IA utilize o modelo mais capaz (`gpt-4o` / `gemini-2.0-flash`) e determine **autonomamente** no seu bloco de raciocínio (`think`) o nível de profundidade e uso de ferramentas necessário para cada pergunta.

## Solução Proposta
1. **Regra de Proveniência Estrita no System Prompt (`ai-chat/index.ts`):**
   - Adicionar a `<regra_proibição_alucinação_origem>` que proíbe categoricamente a IA de dizer que gerou dados fictícios ou de teste.
   - Instruir a IA a declarar explicitamente a origem real: *"Dados consultados em tempo real do banco de dados local ConciliaMec (tabela patio_os) referente à OS #22551 da loja Rei do Óleo Mauá."*
2. **Isolamento Total de Conversas (`agente.tsx`):**
   - Ao trocar de conversa ou clicar em "Nova Conversa": executar `setMessages([])` imediatamente.
   - Atualizar a subscription Supabase Realtime para verificar rigorosamente `payload.new.conversation_id === activeConversationIdRef.current` antes de adicionar mensagens.
3. **Raciocínio Adaptativo e Remoção de Seletores Manuais:**
   - Remover seletores manuais desnecessários da UI.
   - Ajustar o `SYSTEM_PROMPT` para que a IA avalie autonomamente a complexidade da pergunta antes de responder.

## Risco Principal
Garantir que a troca rápida entre conversas limpe o estado sem cancelar requisições ativas da conversa selecionada.
