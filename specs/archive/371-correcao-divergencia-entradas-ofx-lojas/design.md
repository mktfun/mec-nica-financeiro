# 📐 Design: Correção de Divergência de Entradas OFX por Filial e Sanear Créditos Órfãos

**Spec ID:** `371-correcao-divergencia-entradas-ofx-lojas`  
**Data:** 04/09/2026  

---

## 1. Arquitetura e Fluxo de Dados

```
Banco (ofx_transactions)
       │
       ▼
RPC get_daily_reconciliation_summary
   ├── CTE rede_agg (vendas brutas/líquidas da Rede na data)
   ├── CTE ofx_entradas_agg:
   │     ├── ofx_maquininhas: SUM(amount) onde REDECARD/CIELO/STONE/CARTAO
   │     ├── pix_total: SUM(amount) onde matched_os_number ou PIX OS
   │     ├── entradas_justificadas: SUM(amount) onde manual_category preenchido (Sucata, etc)
   │     └── entradas_orfas: SUM(amount) onde SEM REDE/CARD E SEM OS E SEM JUSTIFICATIVA
   ├── JSON Lojas (stores_detail):
   │     ├── ofx_entradas_total: total de créditos bancários
   │     ├── entradas_conciliadas: (ofx_maquininhas + pix_total + entradas_justificadas)
   │     ├── dif_entradas: (ofx_entradas_total - entradas_conciliadas)
   │     └── status: 'approved' se ABS(dif_entradas) <= 0.05 AND ABS(dif_saidas) <= 0.05
       │
       ▼
Frontend (useDailyReconciliationSummary -> ConciliacaoLojasView -> StoreCardModulo1)
   ├── Linha 1 (ENTRADAS):
   │     ├── OFX Entradas: R$ 2.780,33
   │     ├── Conciliado: R$ 2.780,33
   │     └── Dif. a Justificar: 100% Conciliado (R$ 0,00) em verde
   └── Status da Loja: Verde (100% Conciliado)
```

---

## 2. Contratos SQL & Mudanças no PostgreSQL

### 2.1 CTE `ofx_entradas_agg` na RPC `get_daily_reconciliation_summary`:
```sql
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            COALESCE(SUM(CASE 
                WHEN manual_category ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%CARD%' 
                  OR counterpart_name ILIKE '%CIELO%' 
                  OR counterpart_name ILIKE '%STONE%' 
                  OR counterpart_name ILIKE '%PAGSEGURO%' 
                THEN amount ELSE 0 END), 0) as ofx_maquininhas,
            COALESCE(SUM(CASE 
                WHEN matched_os_number IS NOT NULL 
                  OR manual_category = 'PIX / Recebimento OS' 
                THEN amount ELSE 0 END), 0) as pix_total,
            COALESCE(SUM(CASE 
                WHEN manual_category NOT IN ('PIX / Recebimento OS', 'REDE') 
                 AND manual_category IS NOT NULL 
                 AND NOT (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%') 
                THEN amount ELSE 0 END), 0) as entradas_justificadas,
            COALESCE(SUM(CASE 
                WHEN matched_os_number IS NULL 
                 AND (manual_category IS NULL OR TRIM(manual_category) = '') 
                 AND (manual_justification IS NULL OR TRIM(manual_justification) = '') 
                 AND NOT (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%') 
                THEN amount ELSE 0 END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
```

### 2.2 Projeção em `v_stores_detail`:
```sql
        'ofx_entradas_total', COALESCE(oe.ofx_entradas_total, 0),
        'ofx_maquininhas', COALESCE(oe.ofx_maquininhas, 0),
        'pix_total', COALESCE(oe.pix_total, 0),
        'entradas_justificadas', COALESCE(oe.entradas_justificadas, 0),
        'entradas_orfas', COALESCE(oe.entradas_orfas, 0),
        'entradas_conciliadas', (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
        'dif_entradas', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))),
        'diferenca_entradas', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))),
```

### 2.3 Status Consistente por Loja:
```sql
        'status', CASE 
            WHEN ABS(COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) <= 0.05 
             AND ABS(COALESCE(sofx.ofx_saidas_total, 0) - (
                LEAST(COALESCE(sofx.ofx_saidas_total, 0), COALESCE(bst.contas_loja_total, 0)) +
                LEAST(COALESCE(sofx.saidas_justificadas, 0), GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)))
             )) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

### [MODIFY] `supabase/migrations/20260904000035_fix_store_entradas_orfas.sql`
- Nova migration idempotente atualizando `public.get_daily_reconciliation_summary(text, boolean)` com a fórmula corrigida de `ofx_entradas_agg`, `entradas_conciliadas`, `dif_entradas` e `status`.

### [MODIFY] `src/components/conciliacao/ConciliacaoLojasView.tsx`
- Saneamento definitivo de `orfasEntradas`:
  ```tsx
  const orfasEntradas = rawLog?.dif_entradas !== undefined && Math.abs(Number(rawLog.dif_entradas) - (ofxEntradas - concEntradas)) < 0.1
    ? Number(rawLog.dif_entradas)
    : Math.max(0, Number((ofxEntradas - concEntradas).toFixed(2)));
  ```
  Evita que valores de `entradas_orfas` espúrios sobreponham a subtração canônica de `ofxEntradas - concEntradas`.

---

## 4. Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Filiais com Lotes de Cartão e Justificativas de Sucata (Ex: Dom Pedro `st-01`, Kennedy `st-04`)
- **Estado Inicial:** OFX Entradas = 2.780,33, Lotes Rede = 2.710,32, Justificados = 70,01.
- **Ação:** Execução de `get_daily_reconciliation_summary('2026-09-04')`.
- **Resultado Esperado:**
  - `entradas_conciliadas = 2780.33`
  - `dif_entradas = 0.00`
  - `dif_saidas = 0.00`
  - `status = 'approved'`
  - Card no frontend exibe `Dif. a Justificar: 100% Conciliado R$ 0,00` em verde, sem badge de `DIVERGÊNCIA`.

### Cenário 2: Filial com Crédito Órfão Genuíno (Edge Case)
- **Estado Inicial:** Depósito PIX de R$ 500,00 sem OS vinculada e sem categoria manual.
- **Ação:** Execução da RPC.
- **Resultado Esperado:**
  - `ofx_entradas_total` supera `entradas_conciliadas` em R$ 500,00.
  - `dif_entradas = 500.00`.
  - `status = 'divergence'`.
  - Card no frontend exibe `Dif. a Justificar: Crédito Órfão +R$ 500,00` em vermelho.
