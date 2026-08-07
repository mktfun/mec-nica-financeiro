# Spec Plan: CorreçÁo de Payload do Chat e Teste E2E Oficina GPT (fix-chat-payload-and-e2e)

## Tasks

- [x] [FRONTEND] Incluir `messages: request.messages` dentro de `body` no `prepareSendMessagesRequest` em `src/routes/agente.tsx`
- [x] [BACKEND] Adicionar higienizaçÁo/mapeamento de `messages` em `supabase/functions/ai-chat/index.ts` para extrair texto de `parts` ou `content`
- [x] [BACKEND] Fazer deploy da Edge Function `ai-chat` no Supabase remoto (`npx supabase functions deploy ai-chat`)
- [x] [TEST] Executar verificaçÁo E2E via Playwright / script de teste em `http://localhost:8080/agente` com o login do usuário (`mktfunil1@gmail.com` / `Mktfunil8563*`), validando consulta sobre o Rei do Óleo
