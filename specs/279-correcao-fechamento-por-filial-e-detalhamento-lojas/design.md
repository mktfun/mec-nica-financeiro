# Design: Correção do Fechamento por Filial e Contrato de Dados por Loja (279)

## Arquitetura Técnica
```
[Banco de Dados Supabase]
  ├── reconciliations (bank_total por store_id na data)
  ├── patio_os (soma do saldo aberto das OSs por store_id)
  ├── store_cash_vault (dinheiro no cofre em_transito por store_id)
  ├── pos_transactions & get_store_pos_triple_reconciliation
  └── ofx_transactions (rede, pix, justificativas por store_id)
         │
         ▼
[RPC get_daily_reconciliation_summary]
  ├── Agrega v_stores_detail com chaves padronizadas (saldo_banco, maquininha, pix, na_loja_os, etc.)
  └── Retorna objeto JSONB com chave 'stores' e 'stores_detail'
         │
         ▼
[Hook useDailyReconciliationSummary]
  └── Recebe payload e expõe summary.stores para os componentes React
         │
         ▼
[Página /conciliacao (conciliacao.index.tsx)]
  └── Mapeia as 10 lojas exibindo saldos bancários, maquininhas, pix, pátio e diferença real
```

## Interfaces TypeScript
```typescript
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  color?: string;
  saldo_banco: number;
  saldo_banco_ofx: number;
  bank_balance?: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  patio_os?: number;
  cash_vault?: number;
  previsto_ofx: number;
  diferenca: number;
  status_compensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento';
  nao_entrou_valor: number;
  cartoes_a_compensar?: number;
  status: 'approved' | 'divergence';
}
```

## Componentes / Hooks Afetados
1. `supabase/migrations/20260824000009_fix_store_reconciliation_array_in_rpc.sql`:
   - Atualiza a RPC `get_daily_reconciliation_summary` para emitir o array `stores` com todas as propriedades esperadas pelo front.
2. `src/hooks/useBackendConciliacao.ts`:
   - Suporte a normalização de `stores` / `stores_detail`.
3. `src/routes/conciliacao.index.tsx`:
   - Consumo do array `stores` preenchendo todos os cards de filial com valores reais.

## Cenários de Verificação
- **Cenário 1:** Carregar dia `2026-08-24` na tela `/conciliacao`.
  - **Esperado:** Os cards das 10 lojas em "Fechamento por Filial" devem exibir seus saldos bancários reais (ex: Jorge Beretta R$ 25.711,31, Mauá R$ 5.059,26, Santo André R$ 17.255,45, Planalto -R$ 34.205,34, etc.), maquininhas, PIX e Pátio, sem nenhum card zerado por erro de chave.
