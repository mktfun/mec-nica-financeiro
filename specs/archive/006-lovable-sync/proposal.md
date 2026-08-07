# Vibe Proposal: 006-lovable-sync

## Contexto e Problema Atual

O projeto foi migrado com sucesso para o Supabase no código-fonte (GitHub), incluindo a tela de Login e a remoção dos mocks. No entanto, o **Preview do Lovable não está refletindo essas mudanças**.

Como evidenciado pelas screenshots:
1. O painel esquerdo do Lovable **mostra** que os commits chegaram ("Sincronizado").
2. O preview à direita **continua** mostrando a versão antiga (sem login e com os valores fixos do mock, ex: R$ 4.160,00).
3. Ao tentar acessar `/login` direto na URL, o sistema exibe 404.

**Causa Raiz Identificada:**
O código novo exige duas variáveis de ambiente fundamentais para compilar e funcionar:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Como essas variáveis **não foram configuradas no painel do Lovable**, o "build interno" da plataforma deles falha. Como mecanismo de segurança para não derrubar sua visualização, o Lovable descarta a versão quebrada (o novo código) e continua exibindo na tela o último preview que compilou com sucesso (a versão antiga com mock data). Por isso parece que nada mudou.

## O Que Já Existe e Será Reutilizado
- O código com a lógica do Supabase **já está escrito, commitado e funcional**.
- O banco de dados Supabase **já está no ar** com 10 lojas e tabelas povoadas.
- A tela de `/login` **já existe no código-fonte**.

## O Que Precisa Ser Feito
Para que o Lovable destrave e mostre as telas reais conectadas ao Supabase, é preciso adicionar os secrets dentro do painel deles. O Lovable precisa saber como se conectar ao Supabase.

**Passos:**
1. Encontrar a seção de "Environment Variables" (Variáveis de Ambiente) ou "Secrets" na interface do seu projeto no Lovable.
2. Adicionar as chaves `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do nosso projeto Supabase.

## Critérios de Aceite
1. Variáveis inseridas no Lovable.
2. O build do Lovable recomeça e passa a dar sucesso (o botão "Build" ficará verde).
3. O preview do Lovable recarregará e te enviará automaticamente para a tela de `/login`.
4. Após o login com as credenciais que criamos, o dashboard aparecerá.
