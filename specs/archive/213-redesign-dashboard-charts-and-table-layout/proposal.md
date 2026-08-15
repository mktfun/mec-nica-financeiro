# Proposal: 213-redesign-dashboard-charts-and-table-layout

## 1. Visão Geral e Alinhamento com o Usuário

Implementar a arquitetura visual exata solicitada:
1. **Lado Esquerdo (65% da tela / `lg:col-span-8` - Tabela Resultado por Loja Widescreen)**:
   - Tabela espaçosa e 100% legível com todas as 6 colunas visíveis sem necessidade de scroll lateral:
     - *Loja*
     - *Saldo Bancário* (com destaque visual em vermelho vivo e badge de alerta `Negativo` para contas no cheque especial)
     - *Faturamento*
     - *Contas (OFX)*
     - *Resultado Líquido*
     - *Pátio (Unidades e Valor Retido)*
     - *Linha de Totais Gerais*
2. **Lado Direito (35% da tela / `lg:col-span-4` - 2 Cards de Pizza/Donut Empilhados)**:
   - **Card Superior (Faturamento por Filial)**: Gráfico Donut com a fatia percentual (%) e valor em R$ que cada loja representa no faturamento total do dia, totalizador central e legenda limpa.
   - **Card Inferior (Contas por Filial)**: Gráfico Donut com a fatia percentual (%) e valor em R$ das despesas/contas debitadas de cada filial no dia, totalizador central e legenda limpa.
3. **Correção do Gráfico "Visão Macro do Mês"**:
   - Correção do container Recharts para altura fixa (`h-[280px]`).
   - Correção na RPC `get_dashboard_metrics` para calcular o faturamento diário real (delta de odômetro dia a dia) no histórico dos últimos 7 dias.

---

## 2. Contratos Técnicos

- **Componente `StoreTableDashboard.tsx`**:
  - Posicionado na coluna esquerda ampla (`lg:col-span-8`), eliminando cortes nas colunas de Resultado e Pátio.
  - Destaque em vermelho nos saldos negativos.

- **Componente `StoreDonutCharts.tsx` (Novo)**:
  - Posicionado na coluna direita (`lg:col-span-4`), empilhando os dois cards Donut/Pizza usando Recharts.
  - Paleta de Faturamento: Escala em tons Esmeralda, Ciano, Teal e Azul Royal.
  - Paleta de Despesas: Escala em tons Âmbar, Laranja, Coral, Rosa e Violeta.
  - Tooltips flutuantes customizados com `% do total`, `valor em R$` e `nome da filial`.

- **Componente `EvolucaoMacroChart.tsx`**:
  - Container com altura fixa explícita de `280px` evitando colapso de altura no Flexbox.

- **RPC `get_dashboard_metrics` (PostgreSQL)**:
  - Histórico de 7 dias com cálculo de `faturamento_diario` (subtração entre odômetros consecutivos).
