# Spec Plan: Fix AI Chat Edge Function Crash (061-fix-ai-chat-settings)

## Checklist de Implementação

- [ ] Trocar `.single()` por `.maybeSingle()` em `supabase/functions/ai-chat/index.ts` (linha ~130)
- [ ] Verificar e robustecer o bloco de instanciação do LLM para suportar `settings === null`
- [ ] Garantir que `toolsOficina(supabaseClient, settings, user.id)` funciona com `settings = null`
- [ ] Commitar e deployar a Edge Function

## Status
IN_PROGRESS
