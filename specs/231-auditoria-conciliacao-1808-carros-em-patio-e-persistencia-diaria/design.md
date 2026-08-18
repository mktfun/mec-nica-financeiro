# Design: Entendimento de Carros em Pátio, Faturamento Mapa de Metas e Persistência por Data (231)

## 1. Ajuste da RPC `get_daily_reconciliation_summary`
- Priorizar valores gravados em `daily_snapshots` para `p_date`.
- Calcular `v_faturamento_periodo` a partir do delta do Mapa de Metas (`odometro_atual - odometro_anterior`).
- Integrar `na_loja_os` apurado a partir do saldo pendente líquido de OSs.

## 2. Ajuste de `ResumoDiaPanel.tsx` e `conciliacao.index.tsx`
- Ao mudar `selectedDate`, sincronizar todos os cards com os valores congelados em `currentSnapshot`.
- Manter o botão "Editar Fechamento" restrito a permitir ajustes necessários salvando diretamente em `daily_snapshots`.
