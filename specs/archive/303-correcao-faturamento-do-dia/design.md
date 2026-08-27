# Design: Correcao do Card Faturamento do Dia (303)

## Arquitetura Tecnica

```
[Snapshot Anterior (26/08): R$ 867.870,82]
                   ¦
                   ? (v_faturamento_anterior)
[Mapa de Metas / Input Manual: R$ 891.663,62] --? [Diferenca: Hoje - Ontem = R$ 23.792,80]
                                                              ¦
                                                              ?
                                                   [Faturamento do Dia: R$ 23.792,80]
                                                              ¦
                                                              ?
                                                   [Card "Faturamento do Dia" na UI]
```

## Modificacoes de Codigo

### 1. RPC `get_daily_reconciliation_summary`
- No Ramal 1 (dia fechado):
  - Consultar `v_faturamento_anterior` de `daily_snapshots WHERE date < v_target_date ORDER BY date DESC LIMIT 1`.
  - Definir `v_faturamento_oi_base`:
    ```sql
    IF (v_snapshot.metadata->>'faturamento_oi_base') IS NOT NULL AND (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
        v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
    ELSIF v_snapshot.faturamento IS NOT NULL AND v_faturamento_anterior > 0 AND v_snapshot.faturamento > v_faturamento_anterior THEN
        v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
    ELSE
        v_faturamento_oi_base := COALESCE(v_snapshot.faturamento, 0);
    END IF;
    ```
  - `v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;`
  - Retornar `'faturamento_anterior', v_faturamento_anterior` no jsonb.

### 2. Frontend `ResumoDiaPanel.tsx`
- Exibicao no Card:
  - Numero principal: `faturamentoTotalComAjustes` (ou `summary?.faturamento_periodo`), que contera `R$ 23.792,80`.
  - Subtitulo: Informa o `faturamentoLiquidoDia` e as referencias de hoje vs ontem.
- No modo de edicao:
  - Input continua permitindo digitar o odometro acumulado (ex: `891.663,62`).
  - `faturamentoLiquidoDia` calcula em tempo real `faturamentoInput - faturamentoAnteriorGlobal`.

## Cenarios de Verificacao
- **Cenario 1 (27/08 Fechado):** Acessar 27/08 -> Card "Faturamento do Dia" exibe `R$ 23.792,80`.
- **Cenario 2 (27/08 Em Edicao):** Clicar em Editar -> Input mostra `891.663,62` -> O calculo do dia mostra `R$ 23.792,80`.
- **Cenario 3 (26/08 Fechado):** Acessar 26/08 -> Card "Faturamento do Dia" exibe `R$ 29.046,09` (inalterado).
