# Proposal: Erro "s is not a function" no Vercel AI SDK (chat-bug-not-a-function)

## Problema
O usuário relatou que, ao enviar uma mensagem no chat, a IA nÁo responde e a mensagem só aparece ao recarregar a tela. Ao mesmo tempo, o console dispara o erro fatal: `Uncaught (in promise) TypeError: s is not a function`.
A tentativa anterior (bugfix-ai-chat-2) corrigiu a forma como instanciamos os headers nativos, porém, manter a sobrescrita do interceptador `fetch` dentro do hook `useChat` do `@ai-sdk/react` continua quebrando a máquina de estado interno da biblioteca. Quando o Vercel AI SDK tenta invocar callbacks internos ou gerenciar o fluxo da stream de resposta usando o `fetch` adulterado, alguma funçÁo (minificada como `s`) resulta em erro de tipagem. Isso impede a execuçÁo síncrona do `append()`, o que explica por que a mensagem salva no banco nÁo aparece instantaneamente na tela.

## SoluçÁo Proposta
1. **Remover a Sobrescrita do `fetch`:** Remover totalmente a funçÁo customizada `fetch` da configuraçÁo do `useChat` em `src/routes/agente.tsx`.
2. **Injetar Headers no `append`:** Ao invés de interceptar todas as requisições globais do hook, vamos capturar a sessÁo no momento exato do clique em "Enviar" (`sendMessage`), e passar o header de `Authorization` no segundo argumento da funçÁo `append` (`chatRequestOptions.headers`). O Vercel AI SDK foi desenhado para receber opções por requisiçÁo desta maneira sem quebrar o stream interno.

## Contratos de Dados
- Nenhuma alteraçÁo no backend.
- A funçÁo `sendMessage` buscará o token (`await supabase.auth.getSession()`) antes do `append`.

## API / Interface
- O fluxo de requisiçÁo do frontend para a Edge Function usará a assinatura oficial do AI SDK:
  `append(message, { headers: { Authorization: \`Bearer \${token}\` } })`

## Features Existentes Impactadas
- Tela `/agente` (RefatoraçÁo exclusiva do código de integraçÁo com Vercel AI SDK).

## Risco Principal
- Caso a API de Edge Function necessite de outros headers além do `Authorization` (ex: `Content-Type`), a delegaçÁo para o `append` lidará com eles nativamente, o que é mais seguro do que manipulaçÁo manual. O risco é mínimo, tratando-se do padrÁo oficial da biblioteca.
