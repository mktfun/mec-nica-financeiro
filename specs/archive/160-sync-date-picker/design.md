# Design: Seletor de Data na Sincronização Cloud (160)

## Arquitetura Técnica
O fluxo recebe um novo parâmetro de input do usuário antes da execução em lote.
Input React (targetDate) → onClick Button → Supabase Function (`{ loja, data }`) → Fetch (Deno to Node) com Query String (`&data=`).

## Interfaces TypeScript
Nenhuma nova interface. Utilizaremos string pura ISO `YYYY-MM-DD`.

## Componentes / Hooks / Funções
1. `src/components/importacoes/CentralImportWizard.tsx`: Adição do elemento nativo `<input type="date">` acima do botão "Sincronizar Oficina Agora".
2. `supabase/functions/sync-oficina/index.ts`: Leitura e repasse seguro do parâmetro `data` usando URLSearchParams ou interpolação de strings.

## Fluxo de UI
1. O usuário vê o card "Sincronização Cloud".
2. Acima do botão, há um campo "Data de Referência (Mês/Ano)" preenchido com a data de hoje.
3. O usuário seleciona o mês passado.
4. Clica em sincronizar. A promessa leva a data para a nuvem.

## Infra / Deploy
Ao tocar na Edge Function de Deno novamente, um novo `supabase functions deploy` precisará ser feito pelo usuário para efetivar.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Selecionar data "2026-07-01"] → [Clicar sincronizar] → [O payload de POST da Edge Function exibe `{ loja: '...', data: '2026-07-01' }` no Inspecionar (Network)]
