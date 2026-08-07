# Design: Dashboard Fintech V3 (063)

## Arquitetura Técnica
A principal mudança arquitetural é a transiçÁo de um intervalo de datas (mensal) para um pivô baseado na ÚLTIMA data de conciliaçÁo registrada.

Fluxo de Dados:
1. `useDashboardV2` faz uma query inicial na tabela `reconciliations` extraindo todas as `date` distintas e ordenando DESC.
2. Pega `dates[0]` como `dateAtual` e `dates[1]` como `dateAnterior`.
3. Dispara as queries paralelas filtrando estritamente por essas datas, garantindo que "Faturamento" reflita o valor daquele dia/fechamento, nÁo de 30 dias acumulados.
4. O componente de tabela calcula os totais locais e injeta na renderizaçÁo (`<tfoot>`).

## Interfaces TypeScript
```ts
// AlteraçÁo no retorno de useDashboardV2
export interface StoreMetrics {
  storeId: string;
  storeName: string;
  saldoAtual: number;
  faturamento: number;
  contas: number;
  resultado: number;
  statusConciliacao: 'approved' | 'divergence' | 'pending';
  veiculosPatio: number;        // Nova métrica
  veiculosPatioValor: number;   // Nova métrica
}

export interface DashboardV2Data {
  dataAtual: string;       // Nova prop para exibir no cabeçalho
  dataAnterior: string;    // Nova prop
  saldoTotal: number;
  caixaAtual: number;
  contasAPagar: number;
  diferenca: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoFaturamento: number;
  fluxoCaixa: number;
  aReceber: number;
  veiculosPatio: number;
  veiculosPatioValor: number;
  porLoja: StoreMetrics[];
  historicoSaldos: { date: string; saldo: number }[]; // Nova métrica para o gráfico
}
```

## Componentes / Hooks / Funções
- **`useDashboardV2.ts`** [MODIFICADO]: Refatorado para extrair as top 2 datas globais de `reconciliations` e buscar os dados atrelados a elas. CriaçÁo do array `historicoSaldos`.
- **`src/routes/index.tsx`** [MODIFICADO]: RemoçÁo do Seletor de Mês (passa a exibir "Dados ref. à última conciliaçÁo: DD/MM/YYYY"). Labels "Atual" e "vs ANTERIOR". InjeçÁo do novo gráfico.
- **`StoreTableDashboard.tsx`** [MODIFICADO]: AdiçÁo da tag `<tfoot>` com os totais globais e uma nova coluna "Pátio (Qtd/R$)" mostrando os veículos parados por loja.
- **`EvolucaoSaldoChart.tsx`** [NOVO]: Um `AreaChart` do Recharts (linha suave com preenchimento em gradiente teal) exibindo o `Saldo Total` dos últimos 7-10 dias de conciliaçÁo para entregar o peso visual solicitado pelo usuário.

## Fluxo de UI
1. O usuário acessa a página inicial. NÁo há mais dropdown de mês no topo, mas sim um label informando: `"Última atualizaçÁo: DD/MM/YYYY"`.
2. A faixa do meio exibe "Faturamento: Atual" e a comparaçÁo inferior "+X% vs ANTERIOR".
3. A tabela da base exibe todas as lojas e, na última linha, um **TOTAL** em destaque (negrito, bg mais escuro) facilitando a auditoria da rede.
4. O gráfico de barras Faturamento vs Contas dividirá espaço com o novo gráfico de EvoluçÁo do Saldo, ou o substituirá dependendo do layout (vamos manter ambos empilhados ou lado a lado).

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** RenderizaçÁo do Hook.
  - SCAN: `useDashboardV2` nÁo recebe parâmetro de mês.
  - INFER: Deve descobrir automaticamente a data mais recente via supabase.
  - VERIFY: Os valores de Faturamento batem apenas com a `date` encontrada (e nÁo o mês todo).
- **Cenário 2:** Somatório na Tabela.
  - SCAN: Array `porLoja`.
  - INFER: A `tfoot` deve renderizar o `.reduce()` exato dessas colunas.
  - VERIFY: NÁo há quebra de layout na tabela responsiva com a inserçÁo do `tfoot`.
