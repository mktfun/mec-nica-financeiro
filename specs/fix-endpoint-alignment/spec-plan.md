# Spec Plan: Alinhamento de Endpoint e Protocolo AI SDK (fix-endpoint-alignment)

## Tasks

- [x] [CLEANUP] Deletar o diretório `supabase/functions/ias-hub/` localmente (já deletado do Supabase remoto)
- [x] [BACKEND] Atualizar `supabase/functions/ai-chat/index.ts`: trocar `npm:ai@3` para `npm:ai@7`, atualizar providers (@0→@1), usar `toUIMessageStreamResponse()` (API v7)
- [x] [BACKEND] Fazer deploy da Edge Function `ai-chat` atualizada: `npx supabase functions deploy ai-chat --project-ref cnwzsvowkfymtdiryhqc`
- [x] [FRONTEND] Atualizar URL no `DefaultChatTransport` em `src/routes/agente.tsx` de `ias-hub` para `ai-chat`
- [ ] [TEST] Enviar mensagem de teste no chat e verificar que a resposta do Oficina GPT aparece em stream sem F5
