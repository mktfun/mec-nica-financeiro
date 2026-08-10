# Proposal: Audit and Fix Conciliation Matches (match-audit-and-fix)

## Problema
Atualmente, o sistema de auto-match (`auto_match_transactions`) não está conseguindo parear corretamente PIX, Maquininha (Rede) e Ordens de Serviço (OS). A auditoria revelou dois grandes problemas:
1. **Divergência de Escopo (Global vs Local)**: Transações vindas do arquivo OFX (extrato bancário) geralmente pertencem à conta global do Itaú (`store_id IS NULL`), enquanto as transações da Maquininha (POS) e do Pátio (OS) pertencem a uma loja específica. A RPC atual tenta fazer `WHERE store_id = ofx_record.store_id`, o que causa falha imediata quando o OFX é global (`NULL = 'DP'` é falso).
2. **Pipelines de Match Incompletas**: A lógica atual tenta parear Maquininha direto com OFX, mas ignora a relação Maquininha x OS. O usuário definiu explicitamente três regras de negócio vitais que precisam ser respeitadas.

## Solução Proposta
Reescrever a RPC `auto_match_transactions` no banco de dados para implementar os 3 pipelines exatos de conciliação solicitados:
1. **Match 1 (Maquininha Líquido x OFX Rede)**: Agrupar `pos_transactions.net_amount` por loja no dia e buscar uma entrada no `ofx_transactions` (independente de `store_id`) com o exato mesmo valor.
2. **Match 2 (Maquininha Bruto x OS Cartão)**: Para cada `pos_transactions.gross_amount` de uma loja, buscar uma `patio_os` da mesma loja cuja entrada (paga em maquininha) bata com o valor bruto.
3. **Match 3 (PIX OFX x PIX OS)**: Para cada entrada PIX no `ofx_transactions` (global), varrer todas as OSs do dia (qualquer loja) procurando um `pix_transfer_value` (ou `paid_value` com método PIX) que case perfeitamente.

## Contratos de Dados
- **Tabelas Envolvidas**: `ofx_transactions`, `pos_transactions`, `patio_os`.
- O pareamento físico continuará atualizando `matched_os_number` (e `matched_ofx_id` no caso do pátio), mas usará a semântica correta (IDs de amarração cruzada).

## API / Interface
- Nenhuma alteração no Frontend. Todo o motor de conciliação roda na RPC `auto_match_transactions`.

## Features Existentes Impactadas
- O dashboard global e o fechamento por loja não serão afetados matematicamente, mas o status de "divergência" e "match" ficará 100% preciso e automático.

## Risco Principal
- **Probabilidade**: Alta
- **Impacto**: Parcialmente reversível
- **Mitigação**: O maior risco é parear transações incorretas caso hajam múltiplos valores idênticos no mesmo dia (ex: 2 PIX de R$ 500,00). O código usará chaves limitadoras e garantirá 1:1 match para OS, evitando que uma mesma OS seja vinculada a dois OFX.
