# Design — SSOT da Conciliação Financeira

## 1. Arquitetura de Fluxo Ponta a Ponta
```text
[Arquivos OFX / POS / Extratos]
               │
               ▼
[Ingestão em Tabelas Físicas: ofx_transactions, pos_transactions, manual_bills]
               │
               ▼
[Rotina fechar_dia(p_date)]:
  1. Ingestão & Verificação
  2. Pareamento Automático Transacional
  3. Recálculo Contábil (get_daily_reconciliation_summary)
  4. Gravação Imutável em daily_snapshots
  5. Registro de Auditoria
               │
               ▼
[Hook Central Frontend: useDailyReconciliationSummary(date)]
               │
               ▼
[UI Components (ResumoDiaPanel, LojaView, Dashboards)]
*ZERO cálculos matemáticos ou somas de dinheiro no React*
```

## 2. Contratos e Interfaces TypeScript

### Interface Canônica de Retorno do Dia:
```typescript
export interface DailyReconciliationSummary {
  date: string;
  is_closed: boolean;
  status: 'approved' | 'divergence';
  tolerancia_aplicada: number;
  
  // Totais Globais
  faturamento_bruto: number;
  faturamento_liquido: number;
  saldo_bancos: number;
  saldo_dinheiro_mp: number;
  saldo_a_receber: number;
  saldo_patio: number;
  saldo_cofre: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  valor_disp_contas: number;
  subtotal_contas: number;
  diferenca_final: number;
  
  // Breakdown por Filial (10 lojas)
  stores: Array<{
    store_id: string;
    store_name: string;
    faturamento: number;
    entradas_ofx: number;
    saidas_ofx: number;
    diferenca: number;
    status: 'approved' | 'divergence';
  }>;
}
```

### Vocabulário de Status Padronizado (`src/types/status.ts`):
```typescript
export const MATCH_STATUSES = [
  'pending',
  'matched',
  'batch',
  'intercompany',
  'cancelled',
  'ignored',
] as const;

export type MatchStatus = typeof MATCH_STATUSES[number];
```

## 3. Cenários Obrigatórios

### Happy Path:
- Usuário acessa o dia 17/09/2026.
- `useDailyReconciliationSummary` chama `get_daily_reconciliation_summary('2026-09-17')`.
- Banco retorna os totais calculados.
- UI renderiza os cards diretamente a partir dos campos do payload sem executar um único `.reduce()` ou soma de estado local.
- Subtotal de lojas soma perfeitamente o valor global.

### Edge Case (Dia Aberto em Edição):
- Usuário altera uma despesa na tela de contas manuais.
- A ação executa mutação direta na tabela `daily_manual_bills`.
- TanStack Query invalida a chave única `['daily-summary', '2026-09-17']`.
- O hook refaz o fetch; como `is_closed = false`, a RPC recalcula a partir do banco e devolve o novo estado instantaneamente.

## 4. Critérios de Aceitação Verificáveis
1. **Compilação Limpa:** `npm run build` passa com 0 erros de TypeScript e 0 warnings impeditivos.
2. **SSOT Estrito:** Nenhum arquivo de componente UI executa fórmulas aritméticas (`+`, `-`, `*`) para derivar `caixa_atual`, `fluxo_caixa`, `valor_disp_contas`, `subtotal_contas` ou `diferenca_final`.
3. **Idempotência de Fechamento:** Executar `fechar_dia` duas vezes consecutivas para a mesma data produz exatamente o mesmo payload de snapshot.
4. **Vocabulário de Status:** Zero registros com status `NULL` ou variações (`MATCHED`, `nao_entrou`, etc.) nas tabelas `ofx_transactions` e `pos_transactions`.
