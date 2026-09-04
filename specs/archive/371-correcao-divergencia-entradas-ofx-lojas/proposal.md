# 📋 Proposta: Correção de Divergência de Entradas OFX por Filial e Sanear Créditos Órfãos

**Spec ID:** `371-correcao-divergencia-entradas-ofx-lojas`  
**Data:** 04/09/2026  
**Status:** Proposta Aberta  
**Área:** Conciliação Bancária / RPCs Postgres / Fechamento por Filial  

---

## 1. O Problema

Ao visualizar os cards de fechamento por filial em `/conciliacao` para o dia `2026-09-04`, os cards de quase todas as lojas passaram a exibir uma divergência espúria na linha de **ENTRADAS**, rotulando os depósitos legítimos de cartão da Rede como **"Crédito Órfão"** e marcando as lojas com o badge vermelho de **`DIVERGÊNCIA`**:

### Exemplos do Sintoma Identificado pelo Usuário:
1. **Dom Pedro (`st-01`):**
   * **OFX Entradas:** R$ 2.780,33 (Rede D-1: R$ 2.710,32)
   * **Conciliado:** R$ 2.780,33
   * **Dif. a Justificar:** `Crédito Órfão +R$ 2.710,32` (em vermelho!)
   * *Contradição:* Se OFX Entradas é R$ 2.780,33 e Conciliado é R$ 2.780,33, a diferença matemática é rigorosamente **R$ 0,00** ($2.780,33 - 2.780,33 = 0$), e não R$ 2.710,32!

2. **Jabaquara (`st-02`):**
   * **OFX Entradas:** R$ 9.049,86 (Rede D-1: R$ 6.149,86)
   * **Conciliado:** R$ 9.049,86
   * **Dif. a Justificar:** `Crédito Órfão +R$ 6.149,86`

3. **Jorge Beretta (`st-03`):**
   * **OFX Entradas:** R$ 3.107,16 (Rede D-1: R$ 3.107,02)
   * **Conciliado:** R$ 3.107,16
   * **Dif. a Justificar:** `Crédito Órfão +R$ 3.107,02`

4. **Kennedy (`st-04`):**
   * **OFX Entradas:** R$ 2.206,51 (Rede D-1: R$ 2.206,49)
   * **Conciliado:** R$ 2.206,51
   * **Dif. a Justificar:** `Crédito Órfão +R$ 2.206,49`

---

## 2. Causa Raiz

Na migration anterior (`20260904000034_fix_store_saidas_divergences.sql`), a CTE `ofx_entradas_agg` da RPC `get_daily_reconciliation_summary` definiu:
```sql
COALESCE(SUM(CASE WHEN matched_os_number IS NULL AND manual_category IS NULL THEN amount ELSE 0 END), 0) as entradas_orfas
```
E na montagem do JSON por filial:
```sql
'entradas_conciliadas', (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
'dif_entradas', COALESCE(oe.entradas_orfas, 0),
```

### O Defeito Técnico:
1. As liquidações de cartão da Rede no extrato bancário possuem `counterpart_name ILIKE '%REDE%'` ou `%CARD%`.
2. Como são lotes de adquirente (e não OSs individuais), elas têm `matched_os_number IS NULL`.
3. E como são reconhecidas automaticamente pela adquirente, têm `manual_category IS NULL`.
4. Consequentemente, a cláusula `matched_os_number IS NULL AND manual_category IS NULL` agrupou **TODOS OS LOTES DE CARTÃO DA REDE** como se fossem `entradas_orfas`!
5. Em seguida, a RPC atribuiu diretamente `'dif_entradas', oe.entradas_orfas` em vez de calcular linearmente `ofx_entradas_total - entradas_conciliadas`.
6. Por fim, a verificação de status `status = CASE WHEN ABS(oe.entradas_orfas) <= 0.05 ... THEN 'approved' ELSE 'divergence'` marcou 9 das 10 lojas como divergentes.

Auditoria forense no banco em `2026-09-04` comprovou que **TODAS AS 10 LOJAS POSSUEM DIFERENÇA REAL DE ENTRADAS IGUAL A R$ 0,00** (100% dos créditos bancários explicados por lotes de cartão, PIX de OS ou justificativas de sucata/outros).

---

## 3. Solução Proposta

### 3.1 Correção Canônica na RPC `get_daily_reconciliation_summary` (PostgreSQL)
1. **Regra Estrita de Crédito Órfão (`entradas_orfas`):**
   Um crédito bancário só é órfão se:
   - NÃO for lote de adquirente (`NOT (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR manual_category ILIKE '%REDE%')`);
   - E NÃO possuir OS vinculada (`matched_os_number IS NULL`);
   - E NÃO possuir justificativa manual preenchida (`(manual_category IS NULL OR TRIM(manual_category) = '') AND (manual_justification IS NULL OR TRIM(manual_justification) = '')`).
2. **Equação Linear Canônica de Entradas ($A - B = C$):**
   - $A = \text{OFX Entradas} = \text{ofx\_entradas\_total}$
   - $B = \text{Créditos Conciliados} = \text{ofx\_maquininhas} + \text{pix\_total} + \text{entradas\_justificadas}$
   - $C = \text{Dif. a Justificar} = A - B$
   - `'dif_entradas'`, `(COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)))`
   - `'diferenca_entradas'`, `(COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)))`
3. **Avaliação de Status da Filial:**
   - Status é `'approved'` quando `ABS(dif_entradas) <= 0.05 AND ABS(dif_saidas) <= 0.05`.

### 3.2 Blindagem Defensiva no Frontend (`ConciliacaoLojasView.tsx`)
Garantir que a diferença de entradas exibida nos cards seja calculada de forma imutável como $\max(0, \text{ofxEntradas} - \text{concEntradas})$ caso haja qualquer anomalia de payload, eliminando a renderização de valores incoerentes onde `ofxEntradas === concEntradas` mas a diferença exibia o valor de um dos campos.

---

## 4. Risco Principal & Mitigação
* **Risco:** Reabrir divergências em filiais que possuam sobras legítimas de PIX ou depósitos não identificados.
* **Mitigação:** A fórmula linear $A - B = C$ preserva rigorosamente qualquer valor que não esteja conciliado: se uma loja tiver R$ 500 de PIX sem OS e sem justificativa, esse valor continuará figurando como `Crédito Órfão +R$ 500,00` e a loja ficará como `divergence`.
