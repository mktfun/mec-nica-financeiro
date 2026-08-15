# Design: 212-fix-dashboard-chart-layout-tooltip-clipping-and-negative-balance-display

## 1. Arquitetura de UI & Layout

```
  ┌────────────────────────────────────────────────────────┐
  │                 Visão Geral (Dashboard)                │
  ├────────────────────────────────────────────────────────┤
  │ [Topo] 4 KPIs: Saldo Total | Caixa | Contas | Diferença│
  ├────────────────────────────────────────────────────────┤
  │ [Meio] Faturamento Atual vs Ant | A Receber | Fluxo Cx │
  ├────────────────────────────────────────────────────────┤
  │ [Evolução Macro do Mês] Gráfico Widescreen Full-Width  │
  ├────────────────────────────────────────────────────────┤
  │                                                        │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │ Tabela: Resultado por Loja (Widescreen Completa) │  │
  │  │ - Saldos positivos em ciano/verde               │  │
  │  │ - Saldos negativos em vermelho com badge alerta  │  │
  │  │ - Contas OFX, Faturamento, Pátio e Totais        │  │
  │  └──────────────────────────────────────────────────┘  │
  │                                                        │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │ Gráfico: Faturamento × Contas por Loja           │  │
  │  │ - Container amplo (sem espremer)                 │  │
  │  │ - Barras agrupadas com espaçamento legível       │  │
  │  │ - Tooltip com allowEscapeViewBox & z-index:99999 │  │
  │  │ - Destaque do Resultado Líquido no Tooltip       │  │
  │  └──────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────┘
```

## 2. Detalhes de Implementação

### 2.1 `src/components/dashboard/FaturamentoVsContasChart.tsx`
- Layout:
  - Altura dinâmica baseada na quantidade de lojas (`height: Math.max(380, chartData.length * 44)`).
  - Nomes das lojas limpos e formatados com siglas (ex: `Dom Pedro (DP)`, `Planalto (BRASICAR)`, `Santo André (HD)`).
  - Tooltip:
    - `<Tooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 99999 }} />`.
    - CustomTooltip renderiza: Nome da loja, Faturamento (verde), Contas (laranja), e **Resultado Líquido** (verde se positivo, vermelho se negativo) com badge.
  - Eliminação de qualquer `overflow: hidden` ou `overflow-y-auto` restritivo que corte o tooltip.

### 2.2 `src/components/dashboard/StoreTableDashboard.tsx`
- Se `store.saldoAtual < 0`:
  - Exibe o valor em vermelho (`-R$ 11.849,09`) acompanhado de um mini-badge `Negativo` ou ícone de alerta.
- Tooltip do rodapé com o somatório de saldos positivos vs negativos.

### 2.3 `src/routes/index.tsx`
- Organizar a Faixa Base:
  - Card 1: `EvolucaoMacroChart` (full-width widescreen).
  - Card 2: `StoreTableDashboard` (full-width ou grid 2-col equilibrado).
  - Card 3: `FaturamentoVsContasChart` (full-width amplo com barras confortáveis e leitura perfeita de todas as lojas).

---

## 3. Cenários de Teste
- **Cenário 1: Hover no Gráfico de Faturamento x Contas**:
  - Ao passar o mouse sobre qualquer barra de qualquer filial (ex: Piraporinha, Planalto, Santo André), o card do Tooltip aparece 100% visível sobreposto, sem nenhum corte lateral ou vertical.
- **Cenário 2: Visualização de Saldo Negativo**:
  - A linha de Planalto - BRASICAR destaca `-R$ 11.849,09` em vermelho com indicador visual imediato.
- **Cenário 3: Responsividade e Leitura**:
  - Todas as 10 lojas são exibidas com seus nomes completos e sem sobreposição de texto.
