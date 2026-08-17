# Design: Refinamento dos Cards e Layout da Tela de Loja (215)

## Arquitetura de Layout e Dados

```mermaid
graph TD
    A[Estado da Rota: activeTab 'extrato' | 'saidas' | 'entradas' | 'caixa'] --> B[LojaPieCharts Component]
    A --> C[Tabela de Lançamentos com Busca]
    D[useStoreAnalyticBreakdown] -->|Ultimo Saldo OFX Fixo| E[Cards Topo: Saldo da Loja & Valor Disponivel]
    D -->|Valores do Periodo Filtrado| F[Cards Topo: Entradas, Saidas, Resultado]
    D -->|Valores do Periodo Filtrado| G[Card Lateral: Resumo de Entradas x Saidas]
    D -->|Fornecedores & Origens| B
```

## Estrutura do Layout (12 Colunas Responsivas)

### Coluna Esquerda (5 Colunas):
1. **Card de Distribuição Financeira (`LojaPieCharts`):**
   - Header limpo: Ícone + Título contextual ("Visão Geral: Receitas x Despesas" quando aba `extrato`, "Distribuição por Fornecedor" quando aba `saidas`, "Distribuição por Origem" quando aba `entradas`).
   - Gráfico Donut de alta definição com centro informativo (`AnimatedNumber`).
   - Lista de legendas com cores macro, valores em R$, contagem e badges de percentual.
2. **Card Lateral de Resumo do Período:**
   - Visual consolidado com 2 blocos (`Entradas` e `Saídas`) e linha divisória com o `Resultado Líquido do Período`.
   - Permite conferência visual instantânea ao lado do gráfico.

### Coluna Direita (7 Colunas):
1. **Abas Principais da Tabela:**
   - `Extrato Bancário`, `Saídas`, `Entradas`, `Caixa Físico`.
2. **Campo de Busca Inline.**
3. **Tabela de Lançamentos:**
   - Data, Tipo, Fornecedor / Origem, Descrição do Extrato, Valor.
   - Paginação.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Aba Extrato):** O operador está na aba `Extrato Bancário` → O gráfico exibe automaticamente Receitas (Verde) vs Despesas (Vermelho) com o saldo líquido no centro do donut.
- **Cenário 2 (Aba Saídas):** O operador clica na aba `Saídas` → O gráfico de pizza muda automaticamente para a segmentação por Fornecedor (com cores macro) sem necessidade de clicar em nenhum botão extra.
- **Cenário 3 (Aba Entradas):** O operador clica na aba `Entradas` → O gráfico de pizza muda automaticamente para a segmentação por Origem (Cartão REDE, PIX, Transferências).
- **Cenário 4 (Filtro de Data e Saldo Fixo):** O operador altera o filtro de data (ex: últimos 7 dias) → O Saldo da Loja no topo permanece fixo no último saldo real importado do OFX da conta, enquanto Entradas, Saídas e a tabela refletem estritamente o período de 7 dias.
