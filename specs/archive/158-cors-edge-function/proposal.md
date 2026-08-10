# Proposal: Correção de CORS na Edge Function (158)

## Problema
A Edge Function `sync-oficina` está sendo bloqueada pela política de CORS do navegador. O erro `Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response` ocorre porque o frontend (`supabase.functions.invoke`) sempre envia headers como `Authorization` e `x-client-info`, mas a resposta preflight (`OPTIONS`) da function não os autoriza.

## Solução Proposta
Atualizar o arquivo `supabase/functions/sync-oficina/index.ts` para usar o padrão de CORS headers oficial do Supabase/Deno, devolvendo a permissão correta nas rotas.

## Contratos de Dados
Nenhuma tabela modificada.

## API / Interface
A Edge Function `sync-oficina` passará a retornar os seguintes headers para qualquer método (especialmente `OPTIONS`):
`Access-Control-Allow-Origin: *`
`Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Features Existentes Impactadas
Permitirá que o frontend recém-implementado (Sincronização Cloud em `CentralImportWizard`) funcione sem ser bloqueado pela segurança do Browser.

## Risco Principal
- N/A. Alteração estrita de segurança de HTTP Headers requerida por qualquer aplicação React se comunicando com Deno.
