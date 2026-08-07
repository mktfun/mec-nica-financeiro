# Design: Erro "s is not a function" no Vercel AI SDK (chat-bug-not-a-function)

## Arquitetura Técnica

**Fluxo Corrigido (Sem Interceptador `fetch`):**
1. Usuário digita a mensagem e clica em Enviar (`PromptInput`).
2. Componente chama `sendMessage(text)`.
3. `sendMessage` grava no Supabase `messages` para histórico persistente.
4. `sendMessage` invoca `await supabase.auth.getSession()` para obter o `access_token` fresco.
5. `sendMessage` aciona `append(message, options)` passando o token em `options.headers`.
6. O `useChat` utiliza seu próprio `fetch` nativo e incorruptível para gerenciar o Stream, recebendo o token e disparando a UI otimista sem erros.

## Interfaces TypeScript
Assinatura a ser usada:
```typescript
// Vercel AI SDK Signature
append(
  message: Message | Omit<Message, 'id'>, 
  chatRequestOptions?: ChatRequestOptions
): Promise<string | null | undefined>
```

## Componentes / Hooks / Funções
1. **`src/routes/agente.tsx`**: 
   - Remover `fetch` prop do objeto passado para `useChat`.
   - Modificar a função `sendMessage(text)` para extrair o token do usuário e enviá-lo via `append({ role: 'user', content: text }, { headers: { Authorization: \`Bearer \${token}\` } })`.
   - Apenas delegar o `id` omitido para o Vercel AI SDK gerar automaticamente (remover `id: crypto.randomUUID()` caso seja fonte secundária do erro no Edge runtime).

## Fluxo de UI
A interface do Chat permanece inalterada, mas o comportamento de "travar" ao enviar a mensagem deve desaparecer. A mensagem do usuário aparecerá imediatamente, seguida do estado `isLoading` e o streaming da IA.

## Infra / Deploy
- Nenhuma dependência externa nova.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Envio Síncrono de Mensagem**
  - *Estado Inicial:* Usuário no chat sem mensagens.
  - *Ação:* Digita "Olá" e clica em enviar.
  - *Resultado Esperado:* A mensagem "Olá" aparece IMEDIATAMENTE na lista. O erro "s is not a function" não é disparado no console. A requisição HTTP para `ai-chat` leva o header `Authorization`. A resposta da IA é preenchida.
