# Design: CorreçÁo de Crash do AI SDK (fix-ai-sdk-crash)

## Arquitetura Técnica
A mudança é uma simples adaptaçÁo de nomes de propriedades exportadas do hook `useChat` do pacote `@ai-sdk/react`.

## Interfaces TypeScript
- Nenhuma alteraçÁo.

## Componentes / Hooks / Funções
**`src/routes/agente.tsx`**:
- AlteraçÁo no destructuring do `useChat`:
  ```tsx
  const { messages, setMessages, sendMessage: appendMessage, status } = useChat(...)
  const isLoading = status === 'submitted' || status === 'streaming';
  ```
- AlteraçÁo no uso de `append` para `appendMessage` na funçÁo interna de submissÁo do chat.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Envio de mensagem → O console nÁo deve mais mostrar o erro "append is not a function", a inserçÁo na base de dados é disparada em background, e a requisiçÁo POST para `/functions/v1/ias-hub` é realizada.
