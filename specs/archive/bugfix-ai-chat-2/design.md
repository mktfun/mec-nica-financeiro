# Design: Correção de Erro Interno (s is not a function) no AI SDK (bugfix-ai-chat-2)

## Arquitetura Técnica
A correção ocorrerá no componente frontend localizado em `src/routes/agente.tsx`.

**Fluxo de Header Corrigido:**
```tsx
fetch: async (url, options) => {
  const { data } = await supabase.auth.getSession();
  const reqHeaders = new Headers(options?.headers); // ✨ Preserva os Headers nativos do AI SDK
  if (data.session?.access_token) {
    reqHeaders.set('Authorization', \`Bearer \${data.session.access_token}\`);
  }
  return fetch(url, { ...options, headers: reqHeaders });
}
```

**Fluxo de Append Corrigido:**
```tsx
append({ id: crypto.randomUUID(), role: 'user', content: text });
```

## Interfaces TypeScript
Nenhuma mudança de interfaces TypeScript.

## Componentes / Hooks / Funções
**`src/routes/agente.tsx`**:
- Função interna de `fetch` do hook `useChat`.
- Função `sendMessage`.

## Fluxo de UI
A UI permanecerá exatamente a mesma (Layout Limpo).

## Infra / Deploy
Sem alterações de infra.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Enviar mensagem] → Usuário envia "Oi" no chat vazio → O erro "s is not a function" não aparece no console, o request não perde os Headers, e a mensagem do usuário só aparece 1 vez, com o assistente começando a responder imediatamente a seguir.
