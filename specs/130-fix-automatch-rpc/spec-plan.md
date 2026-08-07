# Spec Plan: Fix Auto Match RPC (130-fix-automatch-rpc)

## Tasks

- [x] [BACKEND] Criar nova migration Supabase (ex: `20260807000012_fix_auto_match_rpc.sql`)
- [x] [BACKEND] Reescrever o `CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)` no arquivo para ler e atualizar as tabelas fÃ­sicas.
- [x] [BACKEND] Remover o passo que "zera/limpa" os vínculos anteriores (linha 37 original). O motor só vai processar quem estiver "pending", preservando vínculos antigos/manuais.
- [x] [BACKEND] Modificar o bloco de loop para buscar apenas `FROM ofx_transactions WHERE type = 'in' AND occurred_at::date = p_date`.
- [x] [BACKEND] Substituir os blocos que vinculam a Rede por buscar em `pos_transactions` agrupando pelo valor bruto.
- [ ] [TEST] Re-rodar o processo de importaÃ§Ã£o no frontend e garantir que a base confirma 100% dos pares (10 pares perfeitos).


