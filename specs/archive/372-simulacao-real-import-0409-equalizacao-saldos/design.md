# 📐 Design Técnico: Simulação Real de Importação (04/09/2026) e Equalização de Saldos

**Spec ID:** `372-simulacao-real-import-0409-equalizacao-saldos`  
**Data:** 04/09/2026  
**Status:** Design Técnico (Aguardando Aprovação)  

---

## 1. Arquitetura e Modelagem Contábil Canônica

### 1.1. Regra Canônica Anti-Dupla Contagem de Cartões (Rede a Cair)
O card de liquidez imediata consolidava:
$$\text{total\_saldo\_banco\_positivo} = \text{saldo\_bancos\_positivo} + \text{cartoes\_a\_compensar}$$
* **O Problema:** Os extratos bancários de `04/09/2026` capturados via OFX já fecham o dia contendo os créditos efetuados pela Rede na manhã de 04/09 (referentes às vendas de D-1, `03/09/2026`). Somar novamente o valor bruto ou líquido dessas vendas infla o ativo em R$ 24.547,32!
* **A Solução:**
  1. `cartoes_a_compensar` para a data de referência $D$ deve ser estritamente o montante vendido em cartões que **ainda não foi liquidado em conta bancária até o fechamento de $D$**:
     $$\text{cartoes\_a\_compensar}(D) = \sum \max(0, \text{vendas\_cartao\_liquidas} - \text{creditos\_adquirente\_banco})$$
  2. Para o dia `04/09/2026`, como as vendas de 03/09 foram 100% creditadas na conta no dia 04/09 ($24.547,32 - 24.547,32 = 0$), o valor residual de `cartoes_a_compensar` é **R$ 0,00**.
  3. As vendas de cartão realizadas **no próprio dia 04/09** (registradas nas OSs e no relatório da Rede de 04/09, totalizando R$ 32.776,47) têm liquidação em D+1 (05/09). Elas compõem o saldo a compensar do dia 05/09!
  4. O campo `total_saldo_banco_positivo` reflete com fidelidade a soma dos saldos positivos reais dos extratos: **R$ 290.994,62**.

---

### 1.2. Regra Canônica do Dinheiro em Trânsito (Cofre das Lojas / Baixa Daniel)
* **O Problema:** O filtro SQL atual utilizava `WHERE entry_date = v_target_date::date`. O dinheiro recolhido no dia `03/09/2026` pelo Daniel (R$ 9.113,90 nas filiais Santo André, Dom Pedro e Rei do Módulo) não havia sido baixado até `04/09/2026`, mas deixou de ser exibido porque `entry_date` era 03/09.
* **A Solução:**
  1. O saldo de dinheiro em trânsito é cumulativo:
     ```sql
     SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
     FROM store_cash_vault
     WHERE status = 'em_transito'
       AND entry_date <= v_target_date::date;
     ```
  2. O valor de **R$ 9.113,90** continua constando no Ativo da Tesouraria e fica disponível no modal `BaixaDinheiroTransitoModal.tsx` para o Daniel dar baixa no momento em que efetuar o depósito bancário ou recolhimento central.
  3. No momento da baixa, o status passa para `'depositado'` ou `'baixado'`, neutralizando a pendência sem distorções no histórico.

---

### 1.3. Regra Canônica do Pátio WIP (Restante de Ordens de Serviço)
* As 10 planilhas `_ConferenciaOSxFinanceiro.xls` de `04/09/2026` consolidam:
  - Produção Total: R$ 55.696,43
  - Baixado/Pago no Dia: R$ 43.891,21 (PIX + Cartões)
  - Em Aberto / Pátio WIP: **R$ 11.802,94**
* Este valor reflete o trabalho em andamento (WIP) nas oficinas e compõe o Balanço de Produção (Canal 2), sem poluir a liquidez de caixa imediato da Tesouraria.

---

## 2. Modificações de Banco de Dados (Migration Postgres)

Criar migration `supabase/migrations/20260904000036_fix_reconciliation_exact_balances_0409.sql`:

```sql
-- Atualização atômica da RPC get_daily_reconciliation_summary
CREATE OR REPLACE FUNCTION get_daily_reconciliation_summary(
    p_date text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_date date := p_date::date;
    v_snapshot record;
    v_result jsonb;
    v_saldo_bancos_pos numeric := 0;
    v_saldo_bancos_neg numeric := 0;
    v_rede_total numeric := 0;
    v_rede_creditada numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_dinheiro_mp numeric := 24955.00;
    v_a_receber_manual numeric := 8048.99;
    v_contas_manual numeric := 0;
    v_total_patio numeric := 0;
    ...
BEGIN
    -- 1. Saldos Bancários OFX (Extratos do Dia)
    -- Separação estrita: Bancos Positivos vs Descoberto/LIS
    ...
    -- 2. Dinheiro em Trânsito Acumulado
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE status = 'em_transito'
      AND entry_date <= v_target_date;

    -- 3. Rede a Cair Residual (Vendas - Créditos já entrados no Extrato)
    v_cartoes_a_compensar := GREATEST(0, v_rede_total - v_rede_creditada);

    -- 4. Total Disponível Imediato (Tesouraria Real)
    v_caixa_tesouraria := v_saldo_bancos_pos + v_saldo_bancos_neg + v_cartoes_a_compensar + v_dinheiro_lojas + v_dinheiro_mp + v_a_receber_manual;

    ...
    RETURN v_result;
END;
$$;
```

---

## 3. Componentes Frontend & Visual QA

1. **`src/components/conciliacao/ResumoDiaPanel.tsx` e `CardSaldosAdaptativo.tsx`:**
   - Assegurar que os cards exibam os números puros:
     * **Bancos Positivos:** R$ 290.994,62
     * **Cheque Especial / Devedor:** -R$ 1.653,79 (Planalto)
     * **Cartões a Compensar:** R$ 0,00 (lote 03/09 100% creditado)
     * **Dinheiro em Trânsito:** R$ 9.113,90
     * **Pátio WIP:** R$ 11.802,94
     * **Contas:** R$ 22.462,56
2. **`src/components/conciliacao/BaixaDinheiroTransitoModal.tsx`:**
   - Garantir suporte à listagem dos 3 registros acumulados pendentes (`em_transito`) de Santo André (R$ 2.336,40), Dom Pedro (R$ 2.637,50) e Rei do Módulo (R$ 4.140,00).
   - Permitir baixa individual ou em lote diretamente para o usuário.

---

## 4. Estratégia de Verificação e Testes (Audit Trail)

1. **Script de Prova Real (`scratch/audit-372.cjs`):**
   - Executar chamada à RPC `get_daily_reconciliation_summary('2026-09-04')`.
   - Validar que:
     - `saldo_bancos_positivo` == 290994.62
     - `saldo_bancos_negativo` == -1653.79
     - `cartoes_a_compensar` == 0.00
     - `dinheiro_lojas` == 9113.90
     - `contas_manual` == 22462.56
     - `patio_wip` == 11802.94
2. **Typecheck e Build:**
   - `npm run typecheck`
   - `npm run build`
