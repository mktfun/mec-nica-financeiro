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

## [2026-10-01] — [Feature ID: 463-remediar-brechas-seguranca-rls-lovable]

**Contexto:** O scanner de segurança da Lovable (integrado ao Supabase Security Advisor) apontou 5 vulnerabilidades ao publicar: 38 tabelas com acesso anônimo irrestrito (`USING (true)` para `anon`), bucket `knowledge_graph` legível por qualquer usuário, 29 funções com `search_path` mutável e view `transactions` com `security_definer`.
**Regra aprendida:**
1. **Blindagem RLS Corporativa:** Nenhuma tabela financeira pode ter políticas concedidas para as roles `anon` ou `public` com `qual = true`. Todas as regras de leitura e escrita devem ser restritas `TO authenticated` e validar a existência do usuário na tabela de controle de acesso (`EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())`).
2. **Defesa em Funções e Views:** Toda função de schema público deve ter `SET search_path = public` e revogação de privilégios `EXECUTE` para `PUBLIC` e `anon`. Toda view deve possuir `WITH (security_invoker = true)`.
**Risco identificado:** Políticas criadas temporariamente para testes que concedem `Allow anon ...` vazam para migrações de produção e deixam o banco vulnerável a queries diretas via PostgREST.
**Não fazer:** Nunca criar políticas `FOR ALL TO anon USING (true)` ou `FOR SELECT TO public USING (true)` em tabelas de produção.


