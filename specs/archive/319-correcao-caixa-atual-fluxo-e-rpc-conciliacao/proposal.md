# Proposal: Correção do Caixa Atual, Fluxo Contábil e Paridade dos 5 Pilares na RPC de Conciliação (319)

## Problema
No Painel de Conciliação Diária (`/conciliacao`), os 4 cards de ativos superiores somam os valores consolidados das 10 filiais:
1. **Pilar 1 (Saldo Bancos + Dinheiro Líquido)**: R$ 244.127,24 (Composto por OFX Positivo R$ 203.755,46 + Cofre R$ 10.052,00 + A Compensar R$ 30.319,78; com sub-chip de Cheque Especial: (-) R$ 30.628,21)
2. **Pilar 2 (Dinheiro MP)**: R$ 22.475,00
3. **Pilar 3 (A Receber)**: R$ 8.049,67
4. **Pilar 4 (Na Loja OS)**: R$ 51.054,86

Pela equação canônica dos 5 pilares:
$$\text{Ativos Brutos} = 244.127,24 + 22.475,00 + 8.049,67 + 51.054,86 = \mathbf{325.706,77}$$
$$\text{Caixa Atual} = \text{Ativos Brutos} - \text{Cheque Especial (R\$ 30.628,21)} = \mathbf{295.078,56}$$

No entanto, o card inferior de **Caixa Atual** exibe **R$ 288.300,32** (uma divergência de **R$ 6.778,24**). Isso ocorre porque, no Ramal 1 (dia com snapshot fechado), a RPC `get_daily_reconciliation_summary` lia o campo estático `daily_snapshots.caixa_atual` que havia sido gravado antes da correção do somatório dinâmico do Pátio (quando o Pátio estava com R$ 44.276,62 em vez de R$ 51.054,86: $51.054,86 - 44.276,62 = 6.778,24$).

Essa divergência gerou um efeito cascata em todo o fluxo contábil:
- **Fluxo de Caixa**: Exibindo $-4.327,83$ ($288.300,32 - 292.628,15$) quando o valor correto é $+2.450,41$ ($295.078,56 - 292.628,15$).
- **Valor Disp. Contas**: Exibindo $59.748,78$ ($55.420,95 - (-4.327,83)$) quando o valor correto é $52.970,54$ ($55.420,95 - 2.450,41$).
- **Diferença Final**: Exibindo $+4.422,38$ como divergente, quando a diferença real entre o valor disponível e as contas pagas ($55.326,40$) é de $-2.355,86$.

## Solução Proposta (Foco em Reuso e Correção)
1. **[MODIFY] RPC `public.get_daily_reconciliation_summary`**:
   - No Ramal 1 (Snapshot Fechado) e no Ramal 2 (Dia Aberto), computar o `v_caixa_atual` determinística e dinamicamente a partir dos 5 pilares reais: `(v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau`.
   - Recalcular `v_fluxo_caixa`, `v_valor_disp_contas`, `v_subtotal_contas` e `v_diferenca_final` a partir desse `v_caixa_atual` canônico.
2. **[MODIFY] Componente `ResumoDiaPanel.tsx`**:
   - Assegurar que os cálculos reativos na interface e no `handleSaveDailySnapshot` apliquem a mesma equação canônica antes de persistir em `daily_snapshots`.
3. **[MODIFY] RPC `public.get_dashboard_metrics`**:
   - Sincronizar o cálculo de `caixaAtual` e `fluxoCaixa` com a mesma fórmula dos 5 pilares.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `get_daily_reconciliation_summary`: RPC central de conciliação. Será modificada (`[MODIFY]`) para recalcular Caixa Atual em todos os ramais.
  - `get_dashboard_metrics`: RPC do dashboard. Será atualizada (`[MODIFY]`) para paridade com a conciliação.
  - `daily_snapshots`: Tabela de fechamento diário. Mantida 100% de sua estrutura, atualizando os registros históricos do dia 31/08/2026.
- **Componentes / Hooks Existentes Encontrados:**
  - `ResumoDiaPanel.tsx`: Componente de consolidação do dia e fluxo contábil. Será modificado (`[MODIFY]`).
  - `useDailySnapshot.ts`: Hook de consumo e mutação de snapshots. Reutilizado 100%.
- **Justificativa para Artefatos Novos (se houver):** Nenhuma nova tabela ou componente é necessário. Reuso de 100% da base existente.

## Contratos de Dados & SQL (Supabase)

### 1. RPC `get_daily_reconciliation_summary` (Trecho Canônico de Cálculo)
```sql
-- Fórmula Canônica Unificada dos 5 Pilares:
v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;
v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
v_subtotal_contas := v_contas_manual + v_juros_rede;
v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;
```

## API & Componentes (Frontend)

### `ResumoDiaPanel.tsx`
- Garantir que a derivação de `caixaAtual` utilize:
  ```typescript
  const totalAtivos = (totalSaldoBancoPositivo + dinheiroMpValor + aReceberValor + naLojaValor);
  const caixaAtual = totalAtivos - saldoNegativoItau;
  const fluxoCaixa = caixaAtual - caixaAnterior;
  const valorDispContas = faturamentoPeriodo - fluxoCaixa;
  const subtotalContas = contasManual + jurosRede;
  const diferencaFinal = valorDispContas - subtotalContas;
  ```

## Risco Principal e Mitigação
- **Risco:** Inconsistência ao navegar entre datas passadas já fechadas.
- **Mitigação:** Como `caixa_anterior` busca do snapshot imediatamente anterior (`date < p_date ORDER BY date DESC LIMIT 1`), a atualização do snapshot de 31/08/2026 preserva o encadeamento cronológico sem afetar os dias consolidados anteriores (ex: 28/08/2026 com R$ 292.628,15).
