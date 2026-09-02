# Proposal: Refatoração Completa da Tela de Visão Geral (Dashboard Executivo da Diretoria) (344)

## 1. Contexto & Diagnóstico do Problema

A tela inicial de "Visão Geral" (`/`, implementada em `src/routes/index.tsx`) quebrou completamente devido a:
1. **Divergência Crítica de Contrato no Frontend (`useBackendDashboard.ts`):** O hook tentava ler chaves como `res.porLoja`, `res.saldoTotal`, `res.caixaAtual`, `res.faturamentoAtual`, enquanto a RPC `get_dashboard_metrics` retornava `data.stores`, `data.total_saldo`, `data.total_cxatual`, `data.faturamento_atual`. Essa incompatibilidade gerava arrays vazios e valores `0` ou `NaN` em toda a interface.
2. **Experiência Visual e Design Amador:** Layout visual estático, cartões genéricos sem hierarquia executiva, ausência de visualização clara dos 5 Pilares de Caixa oficiais e falta de comparativos intuitivos de faturamento e pátio para tomada de decisão da diretoria.
3. **Ausência de Insights em Tempo Real:** A diretoria precisa saber em menos de 5 segundos a posição líquida de caixa, o status de fechamento do dia, qual loja liderou o faturamento e onde o dinheiro está retido (cheque especial vs pátio de veículos).

---

## 2. Solução Proposta

Refatorar do zero a tela de Visão Geral com padrão **Fintech Dark Zinc-950 / Emerald / Indigo-500**, estruturando-a em **5 blocos executivos integrados**:

### 🎯 Bloco 1: Header Executivo & Seletor de Fechamentos
- Título institucional com data ativa e badge de status dinâmico (`🟢 Fechamento Oficial Aprovado` ou `🟡 Conciliação em Andamento`).
- Navegador rápido de datas com atalhos para os dias auditados (14/08, 17/08, 18/08, 19/08, 31/08, 01/09).
- Mini-insights da diretoria:
  - 🏆 Loja Líder em Faturamento
  - ⚠️ Alerta de Cheque Especial (se houver filial no negativo)
  - 🚗 Saldo Total Retido em Pátio de OSs

### 📊 Bloco 2: Bento Grid de 6 KPIs Mestres Executivos
1. **Caixa Atual Consolidado:** Posição oficial de caixa dos 5 pilares com variação vs dia anterior.
2. **Faturamento Consolidado:** Faturamento do período + Odômetro acumulado no mês.
3. **Contas do Dia (Subtotal):** Contas a pagar operacionais, juros e pró-labores.
4. **Fluxo de Caixa Líquido:** Geração de caixa líquida do dia com badge positivo/negativo.
5. **Saldo Bancos Líquido:** Saldo positivo total + detalhe em badge do Cheque Especial Itaú.
6. **Veículos & Pátio Retido:** Quantidade de veículos em pátio e montante financeiro em aberto.

### 🏛️ Bloco 3: Painel Interativo dos 5 Pilares de Caixa
- Visualização em cards conectados do fechamento oficial:
  $$\text{Caixa Atual} = (\text{Saldo Bancos Positivos} + \text{Dinheiro MP} + \text{A Receber} + \text{Na Loja OS}) - \text{Cheque Especial}$$
- Modal/Drawer de drilldown para cada pilar ao clicar no card.

### 🏢 Bloco 4: Matriz Analítica das 10 Filiais (Store Performance Matrix)
- Tabela de alta densidade informativa com:
  - Ranking de faturamento por loja com barra de progresso proporcional
  - Saldo bancário da loja (com destaque se negativo em cheque especial)
  - Pátio OS retido e quantidade de OSs abertas
  - Status de conciliação (`Aprovado`, `Pendente`, `Divergente`)
  - Acesso direto em 1 clique para a tela de conciliação detalhada da loja (`/conciliacao/$lojaId`)

### 📈 Bloco 5: Gráficos de Tendência Macro Multi-Dias
- Gráfico de evolução temporal comparativo (Faturamento vs Contas a Pagar vs Caixa Atual) dos últimos dias com dados históricos reais.

---

## 3. Contrato de Dados & Integração

- **Hook Unificado (`src/hooks/useExecutiveDashboard.ts`):**
  - Consumo direto da RPC `get_dashboard_metrics` e `get_daily_reconciliation_summary` com fallback para `daily_snapshots`.
  - Normalização estrita em TypeScript com interface `ExecutiveDashboardData`.
  - Tratamento completo de estados: `isLoading` (Skeletons Dark Zinc-950), `isError`, `isSuccess`.
