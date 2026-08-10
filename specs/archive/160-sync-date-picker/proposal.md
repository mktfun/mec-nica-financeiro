# Proposal: Seletor de Data na Sincronização Cloud (160)

## Problema
O botão de Sincronização Automática (Bot da Oficina) no `CentralImportWizard` ativa a Edge Function passando as lojas, mas **não envia a data-alvo**. Atualmente, não há um input na UI para o usuário escolher qual o mês/data que deseja buscar. Com isso, os bots podem buscar a data errada (como o default do dia vigente), impedindo que o usuário concilie faturamentos retroativos ou meses anteriores.

## Solução Proposta
1. Adicionar um seletor visual de Data no painel do botão Sincronizar Oficina Agora.
2. O botão utilizará a data selecionada e a despachará no body da invocação à Edge Function `sync-oficina`.
3. A Edge Function passará esse novo parâmetro `data` pela URL (`/api/contas-pagar?loja=X&data=Y`) para o bot na VPS, garantindo que o Webhook instrua o Playwright a navegar até o mês e ano corretos.

## Contratos de Dados
- **Edge Function:** O payload muda de `{ loja: string }` para `{ loja: string, data: string }`. A propriedade `data` será repassada na QueryString para a VPS.
- Supabase: Nenhuma alteração de schema.

## API / Interface
- Adição de `<input type="date" value={targetDate} onChange={...} />` no painel lateral de sincronização cloud do `CentralImportWizard.tsx`.

## Features Existentes Impactadas
Impacta positivamente o poder de busca (filtros retroativos) do bot no sistema ERP.

## Risco Principal
- Nulo/Mínimo. Depende apenas do bot lá na VPS ter sido programado para entender o parâmetro Query `&data=YYYY-MM-DD`. Como o padrão é extração temporal, esse parâmetro é padrão da API.
