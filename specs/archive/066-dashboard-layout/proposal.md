# Spec 066: Reestruturação Visual do Dashboard V5 (Macro Chart)

## 1. Visão Geral
O usuário solicitou uma mudança na disposição visual do Dashboard Principal (`src/routes/index.tsx`) para otimizar a leitura executiva e criar uma visão macro consolidadora.

**Objetivos:**
1. Criar um novo **Hero Card (Painel Macro)** posicionado acima da tabela "Resultado por Loja".
2. Este Painel terá **UM ÚNICO GRÁFICO SUPERIOR** combinando 3 linhas/áreas de dados:
   - Evolução do Saldo Global
   - Faturamento Global
   - Contas (OFX) Global
3. **Escala de Tempo Dinâmica (Mensal):** O eixo X do gráfico se adaptará perfeitamente aos dias do mês atual. Se o mês começou dia 1 e estamos no dia 7, o gráfico terá 7 dias. Se os dados importados são do dia 15 ao dia 31, o gráfico mostrará apenas esse recorte.
4. A barra lateral (coluna da direita) será dedicada 100% ao gráfico **Faturamento × Contas**, ocupando toda a altura vertical sem ficar espremido.

## 2. Abordagem Técnica
- **`src/hooks/useDashboardV2.ts`**:
  - Modificar a coleta do histórico (atualmente restrita a 15 dias de Saldo) para buscar todas as datas do **Mês Referência** (mês da `dateAtual`).
  - O array de histórico passará a agregar `saldo`, `faturamento` e `contas` por data.
- **`src/components/dashboard/EvolucaoMacroChart.tsx`**:
  - Renomear/refatorar o antigo `EvolucaoSaldoChart` para um gráfico unificado (Recharts `ComposedChart` ou `AreaChart` com 3 séries).
  - O gráfico preencherá toda a largura do Hero Card.
- **`src/routes/index.tsx`**:
  - Reorganizar o Grid inferior (`xl:col-span-3`).
  - Inserir o novo Hero Card na parte superior desta coluna.
