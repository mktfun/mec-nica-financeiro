# Design: Correção de CORS (158)

## Arquitetura Técnica
A requisição HTTP `OPTIONS` feita silenciosamente pelo navegador antes de um POST necessita aprovação de headers.
Vamos declarar uma constante `corsHeaders` padrão e integrá-la às respostas.

## Interfaces TypeScript
N/A

## Componentes / Hooks / Funções
`supabase/functions/sync-oficina/index.ts`

## Fluxo
1. Arquivo TS é editado para incluir o dicionário de CORS.
2. Nas respostas normais (200/400) ou no Preflight (OPTIONS), o dicionário é acoplado via object spread (`{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }`).
3. O deploy da function deve ser efetuado (manual ou via Supabase CLI, se a CLI local tiver link com o projeto).

## Infra / Deploy
A alteração não se aplica apenas ao front. Para funcionar, a function precisa ser enviada de volta à nuvem do Supabase:
`supabase functions deploy sync-oficina`
Isso deverá ser instruído ao usuário, já que agentes às vezes não têm os tokens da Supabase CLI para fazer deploy em projetos de produção alheios sem login interativo.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Front invoca function] → [Browser envia OPTIONS preflight] → [Function retorna 200 OK autorizando Authorization e apikey] → [Browser executa o POST]
