# Autenticação & Autorização

## Padrões de Auth
- **Provider**: Supabase Auth (JWT).
- **Server-side**: Sempre usar supabase.auth.getUser() para validar sessão e nunca getSession().
- **Client-side**: Hooks do Supabase client configurados com anon key.
- **Service Role**: Usar chave SUPABASE_SERVICE_ROLE_KEY exclusivamente no backend / Edge Functions / scripts administrativos seguros.

## [2026-09-08] — [Feature ID: 325-correcao-erros-terminal-sourcemaps-e-loop-use-session]

**Contexto:** Erro crítico `Maximum update depth exceeded` no hook `useSession`, disparado por dependência circular `[session]` e mutações no `useEffect` com instâncias instáveis do Supabase Auth no React 19.

**Regra aprendida:**
- **Store Externa com useSyncExternalStore:** Stores de autenticação globais baseadas no Supabase Auth DEVEM usar a API nativa `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. Isso garante sincronização atômica sem loops de re-render, sem flickering entre rotas e com hidratação segura (`getServerSnapshot = () => undefined`).

**Risco identificado:** Tentar sincronizar estado global do Supabase dentro de `useEffect` com comparação por referência (`session !== globalSession`) causa loops infinitos fatais de 50+ renders no React 19 sempre que o Supabase emite novas instâncias de objetos no auth state change.

**Não fazer:** Nunca coloque a variável de estado retornado de `useState` como dependência de um `useEffect` que executa `setState` (`useEffect(..., [session])` com `setSession`).

