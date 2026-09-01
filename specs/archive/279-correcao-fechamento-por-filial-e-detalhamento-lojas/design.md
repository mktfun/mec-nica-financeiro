# Design: Correção do Fechamento por Filial e Cálculo de Diferença por Loja (279)

## 1. Arquitetura e Fluxo de Dados Ponta a Ponta

```
+-------------------------------------------------------------------------------------------------+
| Frontend: src/routes/conciliacao.index.tsx                                                      |
| -> Renderiza <ConciliacaoLojasView stores={stores} summary={summary} selectedDate={date} />      |
| -> Para cada loja, renderiza <StoreCardModulo1 data={storeData} date={date} />                  |
|    - Exibe 6 métricas: SALDO TOTAL | Maquininha | PIX | Na Loja OS | Previsto | Diferença       |
|    - Badges: [ENTROU] (verde), [A COMPENSAR (+ R$)] (âmbar), [DIVERGÊNCIA] (vermelho)           |
|    - Ao clicar: Navega para /conciliacao/:lojaId?date=YYYY-MM-DD                                |
+-------------------------------------------------------------------------------------------------+
                                                |
                                                v
+-------------------------------------------------------------------------------------------------+
| Hook: src/hooks/useBackendConciliacao.ts (useDailyReconciliationSummary)                        |
| -> Chama public.get_daily_reconciliation_summary(p_date, false)                                 |
| -> Recebe summary.stores: StoreReconciliationSummary[] com 10 filiais completas                  |
+-------------------------------------------------------------------------------------------------+
                                                |
                                                v
+-------------------------------------------------------------------------------------------------+
| Backend: RPC public.get_daily_reconciliation_summary                                            |
| 1. CTE rede_agg: pos_transactions por store_id (gross_amount, net_amount, fee_amount)            |
| 2. CTE ofx_rede_agg: ofx_transactions de maquininhas por store_id                               |
| 3. CTE pix_agg: ofx_transactions de PIX/OS por store_id                                         |
| 4. CTE patio_agg: patio_os em aberto até p_target_date por store_id                              |
| 5. CTE vault_agg: store_cash_vault em trânsito por store_id                                     |
| 6. CTE recon_latest: reconciliations (bank_total, historical na_loja) por store_id               |
| 7. SELECT sobre stores WHERE active = true:                                                     |
|    - saldo_banco = bank_total + vault_total + max(0, rede_liquido - ofx_maquininhas)            |
|    - previsto_ofx = rede_liquido + pix_total                                                    |
|    - diferenca = (ofx_maquininhas + pix_total) - previsto_ofx                                   |
|    - nao_entrou_valor = max(0, rede_liquido - ofx_maquininhas)                                  |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Interfaces TypeScript (src/hooks/useBackendConciliacao.ts)

```typescript
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  saldo_banco_ofx?: number;
  saldo_banco_itau?: number;
  maquininha: number;
  rede_bruto?: number;
  rede_liquido?: number;
  rede_taxas?: number;
  ofx_maquininhas?: number;
  nao_entrou_valor?: number;
  pix: number;
  pix_os?: number;
  na_loja_os: number;
  patio_os?: number;
  previsto_ofx: number;
  faturamento_atual?: number;
  diferenca: number;
  status: 'approved' | 'divergence' | 'conciliado' | 'pending';
  status_compensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'a_compensar' | 'sem_movimento';
  dinheiro_loja?: number;
}

export interface StoreCardData {
  storeId: string;
  storeName: string;
  avatarUrl?: string | null;
  saldoBanco: number;
  maquininha: number;
  pix: number;
  naLojaOs: number;
  previsto: number;
  diferenca: number;
  statusCompensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'a_compensar' | 'sem_movimento';
  naoEntrouValor: number;
  status: 'approved' | 'divergence' | 'conciliado' | 'pending';
}
```

---

## 3. Mutações em Arquivos Existentes [MODIFY] e Novos [NEW]

- **`supabase/migrations/20260901000003_fix_store_breakdown_metrics_and_differences.sql` [NEW]**:
  - Nova migration com CTEs isoladas e robustas na RPC `get_daily_reconciliation_summary` para agregação de Saldo, Maquininha, PIX, Pátio, Previsto e Diferença por Loja em ambos os ramais.
- **`src/components/conciliacao/StoreCardModulo1.tsx` [NEW]**:
  - Componente visual isolado para o card de 6 métricas com Dark UI Zinc-950, animações de número e badges informativas.
- **`src/components/conciliacao/ConciliacaoLojasView.tsx` [NEW]**:
  - Grid de filiais que itera sobre as 10 lojas com ordenação inteligente e estados vazios.
- **`src/routes/conciliacao.index.tsx` [MODIFY]**:
  - Substituição da renderização inline pelo componente modular `<ConciliacaoLojasView />`.
- **`src/routes/conciliacao.$lojaId.tsx` [MODIFY]**:
  - Reutilização do componente de card ou métricas no topo e correção do link de retorno preservando `search={{ date: targetDate }}`.
- **`src/hooks/useBackendConciliacao.ts` [MODIFY]**:
  - Alinhamento de tipos TypeScript e garantia de fallbacks estritos.

---

## 4. Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Retorno das 10 Filiais com Métricas Preenchidas (01/09/2026)
- **SCAN:** Chamar RPC `get_daily_reconciliation_summary('2026-09-01')`.
- **INFER:** O array `stores` deve conter 10 lojas, cada uma com `saldo_banco`, `maquininha`, `pix`, `na_loja_os`, `previsto_ofx` e `diferenca` calculados.
- **VERIFY:** Nenhuma filial com valor nulo ou NaN. Soma dos saldos de lojas deve bater com o total bancário.
- **FIX:** Se alguma filial vier vazia, ajustar a CTE `recon_latest` com `WHERE date <= p_target_date`.

### Cenário 2: Preservação da Navegação com Data
- **SCAN:** Acessar `/conciliacao?date=2026-08-31` e clicar na loja `st-01`.
- **INFER:** A rota `/conciliacao/st-01?date=2026-08-31` deve carregar os dados de 31/08.
- **VERIFY:** Ao clicar em "Voltar para Fechamento", a URL deve retornar para `/conciliacao?date=2026-08-31`.
- **FIX:** Incluir `search={{ date: targetDate }}` no `<Link to="/conciliacao">`.
