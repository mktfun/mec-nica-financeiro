# Design: Fix Dashboard & Loja UI Consistency (083)

## Arquitetura Técnica
Fluxo da UI -> Custom Hooks (React Query) -> Supabase.
O estado do componente `LojaDashboardPage` gerencia `startDate` e `endDate`.
Eles determinam o que é filtrado no DB (através do Supabase `.gte` e `.lte`).
A mudança passará por ajustar como os totais e extratos sÁo consolidados nessas datas, substituindo `occurred_at` por `target_date` para os totais.

## Interfaces TypeScript
Nenhuma nova interface. UtilizaçÁo das já existentes em `useExtrato`, `useDashboardV2` e `TransactionRow`.

## Componentes / Hooks / Funções

1. **`src/components/conciliacao/ResumoDiaPanel.tsx`**
   - **Responsabilidade**: Mudar o Card de `SALDO BANCO ITAÚ` para renderizar uma prop diferente (saldo real/global) ou rebatizar para `FATURAMENTO (ENTRADAS BANCÁRIAS)`. Como a tela já recebe totais, vamos renomear a label atual para "Faturamento OFX" ou apontar para a variável de `globalBalance`.

2. **`src/routes/loja.$lojaId.tsx`**
   - **Responsabilidade**: 
     - Substituir `occurred_at` por `target_date` nas chamadas diretas de `.select('amount, type')` para conciliações (`ofxRes`, `sysRes`, `despRes`).
     - Alterar `getDefaultPeriod()` (ou a forma como inicializa) para pegar a data atual ou manter o default mensal mas garantir que a consulta e filtragem funcionem corretamente para alinhar as visões.

## Fluxo de UI
1. O usuário acessa a tela de Dashboard: vê "Saldo Banco Itaú" com o valor de R$ 17 milhões real e "Faturamento Atual" com 107k. Tudo congruente.
2. O usuário entra na tela de uma Loja específica: a data padrÁo selecionada foca nos últimos eventos ou os totais nÁo se acumulam de forma inconsistente. Os totais de "ConciliaçÁo" que aparecem no topo refletem a visÁo por `target_date`.
3. Zero alucinaçÁo visual: sem transações "duplicadas" pelo conflito de datas de range amplo.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Acessar Dashboard Geral → Verificar que o card Itaú nÁo mostra a soma das entradas (107k) e sim o `saldoTotal`.
- **Cenário 2**: Acessar LojaDashboardPage → Selecionar 05/08 como startDate e endDate → Verificar se os totais no topo batem exatamente com as transações renderizadas embaixo (ambos filtrados por `target_date`).
