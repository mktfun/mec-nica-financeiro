# Design: Fix Dashboard V2 Time Leakage

## Componentes Afetados
- `useDashboardV2.ts` (Hooks)

## Lógica de Negócio Envolvida
O Dashboard V2 tem um estado de seleção de data (`dateAtual`).
Os cálculos de fluxo de caixa dependem de duas métricas principais baseadas na tabela `reconciliations`:
1. `saldoTotal` (O Saldo do dia atual)
2. `saldoAnterior` (O Saldo do dia anterior)

## Mudanças Arquiteturais / Fluxo de Dados
A query atual de `recsAll` no supabase baixa a tabela inteira e a redução do lado do cliente ignora o teto temporal (`dateAtual`).
Para que a interface do usuário seja uma verdadeira "máquina do tempo" previsível:
- O request ao Supabase `reconciliations` deve trazer apenas registros até a data teto: `.lte('date', dateAtual)`.
- No parser de `latestByStore`, o critério de seleção da data mais recente deve respeitar o limite máximo imposto (`<= dateAtual`), garantindo que saldos futuros não "vazem" de volta no tempo.

## Interface do Usuário (UI)
Não há mudanças visuais. O comportamento reativo das métricas "Saldo Total", "Fluxo de Caixa" e "Diferença Final" será corrigido para refletir a realidade.
