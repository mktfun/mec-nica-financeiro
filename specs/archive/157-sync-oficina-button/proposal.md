# Proposal: Ativação do Bot Oficina Inteligente (157)

## Problema
Atualmente, no `CentralImportWizard` (tela de Importações), o botão "Sincronizar Oficina Agora" (Bot/Cloud) está executando um mock `alert('Edge Function sync-oficina acionada...')`. O usuário quer que esse botão ative de fato a comunicação com o bot Playwright no servidor para extração real do Oficina Inteligente, acabando com a necessidade de importação manual de planilhas.

## Solução Proposta
Conectar o botão "Sincronizar Oficina Agora" à Edge Function existente `sync-oficina`.
Como o CentralImportWizard pode rodar para múltiplas lojas, o clique do botão fará um disparo de Sincronização em Lote (varrendo as lojas ativas no sistema) ou passaremos uma seleção de loja no frontend. Vamos implementar o trigger real via Supabase Functions Client e atualizar o estado da interface.

## Contratos de Dados
- **Edge Function:** `sync-oficina` (já existente e rodando). Aceita payload `{ loja: string }`.
- **Nenhuma alteração de tabela necessária**, pois o Bot Headless e a Edge Function já manipulam `oficina_contas` e a OS Cache.

## API / Interface
- **Componente:** `src/components/importacoes/CentralImportWizard.tsx`.
- **Ação:** O `onClick` do botão será assíncrono. Injetaremos o `supabase.functions.invoke` passando as lojas recuperadas do hook `useStores()`.

## Features Existentes Impactadas
- Não impacta fluxos manuais de Excel, pois o botão fica no painel lateral de automação cloud. 

## Risco Principal
- **Timeout da Função:** O Edge Function do Supabase (deno) e a chamada na VPS (Tork Services) pode demorar mais que o habitual do navegador e causar timeout do client.
- **Probabilidade:** Média.
- **Impacto:** Parcialmente reversível. Se demorar, a UI pode dar erro de Timeout mas o bot lá na VPS vai rodar mesmo assim (Background task).
- **Mitigação:** Tratamento de promessa no front com `toast` assíncrono ("Processamento em background iniciado") e sem travar a navegação.
