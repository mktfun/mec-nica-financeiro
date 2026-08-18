# Design Técnico: Exibição do Saldo a Compensar por Loja e Global (Spec 235)

## 1. Arquitetura de Dados & Backend (PostgreSQL)

### 1.1 Atualização da RPC `get_daily_reconciliation_summary`

No CTE `store_calc` da RPC, cruzamos diretamente o saldo da conta corrente com a apuração da conciliação tripla de maquininhas por loja:

```sql
WITH recon_latest AS (
    SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as historical_na_loja
    FROM reconciliations
    WHERE date <= p_date
    ORDER BY store_id, date DESC
),
triple_match AS (
    SELECT 
        s.id as store_id,
        COALESCE(r.rede_liquido, 0) as rede_liquido,
        COALESCE(o.ofx_maquininhas, 0) as ofx_maquininhas,
        GREATEST(0, COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) as nao_entrou_valor,
        CASE 
            WHEN COALESCE(r.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
            WHEN ABS(COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) <= 10 THEN 'entrou'
            WHEN COALESCE(o.ofx_maquininhas, 0) > 0 AND COALESCE(r.rede_liquido, 0) > COALESCE(o.ofx_maquininhas, 0) THEN 'parcial'
            ELSE 'nao_entrou'
        END as status_compensacao
    FROM stores s
    LEFT JOIN store_rede r ON r.store_id = s.id
    LEFT JOIN store_ofx o ON o.store_id = s.id
)
```

E montamos cada objeto da loja com:
```json
{
  "store_id": "st-01",
  "store_name": "Dom Pedro - DP",
  "saldo_banco_ofx": 8721.06,
  "nao_entrou_valor": 1727.05,
  "saldo_banco_total": 10448.11,
  "status_compensacao": "parcial",
  "maquininha": 8721.06,
  "pix": 3500.00,
  "na_loja_os": 12500.00,
  "previsto_ofx": 12221.06,
  "diferenca": 0.00,
  "status": "approved"
}
```

---

## 2. Componentes de Frontend

### 2.1 Atualização de `src/hooks/useBackendConciliacao.ts`
Adicionar os novos campos tipados na interface `StoreReconciliationSummary`:
```ts
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number; // Saldo total consolidado (OFX + Não Entrou)
  saldo_banco_ofx: number; // Saldo puro do extrato OFX
  nao_entrou_valor: number; // Vendas de maquininha a compensar
  status_compensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento';
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence';
}
```

### 2.2 Card da Loja em `src/routes/conciliacao.index.tsx`
No Card de cada loja, na coluna `Saldo Banco`:
- Valor Principal: `log.saldo_banco_total ?? log.saldo_banco`
- Sub-linhas:
  - `OFX: R$ ...`
  - `+ Maq: + R$ ... (Não Entrou)` com cor âmbar destacada.
- Badge ao lado do nome da loja:
  - `ENTROU` (se `status_compensacao === 'entrou'`)
  - `NÃO ENTROU (+ R$ ...)` (se `status_compensacao === 'nao_entrou' || 'parcial'`)

### 2.3 Header de `src/routes/conciliacao.$lojaId.tsx`
Banner discreto e informativo no topo da página da loja detalhando o status de compensação das maquininhas.
