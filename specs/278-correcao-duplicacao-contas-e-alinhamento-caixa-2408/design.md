# Design: Correção da Duplicação de Contas a Pagar e Alinhamento Preciso do Fechamento 24/08 (Spec 278)

## Tabela Comparativa de Cada Indicador

| Indicador | Valor no Sistema Antes | Valor Oficial no Excel | Causa da Diferença |
|---|---|---|---|
| **Saldo Bancos OFX** | R$ 61.456,10 | R$ 102.999,61 (ou 142.498,12 bruto) | 7 contas positivas (100.954,61) - 3 negativas (39.498,51) = 61.456,10. Excel soma CDB de R$ 80.000 em JB e deduz contas negativas no G18. |
| **Dinheiro MP** | R$ 13.278,00 | R$ 13.278,00 | ✅ 100% Idêntico |
| **A Receber** | R$ 10.694,50 | R$ 10.694,50 | ✅ 100% Idêntico |
| **Na Loja OS (Pátio)** | R$ 91.993,61 | R$ 88.212,39 | Reimportação de OSs brutas sem cruzar liquidações da Rede (+R$ 3.781,22). |
| **Caixa Atual** | R$ 181.855,58 | R$ 175.685,99 | Saldo Total Bancos + Dinheiro MP + A Receber + Pátio - Negativo Itaú. |
| **Caixa Anterior** | R$ 150.600,29 | R$ 150.600,29 | ✅ 100% Idêntico |
| **Fluxo de Caixa** | +R$ 31.255,29 | +R$ 25.085,70 | Caixa Atual (175.685,99) - Caixa Anterior (150.600,29) = 25.085,70. |
| **Faturamento OI Base** | R$ 70.721,56 | R$ 70.721,56 | ✅ 100% Idêntico |
| **Ajustes Faturamento** | R$ 0,00 | R$ 90,00 (60 HD + 30 JB) | Faltava registrar Sucata em `daily_revenue_adjustments`. |
| **Faturamento Total** | R$ 70.721,56 | R$ 70.811,56 | 70.721,56 + 90,00 = 70.811,56. |
| **Valor Disp. Contas** | R$ 39.466,27 | R$ 45.725,86 | 70.811,56 - 25.085,70 = 45.725,86. |
| **Contas (Manual)** | **R$ 59.999,02** | **R$ 40.069,51** | **DUPLICAÇÃO:** O sistema somou `BuscaContasAPagar (29.999,51)` duas vezes (snapshot + manual_bills). O real é `29.999,51 + 10.070,00 (Daniel) = 40.069,51`. |
| **Juros Rede** | R$ 6.148,50 | R$ 5.650,15 | Taxa bruta dos 10 relatórios vs taxa líquida lançada na planilha. |
| **Subtotal Contas** | R$ 66.147,52 | R$ 45.719,66 | 40.069,51 + 5.650,15 = 45.719,66. |
| **Diferença Final** | **-R$ 26.681,25** | **+R$ 6,20** | **✅ CONCILIADO COM SOBRA DE R$ 6,20!** |

---

## Modificações na RPC `get_daily_reconciliation_summary`

Ajustar a apuração de `v_contas_manual`:
```sql
    -- Se existirem registros em daily_manual_bills, usa a soma de daily_manual_bills como a lista detalhada
    -- Se o snapshot já tiver um valor idêntico ao total de daily_manual_bills, não soma duas vezes
    IF v_contas_extras > 0 THEN
        IF v_contas_base = v_contas_extras THEN
            v_contas_manual := v_contas_extras;
        ELSE
            v_contas_manual := GREATEST(v_contas_base, v_contas_extras);
        END IF;
    ELSE
        v_contas_manual := v_contas_base;
    END IF;
```
