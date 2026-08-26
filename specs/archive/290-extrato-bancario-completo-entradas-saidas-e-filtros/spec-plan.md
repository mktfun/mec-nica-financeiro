# Spec Plan: Extrato Bancário Nativo por Loja com Entradas, Saídas, Filtros e Fuzzy Match de Despesas (290)

## Tasks

### Fase 1 — Consulta de Dados e Motor de Fuzzy Match
- [x] [FRONTEND] Ajustar hook/consulta para carregar transações OFX (`in` e `out`) e contas a pagar (`daily_manual_bills`) da loja na data
- [x] [FRONTEND] Implementar função utilitária `matchExpenseWithOfxDebit(debitTx, billsList)` com cruzamento por valor e similaridade de favorecido

### Fase 2 — Refatoração de StoreExtratoBancarioView (Design 100% Nativo)
- [x] [FRONTEND] Atualizar os 4 cards de KPIs no topo: (+) Entradas, (-) Saídas, (=) Movimentação Líquida e Saldo Final em Conta
- [x] [FRONTEND] Implementar barra de filtros nativa: [Todas], [Pendentes ⚠️], [Entradas (+)], [Saídas (-)], [Contas Pagas], [Rede / Cartão]
- [x] [FRONTEND] Adicionar coluna de Data formatada estritamente como `DD/MM/AAAA` (sem horário)
- [x] [FRONTEND] Renderizar badges nativos de status para saídas casadas com despesas (`🟢 Conta: [Nome]`), Rede (`🔵 Rede`), OSs (`🟢 OS #[N]`) e pendentes (`🟡 Pendente`)

### Fase 3 — Modais e Ações
- [x] [FRONTEND] Conectar ações de justificar/vincular utilizando os modais existentes (`OrphanCategorizationModal` e `ManualMatchOsModal`)
- [x] [FRONTEND] Adicionar opção de vincular saída a uma conta a pagar manualmente caso o auto-match não ocorra

### Fase 4 — Validação e Quality Gate
- [x] [TEST] Validar conciliação das saídas e entradas de Dom Pedro, Jabaquara e demais lojas
- [x] [TEST] Test suite automatizado com 9/9 cenários validados com sucesso (`test_spec290_matcher.js`)
