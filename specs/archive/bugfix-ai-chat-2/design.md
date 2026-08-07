# Design: CorreçÁo de Erro Interno (s is not a function) no AI SDK (bugfix-ai-chat-2)

## Arquitetura Técnica
A correçÁo ocorrerá no componente frontend localizado em `src/routes/agente.tsx`.

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
- FunçÁo interna de `fetch` do hook `useChat`.
- FunçÁo `sendMessage`.

## Fluxo de UI
A UI permanecerá exatamente a mesma (Layout Limpo).

## Infra / Deploy
Sem alterações de infra.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Enviar mensagem] → Usuário envia "Oi" no chat vazio → O erro "s is not a function" nÁo aparece no console, o request nÁo perde os Headers, e a mensagem do usuário só aparece 1 vez, com o assistente começando a responder imediatamente a seguir.
