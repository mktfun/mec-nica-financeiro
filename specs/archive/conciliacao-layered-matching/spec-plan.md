# Spec Plan: Motor de Conciliação em Camadas com Subset-Sum Combinatório e Janela Temporal D-1 (conciliacao-layered-matching)

## Tasks

- [x] [FRONTEND] Implementar Algoritmo de Matching em Camadas em `src/hooks/useConciliacao.ts`:
  - [x] Adicionar busca de transações do dia anterior (D-1 / D-2) na query de `useReconciliationViews`.
  - [x] Implementar a **Camada 1 (Exact 1:1 Match)**: identificar e remover do pool transações com valor idêntico entre Maquininha e Banco OFX.
  - [x] Implementar a **Camada 2 (Subset-Sum Combinatório N:1)**: função de backtracking (limite $N \le 6$) para encontrar combinações exatas de $N$ vendas que somam o valor exato do depósito bancário.
  - [x] Implementar a **Camada 3 (Janela Temporal D-1)**: testar casamentos exatos ou por subconjuntos com lançamentos pendentes de dias anteriores.
  - [x] Implementar a **Camada 4 (Filtragem de Exceções)**: separar tudo o que não fechou matematicamente em uma lista limpa de alertas/exceções reais por loja.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/RedeVsOfxTable.tsx`:
  - [x] Exibir badges distintas para pareamentos de **Camada 1 (1:1 Exato)**, **Camada 2 (Combinação N:1)** e **Camada 3 (Venda D-1)**.
  - [x] Garantir que grupos 100% pareados exibam $R\$ 0,00$ de divergência e não forcem pareamentos errôneos.
- [x] [FRONTEND] Criar componente de Exceções `src/components/conciliacao/ConciliacaoAlertsSection.tsx`:
  - [x] Tabela dedicada para exibir lançamentos pendentes e divergências reais por loja com valor esperado, encontrado e delta.
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx`:
  - [x] Integrar a seção de Alertas/Exceções e atalhos visuais de pareamento por camada.
- [x] [TEST] Verificar compilação limpa com `npm run build` — ✅ 0 erros (34.60s Client + 9.97s SSR).
