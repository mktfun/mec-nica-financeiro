# Spec Plan: Agrupamento de Turnos do Assistente, Passo a Passo Unificado e Persistência Pós-F5 (fix-chat-turn-aggregation-and-persistence)

## Tasks

- [x] [FRONTEND] Implementar `aggregateAssistantTurns` em `src/components/chat/MessageList.tsx` para mesclar mensagens consecutivas de assistente em um único turno com avatar único e acordeão de ferramentas unificado
- [x] [FRONTEND] Atualizar `onFinish` em `src/routes/agente.tsx` para garantir a extração e salvamento do texto completo consolidado do assistente no banco Supabase
- [x] [TEST] Executar teste E2E via Playwright (`node test_e2e.js`) enviando a mensagem da OS `22551`, validando que existe apenas 1 avatar/balão do Oficina GPT com o acordeão de passo a passo
- [x] [TEST] Simular F5 no teste Playwright (`page.reload()`) e capturar screenshot pós-refresh provando a persistência perfeita da resposta no histórico
