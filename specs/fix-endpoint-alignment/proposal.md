# Proposal: Alinhamento de Endpoint e Protocolo AI SDK (fix-endpoint-alignment)

## Problema
O frontend está apontando para a Edge Function errada (`ias-hub`, que foi criada por erro e já foi deletada), e deve usar `ai-chat` que já existe há 13 dias com 18 deploys e contém toda a lógica de negócio real (System Prompt com identidade "Oficina GPT", ferramentas de consulta de OS, financeiro, etc.).

Além disso, existe uma incompatibilidade de protocolo de streaming:
- **Edge Function `ai-chat`**: usa `npm:ai@3` → emite protocolo de streaming v1 (text stream simples)
- **Frontend `@ai-sdk/react@4.0.45`**: espera protocolo de streaming v2 (JSON event stream)

Essa incompatibilidade causa erros 400 e respostas inválidas. A soluçÁo correta é **atualizar `ai-chat` de ai@3 para ai@4** (ou downgrade do client para @ai-sdk/react@3). Dado que o frontend já tem ai@7 instalado (que é o SDK v4), a estratégia mais segura é **atualizar a Edge Function para ai@7**.

> ⚠️ Importante: A pasta `supabase/functions/ias-hub/` ainda existe localmente no repo, mas a funçÁo já foi deletada do Supabase remoto. A pasta deve ser deletada localmente também para nÁo causar futuros deploys acidentais.

## SoluçÁo Proposta
1. **Deletar `supabase/functions/ias-hub/`** localmente — funçÁo duplicada que nÁo devia existir.
2. **Atualizar `supabase/functions/ai-chat/index.ts`** — trocar `npm:ai@3` por `npm:ai@7` e `streamText` para o novo import. O `toDataStreamResponse` da v4 emite o protocolo v2 que o frontend espera. As ferramentas (`toolsLocal`, `toolsOficina`) nÁo precisam mudar pois a API de `tool()` é retrocompatível entre v3 e v4.
3. **Atualizar `src/routes/agente.tsx`** — trocar a URL do transport de `ias-hub` para `ai-chat` e remover `DefaultChatTransport` (simplesmente configurar via `api` no `useChat`).
4. **Redirecionar o `conversation_id`**: A funçÁo `ai-chat` recebe `{ messages }` mas nÁo usa `conversation_id` no body. Para que o `onFinish` do frontend saiba em qual conversa salvar a resposta, continua usando o `activeConversationIdRef` — nÁo precisa mudar o schema da funçÁo.

## Contratos de Dados
- Tabelas envolvidas: `messages`, `conversations`, `ai_settings` (sem alteraçÁo de schema)
- A Edge Function `ai-chat` recebe: `{ messages: UIMessage[] }` via POST
- O `conversation_id` continua sendo gerenciado exclusivamente pelo frontend via `activeConversationIdRef`

## API / Interface
- **Endpoint final:** `${VITE_SUPABASE_URL}/functions/v1/ai-chat`
- **`useChat` hook:** apontar para `ai-chat`, injetar Authorization via `prepareSendMessagesRequest` no `DefaultChatTransport` (padrÁo já implementado — só troca a URL)
- **Sem mudanças** nas props do `PromptInput`, `MessageList` nem no schema do Supabase

## Features Existentes Impactadas
- `src/routes/agente.tsx`: A URL do transport precisa trocar de `ias-hub` para `ai-chat`
- `supabase/functions/ai-chat/index.ts`: AtualizaçÁo de ai@3 para ai@7

## Risco Principal
A API de streaming do `toDataStreamResponse()` entre ai@3 e ai@7 pode ter mudado a assinatura. Precisa garantir que o `streamText` da ai@7 retorna `toDataStreamResponse()`. Se nÁo existir, usar `toAIStreamResponse()` como fallback. A funçÁo `toolsLocal` e `toolsOficina` usam o formato `tool({ description, parameters, execute })` que é idêntico entre v3 e v4/v7.
