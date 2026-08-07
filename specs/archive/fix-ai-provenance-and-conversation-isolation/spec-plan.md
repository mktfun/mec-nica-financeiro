# Spec Plan: Transparência de Origem de Dados, Isolamento Estrito de Conversas e Raciocínio Adaptativo (fix-ai-provenance-and-conversation-isolation)

## Tasks

- [x] [BACKEND] Adicionar `<regra_proibiçÁo_alucinaçÁo_origem>` e `<raciocinio_adaptativo>` no `SYSTEM_PROMPT` em `supabase/functions/ai-chat/index.ts`
- [x] [BACKEND] Fazer deploy da Edge Function `ai-chat` com o novo System Prompt de proveniência
- [x] [FRONTEND] Implementar isolamento estrito de histórico e filtro de Realtime por `conversation_id` em `src/routes/agente.tsx`
- [x] [TEST] Executar teste E2E via Playwright (`node test_e2e.js`) enviando "de onde vc puxou essa informaçÁo??" e comprovando a resposta profissional de proveniência de dados sem alucinações fictícias
- [x] [TEST] Comprovar o isolamento completo de conversas ao alternar para uma "Nova Conversa" sem vazamento de histórico
