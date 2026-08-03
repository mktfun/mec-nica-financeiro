# Design: Fix AI Chat Edge Function Crash (061-fix-ai-chat-settings)

## Resumo Arquitetural
A *Edge Function* `ai-chat` é responsável por instanciar o modelo de Inteligência Artificial usando o SDK da Vercel (`ai@latest`). Ela aceita chaves de API dinâmicas configuradas por usuário (BYOK - Bring Your Own Key) salvos na tabela `ai_settings`.

**Problema atual:**
Ao usar `single()` no Supabase, a ausência de uma linha correspondente dispara uma Exception nativa no PostgREST, o que bloqueia o fluxo e retorna HTTP 400.

**Correção:**
Trocar `single()` por `maybeSingle()`. O `settings` retornado será nulo.
O fluxo de fallback no instanciamento do LLM já existe parcialmente (ele cai para o Gemini), mas precisamos garantir que, caso `settings` seja nulo, a aplicação ainda consiga:
1. Usar a variável `GOOGLE_API_KEY` do `Deno.env.get()`.
2. Não estourar exceção ao tentar acessar `settings.provider` ou `settings.api_key`.

## Alterações Específicas (`supabase/functions/ai-chat/index.ts`)

**Antes:**
```typescript
    // Fetch AI Settings
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
```

**Depois:**
```typescript
    // Fetch AI Settings gracefully
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
```

Além disso, a injeção nas *tools* deve ser protegida (já está usando *optional chaining*, e.g., `settings?.bot_url`, logo não deve quebrar ali).

## Componentes/Arquivos Modificados
- `supabase/functions/ai-chat/index.ts`
