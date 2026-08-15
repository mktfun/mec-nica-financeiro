# Proposal: 212-fix-dashboard-chart-layout-tooltip-clipping-and-negative-balance-display

## 1. Problemas Identificados

1. **Gráfico Faturamento × Contas Espremido e Ilegível**:
   - No layout atual do Dashboard (`src/routes/index.tsx`), a tabela ocupa `xl:col-span-3` e o gráfico fica espremido em `xl:col-span-1` (~280px de largura).
   - Com 10 filiais, as barras ficam minúsculas, os nomes das lojas ficam truncados (ex: `Piraporinha - EMPORI`, `Módulo - MP`) e a leitura fica inviável.

2. **Tooltip do Gráfico Cortado (90% Invisível)**:
   - O container interno do gráfico possui `overflow-y-auto` e o card tem limites rígidos de largura.
   - Quando o usuário passa o mouse sobre as barras, o card de Tooltip do Recharts é renderizado dentro da camada com overflow e fica **90% cortado pela borda direita/inferior do card**.

3. **Visibilidade de Saldos Bancários Negativos**:
   - Quando uma filial está no vermelho/cheque especial (ex: `Planalto - BRASICAR` com `-R$ 11.849,09`), isso precisa ficar explicitamente destacado na tabela com badge/cor de alerta e no resumo dos saldos, para que o operador saiba exatamente o total positivo vs o saldo negativo das contas.

---

## 2. Solução Proposta

1. **Redesenho do Layout da Seção Inferior do Dashboard (`src/routes/index.tsx`)**:
   - Reestruturar a distribuição visual:
     - Tabela **Resultado por Loja** com visual widescreen imersivo e badge de destaque em lojas com saldo negativo.
     - Gráfico **Faturamento × Contas** em container amplo e espaçoso (com largura generosa ou colunas balanceadas `2x2` / abas / layout responsivo moderno), permitindo visualização clara de todas as 10 lojas sem espremer.

2. **Correção Total do Tooltip do Recharts (`FaturamentoVsContasChart.tsx`)**:
   - Remover o clipping de `overflow-y-auto`.
   - Adicionar `allowEscapeViewBox={{ x: true, y: true }}` e `wrapperStyle={{ zIndex: 99999 }}` no `<Tooltip />` do Recharts.
   - Ajustar o `CustomTooltip` com design premium glassmorphism, indicador de resultado líquido por loja (`Faturamento - Contas`) e margem de segurança para nunca ser cortado.
   - Nomes das lojas limpos e completos (ex: `Dom Pedro (DP)`, `Planalto (BRASICAR)`, `Santo André (HD)`).

3. **Destaque Visual para Saldos Bancários Negativos**:
   - Na tabela `StoreTableDashboard.tsx`, saldos negativos recebem badge vermelho de aviso `Cheque Especial / Negativo` com ícone de alerta.
   - No Card de Saldo Total do topo, o tooltip detalha a composição: `Saldos Positivos: R$ 162.883,67 • Negativos: -R$ 11.849,09 • Saldo Líquido: R$ 151.034,58`.

---

## 3. Contratos de Dados e Componentes Impactados

- `src/routes/index.tsx` (Layout responsivo e grid de cards)
- `src/components/dashboard/FaturamentoVsContasChart.tsx` (Recharts, Tooltip e layout do gráfico)
- `src/components/dashboard/StoreTableDashboard.tsx` (Destaque para saldos negativos e formatação)
