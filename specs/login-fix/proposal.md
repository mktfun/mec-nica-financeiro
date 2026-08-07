# Proposal: Fix Login Credentials (login-fix)

## Problema
O usuário não estava conseguindo realizar login na plataforma utilizando as credenciais `mktfunil1@gmail.com` e a senha `Mktfunil8563*`, recebendo o erro de "E-mail ou senha incorretos. Tente novamente." Isso ocorre quando as credenciais no Supabase Auth perdem a sincronia com o acesso esperado (ex: resetadas acidentalmente, migrations de seed incompletas, ou hashes de senha inválidos).

## Solução Proposta
Uma vez que o problema era puramente no nível de banco de dados (Supabase Auth) e não havia bug no frontend (`src/routes/login.tsx`), a solução já foi **aplicada proativamente via script Admin (Service Role)**. Foi forçada a redefinição de senha para exatamente a string esperada (`Mktfunil8563*`) no ID de usuário `348de204-e62b-471c-83bc-6e3978edd184`.

## Contratos de Dados
- Nenhuma alteração de schema necessária.
- Mutações de estado: Apenas uma chamada isolada para `supabase.auth.admin.updateUserById`.

## API / Interface
- Nenhuma mudança no código React. O código atual utiliza corretamente o hook `useLogin()` que bate em `signInWithPassword`.

## Features Existentes Impactadas
Nenhuma.

## Risco Principal
Não há riscos de código, porém é fundamental garantir que a senha digitada no teclado do usuário não contenha espaços ocultos (trailing spaces) que causem divergência de caracteres no momento do Submit.
