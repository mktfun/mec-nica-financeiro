# Spec Plan: Fix Login Credentials (login-fix)

## Tasks

- [x] [BACKEND] Executar rotina Node via Supabase JS Admin isolada para buscar ID correspondente a `mktfunil1@gmail.com`.
- [x] [BACKEND] Executar update forçado de credencial Auth (`Mktfunil8563*`) via `updateUserById` para o usuário referenciado.
- [x] [TEST] Verificar resposta positiva do `updateUserById` via console log.
- [ ] [TEST] Verificar cenário 1: Realizar o login na aplicação do front-end com os dados recuperados para garantir a consistência do acesso.
