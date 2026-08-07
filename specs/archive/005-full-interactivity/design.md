# Design: 005-Full-Interactivity

## UI — DivisÁo de Componentes

### ConciliaçÁo Diária (full-page rewrite)
- **Banner de status** — faixa verde/vermelha no topo
- **SummaryCards** — 4 cards: Entradas, Contas a Pagar, Saldo, Carros no Pátio
- **StoreGrid** — grid de cards por loja (10 lojas, 2 colunas desktop / 1 mobile)
- **AlertasAtivos** — seçÁo inline com alertas do dia
- **DinheiroCaixa** — inputs por loja para informar dinheiro físico

### ConciliaçÁo Detalhes (drill-down)
- **ResumoFinanceiro** — tabela bilateral (entradas vs caixa)
- **TabelaLojas** — tabela sortable com colunas: Loja, Entradas, Dinheiro, Contas, Resultado, Status
- **Tabs** — Por Loja | Erros Detectados | Histórico

### Carros no Pátio
- **SummaryCards** — Total em Aberto, Maior OS, Sem Pagamento, Pagas Parcialmente
- **Tabela** — OS#, Loja, Placa, Valor Total, Valor Pago, Forma Pgto, Status, Dias
- **Filtros** — busca + dropdown loja + tabs de status

### Recebíveis
- **SummaryCards** — Total a Receber, Vencidos, A Vencer Hoje, Recebidos Hoje
- **Tabela** — Data, Loja, Tipo, Valor, Status, Dias

## Modelo de Dados Mock
Todas as interfaces expandidas em `data.ts`:
- `MockPatioOS` — id, osNumber, storeId, storeName, plate, totalValue, paidValue, paymentMethod, status, daysOpen
- `MockReceivable` — id, date, storeName, type, value, status, dueDate
- `MockConciliacaoDetalhe` — storeId, storeName, entradas, dinheiro, contas, resultado, status
- `MockConciliacaoResumo` — cartaoCredito, cartaoDebito, dinheiroFisico, totalEntradas, contasPagar, caixaAnterior, caixaAtual, recebiveisAberto, somaPatio, jurosParcelamento

## Mapa de Dependências
- `conciliacao.tsx` → `data.ts` (resumo + stores grid)
- `conciliacao-detalhes.tsx` → `data.ts` (tabelas detalhadas)
- `patio.tsx` → `data.ts` (mockPatioOS)
- `recebiveis.tsx` → `data.ts` (mockReceivables)
- `historico.tsx` → `data.ts` (mockTransactions expandido)
- `Sidebar.tsx` / `BottomNav.tsx` → novas rotas
