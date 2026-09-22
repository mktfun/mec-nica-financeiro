# 📐 SDD Design: Correção do Over-filtering de Datas do OFX (Cards Zerados na Conciliação)

## 1. Arquitetura de Fluxo de Dados Ponta a Ponta

```
[Extrato Bancário OFX / Ingestão]
       │
       ▼
[ofx_transactions] (occurred_at TIMESTAMPTZ, target_date DATE)
       │
       ▼
[PostgreSQL: RPC get_daily_reconciliation_summary(p_date, p_force_dynamic)]
       │
       ├─► Limites Sargables:
       │     v_start_utc = p_date 00:00:00+00 / v_end_utc = (p_date+1) 00:00:00+00
       │     v_start_brt = p_date 00:00:00-03 / v_end_brt = (p_date+1) 00:00:00-03
       │
       ├─► CTE ofx_entradas_agg (WHERE target_date = p_date OR occurred_at IN [start, end))
       ├─► CTE ofx_saidas_agg   (WHERE target_date = p_date OR occurred_at IN [start, end))
       ├─► CTE rede_agg         (WHERE target_date = p_date OR occurred_at IN [start, end))
       ├─► CTE bills_store_agg  (WHERE date = p_date AND contabilizar_no_subtotal = true)
       │
       ▼
[Payload JSONB SSOT: v_stores_detail com chaves completas]
  - ofx_entradas_total (Crédito Real Banco)
  - entradas_conciliadas (Lotes Rede + PIX OS + Justificados)
  - dif_entradas (ofx_entradas_total - entradas_conciliadas)
  - ofx_saidas_total (Débito Real Banco)
  - contas_conciliadas (Despesas Loja + Justificadas)
  - dif_saidas (ofx_saidas_total - contas_conciliadas)
       │
       ▼
[Frontend: useDailyReconciliationSummary(date)]
       │
       ▼
[ConciliacaoLojasView & StoreCardModulo1] (Cards da Direita: OFX Entradas, Conciliados, Saídas OFX, Contas/Boletos)
```

---

## 2. Design System & Padrões de UI

Em conformidade com `DESIGN.md` e `skills/frontend-design-pro/SKILL.md`:
- **Superfície e Fundo:** `bg-zinc-950` (Canvas) e `bg-zinc-900/50` nos painéis internos de Split Dual.
- **Bordas:** `border-white/5` ou `border-border/40`.
- **Tipografia e Cores Semânticas:**
  - `OFX Entradas` (Crédito Real no Banco): `text-emerald-400 font-mono font-bold`.
  - `Conciliado` (Lotes Identificados): `text-zinc-300 font-mono font-bold`.
  - `Dif. a Justificar (Entradas)`: `text-teal-400` se $\le 0.05$, senão `text-rose-400`.
  - `Saídas OFX` (Débito Real no Banco): `text-rose-400 font-mono font-bold`.
  - `Contas / Boletos` (Despesas da Loja): `text-zinc-300 font-mono font-bold`.
  - `Dif. a Justificar (Saídas)`: `text-teal-400` se $\le 0.05$, senão `text-rose-400`.
- **Zero AI Slop:** Proibido o uso de cores hexadecimais arbitrárias ou gradientes espúrios. Apenas tokens Tailwind semânticos pré-definidos.

---

## 3. Interfaces TypeScript Reais

```typescript
// src/hooks/useBackendConciliacao.ts
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  color?: string;
  saldo_banco: number;
  saldo_banco_ofx?: number;
  saldo_devedor_real?: number;
  saldo_positivo_real?: number;
  dinheiro_loja?: number;
  nao_entrou_valor?: number;
  rede_bruto?: number;
  rede_liquido?: number;
  rede_taxas?: number;
  rede_devolucoes?: number;
  ofx_maquininhas?: number;
  status_compensacao?: 'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento' | string;
  status_banco?: 'credor' | 'devedor' | 'compensado_rede' | string;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  patio_os?: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence';
  // Split Dual Canônico
  ofx_entradas_total?: number;
  entradas_conciliadas?: number;
  entradas_realizadas?: number;
  entradas_previsto?: number;
  dif_entradas?: number;
  diferenca_entradas?: number;
  ofx_saidas_total?: number;
  saidas_ofx?: number;
  contas_conciliadas?: number;
  contas_loja_total?: number;
  contas_loja?: number;
  dif_saidas?: number;
  diferenca_saidas?: number;
}
```

---

## 4. Cenários Obrigatórios

### A. Happy Path
- O usuário acessa `/conciliacao?date=2026-09-16` ou qualquer data contábil onde foram importados arquivos OFX.
- A RPC `get_daily_reconciliation_summary` agrega as transações em `ofx_entradas_agg` e `ofx_saidas_agg` através da janela temporal contábil sargable.
- Os cards das filiais renderizam:
  - `OFX Entradas`: Soma real de créditos bancários da loja (ex: R$ 15.027,26).
  - `Conciliado`: Soma de depósitos de cartão Rede + PIX OS vinculados + créditos justificados (ex: R$ 14.307,26).
  - `Dif. a Justificar (Entradas)`: R$ 720,00 (Crédito Órfão).
  - `Saídas OFX`: Soma real de débitos bancários da loja (ex: R$ 11.179,90).
  - `Contas / Boletos`: Soma das despesas lançadas da filial (ex: R$ 2.053,77).
  - `Dif. a Justificar (Saídas)`: R$ 9.126,13 (Débito Órfão).

### B. Edge Case
- Transação bancária registrada com timestamp às 22h00 em horário de Brasília (UTC-3), que no banco é persistida como `01:00:00+00` do dia seguinte em UTC, e com `target_date` ainda não preenchido ou herdado.
- A condição com limites de Brasília (`v_start_brt` e `v_end_brt`) e UTC (`v_start_utc` e `v_end_utc`) captura a transação na data contábil de competência correta, sem quebrar o índice btree e sem descartar a movimentação.

---

## 5. Critérios de Aceitação Verificáveis

1. **Agregação Não-Zerada no Backend:**
   - Para a data `2026-09-16`, a chamada `SELECT public.get_daily_reconciliation_summary('2026-09-16', true);` deve retornar `ofx_entradas_total > 0` e `saidas_ofx > 0` nas filiais com extrato bancário.
2. **Sargabilidade Garantida:**
   - O plano de execução do PostgreSQL (`EXPLAIN ANALYZE`) deve utilizar os índices em `(occurred_at)` ou `(target_date)`, sem varredura sequencial desnecessária (`Seq Scan`) causada por funções envolventes na coluna.
3. **Integridade de Propriedades no Frontend:**
   - A interface de fechamento por filial deve exibir os valores em `StoreCardModulo1.tsx` sem inverter Realizado vs Conciliado e sem exibir falsos `R$ 0,00`.
4. **Build Limpo:**
   - `npm run build` deve compilar sem nenhum erro de tipagem TypeScript ou quebra de interfaces.
