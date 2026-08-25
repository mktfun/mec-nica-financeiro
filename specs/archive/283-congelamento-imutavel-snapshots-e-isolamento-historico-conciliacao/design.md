# Design: 283 — Congelamento Imutável de Snapshots Fechados e Isolamento Histórico da Conciliação

## Arquitetura Técnica
Diagrama de bifurcação determinística entre Dias Fechados (Snapshot Imutável) e Dias Ativos (Cálculo Dinâmico):

```
                       [Requisição get_daily_reconciliation_summary(p_date)]
                                               │
                                               ▼
                              ┌───────────────────────────────────┐
                              │ Existe daily_snapshots(date) com │
                              │ is_closed = true / homologado?    │
                              └───────────────────────────────────┘
                                         │               │
                                   [SIM] │               │ [NÃO / p_force_dynamic=true]
                                         ▼               ▼
                   ┌───────────────────────────────┐   ┌───────────────────────────────┐
                   │  RETORNO DO SNAPSHOT CONGELADO│   │    AGREGAÇÃO DINÂMICA VIVA    │
                   │  - Saldo Bancos OFX congelado │   │  - Consulta patio_os aberto   │
                   │  - Total Pátio da data fixo   │   │  - Consulta ofx_transactions  │
                   │  - Dinheiro no cofre fixo     │   │  - Consulta store_cash_vault  │
                   │  - Caixa Atual histórico fixo │   │  - Consulta pos_transactions  │
                   │  - Diferença Final imutável   │   │  - Calcula Diferença do Dia   │
                   └───────────────────────────────┘   └───────────────────────────────┘
                                         │                               │
                                         └───────────────┬───────────────┘
                                                         │
                                                         ▼
                                          [Retorno JSON Padronizado para UI]
```

## Interfaces TypeScript

```typescript
export interface DailySnapshotModel {
  id: string;
  date: string;
  caixa_atual: number;
  caixa_anterior: number;
  saldo_bancario: number;
  dinheiro_mp: number;
  a_receber_manual: number;
  total_patio: number;
  contas_a_pagar: number;
  juros_rede: number;
  saldo_negativo_itau: number;
  faturamento: number;
  total_recebiveis: number;
  provisao: number;
  is_closed: boolean;
  closed_at?: string | null;
  metadata?: {
    total_saldo_banco?: number;
    dinheiro_em_lojas?: number;
    cartoes_a_compensar?: number;
    devolucoes_rede?: number;
    diferenca_final?: number;
    status_geral?: 'approved' | 'divergent';
    stores_summary?: any[];
  } | null;
  created_at?: string;
  updated_at?: string;
}
```

## Componentes / Hooks / Funções

| Artefato | Caminho | Responsabilidade |
|---|---|---|
| **Migration SQL** | `supabase/migrations/20260825000002_freeze_closed_snapshots_and_isolate_history.sql` | Adiciona colunas `is_closed` e `closed_at`, congela formalmente os dias 18/08, 19/08, 21/08 e 24/08 com seus valores canônicos e atualiza a RPC `get_daily_reconciliation_summary` para respeitar o congelamento de dias fechados. |
| **RPC Canônica** | `get_daily_reconciliation_summary` | Bifurcação: se o dia estiver congelado, retorna a fotografia exata do snapshot; se estiver aberto, calcula dinamicamente. |
| **Hook Frontend** | `src/hooks/useBackendConciliacao.ts` | Suporte a flag de status de fechamento e recarregamento sem quebrar cache de dias passados. |
| **Painel Resumo** | `src/components/conciliacao/ResumoDiaPanel.tsx` | Exibição de badge "Dia Fechado & Consolidado" vs "Dia em Aberto (Live)". |

## Fluxo de UI
1. Ao navegar por datas passadas consolidadas (ex: 18/08, 19/08, 21/08, 24/08), o sistema exibe o status `APPROVED` com os valores oficiais imutáveis congelados.
2. Ao realizar o fechamento do dia de hoje ($D$), o sistema lê o `caixa_anterior` do snapshot fechado de ontem ($D-1$), mantendo estabilidade contábil de 100%.
3. Caso o gestor financeiro precise corrigir retroativamente um dia passado, existe a opção explícita de "Reabrir Conciliação", que reativa o modo dinâmico temporariamente.

## Infra / Deploy
- Nenhuma dependência externa nova.
- Execução controlada via migration Supabase SQL.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Preservação de Pátio e Caixa do Dia 18/08 e 19/08
- **SCAN:** Consultar `get_daily_reconciliation_summary('2026-08-18')` e `('2026-08-19')`.
- **INFER:** O pátio do dia 18/08 deve ser R$ 115.988,47 e o caixa atual R$ 316.215,85. O pátio de 19/08 deve ser R$ 100.153,69 e o caixa R$ 271.922,90.
- **VERIFY:** Executar RPC e verificar se o retorno bate exatamente com os fechamentos oficiais homologados sem sofrer desvios por OSs pagas no dia 24/08.
- **FIX:** RPC prioriza o snapshot congelado para dias fechados.

### Cenário 2: Blindagem do Caixa Anterior de Hoje
- **SCAN:** Ao calcular o fechamento de 24/08 ou 25/08.
- **INFER:** O `caixa_anterior` consome o `caixa_atual` congelado do dia anterior imediatamente consolidado, blindado contra oscilações de OSs.
- **VERIFY:** O fechamento de 24/08 permanece com `status_geral = 'approved'` e `diferenca_final <= 50.00`.
