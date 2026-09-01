# Proposal: Fix Silent Drops in Import Wizard & Revert Diferença (331)

## Problema
O usuário relata que:
1. O extrato não exibe os lançamentos de PIX importados.
2. A aba de maquininha afirma que não há transações (R$ 0,00).
3. A diferença está R$ 0,00 para todas as lojas.

A investigação multi-agente revelou falhas críticas em duas camadas:
- **Frontend (CentralImportWizard):** Lançamentos de fim de semana (PIX) no OFX estão sendo salvos no Supabase com o `target_date` do dia real da transação (ex: 31/08), ficando ocultos no dashboard de 01/09. Além disso, as transações do arquivo da Rede estão sofrendo um drop silencioso se o `storeName` da Rede não tiver match imediato, o que faz com que não sejam inseridas no banco, resultando em R$ 0,00 para a Maquininha.
- **Backend (RPC):** O novo cálculo de Diferença (Baseado em Órfãos) esconde a divergência real entre o Previsto (Rede Líquido) e o Realizado (OFX), e um bug no SQL trata `transaction_type = NULL` de forma que a expressão retorna `NULL`, ignorando valores brutos.

## Solução Proposta (Foco em Reuso e Correção)
Vamos modificar componentes frontend e o backend [MODIFY].
- **Frontend:** Atualizar `CentralImportWizard.tsx` para forçar `target_date` das transações OFX para o dia do fechamento (evitando espalhamento de datas) e corrigir o agrupamento da Rede para não dropar transações sem `sid` mapeado.
- **Backend:** Recriar `get_daily_reconciliation_summary` restaurando a Diferença (`Previsto - Realizado`) e blindando `transaction_type` com `COALESCE`.

## Contratos de Dados & SQL (Supabase)
- RPC `get_daily_reconciliation_summary` terá sua query ajustada em nova migration.

## Risco Principal e Mitigação
- Risco: O usuário precisará re-importar os arquivos de 01/09 para que o banco preencha corretamente as datas e as vendas da Rede.
- Mitigação: Instruiremos o usuário a fazer o re-upload no wizard.
