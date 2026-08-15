# Design: 213-redesign-dashboard-charts-and-table-layout

## 1. Wireframe e Distribuição de Grid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Visão Geral (Dashboard)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Top Cards]  Saldo Total    | Caixa Atual    | Contas a Pagar | Diferença   │
│              R$ 151.034,58  | R$ 287.964,69  | R$ 45.772,51   | R$ 0,00     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Mid Cards]  Faturamento D-1| A Receber      | Fluxo de Caixa               │
│              R$ 75.004,28   | R$ 10.694,00   | R$ 29.228,54                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Visão Macro do Mês]  Gráfico de Linha + Área (Evolução Temporal 7 Dias)     │
│                       Altura Fixa: 280px (Faturamento Diário Real)          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────┐  ┌─────────────────────────┐  │
│  │ LADO ESQUERDO (65% / lg:col-span-8)      │  │ LADO DIREITO (35%)      │  │
│  │                                          │  │ (lg:col-span-4)         │  │
│  │ 🏢 Tabela: Resultado por Loja            │  │                         │  │
│  │   (Widescreen - 100% visível sem scroll) │  │ 🍩 Faturamento por Loja │  │
│  │   - Loja                                 │  │   (Donut Chart com %    │  │
│  │   - Saldo Bancário (-R$ 11k Alerta)      │  │    e R$ por fatia)      │  │
│  │   - Faturamento (R$)                     │  │                         │  │
│  │   - Contas OFX (R$)                      │  │ ─────────────────────── │  │
│  │   - Resultado Líquido                    │  │                         │  │
│  │   - Pátio (ud. e R$ retido)              │  │ 🍩 Contas/Despesas      │  │
│  │   - Totais Gerais                        │  │   (Donut Chart com %    │  │
│  │                                          │  │    e R$ por fatia)      │  │
│  │                                          │  │                         │  │
│  └──────────────────────────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Detalhes de Componentes

### 2.1 `src/components/dashboard/StoreTableDashboard.tsx`
- Posicionada na coluna esquerda (`lg:col-span-8`), com espaço amplo para exibir confortavelmente todas as 6 colunas sem quebra ou overflow horizontal.
- Linhas com saldos negativos destacadas com badge `Negativo` e cor vermelha.

### 2.2 `src/components/dashboard/StoreDonutCharts.tsx`
- Posicionado na coluna direita (`lg:col-span-4`), empilhando verticalmente:
  - **Donut 1 (Faturamento por Loja)**: Fatias coloridas em gradiente verde/ciano, valor centralizado com o total faturado no dia e mini-legenda com as principais lojas.
  - **Donut 2 (Contas por Loja)**: Fatias em tons âmbar/laranja/coral, valor centralizado com o total de despesas e mini-legenda com as principais despesas.

### 2.3 `src/components/dashboard/EvolucaoMacroChart.tsx`
- Altura fixa `h-[280px]` para evitar colapso do Recharts.

### 2.4 `src/routes/index.tsx`
- Grid reconfigurado:
  - `lg:col-span-8`: Tabela `StoreTableDashboard`.
  - `lg:col-span-4`: Cards Donut `StoreDonutCharts`.
