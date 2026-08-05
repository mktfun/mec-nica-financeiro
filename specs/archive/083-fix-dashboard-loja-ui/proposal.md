# Proposal: Fix Dashboard & Loja UI Consistency (083)

## Problema
O usuário relatou valores "astronômicos" e duplicidades nas telas de Dashboard e Loja, enquanto a tela de Conciliação exibe os valores corretos. A análise revelou que:
1. **Card Enganoso (Dashboard / ResumoDiaPanel):** O card intitulado "SALDO BANCO ITAÚ" está exibindo a soma das entradas importadas no dia (ex: R$ 107.163,34) em vez do Saldo Real do banco (Ledger Balance, ~17 milhões). Isso gera a percepção de um valor astronômico incorreto.
2. **Visão Mensal vs Diária (LojaDashboardPage):** A tela da Loja utiliza, por padrão, um range de datas de todo o mês corrente (`getDefaultPeriod`), acumulando todas as importações feitas. Além disso, a tela usa `occurred_at` para as somas do cabeçalho, mas `target_date` para a lista, causando um desalinhamento total com a tela de Conciliação (que foca em um único `target_date`).

## Solução Proposta
O fluxo de importação (`CentralImportWizard`) permanecerá **intacto**, conforme exigência estrita do usuário ("ent nem mexe nisso ai"). A correção será exclusivamente na camada de visualização (UI e Queries React):
- **Dashboard / ResumoDiaPanel:** Corrigir a referência do valor no card "SALDO BANCO ITAÚ" para apontar para o saldo real consolidado (ex: `globalBalance` retornado pelo hook `useExtrato` ou extraído das reconciliations).
- **LojaDashboardPage:** 
  - Alterar o range padrão para refletir um único dia (hoje) ou garantir que a filtragem por range utilize `target_date` em todas as queries.
  - Substituir o uso de `occurred_at` por `target_date` nas queries manuais de `concBanco`, garantindo pareamento exato com o que o usuário importou para aquele dia (como na tela de Conciliação).

## Contratos de Dados
- Nenhuma alteração de schema. 
- Operações de leitura (SELECT) na tabela `transactions` passarão a priorizar `target_date` (data de importação/fechamento) em vez de `occurred_at` na tela de Loja.

## API / Interface
- `ResumoDiaPanel.tsx`: Ajuste visual no componente.
- `loja.$lojaId.tsx`: Ajuste no estado inicial de `startDate` e `endDate` (ou refatoração das queries manuais para usar `target_date`).

## Features Existentes Impactadas
- **Dashboard Geral:** Correção visual do saldo.
- **Dashboard da Loja:** Os totais no topo e o extrato passarão a bater centavo por centavo com a tela de Conciliação.

## Risco Principal
Como o usuário não quer que a lógica de importação seja alterada, o risco é o usuário selecionar um range longo na tela da loja e ainda ver um volume massivo de transações e confundir com duplicidade. A mitigação é garantir que o default da tela da Loja seja focado para evitar sobrecarga de visão mensal indesejada.
