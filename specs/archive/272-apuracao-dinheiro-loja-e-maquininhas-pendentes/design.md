# Design: Apuração Automática de Dinheiro no Cofre das Lojas por Janela Contábil (Spec 272)

## Algoritmo de Janela Contábil Automática

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Identificar Último Fechamento Consolidado                │
│    v_last_closed_date = MAX(date) FROM daily_snapshots     │
│    WHERE date < target_date AND caixa_atual > 0             │
│    (Ex: 21/08/2026 para a conciliação de 24/08/2026)        │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Classificação Automática das OSs em Dinheiro             │
│    - Se closed_at / opened_at > v_last_closed_date:         │
│      -> Dinheiro Novo da Janela -> 'em_transito'            │
│      (Ex: OS #586 Dom Pedro = R$ 1.845,00)                  │
│    - Se closed_at / opened_at <= v_last_closed_date:        │
│      -> Conciliação Anterior -> 'depositado' (já baixado)   │
│      (Ex: OS #8736 Rudge R$ 1.900, OS #1094 Beretta)        │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RPC get_daily_reconciliation_summary                     │
│    - dinheiro_loja = SUM(amount) WHERE 'em_transito'        │
│    - Dom Pedro: Dinheiro no Cofre = +R$ 1.845,00            │
│    - Rudge / Beretta / Demais: Dinheiro no Cofre = R$ 0,00  │
│    - Total Geral Dinheiro no Cofre: R$ 1.845,00             │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SaldoBancosDetailModal.tsx                               │
│    - Dom Pedro: OFX (-4.594,81) + Dinheiro (1.845) =        │
│                 Saldo Consolidado: -R$ 2.749,81             │
│    - Permite dar baixa individual que move para             │
│      'depositado' em tempo real no banco                    │
└─────────────────────────────────────────────────────────────┘
```

## Modificações no Banco de Dados
1. Migração SQL `20260824000004_auto_cash_vault_window_and_pos_pending.sql`:
   * Cria função de sync automático de `store_cash_vault` com base na janela do último fechamento consolidado.
   * Ajusta `get_daily_reconciliation_summary` para apurar `dinheiro_loja` (apenas `status = 'em_transito'`) e `nao_entrou_valor` (maquininhas a compensar).

## Modificações no Frontend
1. **`useOsImportProcessor.ts`:**
   * Extrair explicitamente `cash_value` nos pagamentos de OSs.
2. **`CentralImportWizard.tsx`:**
   * No Step 4, aplicar a sincronização automática da janela contábil em `store_cash_vault`.
3. **`SaldoBancosDetailModal.tsx`:**
   * Exibir a composição com 100% de paridade com o Excel.
