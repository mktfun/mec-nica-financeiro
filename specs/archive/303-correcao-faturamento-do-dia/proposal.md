# Proposal: Correcao do Card Faturamento do Dia (303)

## Problema

O Card **"Faturamento do Dia"** estava exibindo o valor acumulado do mes inteiro (ex: `R$ 891.663,62`) em vez do **faturamento liquido do proprio dia** (`R$ 23.792,80`), que e calculado pela diferenca entre o odometro de hoje e o de ontem (`Hoje - Ontem`).

### Causa Raiz Identificada:
1. **RPC `get_daily_reconciliation_summary` (Ramal 1 - Dia Fechado):**
   - Atribuia diretamente `v_faturamento_periodo := COALESCE(v_snapshot.faturamento, 0)` (que continha o valor acumulado `891.663,62`).
   - Nao carregava nem retornava `faturamento_anterior` no JSON de resposta.
2. **Frontend `ResumoDiaPanel.tsx`:**
   - Ao ler `summary.faturamento_periodo`, exibia o valor bruto acumulado `891.663,62`.
   - Como `summary.faturamento_anterior` vinha ausente (`undefined`), o fallback `faturamentoAnteriorGlobal` zerava, fazendo com que no modo de edicao o faturamento do dia ficasse igual ao total do input manual sem subtrair ontem.
3. **Snapshot de 27/08:**
   - O campo `metadata.faturamento_periodo` e `metadata.faturamento_oi_base` estavam salvos com `891.663,62` em vez de `23.792,80`.

## Solucao Proposta

1. **RPC `get_daily_reconciliation_summary` (Ramal 1 e 2):**
   - Buscar `v_faturamento_anterior` do snapshot fechado imediatamente anterior (`date < v_target_date ORDER BY date DESC LIMIT 1`).
   - Calcular `v_faturamento_oi_base`:
     - Se `faturamento_oi_base` existir no metadata do snapshot e for > 0, usar.
     - Senao, se `v_snapshot.faturamento > v_faturamento_anterior`, calcular `v_snapshot.faturamento - v_faturamento_anterior`.
     - Senao usar `v_snapshot.faturamento`.
   - `v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes`.
   - Retornar obrigatoriamente no JSON: `faturamento_periodo`, `faturamento_oi_base`, `faturamento_anterior`, `faturamento_ajustes`.
2. **Frontend `ResumoDiaPanel.tsx`:**
   - Garantir que o valor em destaque do Card "Faturamento do Dia" seja `faturamentoTotalComAjustes` (ou `summary?.faturamento_periodo`), que representa o dia (`R$ 23.792,80`).
   - O input manual continua recebendo o odometro acumulado (ex: `891.663,62`), mas imediatamente calcula `faturamentoLiquidoDia = faturamentoInput - faturamentoAnteriorGlobal` em tempo real.
   - O subtitulo exibe claramente: `OI: R$ 23.792,80 (Hoje: R$ 891.663,62 - Ant: R$ 867.870,82)`.
3. **Hotfix de dados (Snapshot 27/08):**
   - Atualizar `daily_snapshots` para `2026-08-27` com `faturamento_oi_base = 23792.80`, `faturamento_periodo = 23792.80`, `faturamento_liquido = 23792.80`, `faturamento_anterior = 867870.82`.

## Valores Esperados (27/08):
- Faturamento Acumulado (Hoje): `R$ 891.663,62`
- Faturamento Anterior (Ontem 26/08): `R$ 867.870,82`
- **Faturamento do Dia:** `R$ 23.792,80`
