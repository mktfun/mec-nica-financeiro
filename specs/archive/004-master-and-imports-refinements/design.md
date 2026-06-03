# Design: Master & Import Refinements

## Banco de Dados e Modelagem (Supabase MCP)
Não haverá alteração estrutural no Supabase neste estágio, pois `category` e `subtitle` já estão previstos no payload de insert (`useBulkInsertTransactions`), o que falta é enviar os dados corretos nos parsers.
O `is_matriz` (Master) da tabela `stores` será a chave de roteamento condicional no Frontend.

## Componentes UI/UX 2026 (Stitch MCP)

### 1. Master View (`src/routes/loja.$lojaId.tsx`)
A página usará conditional rendering baseado em `store.is_matriz`:
```tsx
if (store.is_matriz) {
  // Renderizar "Corporate Dashboard"
  // - Ocultar "Carros no Pátio"
  // - Gráficos Analíticos
  // - Tabela do Extrato limpa (sem coluna OS)
} else {
  // Renderizar "Branch Dashboard" (atual)
}
```

### 2. Conciliação Diária (`src/routes/conciliacao.tsx`)
- Remover ou comentar o loop `stores.map(...)` que gera o Feed "10 Lojas" com inputs físicos de dinheiro que o usuário considerou confuso e desnecessário.
- Manter o Hero Status Banner e Cards Analíticos.
- Mostrar apenas Lojas que estão com `status === 'PENDENTE'` ou divergências em um formato de lista minimalista de Alertas.

### 3. Parser Inteligente de OS e Despesas
**Despesas (`contasAPagarParser.ts`):**
Mudar a lógica `category: 'contas_pagar'` para ler a coluna `Categoria` se existir, ou usar a lógica de substring na `Descrição` caso as lojas não exportem categorias. (Vamos dar prioridade ao índice da coluna "Plano de Contas" / "Categoria").

**OS (`useOsImportProcessor.ts`):**
O excel de OS do sistema deles muitas vezes tem a Razão Social da Loja na Linha 1 ou Linha 2 do relatório (algo do tipo "Relatório Financeiro de OS - UNIDADE SANTO ANDRÉ").
Se não encontrar, tentaremos identificar padrões, ou o Wizard deixará de mostrar apenas `fileName` para tentar procurar strings específicas dentro de `data[0]` até `data[5]`. Se a leitura interna da loja falhar, ele deve pelo menos exibir um fragmento legível.
*(Como não temos a planilha de exemplo exata do usuário agora, faremos a leitura heurística nas 10 primeiras linhas de todas as colunas buscando padrões como "Unidade", "Loja", ou simplesmente pegando o texto não-vazio mais proeminente que parece um nome, ou então manteremos o filename limpo removendo o "1675_")*.
Para garantir que o usuário não fique preso com um código estranho (1675), vamos limpar o filename (`nomeArquivo.split('_').slice(1).join(' ')`) ou procurar no corpo da planilha.
