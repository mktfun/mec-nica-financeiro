# Autenticação & Autorização

## Padrões de Auth
- **Provider**: Supabase Auth (JWT).
- **Server-side**: Sempre usar supabase.auth.getUser() para validar sessão e nunca getSession().
- **Client-side**: Hooks do Supabase client configurados com anon key.
- **Service Role**: Usar chave SUPABASE_SERVICE_ROLE_KEY exclusivamente no backend / Edge Functions / scripts administrativos seguros.
