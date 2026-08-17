# Proposal: Refinamento dos Cards e Layout da Tela de Loja (215)

## Problema
1. **Duplicação de Controles:** O card de Distribuição Financeira possuía botões de aba internos (`Geral`, `Por Fornecedor`, `Por Origem`) que duplicavam as abas principais da tabela (`Extrato Bancário`, `Saídas`, `Entradas`), causando redundância na interface.
2. **Saldo Bancário vs Filtro de Período:** O saldo bancário da loja deve representar a posição patrimonial real da conta (último saldo importado do OFX), e não variar com base no intervalo de datas selecionado para visualização do extrato.
3. **Falta de Card de Resumo Lateral de Entradas e Saídas:** O operador solicitou um card complementar lateral mostrando o resumo consolidado de Entradas, Saídas e Resultado Líquido do período filtrado, integrando perfeitamente a coluna lateral de análise visual.

## Solução Proposta
1. **Despoluição do Card de Gráfico (`LojaPieCharts.tsx`):**
   - Remover os botões duplicados de alternância manual dentro do card de gráfico.
   - O gráfico passa a responder **automaticamente à aba ativa selecionada** na tabela:
     - Aba `Extrato Bancário`: exibe o gráfico Donut de **Receitas vs Despesas (Geral)** com resultado líquido central.
     - Aba `Saídas`: exibe automaticamente a **Segmentação por Fornecedor** em cores macro.
     - Aba `Entradas`: exibe automaticamente a **Segmentação por Origem** (Cartão REDE, PIX, Transferências).
     - Aba `Caixa Físico`: exibe a proporção de Dinheiro Físico / Caixas.
2. **Card Lateral de Resumo de Entradas & Saídas do Período:**
   - Adicionar card elegante na coluna esquerda (abaixo ou junto ao gráfico) detalhando:
     - Total de Entradas (Receitas) no período com badge verde e contagem.
     - Total de Saídas (Despesas) no período com badge coral e contagem.
     - Resultado Operacional Líquido do período.
3. **Fixação do Saldo da Loja no Último OFX Importado:**
   - O card "Saldo da Loja" e "Valor Disponível" sempre busca o último `bank_total` / saldo real reportado pelo OFX mais recente da loja, independente da data inicial ou final do filtro de extrato.
   - Entradas, Saídas, Gráficos e a Tabela de Transações continuam respondendo estritamente ao filtro de data selecionado (De / Até).

## Contratos de Dados
- **Consultas Supabase:**
  - Saldo em Conta: `reconciliations.bank_total` (última data registrada da loja).
  - Transações do Período: `transactions` filtradas por `store_id`, `target_date >= startDate` e `target_date <= endDate`.

## API / Interface
- `src/components/lojas/LojaPieCharts.tsx`: simplificado, sem botões de header duplicados, acionado pela prop `activeTab: 'extrato' | 'saidas' | 'entradas' | 'caixa'`.
- `src/routes/loja.$lojaId.tsx`: layout harmonizado com novo card de resumo lateral e saldo bancário desacoplado do filtro temporal.

## Risco Principal
- **Risco:** O usuário selecionar uma aba sem transações e o gráfico ficar vazio sem explicação.
- **Probabilidade:** Baixa.
- **Impacto:** Baixo (Reversível).
- **Mitigação:** Empty state claro com mensagem semântica (ex: "Nenhuma saída registrada neste período").
