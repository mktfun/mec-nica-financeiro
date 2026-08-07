# Design: Global Backend Math Refactor (108-global-backend-math-refactor)

## Arquitetura Técnica
(Frontend - Dashboard e Conciliação)
  ↓
[Hooks Simples e Diretos (`useBackendDashboard`, `useBackendConciliacao`)]
  ↓
[Supabase PostgREST RPC]
  ↓
(Camada de Matemática SQL e Triggers no Banco)
  1. Agrega transações, deduplica saldos bancários
  2. Calcula Fluxo, Caixas, Diferenças e Variações Percentuais
  3. Compara o estado atual contra o histórico persistido
  4. Realiza UPSERT nas tabelas de Snapshot (`_daily_logs`) garantindo Auditoria imutável
  ↓
[Retorno em JSON Pré-Computado para Componentes]

## Interfaces TypeScript
```typescript
export interface ConciliationDailyLog {
  date: string;
  store_id: string;
  faturamento_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence' | 'pending';
}

export interface DashboardDailyLog {
  date: string;
  saldo_total: number;
  caixa_atual: number;
  contas_a_pagar: number;
  diferenca: number;
  faturamento_atual: number;
  faturamento_anterior: number;
  variacao_faturamento: number;
  fluxo_caixa: number;
  a_receber: number;
  veiculos_patio: number;
  veiculos_patio_valor: number;
  historico_macro: any[]; // JSON array
}
```

## Componentes / Hooks / Funções
1. **Migrations SQL**: `add_conciliation_and_dashboard_logs_rpc.sql` (contém tabelas e RPCs matadoras).
2. **Hooks**: 
   - `src/hooks/useBackendDashboard.ts`
   - `src/hooks/useBackendConciliacao.ts`
3. **Páginas a limpo**:
   - `src/routes/index.tsx`
   - `src/routes/conciliacao.index.tsx`
   - `src/components/conciliacao/ResumoDiaPanel.tsx`

## Fluxo de UI
Toda vez que a tela principal (Dashboard) ou a tela de Conciliação montar ou alterar a data, os hooks novos buscarão o snapshot processado no banco de dados. Os indicadores, gráficos de barra e alertas vermelhos/verdes acenderão baseados unicamente no JSON respondido pela RPC, matando a árvore de dependências espaguete do frontend.

## Cenários de Verificação
- **Cenário 1**: Faturamento Anterior no Dashboard. O usuário abre o sistema hoje, o SQL calcula as métricas, retroage 1 dia, calcula as do dia anterior, e exibe o `variacao_faturamento` exato no front.
- **Cenário 2**: Conciliação individual exibe a Diferença correta de (`Previsto - PIX - Maquininha`). Caso haja falha (ex: Pix = 50, Prev = 60), a tela acusa erro -10. O admin pode auditar na tabela de logs para ver que às 22h os valores bateram exatamente nisso.
