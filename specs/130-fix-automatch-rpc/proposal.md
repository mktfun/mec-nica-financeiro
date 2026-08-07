# Proposal: Fix Auto Match RPC (130-fix-automatch-rpc)

## Problema
O RPC `auto_match_transactions` estÃ¡ quebrando durante a importaÃ§Ã£o (erro `column "matched_ofx_id" of relation "transactions" does not exist`). Isso ocorre porque o RPC original foi desenhado para atualizar a antiga tabela `transactions`, que agora foi substituÃ­da por uma `VIEW` de mesmo nome (para leitura unificada) e dividida nas tabelas fÃ­sicas `ofx_transactions`, `pos_transactions` e `manual_transactions`. AlÃ©m disso, a coluna antiga `matched_ofx_id` foi substituÃ­da pelo `matched_os_number` no novo schema.

## SoluÃ§Ã£o Proposta
Reescrever o RPC `auto_match_transactions` no banco de dados para atuar diretamente nas tabelas fÃ­sicas divididas (`ofx_transactions` para Entradas bancÃ¡rias, `pos_transactions` para Maquininhas e `patio_os` para as Ordens de ServiÃ§o), utilizando o `matched_os_number` como chave de amarraÃ§Ã£o oficial ao invÃ©s do antigo ID estrito.

## Contratos de Dados
- **Tabelas Envolvidas:** `ofx_transactions`, `pos_transactions`, `patio_os`
- **MutaÃ§Ãµes:**
  - `UPDATE ofx_transactions SET matched_os_number = X`
  - `UPDATE pos_transactions SET matched_os_number = X`
  - `UPDATE patio_os SET matched_ofx_id = X` (se ainda utilizar a chave antiga internamente ou padronizar para ambas).

## API / Interface
- Nenhuma alteraÃ§Ã£o nas rotas do React.
- O Frontend continuarÃ¡ chamando `await supabase.rpc('auto_match_transactions', { p_date: targetDate });` de forma transparente.

## Features Existentes Impactadas
- O prÃ³prio motor de Auto-Match
- ExibiÃ§Ã£o de pares casados na ConciliaÃ§Ã£o

## Risco Principal
NÃ£o realizar a limpeza idempotente de vÃ­nculos anteriores corretamente antes de rodar o loop na data (para evitar duplicaÃ§Ã£o em re-importaÃ§Ãµes). Resolvido mantendo o step de zerar os matches no topo do RPC.

