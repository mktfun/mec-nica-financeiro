# Proposal: Redesign do Dashboard com Tabs de Análise por Filial e Tabela de Resultado Horizontal (228)

## 1. Contexto e Motivação
Atualmente, a parte inferior do Dashboard divide a tela em duas colunas assimétricas (65% Tabela de Lojas e 35% dois gráficos de rosquinha empilhados). Esse layout espreme tanto a tabela quanto os gráficos, limitando a visualização e impedindo a análise de Saldo Bancário por Filial.

## 2. Nova Estrutura Proposta

### A. Card Widescreen de Análise por Filial com Tabs (`StoreAnalyticsTabs.tsx`):
Um card panorâmico com navegação por abas:
- **Aba 1: Saldo Bancário por Filial (Contas Itaú)** (Paleta Azul/Cobalto).
- **Aba 2: Faturamento por Filial (OFX / Entradas Bancárias)** (Paleta Esmeralda/Verde/Ciano).
- **Aba 3: Contas / Despesas por Filial (OFX / Saídas Bancárias)** (Paleta Âmbar/Laranja/Coral).

**Conteúdo de cada Aba:**
1. **Gráfico de Rosquinha (Donut Chart) Interativo:**
   - Centro translúcido com o Total Consolidado formatado em moeda.
   - Tooltip rico com Nome completo da Loja, Valor Exato e % de Participação.
   - Legenda com as principais filiais.
2. **Painel Analítico Lateral com Ranking das 10 Lojas:**
   - **Métricas Rápidas:** Total da Categoria, Média por Filial, Loja Líder (Maior Volume) e Menor Volume.
   - **Barras de Progresso / Ranking Horizontal:** Lista das 10 filiais ordenadas por volume com barra visual proporcional, percentual e valor monetário.
3. **Clareza de Fonte de Dados:**
   - Textos explícitos indicando a proveniência: *"OFX (Conta Bancária Itaú)"*.

### B. Card "Resultado por Loja" em Largura Total Horizontal (`StoreTableDashboard.tsx`):
- Ocupa 100% da largura horizontal da tela, proporcionando respiração visual para todas as colunas:
  - *Loja, Saldo Bancário, Faturamento (OFX), Contas (OFX), Resultado Líquido e Pátio (Unidades + Valor)*.
- Linhas com hover suave, badge de saldo negativo elegante, indicadores de tendência e rodapé consolidado.

### C. Fluxo no Dashboard (`src/routes/index.tsx`):
```
[ 1. Visão Geral + Seletor de Data ]
[ 2. Faixa Topo: 4 KPIs ]
[ 3. Faixa Analítica: Faturamento Atual/Anterior, A Receber, Fluxo ]
[ 4. Banner Pátio ]
[ 5. Gráfico de Evolução Macro Widescreen ]
[ 6. NOVO: Card de Análise Setorial por Filiais em Tabs (Saldo | Faturamento OFX | Contas OFX) - Widescreen ]
[ 7. Card Resultado por Loja Widescreen Horizontal ]
```
