# 📐 Arquitetura & Design — Spec 416: Correção de Dupla Contagem de PIX/OS e Partição Canônica de Entradas OFX

## 1. Arquitetura de Fluxo & Partição de Dados

O cálculo de entradas do extrato bancário na RPC `get_daily_reconciliation_summary` é estruturado em uma CTE pré-agrupada (`ofx_entries`).
Para eliminar qualquer possibilidade de dupla contagem e garantir que a soma dos baldes seja idêntica ao total de entradas, a query deve particionar cada crédito bancário em **ramos mutuamente exclusivos**:

```sql
ofx_entries AS (
    SELECT 
        TRIM(store_id::text) as store_id,
        COALESCE(SUM(amount), 0) as ofx_entradas_total,
        
        -- BALDE 1: ADQUIRENTES / MAQUININHAS
        COALESCE(SUM(CASE 
            WHEN manual_category ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%CARD%'
              OR counterpart_name ILIKE '%CIELO%'
              OR counterpart_name ILIKE '%STONE%'
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR bank_name ILIKE '%REDE%'
              OR bank_name ILIKE '%CARD%'
              OR bank_name ILIKE '%CIELO%'
              OR bank_name ILIKE '%STONE%'
              OR bank_name ILIKE '%PAGSEGURO%' THEN amount 
            ELSE 0 
        END), 0) as ofx_maquininhas,
        
        -- BALDE 2: PIX / RECEBIMENTO OS (Exclui Balde 1)
        COALESCE(SUM(CASE 
            WHEN (manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR bank_name ILIKE '%REDE%' OR bank_name ILIKE '%CARD%' OR bank_name ILIKE '%CIELO%' OR bank_name ILIKE '%STONE%' OR bank_name ILIKE '%PAGSEGURO%') THEN 0
            WHEN matched_os_number IS NOT NULL 
              OR manual_category ILIKE '%OS%' 
              OR manual_category ILIKE '%PIX%'
              OR counterpart_name ILIKE '%PIX%'
              OR bank_name ILIKE '%PIX%' THEN amount 
            ELSE 0 
        END), 0) as pix_total,
        
        -- BALDE 3: ENTRADAS JUSTIFICADAS (Exclui Balde 1 e Balde 2)
        COALESCE(SUM(CASE 
            WHEN (manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR bank_name ILIKE '%REDE%' OR bank_name ILIKE '%CARD%' OR bank_name ILIKE '%CIELO%' OR bank_name ILIKE '%STONE%' OR bank_name ILIKE '%PAGSEGURO%') THEN 0
            WHEN matched_os_number IS NOT NULL 
              OR manual_category ILIKE '%OS%' 
              OR manual_category ILIKE '%PIX%'
              OR counterpart_name ILIKE '%PIX%'
              OR bank_name ILIKE '%PIX%' THEN 0
            WHEN (manual_category IS NOT NULL AND TRIM(manual_category) <> '')
              OR (manual_justification IS NOT NULL AND TRIM(manual_justification) <> '')
              OR match_status IN ('matched', 'intercompany_paired') THEN amount 
            ELSE 0 
        END), 0) as entradas_justificadas,
        
        -- BALDE 4: CRÉDITOS ÓRFÃOS (Tudo o que restou não classificado)
        COALESCE(SUM(CASE 
            WHEN (manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR bank_name ILIKE '%REDE%' OR bank_name ILIKE '%CARD%' OR bank_name ILIKE '%CIELO%' OR bank_name ILIKE '%STONE%' OR bank_name ILIKE '%PAGSEGURO%') THEN 0
            WHEN matched_os_number IS NOT NULL 
              OR manual_category ILIKE '%OS%' 
              OR manual_category ILIKE '%PIX%'
              OR counterpart_name ILIKE '%PIX%'
              OR bank_name ILIKE '%PIX%' THEN 0
            WHEN (manual_category IS NOT NULL AND TRIM(manual_category) <> '')
              OR (manual_justification IS NOT NULL AND TRIM(manual_justification) <> '')
              OR match_status IN ('matched', 'intercompany_paired') THEN 0
            ELSE amount 
        END), 0) as entradas_orfas
    FROM ofx_transactions
    WHERE target_date = v_target_date::date AND type = 'in'
    GROUP BY TRIM(store_id::text)
)
```

---

## 2. Cenários Obrigatórios

### Happy Path:
- O operador clica no botão para vincular o PIX de R$ 720,00 à OS 18481.
- `ofx_transactions` registra `matched_os_number = '18481'` e `manual_category = 'Recebimento OS'`.
- A RPC classifica a transação no **Balde 2 (PIX / Recebimento OS)** e a exclui do **Balde 3 (Entradas Justificadas)**.
- `pix_total` recebe R$ 720,00.
- `entradas_justificadas` NÃO recebe R$ 720,00.
- `entradas_conciliadas` = R$ 15.027,26.
- `dif_entradas` = R$ 15.027,26 - R$ 15.027,26 = **R$ 0,00**.
- O card de Planalto exibe `Dif. a Justificar: R$ 0,00 (100% Conciliado)` com borda verde/aprovada.

### Edge Case:
- Uma transação bancária possui a palavra "PIX" no memo (`counterpart_name`) mas o operador justificou manualmente como "Transferência entre Lojas" (`manual_category = 'TRANSFERÊNCIA'`).
- A ordem de precedência garante que categorizações explícitas de transferência ou holding sejam respeitadas, ou que caia deterministicamente em um único balde sem contagem dupla.

---

## 3. Critérios de Aceitação Verificáveis

1. **Equação Fundamental Mantida:** Em todas as filiais, a soma `ofx_maquininhas + pix_total + entradas_justificadas + entradas_orfas` deve ser matematicamente idêntica a `ofx_entradas_total`.
2. **Planalto Equalizada:** A diferença de entradas (`dif_entradas`) de Planalto (`st-06`) em 17/09/2026 deve ser exatamente **R$ 0,00**.
3. **Status Approved:** Todas as 10 filiais permanecem com status `approved` na data 17/09/2026.
4. **Build Limpo:** `npm run build` deve compilar sem erros de tipos.
