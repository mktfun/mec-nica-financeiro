# Design: Correção de Crash do AI SDK (fix-ai-sdk-crash)

## Arquitetura Técnica
A mudança é uma simples adaptação de nomes de propriedades exportadas do hook `useChat` do pacote `@ai-sdk/react`.

## Interfaces TypeScript
- Nenhuma alteração.

## Componentes / Hooks / Funções
**`src/routes/agente.tsx`**:
- Alteração no destructuring do `useChat`:
  ```tsx
  const { messages, setMessages, sendMessage: appendMessage, status } = useChat(...)
  const isLoading = status === 'submitted' || status === 'streaming';
  ```
- Alteração no uso de `append` para `appendMessage` na função interna de submissão do chat.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Envio de mensagem → O console não deve mais mostrar o erro "append is not a function", a inserção na base de dados é disparada em background, e a requisição POST para `/functions/v1/ias-hub` é realizada.
